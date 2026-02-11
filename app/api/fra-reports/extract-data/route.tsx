import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLatestHSAuditForStore } from '@/app/actions/fra-reports'
import { getAuditInstance } from '@/app/actions/safehub'
import { getStoreDataFromGoogleSearch } from '@/lib/fra/google-store-data-search'
import { getOpeningHoursFromSearch } from '@/lib/fra/opening-hours-search'

export const dynamic = 'force-dynamic'

type ParsedYesNoQuestion = {
  answer: 'yes' | 'no' | 'na' | null
  comment: string | null
}

function parseYesNoQuestionBlock(
  text: string,
  questionRegex: RegExp
): ParsedYesNoQuestion {
  const questionMatch = text.match(questionRegex)
  if (!questionMatch || questionMatch.index === undefined) {
    return { answer: null, comment: null }
  }

  const afterQuestion = text.slice(questionMatch.index + questionMatch[0].length, questionMatch.index + questionMatch[0].length + 2000)
  const answerMatch = afterQuestion.match(/(?:^|\n)\s*(Yes|No|N\/A|NA)\s*(?:\n|$)/im)
  const rawAnswer = answerMatch?.[1]?.toLowerCase() || ''
  const answer: ParsedYesNoQuestion['answer'] =
    rawAnswer === 'yes' ? 'yes' :
    rawAnswer === 'no' ? 'no' :
    rawAnswer === 'n/a' || rawAnswer === 'na' ? 'na' :
    null

  let commentRaw = ''
  if (answerMatch && answerMatch.index !== undefined) {
    commentRaw = afterQuestion.slice(0, answerMatch.index)
  } else {
    commentRaw = afterQuestion
  }

  const comment = commentRaw
    .replace(/\bPhoto\s+\d+(?:\s+Photo\s+\d+)*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    answer,
    comment: comment || null,
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function toDisplayAnswer(answer: ParsedYesNoQuestion['answer']): string | null {
  if (answer === 'yes') return 'Yes'
  if (answer === 'no') return 'No'
  if (answer === 'na') return 'N/A'
  return null
}

function extractDateFromText(value: string): string | null {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  const dated =
    normalized.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/)?.[1]
    || normalized.match(/\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})\b/i)?.[1]
    || null
  return dated ? normalizeWhitespace(dated) : null
}

function isLikelyGeneralSiteLabel(value: string): boolean {
  const lower = normalizeWhitespace(value).toLowerCase()
  if (!lower) return false
  return [
    'general site information',
    'number of floors',
    'square footage',
    'number of fire exits',
    'number of staff',
    'maximum number of staff',
    'number of young persons',
    'any know enforcement action',
    'any known enforcement action',
    'health and safety policy',
    'risk assessments',
    'training',
    'statutory testing',
    'fire safety',
  ].some((label) => lower.startsWith(label))
}

function extractNumericAfterLabel(text: string, labelRegex: RegExp): string | null {
  const sameLineRegex = new RegExp(`${labelRegex.source}[^\\n\\r]*`, 'i')
  const sameLine = text.match(sameLineRegex)?.[0] || null
  if (sameLine) {
    const trailingNumber = sameLine.match(/(\d+)\s*$/)?.[1] || null
    if (trailingNumber) return trailingNumber
  }

  const blockRegex = new RegExp(`${labelRegex.source}[\\s\\S]{0,160}`, 'i')
  const block = text.match(blockRegex)?.[0] || null
  if (!block) return null

  const lines = block
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const labelIndex = lines.findIndex((line) => labelRegex.test(line))
  if (labelIndex < 0) return null

  for (let i = labelIndex + 1; i < lines.length && i <= labelIndex + 3; i += 1) {
    const line = lines[i]
    if (isLikelyGeneralSiteLabel(line)) break
    const numeric = line.match(/^(\d+)\b/)?.[1] || null
    if (numeric) return numeric
  }

  return null
}

function isValidSquareFootageValue(value: string): boolean {
  const cleaned = normalizeWhitespace(value).replace(/^[:\-–]\s*/, '')
  if (!cleaned) return false
  if (/^(n\/a|na|none|nil|not applicable|not provided|—|-)$/.test(cleaned.toLowerCase())) return false
  if (!/\d/.test(cleaned)) return false
  if (isLikelyGeneralSiteLabel(cleaned)) return false
  if (/number of fire exits|number of staff|maximum number of staff|young persons|enforcement action/i.test(cleaned)) return false

  return /^(\d[\d,]*(?:\.\d+)?)\s*(sq\s*ft|sq\s*m|m²|ft²|square\s*(feet|meters|metres))?$/i.test(cleaned)
}

function extractSquareFootageAfterLabel(text: string): string | null {
  const labelRegex = /square footage or square meterage of site/i
  const sameLine = text.match(/square footage or square meterage of site[^\n\r]*/i)?.[0] || null
  if (sameLine) {
    const candidate = normalizeWhitespace(sameLine.replace(labelRegex, ''))
    if (isValidSquareFootageValue(candidate)) {
      return candidate
    }
  }

  const block = text.match(/square footage or square meterage of site[\s\S]{0,200}/i)?.[0] || null
  if (!block) return null

  const lines = block
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const labelIndex = lines.findIndex((line) => labelRegex.test(line))
  if (labelIndex < 0) return null

  for (let i = labelIndex + 1; i < lines.length && i <= labelIndex + 4; i += 1) {
    const line = normalizeWhitespace(lines[i]).replace(/^[:\-–]\s*/, '')
    if (isLikelyGeneralSiteLabel(line)) break
    if (isValidSquareFootageValue(line)) return line
  }

  return null
}

type ParsedAnchoredQuestion = {
  answer: 'yes' | 'no' | 'na' | null
  comment: string | null
  windowText: string
}

type ExtractSectionMap = {
  full: string
  generalSiteInformation?: string
  statutoryTesting?: string
  fireSafety?: string
  training?: string
}

function normalizeLines(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n')
}

function isPhotoOnlyLine(value: string): boolean {
  return /^\s*photo\s+\d+(?:\s+photo\s+\d+)*\s*$/i.test(value)
}

function isSectionHeadingLine(value: string): boolean {
  const line = normalizeWhitespace(value)
  if (!line) return false
  return [
    'General Site Information',
    'Statutory Testing',
    'Fire Safety',
    'Store Compliance',
    'COSHH',
    'Training',
  ].some((heading) => new RegExp(`^${heading}\\b`, 'i').test(line))
}

function isLikelyNewQuestionLine(value: string): boolean {
  const line = normalizeWhitespace(value)
  if (!line) return false
  if (/\?$/.test(line) && line.length > 12) return true
  if (/^(number of|location of|evidence of|is panel|are all|fire drill has|h&s)/i.test(line)) return true
  return false
}

function isInvalidLocationValue(value: string | null | undefined): boolean {
  const normalized = normalizeWhitespace(value || '')
  if (!normalized) return true
  if (/^(yes|no|n\/a|na)$/i.test(normalized)) return true
  if (/^photo\s+\d+(?:\s+photo\s+\d+)*$/i.test(normalized)) return true
  if (/^emergency\s+lighting\s+switch\s+photo$/i.test(normalized)) return true
  if (/^location\s+of\s+emergency\s+lighting\s+test\s+switch/i.test(normalized)) return true
  return false
}

const NEXT_QUESTION_BOUNDARIES: RegExp[] = [
  /fire\s+exit\s+routes\s+clear\s+and\s+unobstructed\?/i,
  /combustible\s+materials\s+are\s+stored\s+correctly\?/i,
  /fire\s+doors\s+in\s+a\s+good\s+condition\?/i,
  /are\s+fire\s+door\s+intumescent\s+strips\s+in\s+place\s+and\s+intact\?/i,
  /fire\s+doors\s+closed\s+and\s+not\s+held\s+open\?/i,
  /weekly\s+fire\s+tests\s+carried\s+out\s+and\s+documented\?/i,
  /evidence\s+of\s+monthly\s+emergency\s+lighting\s+test\s+being\s+conducted\?/i,
  /fire\s+extinguisher\s+service\?/i,
  /fire\s+drill\s+has\s+been\s+carried\s+out\s+in\s+the\s+past\s+6\s+months\s+and\s+records?\s+available\s+on\s+site\?/i,
]

function splitBeforeNextQuestionBoundary(value: string): { before: string; hitBoundary: boolean } {
  let cutIndex = -1
  for (const pattern of NEXT_QUESTION_BOUNDARIES) {
    const match = pattern.exec(value)
    if (!match || typeof match.index !== 'number') continue
    if (cutIndex < 0 || match.index < cutIndex) cutIndex = match.index
  }
  if (cutIndex < 0) {
    return { before: value, hitBoundary: false }
  }
  return { before: value.slice(0, cutIndex).trim(), hitBoundary: true }
}

function extractEmergencyLightingSwitchLocation(text: string): string | null {
  const sameLinePatterns = [
    /location\s+of\s+emergency\s+lighting\s+test\s+switch\s*\([^)]*photograph[^)]*\)\s*[:\-]?[ \t]*([^\n\r]+)/i,
    /location\s+of\s+emergency\s+lighting\s+test\s+switch\s*[:\-]?[ \t]*([^\n\r]+)/i,
  ]

  for (const pattern of sameLinePatterns) {
    const match = pattern.exec(text)
    const candidate = normalizeWhitespace(
      (match?.[1] || '')
        .replace(/\([^)]*photograph[^)]*\)/gi, '')
        .replace(/photograph/gi, '')
        .trim()
    )
    if (candidate && !isInvalidLocationValue(candidate) && candidate.length > 2) {
      return candidate
    }
  }

  const lines = normalizeLines(text)
  const anchorIndex = findAnchorLineIndex(
    text,
    /location\s+of\s+emergency\s+lighting\s+test\s+switch\s*(?:\([^)]*photograph[^)]*\))?/i
  )
  if (anchorIndex < 0) return null

  for (let i = anchorIndex + 1; i < lines.length && i <= anchorIndex + 6; i += 1) {
    const line = normalizeWhitespace(lines[i])
    if (!line) continue
    if (isSectionHeadingLine(line)) break
    if (i > anchorIndex + 1 && isLikelyNewQuestionLine(line)) break
    if (isInvalidLocationValue(line)) continue
    return line
  }

  return null
}

