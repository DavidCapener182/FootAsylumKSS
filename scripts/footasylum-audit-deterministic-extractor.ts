export type YesNoNA = boolean | 'N/A' | null

export type ExtractedAudit = {
  number_of_floors: number | null
  square_footage_floor_area: string | null
  monthly_emergency_lighting_tests: {
    answer: YesNoNA
    comment: string | null
  }
  fire_drill: {
    completed: YesNoNA
    date: string | null
    comment: string | null
  }
  fire_safety_training: {
    induction_comment: string | null
    toolbox_comment: string | null
    combined_for_ui: string | null
  }
  management_review_statement: string | null
}

type SectionDef = { id: string; title: string }

type AnchoredQuestionResult = {
  found: boolean
  answer: YesNoNA
  comment: string | null
  windowText: string
}

const SECTION_DEFS: SectionDef[] = [
  { id: 'general_site_information', title: 'General Site Information' },
  { id: 'statutory_testing', title: 'Statutory Testing' },
  { id: 'fire_safety', title: 'Fire Safety' },
  { id: 'store_compliance', title: 'Store Compliance' },
  { id: 'coshh', title: 'COSHH' },
  { id: 'training', title: 'Training' },
]

const GENERAL_SITE_LABEL_HINTS: RegExp[] = [
  /^number of floors\b/i,
  /^square footage\b/i,
  /^square meterage\b/i,
  /^number of fire exits\b/i,
  /^number of staff\b/i,
  /^maximum number of staff\b/i,
  /^number of young persons\b/i,
  /^any know(?:n)? enforcement action\b/i,
]

const KNOWN_QUESTION_HINTS: RegExp[] = [
  /evidence of monthly emergency lighting test being conducted\?/i,
  /fire drill has been carried out in the past 6 months and records available on site\?/i,
  /h\s*&\s*s induction training onboarding up to date and at 100%\?/i,
  /h\s*&\s*s toolbox refresher training completed in the last 12 months/i,
  /management review statement/i,
  /number of floors/i,
  /square footage or square meterage of site/i,
]

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

