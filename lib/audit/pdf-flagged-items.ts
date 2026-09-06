import { createHash } from 'node:crypto'

export type PdfPage = { num: number; text: string }
export type PdfFinding = { section: string; question: string; answer: string; observation: string; page: number; key: string }
const sections = ['Health and Safety Policy', 'Training', 'Contractor & Visitor Safety', 'Manual Handling', 'COSHH', 'Premises and Equipment', 'Working at Height', 'First Aid', 'Accident Reporting and Investigation', 'Fire Safety', 'Store Compliance', 'General Site Information']
const compact = (text: string) => text.replace(/[^a-z0-9]/gi, '').toLowerCase()
const sectionName = (text: string) => sections.find(s => compact(s) === compact(text)) || (/^(Risk Assessments|Statutory Testing)/i.test(text) ? text : null)
export const findingKey = (section: string, question: string) => createHash('sha256').update(compact(section) + '|' + compact(question)).digest('hex')
export function sixMonthsAfter(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Invalid audit date')
  const [year, month, day] = date.split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1 + 6, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.toISOString().slice(0, 10)
}
export function parsePdfFlaggedItems(pages: PdfPage[]) {
  const cover = pages.find(p => p.num === 1)?.text || ''
  const countMatch = cover.match(/Flagged\s*items\s*(\d+)/i)
  if (!countMatch) throw new Error('The PDF does not declare a flagged-item count; review required')
  const expectedCount = Number(countMatch[1])
  const lines: {text: string; page: number}[] = []
  let started = false
  for (const page of pages.filter(p => p.num > 1)) {
    for (const raw of page.text.split(/\r?\n/)) {
      const text = raw.replace(/\s+/g, ' ').trim()
      if (/^(?:\d+\.)?Flagged\s*items/i.test(text)) { started = true; continue }
      if (started && (/^\d+\.\s*(?:Disclaimer|GeneralSiteInformation)/i.test(text) || text === 'Disclaimer' || /^Other actions \d+ action/i.test(text))) { started = false; break }
      if (started && text && !/^(?:Photo\s*\d|Private\s*&|\d+\s*\/\s*\d+$|--\s*\d+\s*of)/i.test(text)) lines.push({text,page:page.num})
    }
    if (lines.length && !started) break
  }
  if (expectedCount === 0) return { expectedCount, findings: [] as PdfFinding[], cover }
  const findings: PdfFinding[] = []
  let section = '', questionParts: string[] = [], observation: string[] = [], answer = '', page = 2
  const flush = () => {
    if (!answer) return
    const question = questionParts.join(' ').trim()
    if (!question || !section) throw new Error('A flagged item has no question or section; review required')
    findings.push({section, question, answer, observation: observation.join(' ').trim(), page, key: findingKey(section,question)})
    questionParts=[]; observation=[]; answer=''
  }
  for (const line of lines) {
    const heading = sectionName(line.text)
    if (heading && (!questionParts.length || answer)) { flush(); section=heading; page=line.page; continue }
    if (!section) continue
    if (answer) { observation.push(line.text); continue }
    // In these reports the answer can follow the question or occupy its own line.
    const end = line.text.match(/(?:^|\s)(No|Yes|N\/A|Unanswered)$/i)
    if (end) {
      const questionText = line.text.slice(0, end.index).trim()
      if (questionText) questionParts.push(questionText)
      answer=end[1]
    } else questionParts.push(line.text)
  }
  flush()
  if (findings.length !== expectedCount) throw new Error(`Flagged count mismatch: PDF declares ${expectedCount}, extracted ${findings.length}`)
  if (new Set(findings.map(f=>f.key)).size !== findings.length) throw new Error('Repeated flagged questions need review')
  return {expectedCount, findings, cover}
}

export function auditDateFromCover(cover: string): string {
  const source = cover.match(/Conducted\s*on\s+([^\n]+)/i)?.[1] || ''
  const numeric = source.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  const named = source.match(/^(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})/i)
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  const day = numeric?.[1] || named?.[1]
  const year = numeric?.[3] || named?.[3]
  const month = numeric ? Number(numeric[2]) : named ? months.indexOf(named[2].slice(0,3).toLowerCase()) + 1 : 0
  if (!day || !year || month < 1 || month > 12) throw new Error('PDF audit date could not be verified')
  const date = `${year}-${String(month).padStart(2,'0')}-${day.padStart(2,'0')}`
  sixMonthsAfter(date)
  return date
}

export function coverMatchesStore(cover: string, storeName: string, storeCode: string | null, postcode?: string | null) {
  const normal = compact(cover)
  const shortName = storeName.replace(/ New Store$| New$/i, '')
  const aliases: Record<string,string> = { 'Sevenstore':'26A Norfolk Street', 'Parc Trostre':'Footasylum Parc Troste', 'Bradford Forster Square':'Forster Square Retail Park', 'Trafford Mega':'Br 34 Trafford Centre', 'Birmingham Fort':"B'ham Fort" }
  const aliasMatch = aliases[storeName] && normal.includes(compact(aliases[storeName]))
  return Boolean(aliasMatch) || normal.includes(compact(storeName)) || normal.includes(compact(shortName)) || Boolean(storeCode && normal.includes(compact(storeCode))) || Boolean(postcode && normal.includes(compact(postcode)))
}

export function pdfFindingActionRow(finding: PdfFinding, source: {storeId:string;auditNumber:1|2;auditDate:string;filePath:string;userId:string;activeUntil:string}) {
  return {store_id:source.storeId,title:finding.question,description:finding.observation || 'Review the flagged audit finding and record the corrective work.',source_flagged_item:`${finding.section}: ${finding.question} (${finding.answer})${finding.observation ? `\n${finding.observation}` : ''}`,priority:'medium' as const,due_date:source.activeUntil,status:'open' as const,ai_generated:false,created_by_user_id:source.userId,source_audit_date:source.auditDate,source_audit_number:source.auditNumber,source_pdf_path:source.filePath,source_page:finding.page,source_finding_key:finding.key,active_until:source.activeUntil}
}