function preCleanAuditText(text: string): string {
  let cleaned = text.replace(/\r\n?/g, '\n').replace(/\u00A0/g, ' ')
  cleaned = cleaned.replace(/disclaimer[\s\S]*?(?=general site information)/i, '')
  cleaned = cleaned.replace(/media summary[\s\S]*$/i, '')
  cleaned = normalizeLines(cleaned)
    .filter((line) => !isPhotoOnlyLine(line))
    .join('\n')
  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}

function splitAuditSections(cleanedText: string): ExtractSectionMap {
  const normalizedText = cleanedText.replace(/\r\n?/g, '\n')
  const lines = normalizedText.split('\n')
  const offsets: number[] = []
  let cursor = 0
  for (const line of lines) {
    offsets.push(cursor)
    cursor += line.length + 1
  }

  const sectionDefs: Array<{ key: keyof Omit<ExtractSectionMap, 'full'>; title: string }> = [
    { key: 'generalSiteInformation', title: 'General Site Information' },
    { key: 'statutoryTesting', title: 'Statutory Testing' },
    { key: 'fireSafety', title: 'Fire Safety' },
    { key: 'training', title: 'Training' },
  ]

  const findHeadingOffset = (title: string): number | null => {
    const normalizedTitle = normalizeWhitespace(title).toLowerCase()
    let fallback: number | null = null

    for (let i = 0; i < lines.length; i += 1) {
      const current = normalizeWhitespace(lines[i]).toLowerCase()
      if (!current.startsWith(normalizedTitle)) continue
      if (fallback === null) fallback = offsets[i]
      const prev = i > 0 ? normalizeWhitespace(lines[i - 1]) : ''
      if (i === 0 || prev === '') return offsets[i]
    }

    return fallback
  }

  const hits: Array<{ key: keyof Omit<ExtractSectionMap, 'full'>; index: number }> = []
  for (const def of sectionDefs) {
    const index = findHeadingOffset(def.title)
    if (typeof index === 'number' && index >= 0) {
      hits.push({ key: def.key, index })
    }
  }

  hits.sort((a, b) => a.index - b.index)

  const sections: ExtractSectionMap = { full: normalizedText }
  for (let i = 0; i < hits.length; i += 1) {
    const current = hits[i]
    const next = hits[i + 1]
    const start = current.index
    const end = next ? next.index : normalizedText.length
    sections[current.key] = normalizedText.slice(start, end).trim()
  }

  return sections
}

function findAnchorLineIndex(sectionText: string, anchorRegex: RegExp): number {
  const safeRegex = new RegExp(anchorRegex.source, anchorRegex.flags.replace(/g/g, ''))
  const match = safeRegex.exec(sectionText)
  if (!match || typeof match.index !== 'number') return -1
  return sectionText.slice(0, match.index).split(/\r\n?|\n/).length - 1
}

function parseAnchoredQuestionBlock(
  sectionText: string,
  anchorRegex: RegExp,
  options?: { maxLines?: number; skipLinePatterns?: RegExp[] }
): ParsedAnchoredQuestion {
  const lines = normalizeLines(sectionText)
  const anchorIndex = findAnchorLineIndex(sectionText, anchorRegex)
  if (anchorIndex < 0) {
    return { answer: null, comment: null, windowText: '' }
  }

  const maxLines = options?.maxLines ?? 18
  let answer: ParsedAnchoredQuestion['answer'] = null
  const commentParts: string[] = []
  const windowParts: string[] = []
  const safeRegex = new RegExp(anchorRegex.source, anchorRegex.flags.replace(/g/g, ''))

  const anchorLine = normalizeWhitespace(lines[anchorIndex] || '')
  if (anchorLine) {
    windowParts.push(anchorLine)
  }

  const anchorRemainder = normalizeWhitespace(anchorLine.replace(safeRegex, '').replace(/^[:\-–\s]+/, ''))
  if (anchorRemainder) {
    const standaloneAnswer = anchorRemainder.match(/^(yes|no|n\/a|na)$/i)
    if (standaloneAnswer) {
      const raw = standaloneAnswer[1].toLowerCase()
      answer = raw === 'yes' ? 'yes' : raw === 'no' ? 'no' : 'na'
    } else {
      commentParts.push(anchorRemainder)
    }
  }

  for (let i = anchorIndex + 1; i < lines.length && i <= anchorIndex + maxLines; i += 1) {
    const line = normalizeWhitespace(lines[i])
    if (!line) continue

    if (options?.skipLinePatterns?.some((re) => re.test(line))) {
      windowParts.push(line)
      continue
    }

    if (isPhotoOnlyLine(line) || isSectionHeadingLine(line)) break
    if (i > anchorIndex + 1 && isLikelyNewQuestionLine(line)) break

    windowParts.push(line)

    const standaloneAnswer = line.match(/^(yes|no|n\/a|na)$/i)
    if (standaloneAnswer) {
      const raw = standaloneAnswer[1].toLowerCase()
      answer = raw === 'yes' ? 'yes' : raw === 'no' ? 'no' : 'na'
      break
    }

    const leadingAnswer = line.match(/^(yes|no|n\/a|na)\b(?:\s*[:\-]\s*(.*))?$/i)
    if (leadingAnswer) {
      const raw = leadingAnswer[1].toLowerCase()
      answer = raw === 'yes' ? 'yes' : raw === 'no' ? 'no' : 'na'
      if (leadingAnswer[2]) commentParts.push(leadingAnswer[2])
      break
    }

    commentParts.push(line)
  }

  const comment = normalizeWhitespace(
    commentParts
      .join(' ')
      .replace(safeRegex, ' ')
      .replace(/\bPhoto\s+\d+(?:\s+Photo\s+\d+)*/gi, ' ')
      .replace(/^[:\-–\s]+/, '')
  ) || null

  return {
    answer,
    comment,
    windowText: normalizeWhitespace(windowParts.join(' ')),
  }
}

function extractNumericAfterAnchoredLabel(sectionText: string, anchorRegex: RegExp): string | null {
  const lines = normalizeLines(sectionText)
  const anchorIndex = findAnchorLineIndex(sectionText, anchorRegex)
  if (anchorIndex < 0) return null

  const sameLine = normalizeWhitespace(lines[anchorIndex] || '')
  const sameLineNumber = sameLine.match(/[:\-–]\s*(\d+)\b/)?.[1] || sameLine.match(/\b(\d+)\s*$/)?.[1] || null
  if (sameLineNumber) return sameLineNumber

  for (let i = anchorIndex + 1; i < lines.length && i <= anchorIndex + 6; i += 1) {
    const line = normalizeWhitespace(lines[i])
    if (!line) continue
    if (isPhotoOnlyLine(line)) continue
    if (isLikelyGeneralSiteLabel(line) || isSectionHeadingLine(line) || (i > anchorIndex + 1 && isLikelyNewQuestionLine(line))) break
    const numeric = line.match(/\b(\d+)\b/)?.[1] || null
    if (numeric) return numeric
  }

  return null
}

function extractSquareFootageAfterAnchoredLabel(sectionText: string): string | null {
  const anchor = /square\s+footage\s+or\s+square\s+meterage\s+of\s+site/i
  const lines = normalizeLines(sectionText)
  const anchorIndex = findAnchorLineIndex(sectionText, anchor)
  if (anchorIndex < 0) return null

  const sameLine = normalizeWhitespace(lines[anchorIndex] || '')
  const sameLineCandidate = normalizeWhitespace(sameLine.replace(anchor, '').replace(/^[:\-–\s]+/, ''))
  if (sameLineCandidate && isValidSquareFootageValue(sameLineCandidate)) {
    return sameLineCandidate
  }

  for (let i = anchorIndex + 1; i < lines.length && i <= anchorIndex + 8; i += 1) {
    const line = normalizeWhitespace(lines[i]).replace(/^[:\-–\s]+/, '')
    if (!line) continue
    if (isPhotoOnlyLine(line)) continue
    if (isLikelyGeneralSiteLabel(line) || isSectionHeadingLine(line) || (i > anchorIndex + 1 && isLikelyNewQuestionLine(line))) break
    if (isValidSquareFootageValue(line)) return line
  }

  return null
}

function extractExplicitManagementReviewStatement(cleanedText: string): string | null {
  const directMatch = cleanedText.match(/management\s+review\s+statement\s*[:\-]\s*([^\n]+)/i)
  if (directMatch?.[1]) {
    const value = normalizeWhitespace(directMatch[1])
    if (value) return value
  }

  const lines = normalizeLines(cleanedText)
  const anchorIndex = findAnchorLineIndex(cleanedText, /management\s+review\s+statement/i)
  if (anchorIndex >= 0) {
    const captured: string[] = []
    for (let i = anchorIndex + 1; i < lines.length && i <= anchorIndex + 5; i += 1) {
      const line = normalizeWhitespace(lines[i])
      if (!line) continue
      if (isPhotoOnlyLine(line) || isSectionHeadingLine(line) || isLikelyNewQuestionLine(line)) break
      if (/^(yes|no|n\/a|na)$/i.test(line)) break
      captured.push(line)
    }
    const value = normalizeWhitespace(captured.join(' '))
    if (value) return value
  }

  const sentenceMatch = cleanedText.match(/this assessment has been informed by[^.!?\n]*(?:[.!?])/i)
  return sentenceMatch?.[0] ? normalizeWhitespace(sentenceMatch[0]) : null
}