const ANCHORS = {
  floors: /number\s+of\s+floors/i,
  squareFootage: /square\s+footage\s+or\s+square\s+meterage\s+of\s+site/i,
  monthlyEmergencyLighting: /evidence\s+of\s+monthly\s+emergency\s+lighting\s+test\s+being\s+conducted\?/i,
  fireDrill: /fire\s+drill\s+has\s+been\s+carried\s+out\s+in\s+the\s+past\s+6\s+months\s+and\s+records\s+available\s+on\s+site\?/i,
  inductionTraining: /h\s*&\s*s\s+induction\s+training\s+onboarding\s+up\s+to\s+date\s+and\s+at\s+100%\?/i,
  toolboxTraining: /h\s*&\s*s\s+toolbox\s+refresher\s+training\s+completed\s+in\s+the\s+last\s+12\s+months(?:\s+and\s+records\s+available\s+for)?/i,
  managementReview: /management\s+review\s+statement/i,
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function toLines(value: string): string[] {
  return value.replace(/\r\n?/g, '\n').split('\n')
}

function isPhotoMarkerLine(line: string): boolean {
  return /^\s*photo\s+\d+(?:\s+photo\s+\d+)*\s*$/i.test(line)
}

function isSectionHeading(line: string): boolean {
  const normalized = normalizeWhitespace(line)
  if (!normalized) return false
  return SECTION_DEFS.some((def) => new RegExp(`^${escapeRegex(def.title)}$`, 'i').test(normalized))
}

function isGeneralSiteLabel(line: string): boolean {
  const normalized = normalizeWhitespace(line)
  return GENERAL_SITE_LABEL_HINTS.some((re) => re.test(normalized))
}

function isLikelyQuestionLabel(line: string): boolean {
  const normalized = normalizeWhitespace(line)
  if (!normalized) return false
  if (KNOWN_QUESTION_HINTS.some((re) => re.test(normalized))) return true
  if (/\?$/.test(normalized) && normalized.length > 12) return true
  if (/^(location of|evidence of|is panel|are all|number of)\b/i.test(normalized)) return true
  return false
}

function parseAnswerToken(token: string): YesNoNA {
  const lower = normalizeWhitespace(token).toLowerCase()
  if (lower === 'yes') return true
  if (lower === 'no') return false
  if (lower === 'n/a' || lower === 'na' || lower === 'not applicable') return 'N/A'
  return null
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cleanInput(auditText: string): string {
  let cleaned = auditText.replace(/\r\n?/g, '\n').replace(/\u00A0/g, ' ')

  cleaned = cleaned.replace(/disclaimer[\s\S]*?(?=general site information)/i, '')
  cleaned = cleaned.replace(/media summary[\s\S]*$/i, '')

  cleaned = toLines(cleaned)
    .filter((line) => !isPhotoMarkerLine(line))
    .join('\n')

  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}

function buildSections(cleanedText: string): Record<string, string> {
  const normalizedText = cleanedText.replace(/\r\n?/g, '\n')
  const lines = normalizedText.split('\n')
  const lineStartOffsets: number[] = []
  let cursor = 0
  for (const line of lines) {
    lineStartOffsets.push(cursor)
    cursor += line.length + 1
  }

  const findHeadingOffset = (title: string): number | null => {
    const normalizedTitle = normalizeWhitespace(title).toLowerCase()

    let fallbackOffset: number | null = null
    for (let i = 0; i < lines.length; i += 1) {
      const current = normalizeWhitespace(lines[i]).toLowerCase()
      if (current !== normalizedTitle) continue

      if (fallbackOffset === null) {
        fallbackOffset = lineStartOffsets[i]
      }

      const prev = i > 0 ? normalizeWhitespace(lines[i - 1]) : ''
      if (i === 0 || prev === '') {
        return lineStartOffsets[i]
      }
    }

    return fallbackOffset
  }

  const hits: Array<{ id: string; index: number }> = []

  for (const def of SECTION_DEFS) {
    const index = findHeadingOffset(def.title)
    if (typeof index === 'number' && index >= 0) {
      hits.push({ id: def.id, index })
    }
  }

  hits.sort((a, b) => a.index - b.index)

  const sections: Record<string, string> = { full: normalizedText }
  for (let i = 0; i < hits.length; i += 1) {
    const current = hits[i]
    const next = hits[i + 1]
    const start = current.index
    const end = next ? next.index : normalizedText.length
    sections[current.id] = normalizedText.slice(start, end).trim()
  }

  return sections
}

function findAnchorIndex(sectionText: string, anchorRegex: RegExp): number {
  const safeRegex = new RegExp(anchorRegex.source, anchorRegex.flags.replace(/g/g, ''))
  const match = safeRegex.exec(sectionText)
  if (!match || typeof match.index !== 'number') return -1
  return sectionText.slice(0, match.index).split(/\r\n?|\n/).length - 1
}

function cleanComment(raw: string): string | null {
  if (!raw) return null
  const cleaned = normalizeWhitespace(
    raw
      .replace(/\bphoto\s+\d+(?:\s+photo\s+\d+)*\b/gi, ' ')
      .replace(/^[\-:–\s]+/, '')
  )
  return cleaned || null
}

function parseAnchoredQuestion(
  sectionText: string,
  anchorRegex: RegExp,
  options?: {
    maxLines?: number
    skipInitialPatterns?: RegExp[]
  }
): AnchoredQuestionResult {
  const lines = toLines(sectionText)
  const anchorIndex = findAnchorIndex(sectionText, anchorRegex)

  if (anchorIndex < 0) {
    return { found: false, answer: null, comment: null, windowText: '' }
  }

  const maxLines = options?.maxLines ?? 20
  let answer: YesNoNA = null
  const commentParts: string[] = []
  const windowParts: string[] = []

  const anchorLine = normalizeWhitespace(lines[anchorIndex] || '')
  windowParts.push(anchorLine)

  let anchorLineRemainder = normalizeWhitespace(anchorLine.replace(new RegExp(anchorRegex.source, anchorRegex.flags.replace(/g/g, '')), ''))
    .replace(/^[:\-–\s]+/, '')

  if (/^and records available for$/i.test(anchorLineRemainder)) {
    anchorLineRemainder = ''
  }

  if (anchorLineRemainder) {
    const standalone = anchorLineRemainder.match(/^(yes|no|n\/a|na|not applicable)\b(?:\s*[-:]\s*(.*))?$/i)
    if (standalone) {
      answer = parseAnswerToken(standalone[1])
      if (standalone[2]) {
        commentParts.push(standalone[2])
      }
    } else {
      commentParts.push(anchorLineRemainder)
    }
  }

  for (let i = anchorIndex + 1; i < lines.length && i <= anchorIndex + maxLines; i += 1) {
    const rawLine = lines[i]
    const line = normalizeWhitespace(rawLine)

    if (!line) {
      continue
    }

    if (options?.skipInitialPatterns?.some((re) => re.test(line))) {
      windowParts.push(line)
      continue
    }

    if (isPhotoMarkerLine(line)) break
    if (isSectionHeading(line)) break
    if (i > anchorIndex + 1 && isLikelyQuestionLabel(line)) break

    const standaloneAnswer = line.match(/^(yes|no|n\/a|na|not applicable)$/i)
    if (standaloneAnswer) {
      if (answer === null) answer = parseAnswerToken(standaloneAnswer[1])
      windowParts.push(line)
      break
    }

    const leadingAnswer = line.match(/^(yes|no|n\/a|na|not applicable)\b(?:\s*[-:]\s*(.*))?$/i)
    if (leadingAnswer) {
      if (answer === null) answer = parseAnswerToken(leadingAnswer[1])
      if (leadingAnswer[2]) {
        commentParts.push(leadingAnswer[2])
      }
      windowParts.push(line)
      break
    }

    commentParts.push(line)
    windowParts.push(line)
  }

  return {
    found: true,
    answer,
    comment: cleanComment(commentParts.join(' ')),
    windowText: normalizeWhitespace(windowParts.join(' ')),
  }
}

function extractNumberOfFloors(generalSiteSection: string): number | null {
  const sameLineExact = generalSiteSection.match(
    /number of floors\s*\(.*comments\s*section\)\s*[:\-–]?\s*(\d+)\b/i
  )
  if (sameLineExact) {
    const value = Number.parseInt(sameLineExact[1], 10)
    return Number.isFinite(value) ? value : null
  }

  const sameLineGeneric = generalSiteSection.match(/number of floors[^\n\r]*?[:\-–]\s*(\d+)\b/i)
  if (sameLineGeneric) {
    const value = Number.parseInt(sameLineGeneric[1], 10)
    return Number.isFinite(value) ? value : null
  }

  const lines = toLines(generalSiteSection)
  const anchorIndex = findAnchorIndex(generalSiteSection, ANCHORS.floors)
  if (anchorIndex < 0) return null

  for (let i = anchorIndex + 1; i < lines.length && i <= anchorIndex + 6; i += 1) {
    const line = normalizeWhitespace(lines[i])
    if (!line) continue
    if (isPhotoMarkerLine(line)) continue
    if (isGeneralSiteLabel(line)) break

    const numMatch = line.match(/\b(\d+)\b/)
    if (numMatch) {
      const value = Number.parseInt(numMatch[1], 10)
      return Number.isFinite(value) ? value : null
    }
  }

  return null
}

function extractSquareFootage(generalSiteSection: string): string | null {
  const sameLine = generalSiteSection.match(/square footage or square meterage of site[^\n\r]*/i)?.[0] || null

  if (sameLine) {
    const candidate = normalizeWhitespace(
      sameLine
        .replace(/square footage or square meterage of site/i, '')
        .replace(/^[:\-–\s]+/, '')
    )

    if (candidate && /\d/.test(candidate) && !isGeneralSiteLabel(candidate)) {
      return candidate
    }
  }

  const lines = toLines(generalSiteSection)
  const anchorIndex = findAnchorIndex(generalSiteSection, ANCHORS.squareFootage)
  if (anchorIndex < 0) return null

  for (let i = anchorIndex + 1; i < lines.length; i += 1) {
    const line = normalizeWhitespace(lines[i])
    if (!line) continue
    if (isPhotoMarkerLine(line)) continue
    if (isGeneralSiteLabel(line)) break

    if (/\d/.test(line)) {
      return line.replace(/^[:\-–\s]+/, '') || null
    }
  }

  return null
}

function normalizeUkDate(rawDate: string): string | null {
  const raw = normalizeWhitespace(rawDate).replace(/[.,]$/, '')
  if (!raw) return null

  const numericMatch = raw.match(/^([0-3]?\d)[\/-]([0-1]?\d)[\/-](\d{2}|\d{4})$/)
  if (numericMatch) {
    const day = Number.parseInt(numericMatch[1], 10)
    const month = Number.parseInt(numericMatch[2], 10)
    const yearPart = numericMatch[3]
    const year = yearPart.length === 2 ? 2000 + Number.parseInt(yearPart, 10) : Number.parseInt(yearPart, 10)

    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null
    if (month < 1 || month > 12 || day < 1 || day > 31) return null

    const testDate = new Date(year, month - 1, day)
    if (
      testDate.getFullYear() !== year
      || testDate.getMonth() !== month - 1
      || testDate.getDate() !== day
    ) {
      return null
    }

    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
  }

  const textMatch = raw.match(
    /^([0-3]?\d)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})$/i
  )

  if (textMatch) {
    const day = Number.parseInt(textMatch[1], 10)
    const month = MONTH_MAP[textMatch[2].toLowerCase()]
    const year = Number.parseInt(textMatch[3], 10)

    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null

    const testDate = new Date(year, month - 1, day)
    if (
      testDate.getFullYear() !== year
      || testDate.getMonth() !== month - 1
      || testDate.getDate() !== day
    ) {
      return null
    }

    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
  }

  return null
}