function extractValueAfterAnchoredLabel(
  sectionText: string,
  anchorRegex: RegExp,
  options?: {
    maxLines?: number
    disallowLinePatterns?: RegExp[]
  }
): string | null {
  const lines = normalizeLines(sectionText)
  const anchorIndex = findAnchorLineIndex(sectionText, anchorRegex)
  if (anchorIndex < 0) return null

  const safeRegex = new RegExp(anchorRegex.source, anchorRegex.flags.replace(/g/g, ''))
  const maxLines = options?.maxLines ?? 6

  const sameLine = normalizeWhitespace(lines[anchorIndex] || '')
  const sameLineRemainder = normalizeWhitespace(sameLine.replace(safeRegex, '').replace(/^[:\-–\s]+/, ''))
  if (
    sameLineRemainder
    && !options?.disallowLinePatterns?.some((re) => re.test(sameLineRemainder))
  ) {
    return sameLineRemainder
  }

  for (let i = anchorIndex + 1; i < lines.length && i <= anchorIndex + maxLines; i += 1) {
    const line = normalizeWhitespace(lines[i])
    if (!line) continue
    if (isPhotoOnlyLine(line)) continue
    if (isSectionHeadingLine(line)) break
    if (i > anchorIndex + 1 && isLikelyNewQuestionLine(line)) break
    if (options?.disallowLinePatterns?.some((re) => re.test(line))) continue
    return line
  }

  return null
}

function extractAssessmentStartTime(text: string): string | null {
  const patterns = [
    /(?:conducted on|conducted at|assessment date)[^\n\r]{0,120}?(\d{1,2}:\d{2}\s*(?:am|pm)\s*(?:gmt|bst|utc)?)/i,
    /(?:conducted on|conducted at|assessment date)[^\n\r]{0,120}?(\d{1,2}\.\d{2}\s*(?:am|pm)\s*(?:gmt|bst|utc)?)/i,
    /\b(\d{1,2}:\d{2}\s*(?:am|pm)\s*(?:gmt|bst|utc))\b/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match?.[1]) continue
    const raw = normalizeWhitespace(match[1].replace(/\./g, ':'))
    const normalized = raw
      .replace(/\bam\b/i, 'AM')
      .replace(/\bpm\b/i, 'PM')
      .replace(/\bgmt\b/i, 'GMT')
      .replace(/\bbst\b/i, 'BST')
      .replace(/\butc\b/i, 'UTC')
    if (normalized) return normalized
  }

  return null
}

function extractFireDrillDateFromAnchorBlock(
  text: string
): { dateOrStatus: string | null; answer: 'yes' | 'no' | 'na' | null; block: string } {
  const anchorPatterns = [
    /fire\s+drill\s+has\s+been?\s+carried\s+out\s+in\s+the\s+past\s+6\s+months\s+and\s+records?\s+available\s+on\s+site\s*\??/i,
    /fire\s+drill\s+has\s+been?\s+carried\s+out\s+in\s+the\s+past\s+6\s+months[\s\S]{0,80}?records?\s+available\s+on\s+site\s*\??/i,
  ]

  let match: RegExpExecArray | null = null
  for (const pattern of anchorPatterns) {
    match = pattern.exec(text)
    if (match) break
  }
  if (!match || typeof match.index !== 'number') {
    return { dateOrStatus: null, answer: null, block: '' }
  }

  const lines = normalizeLines(text)
  const anchorLineIndex = text.slice(0, match.index).split(/\r\n?|\n/).length - 1
  const blockParts: string[] = []
  for (let i = anchorLineIndex; i < lines.length && i <= anchorLineIndex + 16; i += 1) {
    const line = normalizeWhitespace(lines[i])
    if (!line) continue
    if (i > anchorLineIndex && isSectionHeadingLine(line)) break
    if (i > anchorLineIndex + 1 && isLikelyNewQuestionLine(line)) break
    blockParts.push(line)
  }

  const block = normalizeWhitespace(blockParts.join(' '))
  if (!block) return { dateOrStatus: null, answer: null, block: '' }

  const explicitDate = extractDateFromText(block)
  const yesNoMatch =
    block.match(/\?\s*(Yes|No|N\/A|NA)\b/i)?.[1]
    || block.match(/\b(Yes|No|N\/A|NA)\b/i)?.[1]
    || null
  const answer: 'yes' | 'no' | 'na' | null =
    !yesNoMatch ? null :
      yesNoMatch.toLowerCase() === 'yes' ? 'yes' :
      yesNoMatch.toLowerCase() === 'no' ? 'no' :
      'na'

  if (explicitDate) {
    return { dateOrStatus: explicitDate, answer, block }
  }

  if (
    (answer === 'yes' || /marked\s+as\s+completed\s*\(yes\)/i.test(block))
    && /no date|not been recorded|not recorded/i.test(block)
  ) {
    return {
      dateOrStatus: 'The fire drill is marked as completed (Yes) on the weekly check sheet, but no date has been recorded.',
      answer,
      block,
    }
  }

  return { dateOrStatus: null, answer, block }
}

function extractCompartmentationNarrativeFromAnchor(text: string): string | null {
  const anchorPatterns = [
    /structure\s+found\s+to\s+be\s+in\s+a\s+good\s+condition[\s\S]{0,140}?gaps?\s+from\s+area\s+to\s+area\?/i,
    /structure\s+found\s+to\s+be\s+in\s+a\s+good\s+condition[\s\S]{0,140}?ceiling\s+tiles?[\s\S]{0,80}\?/i,
  ]

  let anchorMatch: RegExpExecArray | null = null
  for (const pattern of anchorPatterns) {
    anchorMatch = pattern.exec(text)
    if (anchorMatch) break
  }
  if (!anchorMatch || typeof anchorMatch.index !== 'number') return null

  const lines = normalizeLines(text)
  const anchorLineIndex = text.slice(0, anchorMatch.index).split(/\r\n?|\n/).length - 1
  const captured: string[] = []
  let captureStarted = false
  let sawAnswerToken = false

  const isQuestionFragment = (line: string): boolean => (
    /\?$/.test(line)
    || /structure\s+found\s+to\s+be\s+in\s+a\s+good\s+condition/i.test(line)
    || /would\s+compromise\s+fire\s+safety/i.test(line)
    || /\beg\s+missing\b/i.test(line)
    || /missing\s+.*(?:tiles?|gaps?\s+from\s+area\s+to\s+area)/i.test(line)
    || /gaps?\s+from\s+area\s+to\s+area/i.test(line)
  )

  for (let i = anchorLineIndex + 1; i < lines.length && i <= anchorLineIndex + 16; i += 1) {
    const rawLine = normalizeWhitespace(lines[i])
    const { before, hitBoundary } = splitBeforeNextQuestionBoundary(rawLine)
    const line = before
    if (!line) continue
    if (isPhotoOnlyLine(line)) continue
    if (isSectionHeadingLine(line)) break
    if ((i > anchorLineIndex + 1 && isLikelyNewQuestionLine(line) && captureStarted) || (hitBoundary && captureStarted)) break
    if (/^photo\b/i.test(line)) continue

    if (/^(yes|no|n\/a|na)$/i.test(line)) {
      sawAnswerToken = true
      if (hitBoundary && captureStarted) break
      continue
    }

    if (!captureStarted) {
      if (/^(there\s+are|overall\b|no\s+other\b)/i.test(line)) {
        captureStarted = true
      } else if (sawAnswerToken && !isQuestionFragment(line)) {
        captureStarted = true
      } else if (isQuestionFragment(line)) {
        continue
      } else {
        // Do not start capture before seeing answer or clear narrative opener.
        continue
      }
    }

    if (isQuestionFragment(line)) continue

    captured.push(line)

    if (captured.join(' ').length > 260 && /[.!?]$/.test(line)) break
    if (hitBoundary) break
  }

  const narrative = normalizeWhitespace(captured.join(' '))
  return narrative.length >= 20 ? narrative : null
}

/**
 * Extract data from H&S audit (PDF or database) without generating full FRA
 * Returns raw extracted data for review
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const instanceId = searchParams.get('instanceId')

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
    }

    // Get the FRA audit instance
    const fraInstance = await getAuditInstance(instanceId)
    
    if (!fraInstance || (fraInstance.fa_audit_templates as any)?.category !== 'fire_risk_assessment') {
      return NextResponse.json({ error: 'Invalid FRA audit instance' }, { status: 400 })
    }

    const store = fraInstance.fa_stores as any
    const storeId = store.id

    // Get PDF text from uploaded H&S audit PDF (NOT from database audits)
    // The FRA uses ONLY the uploaded PDF, not database H&S audits
    console.log('[EXTRACT] Getting PDF text from uploaded H&S audit PDF for FRA instance:', instanceId)
    
    // First, try direct query to see if PDF text is stored
    const { data: fraInstanceForQuery } = await supabase
      .from('fa_audit_instances')
      .select('template_id')
      .eq('id', instanceId)
      .single()
    
    let directPdfText: string | null = null
    
    if (fraInstanceForQuery?.template_id) {
      console.log('[EXTRACT] Template ID found:', fraInstanceForQuery.template_id)
      
      const { data: firstSection } = await supabase
        .from('fa_audit_template_sections')
        .select('id')
        .eq('template_id', fraInstanceForQuery.template_id)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle()
      
      if (firstSection) {
        console.log('[EXTRACT] First section found:', firstSection.id)
        
        const { data: firstQuestion } = await supabase
          .from('fa_audit_template_questions')
          .select('id')
          .eq('section_id', firstSection.id)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle()
        
        if (firstQuestion) {
          console.log('[EXTRACT] Direct query: checking for PDF text in question:', firstQuestion.id)
          
          const { data: directResponse, error: directError } = await supabase
            .from('fa_audit_responses')
            .select('response_json, id')
            .eq('audit_instance_id', instanceId)
            .eq('question_id', firstQuestion.id)
            .maybeSingle()
          
          if (directError) {
            console.error('[EXTRACT] Direct query error:', directError)
          } else if (directResponse) {
            console.log('[EXTRACT] Direct query found response ID:', directResponse.id)
            console.log('[EXTRACT] Response JSON keys:', Object.keys(directResponse.response_json || {}))
            
            const text = directResponse.response_json?.fra_pdf_text
            if (text) {
              directPdfText = text
              console.log('[EXTRACT] ✓ Found PDF text via direct query, length:', text.length)
            } else {
              console.log('[EXTRACT] ✗ Direct query: no fra_pdf_text found in first question')
            }
          } else {
            console.log('[EXTRACT] ✗ Direct query: no response found for question:', firstQuestion.id)
          }
        } else {
          console.log('[EXTRACT] ✗ No first question found in section')
        }
      } else {
        console.log('[EXTRACT] ✗ No first section found - template may have no sections')
      }
      
      // If not found in first question, search ALL responses for this instance
      if (!directPdfText) {
        console.log('[EXTRACT] Searching all responses for PDF text...')
        const { data: allResponses } = await supabase
          .from('fa_audit_responses')
          .select('id, question_id, response_json')
          .eq('audit_instance_id', instanceId)
        
        if (allResponses && allResponses.length > 0) {
          console.log('[EXTRACT] Found', allResponses.length, 'responses, checking each for fra_pdf_text...')
          for (const resp of allResponses) {
            const text = resp.response_json?.fra_pdf_text
            if (text) {
              directPdfText = text
              console.log('[EXTRACT] ✓ Found PDF text in response ID:', resp.id, 'question:', resp.question_id, 'length:', text.length)
              break
            }
          }
          if (!directPdfText) {
            console.log('[EXTRACT] ✗ Checked all responses, none contain fra_pdf_text')
            allResponses.forEach((resp: any) => {
              const keys = Object.keys(resp.response_json || {})
              console.log('[EXTRACT] Response', resp.id, 'question', resp.question_id, 'has keys:', keys)
            })
          }
        } else {
          console.log('[EXTRACT] ✗ No responses found for this instance at all')
        }
      }
    } else {
      console.log('[EXTRACT] ✗ No template_id found for instance')
    }
    
    // Try getLatestHSAuditForStore as fallback
    const hsAuditResult = await getLatestHSAuditForStore(storeId, instanceId)
    const pdfText = directPdfText || hsAuditResult.pdfText  // Prefer direct query result
    
    console.log('[EXTRACT] Final results:', {
      hasPdfText: !!pdfText,
      pdfTextLength: pdfText?.length || 0,
      source: directPdfText ? 'direct_query' : (hsAuditResult.pdfText ? 'getLatestHSAuditForStore' : 'none'),
      note: 'FRA uses ONLY uploaded PDF, not database audits'
    })

    // Extract data from PDF text if available
    let pdfExtractedData: Record<string, string | null> = {}
    if (pdfText) {
      console.log('[EXTRACT] PDF text length:', pdfText.length)
      console.log('[EXTRACT] PDF text sample (first 500 chars):', pdfText.substring(0, 500))
      
      // Debug: Show sections that might contain our data
      const debugSections = [
        { name: 'Store Manager', search: /(?:signature|manager|person in charge)/i },
        { name: 'Floors', search: /(?:number of floors|level|floor)/i },
        { name: 'Operating Hours', search: /(?:operating|trading|opening|hours)/i },
        { name: 'Square Footage', search: /(?:square footage|meterage|floor area)/i },
      ]
      
      for (const section of debugSections) {
        const match = pdfText.match(section.search)
        if (match) {
          const index = match.index || 0
          const context = pdfText.substring(Math.max(0, index - 100), Math.min(pdfText.length, index + 200))
          console.log(`[EXTRACT] Debug - ${section.name} context:`, context.replace(/\n/g, '\\n'))
        }
      }
      
      // Don't normalize to lowercase - keep original case for better matching
      const originalText = pdfText
      const normalizedText = pdfText.replace(/\s+/g, ' ')
      const cleanedAuditText = preCleanAuditText(originalText)
      const sectionText = splitAuditSections(cleanedAuditText)
      const generalSiteText = sectionText.generalSiteInformation || cleanedAuditText
      const fireSafetyText = sectionText.fireSafety || cleanedAuditText
      const trainingText = sectionText.training || cleanedAuditText
      
      // Store Manager - look for "Signature of Person in Charge of store at time of assessment"
      let storeManagerMatch = null
      const storeManagerPatterns = [
        // Pattern 1: "Signature of Person in Charge of store at time of assessment." followed by name
        /signature of person in charge of store at time of assessment[.\s]*([A-Z][a-z]+(?:\s+[a-z]+)?)\s+\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/i,
        // Pattern 2: "Signature of Person in Charge" followed by name and date
        /signature of person in charge[.\s]*([A-Z][a-z]+(?:\s+[a-z]+)?)\s+\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/i,
        // Pattern 3: Look for name right before date/time at end of signature section
        /signature of person in charge of store at time of assessment[.\s]*([^\n\r]+?)\s+\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\s+\d{1,2}:\d{2}\s*(?:am|pm)\s+gmt/i,
      ]
      
      for (const pattern of storeManagerPatterns) {
        storeManagerMatch = originalText.match(pattern)
        if (storeManagerMatch) {
          console.log('[EXTRACT] Store manager pattern matched:', pattern.toString())
          break
        }
      }
      
      if (storeManagerMatch) {
        let managerName = storeManagerMatch[1]?.trim() || ''
        // Remove any trailing punctuation or extra text
        managerName = managerName
          .replace(/\s+\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec).*$/i, '')
          .replace(/\s+\d{1,2}:\d{2}.*$/i, '')
          .replace(/\s+gmt.*$/i, '')
          .replace(/[.\s]+$/, '')
          .trim()
        
        // Capitalize first letter of each word
        if (managerName) {
          managerName = managerName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ')
          
          pdfExtractedData.storeManager = managerName
          console.log('[EXTRACT] ✓ Found store manager:', managerName)
        } else {
          console.log('[EXTRACT] Store manager match rejected (empty after cleaning):', storeManagerMatch[1])
        }
      } else {
        console.log('[EXTRACT] ✗ No store manager pattern matched')
      }

      // Fire Panel Location - more flexible pattern
      const firePanelMatch = originalText.match(/(?:location of fire panel|fire panel location)[\s:]*([^\n\r]+?)(?:\n|$|is panel|panel free)/i)
      if (firePanelMatch) {
        pdfExtractedData.firePanelLocation = firePanelMatch[1]?.trim() || null
        console.log('[EXTRACT] Found fire panel location:', pdfExtractedData.firePanelLocation)
      }

      // Fire Panel Faults - look for Yes/No or status
      const firePanelFaultsQuestion = parseYesNoQuestionBlock(
        originalText,
        /is panel free of faults\?/i
      )
      if (firePanelFaultsQuestion.answer === 'no') {
        pdfExtractedData.firePanelFaults = firePanelFaultsQuestion.comment || 'Fault present at time of inspection'
        console.log('[EXTRACT] Found fire panel faults (anchored NO):', pdfExtractedData.firePanelFaults)
      } else if (firePanelFaultsQuestion.answer === 'yes') {
        pdfExtractedData.firePanelFaults = firePanelFaultsQuestion.comment || 'No faults'
        console.log('[EXTRACT] Found fire panel faults (anchored YES):', pdfExtractedData.firePanelFaults)
      } else {
        const firePanelFaultsMatch = originalText.match(/(?:is panel free of faults|panel free of faults|panel faults)[\s:]*([^\n\r]+?)(?:\n|$|location of emergency)/i)
        if (firePanelFaultsMatch) {
          pdfExtractedData.firePanelFaults = firePanelFaultsMatch[1]?.trim() || null
          console.log('[EXTRACT] Found fire panel faults:', pdfExtractedData.firePanelFaults)
        }
      }

      // Emergency Lighting Switch - look for "Location of Emergency Lighting Test Switch (Photograph)"
      // Pattern: "Location of Emergency Lighting Test Switch (Photograph) Electrical cupboard by the rear fire doors"
      const strictSwitchLocation =
        extractEmergencyLightingSwitchLocation(cleanedAuditText)
        || extractEmergencyLightingSwitchLocation(originalText)
      if (strictSwitchLocation) {
        pdfExtractedData.emergencyLightingSwitch = strictSwitchLocation
        console.log('[EXTRACT] ✓ Found emergency lighting switch (strict row):', strictSwitchLocation)
      }

      let emergencyLightingMatch = null
      const emergencyLightingPatterns = [
        // Pattern 1: "Location of Emergency Lighting Test Switch (Photograph)" followed by location
        /location of emergency lighting test switch\s*\([^)]*photograph[^)]*\)[ \t]*([^\n\r]+?)(?:\n|$|emergency lighting switch photo|photo \d+)/i,
        // Pattern 2: "Location of Emergency Lighting Test Switch" followed by location (without photograph)
        /location of emergency lighting test switch[: \t]*([^\n\r]+?)(?:\n|$|emergency lighting switch photo|photo \d+)/i,
        // Pattern 3: Just "emergency lighting" with location on next line
        /emergency lighting test switch[: \t]*([^\n\r]+?)(?:\n|$|photo)/i,
        // Pattern 4: "Electrical cupboard" pattern (common location)
        /(?:emergency lighting|test switch)[\s\S]{0,200}(electrical cupboard[^\n\r]+?)(?:\n|$|photo|photograph)/i,
      ]
      
      for (const pattern of emergencyLightingPatterns) {
        if (pdfExtractedData.emergencyLightingSwitch && !isInvalidLocationValue(pdfExtractedData.emergencyLightingSwitch)) {
          break
        }
        emergencyLightingMatch = originalText.match(pattern)
        if (emergencyLightingMatch) {
          console.log('[EXTRACT] Emergency lighting pattern matched:', pattern.toString())
          let location = emergencyLightingMatch[1]?.trim() || null
          // Clean up common artifacts
          if (location) {
            // Remove "(Photograph)" or "Photograph" if it got captured
            location = location.replace(/\([^)]*photograph[^)]*\)/gi, '')
            location = location.replace(/photograph/gi, '')
            location = location.replace(/^[(\s]+/, '').replace(/[\s)]+$/, '').trim()
            // Reject if it's just punctuation or too short
            if (location.length > 3 && !/^[^\w]+$/.test(location) && !isInvalidLocationValue(location)) {
              pdfExtractedData.emergencyLightingSwitch = location
              console.log('[EXTRACT] ✓ Found emergency lighting switch:', pdfExtractedData.emergencyLightingSwitch)
              break
            } else {
              console.log('[EXTRACT] Emergency lighting match rejected (too short or invalid):', location)
            }
          }
        }
      }
      
      if (!emergencyLightingMatch || !pdfExtractedData.emergencyLightingSwitch) {
        console.log('[EXTRACT] ✗ No emergency lighting switch found')
      }

      // If regex captured the photo label or missed the location, use strict anchored extraction.
      if (
        !pdfExtractedData.emergencyLightingSwitch
        || isInvalidLocationValue(pdfExtractedData.emergencyLightingSwitch)
        || /switch\s+photo|photograph|^photo\b/i.test(pdfExtractedData.emergencyLightingSwitch)
      ) {
        const anchoredSwitchLocation = extractValueAfterAnchoredLabel(
          cleanedAuditText,
          /location\s+of\s+emergency\s+lighting\s+test\s+switch\s*\([^)]*photograph[^)]*\)/i,
          {
            maxLines: 6,
            disallowLinePatterns: [
              /^(yes|no|n\/a|na)$/i,
              /emergency\s+lighting\s+switch\s+photo/i,
              /^photo\b/i,
            ],
          }
        ) || extractValueAfterAnchoredLabel(
          cleanedAuditText,
          /location\s+of\s+emergency\s+lighting\s+test\s+switch/i,
          {
            maxLines: 6,
            disallowLinePatterns: [
              /^(yes|no|n\/a|na)$/i,
              /emergency\s+lighting\s+switch\s+photo/i,
              /^photo\b/i,
            ],
          }
        )

        if (anchoredSwitchLocation && !isInvalidLocationValue(anchoredSwitchLocation)) {
          pdfExtractedData.emergencyLightingSwitch = anchoredSwitchLocation
          console.log('[EXTRACT] ✓ Found emergency lighting switch (anchored):', anchoredSwitchLocation)
        }
      }

      // Number of floors: strict extraction from the matching General Site Information label.
      const extractedFloors =
        extractNumericAfterAnchoredLabel(
          generalSiteText,
          /number\s+of\s+floors\s*\(.*comments?\s*section\)?/i
        )
        || extractNumericAfterAnchoredLabel(generalSiteText, /number\s+of\s+floors?/i)
        || extractNumericAfterAnchoredLabel(generalSiteText, /number\s+of\s+floor/i)
        || extractNumericAfterLabel(cleanedAuditText, /number\s+of\s+floors?/i)
        || extractNumericAfterLabel(cleanedAuditText, /number\s+of\s+floor/i)
      if (extractedFloors) {
        pdfExtractedData.numberOfFloors = extractedFloors
        console.log('[EXTRACT] ✓ Found number of floors:', extractedFloors)
      } else {
        console.log('[EXTRACT] ✗ No number of floors found')
      }

      // Operating Hours - search via Google-first web search (not from PDF extraction)
      let operatingHoursFromWeb: string | null = null
      let squareFootageFromWeb: string | null = null
      try {
        const storeName = store?.store_name || ''
        const city = store?.city || ''
        const address = store?.address_line_1 || ''
        if (storeName) {
          const googleData = await getStoreDataFromGoogleSearch({ storeName, address, city })
          operatingHoursFromWeb = googleData.openingTimes
          squareFootageFromWeb = googleData.squareFootage
          if (!operatingHoursFromWeb) {
            operatingHoursFromWeb = await getOpeningHoursFromSearch({ storeName, address, city })
          }
          if (operatingHoursFromWeb) {
            console.log('[EXTRACT] ✓ Found opening hours from web search:', operatingHoursFromWeb)
          } else {
            console.log('[EXTRACT] Opening hours not found via web search, will need manual entry')
          }
        }
      } catch (webSearchError) {
        console.error('[EXTRACT] Web search error:', webSearchError)
      }

      pdfExtractedData.operatingHours = operatingHoursFromWeb

      // Conducted Date - look for date patterns near "conducted"
      const conductedDateMatch = originalText.match(/(?:conducted on|conducted at|assessment date)[\s:]*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i)
      if (conductedDateMatch) {
        pdfExtractedData.conductedDate = conductedDateMatch[1] || null
        console.log('[EXTRACT] Found conducted date:', pdfExtractedData.conductedDate)
      } else {
        // Try to find any date near "conducted"
        const conductedSection = originalText.match(/conducted[\s\S]{0,100}(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i)
        if (conductedSection) {
          pdfExtractedData.conductedDate = conductedSection[1] || null
          console.log('[EXTRACT] Found conducted date (alternative):', pdfExtractedData.conductedDate)
        }
      }

      const extractedStartTime = extractAssessmentStartTime(originalText)
      if (extractedStartTime) {
        pdfExtractedData.assessmentStartTime = extractedStartTime
        console.log('[EXTRACT] ✓ Found assessment start time:', extractedStartTime)
      }

      // Square footage: strict extraction from its own label only.
      const extractedSquareFootage =
        extractSquareFootageAfterAnchoredLabel(generalSiteText)
        || extractSquareFootageAfterAnchoredLabel(cleanedAuditText)
        || extractSquareFootageAfterLabel(cleanedAuditText)
      if (extractedSquareFootage) {
        pdfExtractedData.squareFootage = extractedSquareFootage
        pdfExtractedData.squareFootageSource = 'PDF'
        console.log('[EXTRACT] ✓ Found square footage:', extractedSquareFootage)
      } else if (squareFootageFromWeb) {
        pdfExtractedData.squareFootage = squareFootageFromWeb
        pdfExtractedData.squareFootageSource = 'WEB_SEARCH'
        console.log('[EXTRACT] ✓ Found square footage from web search:', squareFootageFromWeb)
      } else {
        console.log('[EXTRACT] ✗ No square footage found')
      }

      // Evidence-led FRA fields from exact audit questions.
      const fireExitRoutesQuestion = parseYesNoQuestionBlock(
        originalText,
        /fire exit routes clear and unobstructed\?/i
      )
      if (fireExitRoutesQuestion.comment) {
        pdfExtractedData.escapeRoutesEvidence = fireExitRoutesQuestion.comment
      }
      if (fireExitRoutesQuestion.answer === 'no') {
        console.log('[EXTRACT] ✓ Fire exit routes question answered NO')
      } else if (fireExitRoutesQuestion.answer === 'yes') {
        console.log('[EXTRACT] ✓ Fire exit routes question answered YES')
      }

      const combustibleStorageQuestion = parseYesNoQuestionBlock(
        originalText,
        /combustible materials are stored correctly\?/i
      )
      if (combustibleStorageQuestion.answer === 'no') {
        pdfExtractedData.combustibleStorageEscapeCompromise = 'Escape routes compromised'
      } else if (combustibleStorageQuestion.answer === 'yes') {
        pdfExtractedData.combustibleStorageEscapeCompromise = 'OK'
      }

      const inductionTrainingQuestion = parseAnchoredQuestionBlock(
        trainingText,
        /h\s*&\s*s\s+induction\s+training\s+onboarding\s+up\s+to\s+date\s+and\s+at\s+100%\s*\?/i,
        { maxLines: 16 }
      )
      const toolboxTrainingQuestion = parseAnchoredQuestionBlock(
        trainingText,
        /h\s*&\s*s\s+toolbox\s+refresher\s+training\s+completed\s+in\s+the\s+last\s+12\s+months(?:\s+and\s+records\s+available\s+for)?\s*\??/i,
        {
          maxLines: 18,
          skipLinePatterns: [
            /^manual handling$/i,
            /^housekeeping$/i,
            /^fire safety$/i,
            /^stepladders$/i,
          ],
        }
      )
      if (inductionTrainingQuestion.comment && toolboxTrainingQuestion.comment) {
        pdfExtractedData.fireSafetyTrainingNarrative =
          `${inductionTrainingQuestion.comment} ${toolboxTrainingQuestion.comment}`.trim()
      } else if (inductionTrainingQuestion.comment) {
        pdfExtractedData.fireSafetyTrainingNarrative = inductionTrainingQuestion.comment
      } else if (toolboxTrainingQuestion.comment) {
        pdfExtractedData.fireSafetyTrainingNarrative = toolboxTrainingQuestion.comment
      }

      // Fire doors and compartmentation: use the matching fire-door questions.
      const fireDoorsClosedQuestion = parseYesNoQuestionBlock(
        originalText,
        /fire doors closed and not held open\?/i
      )
      const fireDoorsConditionQuestion = parseYesNoQuestionBlock(
        originalText,
        /fire doors in a good condition\?/i
      )
      const intumescentQuestion = parseYesNoQuestionBlock(
        originalText,
        /are fire door intumescent strips in place and intact/i
      )
      const fireDoorNarrative =
        fireDoorsConditionQuestion.comment
        || intumescentQuestion.comment
        || fireDoorsClosedQuestion.comment
        || [toDisplayAnswer(fireDoorsConditionQuestion.answer), toDisplayAnswer(intumescentQuestion.answer), toDisplayAnswer(fireDoorsClosedQuestion.answer)].filter(Boolean).join(' / ')
      if (fireDoorNarrative) {
        pdfExtractedData.fireDoorsCondition = fireDoorNarrative
      }

      // Weekly fire tests: exact question mapping.
      const weeklyFireTestsQuestion = parseYesNoQuestionBlock(
        originalText,
        /weekly fire tests carried out and documented\?/i
      )
      if (weeklyFireTestsQuestion.comment) {
        pdfExtractedData.weeklyFireTests = weeklyFireTestsQuestion.comment
      } else {
        const weeklyAnswer = toDisplayAnswer(weeklyFireTestsQuestion.answer)
        if (weeklyAnswer) pdfExtractedData.weeklyFireTests = weeklyAnswer
      }

      // Monthly emergency lighting tests: exact question mapping.
      const monthlyEmergencyLightingQuestion = parseAnchoredQuestionBlock(
        fireSafetyText,
        /evidence\s+of\s+monthly\s+emergency\s+lighting\s+test\s+being\s+conducted\s*\?/i,
        { maxLines: 18 }
      )
      if (monthlyEmergencyLightingQuestion.comment) {
        pdfExtractedData.emergencyLightingMonthlyTest = monthlyEmergencyLightingQuestion.comment
      } else {
        const monthlyLightingAnswer = toDisplayAnswer(monthlyEmergencyLightingQuestion.answer)
        if (monthlyLightingAnswer) pdfExtractedData.emergencyLightingMonthlyTest = monthlyLightingAnswer
      }

      // Fire extinguisher service: exact question mapping.
      const fireExtinguisherServiceQuestion = parseYesNoQuestionBlock(
        originalText,
        /fire extinguisher service\?/i
      )
      if (fireExtinguisherServiceQuestion.comment) {
        pdfExtractedData.fireExtinguisherService = fireExtinguisherServiceQuestion.comment
      } else {
        const extinguisherAnswer = toDisplayAnswer(fireExtinguisherServiceQuestion.answer)
        if (extinguisherAnswer) pdfExtractedData.fireExtinguisherService = extinguisherAnswer
      }
      const extinguisherDateFromQuestion = extractDateFromText(fireExtinguisherServiceQuestion.comment || '')
      if (extinguisherDateFromQuestion) {
        pdfExtractedData.extinguisherServiceDate = extinguisherDateFromQuestion
      }

      pdfExtractedData.managementReviewStatement =
        extractExplicitManagementReviewStatement(cleanedAuditText)
      if (pdfExtractedData.managementReviewStatement) {
        pdfExtractedData.managementReviewStatementSource = 'PDF'
      } else {
        pdfExtractedData.managementReviewStatement =
          'This assessment has been informed by recent health and safety inspections and site observations.'
        pdfExtractedData.managementReviewStatementSource = 'DEFAULT'
      }

      // Number of fire exits: strict extraction from the General Site Information label.
      const extractedFireExits = extractNumericAfterLabel(originalText, /number of fire exits/i)
      if (extractedFireExits) {
        pdfExtractedData.numberOfFireExits = extractedFireExits
        console.log('[EXTRACT] ✓ Found number of fire exits:', extractedFireExits)
      }

      // HIGH PRIORITY: Staff numbers - multiple patterns for different formats
      // e.g. "Number of Staff employed at the site" 18, "Staff employed: 9"
      const totalStaffPatterns = [
        /(?:number of staff employed at the site|staff employed at the site)[\s:]*(\d+)/i,
        /(?:number of staff employed|staff employed)[\s:]*(\d+)/i,
        /(?:total staff|total employees)[\s:]*(\d+)/i,
        /(?:staff|employees)[\s:]+(\d+)(?!\s*(?:working|on site|at any))/i,
        /general site information[\s\S]{0,400}(?:staff employed|number of staff)[\s:]*(\d+)/i,
      ]
      for (const pattern of totalStaffPatterns) {
        const match = originalText.match(pattern)
        if (match) {
          pdfExtractedData.totalStaffEmployed = match[1]
          console.log('[EXTRACT] ✓ Found total staff employed:', pdfExtractedData.totalStaffEmployed)
          break
        }
      }

      // Maximum staff on site - "Maximum number of staff working on site at any one time" 8
      const maxStaffPatterns = [
        /(?:maximum number of staff working on site at any one time|maximum number of staff working at any one time)[\s:]*(\d+)/i,
        /(?:maximum number of staff working|maximum staff working|max staff working)[\s\S]{0,30}?(\d+)/i,
        /(?:maximum.*staff.*at any.*time)[\s:]*(\d+)/i,
        /(?:max staff|maximum staff)[\s:]*(\d+)/i,
        /(?:staff working at any one time)[\s:]*(\d+)/i,
        /general site information[\s\S]{0,500}(?:maximum.*staff|max.*staff)[\s\S]{0,30}?(\d+)/i,
      ]
      for (const pattern of maxStaffPatterns) {
        const match = originalText.match(pattern)
        if (match) {
          pdfExtractedData.maxStaffOnSite = match[1]
          console.log('[EXTRACT] ✓ Found max staff on site:', pdfExtractedData.maxStaffOnSite)
          break
        }
      }

      // HIGH PRIORITY: Young persons - "Number of Young persons (under the age of 18 yrs) employed at the site" 0
      const youngPersonsPatterns = [
        /(?:number of young persons?\s*\(under the age of 18[^)]*\)\s*employed[^\n\r]*)[\s:]*(\d+)/i,
        /(?:young persons?\s*\(under[^)]*\)[^\n\r]*employed[^\n\r]*)[\s:]*(\d+)/i,
        /(?:young persons employed|young persons)[\s:]*(\d+)/i,
        /(?:young person)[\s:]+(\d+)/i,
        /(?:number of young persons)[\s:]*(\d+)/i,
        /under the age of 18\s*yrs?[^\n\r]*employed[^\n\r]*[\s:]*(\d+)/i,
        /general site information[\s\S]{0,500}(?:young person)[\s:]+(\d+)/i,
      ]
      for (const pattern of youngPersonsPatterns) {
        const match = originalText.match(pattern)
        if (match) {
          pdfExtractedData.youngPersonsCount = match[1]
          console.log('[EXTRACT] ✓ Found young persons count:', pdfExtractedData.youngPersonsCount)
          break
        }
      }

      // Fire drill date: use exact question comment first, then fallback date patterns.
      const fireDrillQuestion = parseAnchoredQuestionBlock(
        fireSafetyText,
        /fire\s+drill\s+has\s+been\s+carried\s+out\s+in\s+the\s+past\s+6\s+months\s+and\s+records\s+available\s+on\s+site\s*\?/i,
        { maxLines: 20 }
      )
      const fireDrillText = fireDrillQuestion.windowText || fireDrillQuestion.comment || ''
      let fireDrillAnswer = fireDrillQuestion.answer
      if (!fireDrillAnswer) {
        const inlineAnswer =
          fireDrillText.match(/\?\s*(Yes|No|N\/A|NA)\b/i)?.[1]
          || fireDrillText.match(/marked\s+as\s+completed\s*\((Yes|No|N\/A|NA)\)/i)?.[1]
          || fireDrillText.match(/\((Yes|No|N\/A|NA)\)/i)?.[1]
          || null
        if (inlineAnswer) {
          const lower = inlineAnswer.toLowerCase()
          fireDrillAnswer =
            lower === 'yes' ? 'yes' :
            lower === 'no' ? 'no' :
            'na'
        }
      }
      const fireDrillDateFromQuestion = extractDateFromText(fireDrillText)
      if (fireDrillDateFromQuestion) {
        pdfExtractedData.fireDrillDate = fireDrillDateFromQuestion
      } else if (
        (
          fireDrillAnswer === 'yes'
          || /marked\s+as\s+completed\s*\(yes\)/i.test(fireDrillText)
        )
        && /no date|not been recorded|not recorded/i.test(fireDrillText)
      ) {
        pdfExtractedData.fireDrillDate =
          'The fire drill is marked as completed (Yes) on the weekly check sheet, but no date has been recorded.'
      }

      // Dedicated fallback tied strictly to the fire drill anchor block.
      if (!pdfExtractedData.fireDrillDate) {
        const anchoredFireDrill =
          extractFireDrillDateFromAnchorBlock(fireSafetyText)
        if (anchoredFireDrill.dateOrStatus) {
          pdfExtractedData.fireDrillDate = anchoredFireDrill.dateOrStatus
          console.log('[EXTRACT] ✓ Found fire drill date/status (anchored block):', anchoredFireDrill.dateOrStatus)
        }
      }

      if (!pdfExtractedData.fireDrillDate) {
        const anchoredFireDrillFromFull =
          extractFireDrillDateFromAnchorBlock(cleanedAuditText)
        if (anchoredFireDrillFromFull.dateOrStatus) {
          pdfExtractedData.fireDrillDate = anchoredFireDrillFromFull.dateOrStatus
          console.log('[EXTRACT] ✓ Found fire drill date/status (full anchored block):', anchoredFireDrillFromFull.dateOrStatus)
        }
      }
      if (pdfExtractedData.fireDrillDate) {
        console.log('[EXTRACT] ✓ Found fire drill date:', pdfExtractedData.fireDrillDate)
      }

      // PAT testing status: exact PAT question first.
      const patQuestion = parseYesNoQuestionBlock(originalText, /\bPAT\?/i)
      const patDateFromQuestion = extractDateFromText(patQuestion.comment || '')
      if (patQuestion.answer === 'yes') {
        pdfExtractedData.patTestingStatus = patDateFromQuestion
          ? `Satisfactory, last conducted ${patDateFromQuestion}`
          : (patQuestion.comment || 'Satisfactory')
      } else if (patQuestion.answer === 'no') {
        pdfExtractedData.patTestingStatus = patQuestion.comment || 'Unsatisfactory'
      }
      if (!pdfExtractedData.patTestingStatus) {
        const patYesMatch = originalText.match(/\bPAT\??[\s\S]{0,60}?(?:yes|satisfactory|passed|ok)/i)
          || originalText.match(/(?:pat|portable appliance|electrical.*test).*?(?:passed|satisfactory|up to date|completed|yes)/i)
          || originalText.match(/(?:fixed wiring|electrical installation).*?(?:satisfactory|passed|completed)/i)
          || originalText.match(/(?:pat testing|pat test)[\s\S]{0,30}?(?:yes|ok|satisfactory|passed)/i)
        const patDateMatch = originalText.match(/\bPAT\??[\s\S]{0,100}?last conducted[\s\S]{0,30}?(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i)
        if (patYesMatch) {
          pdfExtractedData.patTestingStatus = patDateMatch?.[1] ? `Satisfactory, last conducted ${patDateMatch[1]}` : 'Satisfactory'
        }
      }
      if (pdfExtractedData.patTestingStatus) {
        console.log('[EXTRACT] ✓ Found PAT testing status:', pdfExtractedData.patTestingStatus)
      }

      // Fixed wire date: exact "Fixed Electrical Wiring?" question first.
      const fixedWiringQuestion = parseYesNoQuestionBlock(
        originalText,
        /fixed electrical wiring\?/i
      )
      const fixedWiringDateFromQuestion = extractDateFromText(fixedWiringQuestion.comment || '')
      if (fixedWiringDateFromQuestion) {
        pdfExtractedData.fixedWireTestDate = fixedWiringDateFromQuestion
      }
      if (!pdfExtractedData.fixedWireTestDate) {
        const fixedWireDatePatterns = [
          /(?:fixed electrical wiring|fixed wire|fixed wiring|fixed wire installation)[\s\S]{0,100}?(?:last tested|inspected and tested|tested|last conducted|conducted)[\s\S]{0,50}?(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
          /(?:fixed electrical wiring|fixed wire|fixed wiring)[\s\S]{0,80}?(?:yes|satisfactory)[\s\S]{0,80}?last (?:tested|conducted)[\s\S]{0,30}?(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
          /(?:electrical installation|fixed wiring)[\s\S]{0,60}?(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
        ]
        for (const pattern of fixedWireDatePatterns) {
          const match = originalText.match(pattern)
          if (match) {
            pdfExtractedData.fixedWireTestDate = match[1]
            break
          }
        }
      }
      if (pdfExtractedData.fixedWireTestDate) {
        console.log('[EXTRACT] ✓ Found fixed wire test date:', pdfExtractedData.fixedWireTestDate)
      }

      // MEDIUM PRIORITY: Exit signage condition - more flexible patterns
      if (originalText.match(/(?:exit sign|signage|fire exit sign).*?(?:good|satisfactory|clear|visible|yes|ok)/i)
        || originalText.match(/(?:signage).*?(?:installed|visible|clearly|in place)/i)
        || originalText.match(/(?:fire exit.*sign|emergency.*sign).*?(?:good|satisfactory|visible|yes)/i)
        || originalText.match(/(?:signs.*visible|signage.*adequate|signage.*good)/i)) {
        pdfExtractedData.exitSignageCondition = 'Good condition'
        console.log('[EXTRACT] ✓ Found exit signage condition: Good')
      }

      // MEDIUM PRIORITY: Ceiling tiles / compartmentation
      const extractCompartmentationStatusFromText = (text: string): string | null => {
        const sentences = text
          .replace(/\r/g, '\n')
          .split(/[\n.?!]+/)
          .map((s) => s.trim())
          .filter(Boolean)

        // Prefer explicit defect statements over generic "no issues" wording from question text.
        const issueSentence = sentences.find((sentence) => {
          const lower = sentence.toLowerCase()
          const hasIssueSignal = /missing ceiling tiles?|ceiling tiles? missing|breach(?:es)?|gaps? from area to area|compartmentation[\s\S]{0,40}?(?:damage|breach|issue)/i.test(sentence)
          if (!hasIssueSignal) return false
          if (lower.includes('e.g. missing') || lower.includes('eg missing')) return false
          if (/\bno missing\b|\bno breaches\b|\bno evidence of damage\b|\bno evident breaches\b/.test(lower)) return false
          return true
        })

        if (issueSentence) {
          return issueSentence.replace(/\s+/g, ' ').replace(/[.]+$/, '')
        }

        const noBreachDetected = /(?:ceiling tile|compartmentation|fire stopping|structure|structural)[\s\S]{0,120}?(?:no missing|no breaches|no evidence of damage|intact|satisfactory|good condition|no evident breaches)/i.test(text)
        return noBreachDetected ? 'No breaches identified' : null
      }

      const anchoredCompartmentationNarrative =
        extractCompartmentationNarrativeFromAnchor(cleanedAuditText)
        || extractCompartmentationNarrativeFromAnchor(originalText)

      if (anchoredCompartmentationNarrative) {
        pdfExtractedData.compartmentationStatus = anchoredCompartmentationNarrative
        console.log('[EXTRACT] ✓ Found compartmentation status (anchored narrative):', anchoredCompartmentationNarrative)
      } else {
        const compartmentationQuestion = parseAnchoredQuestionBlock(
          cleanedAuditText,
          /structure\s+found\s+to\s+be\s+in\s+a\s+good\s+condition[\s\S]{0,80}?missing\s+ceiling\s+tiles?\s*\/\s*gaps?\s+from\s+area\s+to\s+area\?/i,
          { maxLines: 10 }
        )
        if (compartmentationQuestion.comment && compartmentationQuestion.comment.length > 20) {
          pdfExtractedData.compartmentationStatus = compartmentationQuestion.comment
          console.log('[EXTRACT] ✓ Found compartmentation status (anchored):', compartmentationQuestion.comment)
        } else {
          const compartmentationStatusFromText = extractCompartmentationStatusFromText(originalText)
          if (compartmentationStatusFromText) {
            pdfExtractedData.compartmentationStatus = compartmentationStatusFromText
            console.log('[EXTRACT] ✓ Found compartmentation status:', compartmentationStatusFromText)
          }
        }
      }

      // MEDIUM PRIORITY: Fire extinguisher service date - more patterns
      const extinguisherServicePatterns = [
        /(?:extinguisher.*service|fire extinguisher.*service|last service.*extinguisher)[\s\S]{0,50}?(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
        /(?:extinguisher)[\s\S]{0,50}?serviced[\s\S]{0,30}?(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
        /(?:extinguisher.*service|fire extinguisher.*service)[\s\S]{0,50}?(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
        /(?:fire extinguisher service)[\s\S]{0,100}?(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
      ]
      for (const pattern of extinguisherServicePatterns) {
        const match = originalText.match(pattern)
        if (match) {
          pdfExtractedData.extinguisherServiceDate = match[1]
          console.log('[EXTRACT] ✓ Found extinguisher service date:', pdfExtractedData.extinguisherServiceDate)
          break
        }
      }

      // MEDIUM PRIORITY: Call point accessibility
      if (originalText.match(/(?:call point|manual call point).*?(?:accessible|unobstructed|clear|yes)/i)
        || originalText.match(/(?:call points clear|call points.*accessible)/i)
        || originalText.match(/(?:mcp|manual call).*?(?:clear|accessible|unobstructed)/i)) {
        pdfExtractedData.callPointAccessibility = 'Accessible and unobstructed'
        console.log('[EXTRACT] ✓ Found call point accessibility: Accessible')
      }
      
      console.log('[EXTRACT] Final extracted data:', pdfExtractedData)
    }

    // FRA uses ONLY the uploaded PDF text - no database audit fallback
    // All data comes from PDF text extraction
    const sourceQuestions: Record<string, string> = {
      storeManager: 'Signature of Person in Charge of store at time of assessment.',
      conductedDate: 'Conducted on',
      assessmentStartTime: 'Conducted on (time portion, if present)',
      numberOfFloors: 'Number of floors (list ie Basement; Ground; 1st, 2nd in comments section)',
      squareFootage: 'Square Footage or Square Meterage of site',
      operatingHours: 'Web search from store details (not from H&S audit PDF)',
      firePanelLocation: 'Location of Fire Panel',
      firePanelFaults: 'Is panel free of faults',
      emergencyLightingSwitch: 'Location of Emergency Lighting Test Switch (Photograph)',
      escapeRoutesEvidence: 'Fire exit routes clear and unobstructed?',
      combustibleStorageEscapeCompromise: 'Combustible materials are stored correctly?',
      fireSafetyTrainingNarrative: 'H&S induction training onboarding up to date and at 100%? + H&S toolbox refresher training completed in the last 12 months...',
      fireDoorsCondition: 'Fire doors in a good condition? / Are fire door intumescent strips in place and intact? / Fire doors closed and not held open?',
      weeklyFireTests: 'Weekly Fire Tests carried out and documented?',
      emergencyLightingMonthlyTest: 'Evidence of Monthly Emergency Lighting test being conducted?',
      fireExtinguisherService: 'Fire Extinguisher Service?',
      managementReviewStatement: 'Management review statement / explicit sentence (e.g., "This assessment has been informed by...")',
      numberOfFireExits: 'Number of Fire Exits',
      totalStaffEmployed: 'Number of Staff employed at the site',
      maxStaffOnSite: 'Maximum number of staff working on site at any one time',
      youngPersonsCount: 'Number of Young persons (under the age of 18 yrs) employed at the site',
      fireDrillDate: 'Fire drill has been carried out in the past 6 months and records available on site?',
      patTestingStatus: 'PAT?',
      fixedWireTestDate: 'Fixed Electrical Wiring?',
      exitSignageCondition: 'Fire exit signage / exit sign condition statements in the audit PDF',
      compartmentationStatus: 'Structure found to be in a good condition... (missing ceiling tiles / gaps from area to area?)',
      extinguisherServiceDate: 'Fire Extinguisher Service?',
      callPointAccessibility: 'Are all call points clear and easily accessible',
    }

    const extractedData = {
      storeManager: pdfExtractedData.storeManager || null,
      assessmentStartTime: pdfExtractedData.assessmentStartTime || null,
      firePanelLocation: pdfExtractedData.firePanelLocation || null,
      firePanelFaults: pdfExtractedData.firePanelFaults || null,
      emergencyLightingSwitch: pdfExtractedData.emergencyLightingSwitch || null,
      numberOfFloors: pdfExtractedData.numberOfFloors || null,
      operatingHours: pdfExtractedData.operatingHours || null,
      conductedDate: pdfExtractedData.conductedDate || null,
      squareFootage: pdfExtractedData.squareFootage || null,
      escapeRoutesEvidence: pdfExtractedData.escapeRoutesEvidence || null,
      combustibleStorageEscapeCompromise: pdfExtractedData.combustibleStorageEscapeCompromise || null,
      fireSafetyTrainingNarrative: pdfExtractedData.fireSafetyTrainingNarrative || null,
      fireDoorsCondition: pdfExtractedData.fireDoorsCondition || null,
      weeklyFireTests: pdfExtractedData.weeklyFireTests || null,
      emergencyLightingMonthlyTest: pdfExtractedData.emergencyLightingMonthlyTest || null,
      fireExtinguisherService: pdfExtractedData.fireExtinguisherService || null,
      managementReviewStatement: pdfExtractedData.managementReviewStatement || null,
      // High priority fields
      numberOfFireExits: pdfExtractedData.numberOfFireExits || null,
      totalStaffEmployed: pdfExtractedData.totalStaffEmployed || null,
      maxStaffOnSite: pdfExtractedData.maxStaffOnSite || null,
      youngPersonsCount: pdfExtractedData.youngPersonsCount || null,
      fireDrillDate: pdfExtractedData.fireDrillDate || null,
      patTestingStatus: pdfExtractedData.patTestingStatus || null,
      fixedWireTestDate: pdfExtractedData.fixedWireTestDate || null,
      // Medium priority fields
      exitSignageCondition: pdfExtractedData.exitSignageCondition || null,
      compartmentationStatus: pdfExtractedData.compartmentationStatus || null,
      extinguisherServiceDate: pdfExtractedData.extinguisherServiceDate || null,
      callPointAccessibility: pdfExtractedData.callPointAccessibility || null,
      sources: {
        storeManager: pdfExtractedData.storeManager ? 'PDF' : 'NOT_FOUND',
        assessmentStartTime: pdfExtractedData.assessmentStartTime ? 'PDF' : 'NOT_FOUND',
        firePanelLocation: pdfExtractedData.firePanelLocation ? 'PDF' : 'NOT_FOUND',
        firePanelFaults: pdfExtractedData.firePanelFaults ? 'PDF' : 'NOT_FOUND',
        emergencyLightingSwitch: pdfExtractedData.emergencyLightingSwitch ? 'PDF' : 'NOT_FOUND',
        numberOfFloors: pdfExtractedData.numberOfFloors ? 'PDF' : 'NOT_FOUND',
        operatingHours: pdfExtractedData.operatingHours ? 'PDF' : 'NOT_FOUND',
        conductedDate: pdfExtractedData.conductedDate ? 'PDF' : 'NOT_FOUND',
        squareFootage:
          (pdfExtractedData.squareFootageSource as string)
          || (pdfExtractedData.squareFootage ? 'PDF' : 'NOT_FOUND'),
        escapeRoutesEvidence: pdfExtractedData.escapeRoutesEvidence ? 'PDF' : 'NOT_FOUND',
        combustibleStorageEscapeCompromise: pdfExtractedData.combustibleStorageEscapeCompromise ? 'PDF' : 'NOT_FOUND',
        fireSafetyTrainingNarrative: pdfExtractedData.fireSafetyTrainingNarrative ? 'PDF' : 'NOT_FOUND',
        fireDoorsCondition: pdfExtractedData.fireDoorsCondition ? 'PDF' : 'NOT_FOUND',
        weeklyFireTests: pdfExtractedData.weeklyFireTests ? 'PDF' : 'NOT_FOUND',
        emergencyLightingMonthlyTest: pdfExtractedData.emergencyLightingMonthlyTest ? 'PDF' : 'NOT_FOUND',
        fireExtinguisherService: pdfExtractedData.fireExtinguisherService ? 'PDF' : 'NOT_FOUND',
        managementReviewStatement:
          (pdfExtractedData.managementReviewStatementSource as string)
          || (pdfExtractedData.managementReviewStatement ? 'PDF' : 'NOT_FOUND'),
        // High priority fields
        numberOfFireExits: pdfExtractedData.numberOfFireExits ? 'PDF' : 'NOT_FOUND',
        totalStaffEmployed: pdfExtractedData.totalStaffEmployed ? 'PDF' : 'NOT_FOUND',
        maxStaffOnSite: pdfExtractedData.maxStaffOnSite ? 'PDF' : 'NOT_FOUND',
        youngPersonsCount: pdfExtractedData.youngPersonsCount ? 'PDF' : 'NOT_FOUND',
        fireDrillDate: pdfExtractedData.fireDrillDate ? 'PDF' : 'NOT_FOUND',
        patTestingStatus: pdfExtractedData.patTestingStatus ? 'PDF' : 'NOT_FOUND',
        fixedWireTestDate: pdfExtractedData.fixedWireTestDate ? 'PDF' : 'NOT_FOUND',
        // Medium priority fields
        exitSignageCondition: pdfExtractedData.exitSignageCondition ? 'PDF' : 'NOT_FOUND',
        compartmentationStatus: pdfExtractedData.compartmentationStatus ? 'PDF' : 'NOT_FOUND',
        extinguisherServiceDate: pdfExtractedData.extinguisherServiceDate ? 'PDF' : 'NOT_FOUND',
        callPointAccessibility: pdfExtractedData.callPointAccessibility ? 'PDF' : 'NOT_FOUND',
      },
      sourceQuestions,
      hasPdfText: !!pdfText,
      hasDatabaseAudit: false, // FRA doesn't use database audits
      pdfTextLength: pdfText?.length || 0,
      // Debug info
      pdfExtractedCount: Object.keys(pdfExtractedData).filter(k => pdfExtractedData[k] !== null).length,
      dbExtractedCount: 0, // Not used for FRA
    }
    
    console.log('[EXTRACT] Summary:', {
      pdfExtracted: extractedData.pdfExtractedCount,
      dbExtracted: extractedData.dbExtractedCount,
      totalFields: 8,
    })

    // Include raw PDF text for debugging (first 5000 chars)
    const responseData = {
      ...extractedData,
      rawPdfText: pdfText ? pdfText.substring(0, 5000) + (pdfText.length > 5000 ? '...' : '') : null,
    }

    console.log('[EXTRACT] Returning response with:', {
      hasPdfText: responseData.hasPdfText,
      hasDatabaseAudit: responseData.hasDatabaseAudit,
      pdfTextLength: responseData.pdfTextLength,
      fieldCount: Object.keys(extractedData).filter(k => !k.startsWith('_') && k !== 'sources' && k !== 'sourceQuestions' && k !== 'hasPdfText' && k !== 'hasDatabaseAudit' && k !== 'pdfTextLength' && k !== 'rawPdfText' && k !== 'pdfExtractedCount' && k !== 'dbExtractedCount').length,
      extractedFields: Object.keys(extractedData).filter(k => (extractedData as Record<string, unknown>)[k] !== null && !k.startsWith('_') && k !== 'sources' && k !== 'sourceQuestions' && k !== 'hasPdfText' && k !== 'hasDatabaseAudit' && k !== 'pdfTextLength' && k !== 'rawPdfText' && k !== 'pdfExtractedCount' && k !== 'dbExtractedCount')
    })

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error('Error extracting FRA data:', error)
    return NextResponse.json(
      { error: 'Failed to extract FRA data', details: error.message },
      { status: 500 }
    )
  }
}