function extractUkDateFromText(text: string): string | null {
  const numeric = text.match(/\b([0-3]?\d[\/-][0-1]?\d[\/-](?:\d{2}|\d{4}))\b/)
  if (numeric) {
    const normalized = normalizeUkDate(numeric[1])
    if (normalized) return normalized
  }

  const textual = text.match(
    /\b([0-3]?\d\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4})\b/i
  )
  if (textual) {
    const normalized = normalizeUkDate(textual[1])
    if (normalized) return normalized
  }

  return null
}

function extractManagementReviewStatement(cleanedText: string): string | null {
  const lines = toLines(cleanedText)
  const anchorIndex = findAnchorIndex(cleanedText, ANCHORS.managementReview)

  if (anchorIndex >= 0) {
    const line = normalizeWhitespace(lines[anchorIndex])
    const trailing = normalizeWhitespace(
      line.replace(/management review statement\s*[:\-–]?/i, '')
    )
      .replace(/^[:\-–\s]+/, '')

    if (trailing) return trailing

    const comments: string[] = []
    for (let i = anchorIndex + 1; i < lines.length && i <= anchorIndex + 6; i += 1) {
      const next = normalizeWhitespace(lines[i])
      if (!next) continue
      if (isPhotoMarkerLine(next) || isSectionHeading(next) || isLikelyQuestionLabel(next)) break
      if (/^(yes|no|n\/a|na|not applicable)$/i.test(next)) break
      comments.push(next)
    }

    const comment = cleanComment(comments.join(' '))
    if (comment) return comment
  }

  const explicitSentencePatterns: RegExp[] = [
    /this assessment has been informed by[^.!?\n]*(?:[.!?])/i,
    /this assessment has been informed by[^\n]*/i,
    /management has reviewed[^.!?\n]*(?:[.!?])/i,
    /reviewed by management[^.!?\n]*(?:[.!?])/i,
  ]

  for (const pattern of explicitSentencePatterns) {
    const match = cleanedText.match(pattern)
    if (match && match[0]) {
      const sentence = cleanComment(match[0])
      if (sentence) return sentence
    }
  }

  return null
}

function selectSectionWithFallback(
  sections: Record<string, string>,
  primary: string,
  anchorRegex: RegExp
): string {
  const primarySection = sections[primary]
  if (primarySection) {
    if (findAnchorIndex(primarySection, anchorRegex) >= 0) {
      return primarySection
    }
  }
  return sections.full
}

export function extractAuditFields(auditText: string): ExtractedAudit {
  const cleanedText = cleanInput(auditText)
  const sections = buildSections(cleanedText)

  const generalSiteSection = sections.general_site_information || sections.full

  const monthlySection = selectSectionWithFallback(
    sections,
    'fire_safety',
    ANCHORS.monthlyEmergencyLighting
  )

  const fireDrillSection = selectSectionWithFallback(
    sections,
    'fire_safety',
    ANCHORS.fireDrill
  )

  const trainingSection = sections.training || sections.full

  const monthly = parseAnchoredQuestion(monthlySection, ANCHORS.monthlyEmergencyLighting, { maxLines: 16 })
  const fireDrill = parseAnchoredQuestion(fireDrillSection, ANCHORS.fireDrill, { maxLines: 20 })

  let fireDrillDate: string | null = null
  if (!/(no\s+date\s+recorded|date\s+not\s+recorded|not\s+recorded)/i.test(fireDrill.windowText)) {
    fireDrillDate = extractUkDateFromText(fireDrill.windowText)
  }

  const induction = parseAnchoredQuestion(trainingSection, ANCHORS.inductionTraining, { maxLines: 16 })
  const toolbox = parseAnchoredQuestion(trainingSection, ANCHORS.toolboxTraining, {
    maxLines: 18,
    skipInitialPatterns: [
      /^manual handling$/i,
      /^housekeeping$/i,
      /^fire safety$/i,
      /^stepladders$/i,
    ],
  })

  const inductionComment = induction.comment
  const toolboxComment = toolbox.comment

  let combinedForUi: string | null = null
  if (inductionComment && toolboxComment) {
    combinedForUi = `${inductionComment} ${toolboxComment}`
  } else if (inductionComment) {
    combinedForUi = inductionComment
  } else if (toolboxComment) {
    combinedForUi = toolboxComment
  }

  return {
    number_of_floors: extractNumberOfFloors(generalSiteSection),
    square_footage_floor_area: extractSquareFootage(generalSiteSection),
    monthly_emergency_lighting_tests: {
      answer: monthly.answer,
      comment: monthly.comment,
    },
    fire_drill: {
      completed: fireDrill.answer,
      date: fireDrillDate,
      comment: fireDrill.comment,
    },
    fire_safety_training: {
      induction_comment: inductionComment,
      toolbox_comment: toolboxComment,
      combined_for_ui: combinedForUi,
    },
    management_review_statement: extractManagementReviewStatement(cleanedText),
  }
}

const sampleSnippet = `
Disclaimer
This disclaimer text must be ignored.
General Site Information
Number of floors (list ie Basement; Ground; 1st, 2nd in comments section)
2
Square Footage or Square Meterage of site
5000 sq ft
Number of fire exits
3

Training
H&S induction training onboarding up to date and at 100%?
Induction matrix is complete for all starters and signed off by manager.
Yes

H&S toolbox refresher training completed in the last 12 months and records available for
Manual handling
Housekeeping
Fire Safety
Stepladders
Completion is at 92%; outstanding refresher booked for two colleagues.
No

Fire Safety
Evidence of Monthly Emergency Lighting test being conducted?
Last monthly check was not completed in January due to access issues.
No

Fire drill has been carried out in the past 6 months and records available on site?
The most recent test was successfully completed on 3 Feb 2026 and recorded in the logbook.
Yes

This assessment has been informed by available statutory testing records and management interviews.
Media summary
Photo 1
Photo 2
`

const extracted = extractAuditFields(sampleSnippet)
console.log(JSON.stringify(extracted, null, 2))

const expectedOutput: ExtractedAudit = {
  number_of_floors: 2,
  square_footage_floor_area: '5000 sq ft',
  monthly_emergency_lighting_tests: {
    answer: false,
    comment: 'Last monthly check was not completed in January due to access issues.',
  },
  fire_drill: {
    completed: true,
    date: '03/02/2026',
    comment: 'The most recent test was successfully completed on 3 Feb 2026 and recorded in the logbook.',
  },
  fire_safety_training: {
    induction_comment: 'Induction matrix is complete for all starters and signed off by manager.',
    toolbox_comment: 'Completion is at 92%; outstanding refresher booked for two colleagues.',
    combined_for_ui:
      'Induction matrix is complete for all starters and signed off by manager. Completion is at 92%; outstanding refresher booked for two colleagues.',
  },
  management_review_statement:
    'This assessment has been informed by available statutory testing records and management interviews.',
}

console.log(JSON.stringify(expectedOutput, null, 2))
