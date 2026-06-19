import Papa from 'papaparse'
import JSZip from 'jszip'
import {
  importMappingSchema,
  staffImportRowSchema,
  type EmpEventImportMapping,
  type StaffImportRowInput,
} from '@/lib/emp/event-day-schema'

type RawCsvRow = Record<string, unknown>

export type EmpEventStaffingPreviewRow = {
  rowNumber: number
  raw: Record<string, string>
  row: StaffImportRowInput | null
  duplicateKey: string | null
  errors: string[]
  warnings: string[]
}

export type EmpEventStaffingImportPreview = {
  sourceType?: 'csv' | 'master_deployment_xlsx'
  sourceLabel?: string
  headers: string[]
  mapping: EmpEventImportMapping
  rows: EmpEventStaffingPreviewRow[]
  validRows: EmpEventStaffingPreviewRow[]
  errorCount: number
  warningCount: number
  duplicateCount: number
  rowCount: number
  dayCounts?: Array<{
    date: string
    label: string
    rowCount: number
    validCount: number
    skippedBlankNameCount: number
    skippedNoShowCount: number
  }>
}

const COLUMN_ALIASES: Record<keyof EmpEventImportMapping, string[]> = {
  staffName: ['name', 'staff name', 'full name', 'employee name', 'employee', 'staff', 'person'],
  agency: ['agency', 'employer', 'company', 'contractor', 'supplier'],
  email: ['email', 'email address', 'e mail'],
  phone: ['phone', 'mobile', 'telephone', 'contact number', 'phone number'],
  siaBadgeNumber: ['sia badge', 'sia number', 'sia badge number', 'badge', 'badge number', 'sia'],
  siaExpiryDate: ['sia expiry', 'expiry', 'expiry date', 'sia expiry date', 'badge expiry'],
  position: ['position', 'role', 'job role', 'post', 'deployment'],
  area: ['area', 'zone', 'location', 'site area', 'deployment area'],
  shiftStart: ['shift start', 'start', 'start time', 'shift time start', 'on duty', 'on'],
  shiftEnd: ['shift end', 'finish', 'end', 'end time', 'finish time', 'off duty', 'off'],
  notes: ['notes', 'note', 'comments', 'comment', 'remarks'],
}

const MASTER_DEPLOYMENT_HEADERS = [
  'Date',
  'Outlet',
  'Role',
  'Company',
  'Name of Person',
  'Start',
  'End',
  'Hours',
  'Source row',
]

const MASTER_DEPLOYMENT_MAPPING = importMappingSchema.parse({
  staffName: 'Name of Person',
  agency: 'Company',
  email: null,
  phone: null,
  siaBadgeNumber: null,
  siaExpiryDate: null,
  position: 'Role',
  area: 'Outlet',
  shiftStart: 'Start',
  shiftEnd: 'End',
  notes: 'Source row',
})

export function cleanImportText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normaliseStaffName(value: unknown): string {
  return cleanImportText(value).toLowerCase()
}

export function normalizeImportColumnName(value: unknown): string {
  return cleanImportText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[_/\\.-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function findHeader(headers: string[], aliases: string[]) {
  const normalizedToOriginal = new Map(headers.map((header) => [normalizeImportColumnName(header), header]))
  for (const alias of aliases) {
    const match = normalizedToOriginal.get(normalizeImportColumnName(alias))
    if (match) return match
  }
  return undefined
}

export function suggestStaffImportMapping(headers: string[]): EmpEventImportMapping {
  const mapping: Record<string, string | null> = {}
  for (const key of Object.keys(COLUMN_ALIASES) as Array<keyof EmpEventImportMapping>) {
    mapping[key] = findHeader(headers, COLUMN_ALIASES[key]) || null
  }

  if (!mapping.staffName && headers.length > 0) {
    mapping.staffName = headers[0]
  }

  return importMappingSchema.parse(mapping)
}

function parseUkDate(value: string) {
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/)
  if (!match) return null
  const [, day, month, rawYear, hour = '00', minute = '00'] = match
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)))
  return Number.isNaN(date.getTime()) ? null : date
}

function parseIsoLikeDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function eventDatePart(eventDateIso?: string | null) {
  if (!eventDateIso) return null
  const parsed = parseIsoLikeDate(eventDateIso)
  if (!parsed) return null
  return parsed.toISOString().slice(0, 10)
}

export function parseEmpEventDateTime(value: unknown, eventDateIso?: string | null): {
  iso: string | null
  error: string | null
} {
  const text = cleanImportText(value)
  if (!text) return { iso: null, error: null }

  const timeOnly = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (timeOnly) {
    const datePart = eventDatePart(eventDateIso)
    if (!datePart) {
      return { iso: null, error: `Time "${text}" needs an event date` }
    }
    const [, hour, minute] = timeOnly
    const date = new Date(`${datePart}T${hour.padStart(2, '0')}:${minute}:00`)
    return Number.isNaN(date.getTime())
      ? { iso: null, error: `Invalid time "${text}"` }
      : { iso: date.toISOString(), error: null }
  }

  const ukDate = parseUkDate(text)
  if (ukDate) return { iso: ukDate.toISOString(), error: null }

  const parsed = parseIsoLikeDate(text)
  if (parsed) return { iso: parsed.toISOString(), error: null }

  return { iso: null, error: `Invalid date/time "${text}"` }
}

export function parseEmpEventDate(value: unknown): {
  value: string | null
  error: string | null
} {
  const text = cleanImportText(value)
  if (!text) return { value: null, error: null }

  const ukDate = parseUkDate(text)
  if (ukDate) return { value: ukDate.toISOString().slice(0, 10), error: null }

  const parsed = parseIsoLikeDate(text)
  if (parsed) return { value: parsed.toISOString().slice(0, 10), error: null }

  return { value: null, error: `Invalid date "${text}"` }
}

function getMappedValue(raw: Record<string, string>, header?: string | null) {
  if (!header) return ''
  return cleanImportText(raw[header])
}

function buildDuplicateKey(row: StaffImportRowInput) {
  return [
    normaliseStaffName(row.staffName),
    row.shiftStart || '',
    row.shiftEnd || '',
    cleanImportText(row.position).toLowerCase(),
  ].join('|')
}

function buildPreviewRows(rows: Array<{
  rowNumber: number
  raw: Record<string, string>
  candidate: StaffImportRowInput
  errors?: string[]
  warnings?: string[]
}>) {
  const seen = new Map<string, number>()

  return rows.map((input) => {
    const errors = [...(input.errors || [])]
    const warnings = [...(input.warnings || [])]
    const validation = staffImportRowSchema.safeParse(input.candidate)
    if (!validation.success) {
      errors.push(...validation.error.issues.map((issue) => issue.message))
    }

    let duplicateKey: string | null = null
    const row = validation.success ? validation.data : null
    if (row) {
      duplicateKey = buildDuplicateKey(row)
      if (seen.has(duplicateKey)) {
        const firstRow = seen.get(duplicateKey)
        warnings.push(`Possible duplicate of row ${firstRow}`)
      } else {
        seen.set(duplicateKey, input.rowNumber)
      }
    }

    if (!input.candidate.shiftStart) warnings.push('Shift start missing')
    if (!input.candidate.shiftEnd) warnings.push('Shift end missing')

    return {
      rowNumber: input.rowNumber,
      raw: input.raw,
      row,
      duplicateKey,
      errors: Array.from(new Set(errors)),
      warnings: Array.from(new Set(warnings)),
    }
  })
}

function buildPreviewResult(input: {
  sourceType: EmpEventStaffingImportPreview['sourceType']
  sourceLabel?: string
  headers: string[]
  mapping: EmpEventImportMapping
  rows: EmpEventStaffingPreviewRow[]
  dayCounts?: EmpEventStaffingImportPreview['dayCounts']
}): EmpEventStaffingImportPreview {
  return {
    sourceType: input.sourceType,
    sourceLabel: input.sourceLabel,
    headers: input.headers,
    mapping: input.mapping,
    rows: input.rows,
    validRows: input.rows.filter((row) => row.row && row.errors.length === 0),
    errorCount: input.rows.filter((row) => row.errors.length > 0).length,
    warningCount: input.rows.filter((row) => row.warnings.length > 0).length,
    duplicateCount: input.rows.filter((row) => row.warnings.some((warning) => warning.includes('duplicate'))).length,
    rowCount: input.rows.length,
    dayCounts: input.dayCounts,
  }
}

function normalizeRawRow(row: RawCsvRow, headers: string[]) {
  return headers.reduce<Record<string, string>>((accumulator, header) => {
    accumulator[header] = cleanImportText(row[header])
    return accumulator
  }, {})
}

export function previewEmpEventStaffingCsv(input: {
  csvText: string
  mapping?: Partial<EmpEventImportMapping> | null
  eventDateIso?: string | null
}): EmpEventStaffingImportPreview {
  const parsed = Papa.parse<RawCsvRow>(input.csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => cleanImportText(header),
  })

  const headers = (parsed.meta.fields || []).filter(Boolean)
  const mapping = importMappingSchema.parse({
    ...suggestStaffImportMapping(headers),
    ...(input.mapping || {}),
  })
  const rows = parsed.data.map((rawRow, index) => {
    const raw = normalizeRawRow(rawRow, headers)
    const errors: string[] = []
    const warnings: string[] = []
    const shiftStart = parseEmpEventDateTime(getMappedValue(raw, mapping.shiftStart), input.eventDateIso)
    const shiftEnd = parseEmpEventDateTime(getMappedValue(raw, mapping.shiftEnd), input.eventDateIso)
    const siaExpiry = parseEmpEventDate(getMappedValue(raw, mapping.siaExpiryDate))

    if (shiftStart.error) errors.push(shiftStart.error)
    if (shiftEnd.error) errors.push(shiftEnd.error)
    if (siaExpiry.error) warnings.push(siaExpiry.error)

    const candidate = {
      staffName: getMappedValue(raw, mapping.staffName),
      agency: getMappedValue(raw, mapping.agency) || null,
      email: getMappedValue(raw, mapping.email) || null,
      phone: getMappedValue(raw, mapping.phone) || null,
      siaBadgeNumber: getMappedValue(raw, mapping.siaBadgeNumber) || null,
      siaExpiryDate: siaExpiry.value,
      position: getMappedValue(raw, mapping.position) || null,
      area: getMappedValue(raw, mapping.area) || null,
      shiftStart: shiftStart.iso,
      shiftEnd: shiftEnd.iso,
      notes: getMappedValue(raw, mapping.notes) || null,
    }

    return {
      rowNumber: index + 2,
      raw,
      candidate,
      errors,
      warnings,
    }
  })

  return buildPreviewResult({
    sourceType: 'csv',
    headers,
    mapping,
    rows: buildPreviewRows(rows),
  })
}

const MONTH_LOOKUP: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
}

function parseMasterDeploymentDateLabel(value: unknown, fallbackYear?: number | null) {
  const text = cleanImportText(value)
  const match = text.match(/^(?:mon|tue|wed|thu|fri|sat|sun)?\s*(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{2,4}))?$/i)
  if (!match) return null
  const month = MONTH_LOOKUP[match[2].toLowerCase()]
  if (!month) return null
  const rawYear = match[3]
  const year = rawYear
    ? Number(rawYear.length === 2 ? `20${rawYear}` : rawYear)
    : fallbackYear
  if (!year || !Number.isFinite(year)) return null
  return `${year}-${month}-${match[1].padStart(2, '0')}`
}

function parseMasterDeploymentTime(value: unknown) {
  const text = cleanImportText(value)
  if (!text) return null
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (match) {
    const hour = Number(match[1])
    const minute = Number(match[2])
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) return null
    return { hour, minute, label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` }
  }

  const serial = Number(text)
  if (Number.isFinite(serial) && serial >= 0 && serial < 1) {
    const totalMinutes = Math.round(serial * 24 * 60)
    const hour = Math.floor(totalMinutes / 60) % 24
    const minute = totalMinutes % 60
    return { hour, minute, label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` }
  }

  return null
}

function parseMasterDeploymentHours(value: unknown) {
  const text = cleanImportText(value)
  if (!text) return null
  const numeric = Number(text)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function localDateTimeIso(dateKey: string, time: { hour: number; minute: number }) {
  const date = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(time.hour, time.minute, 0, 0)
  return date.toISOString()
}

function addHoursIso(iso: string | null, hours: number | null) {
  if (!iso || !hours) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString()
}

function endTimeIso(dateKey: string, startIso: string | null, endTime: ReturnType<typeof parseMasterDeploymentTime>) {
  if (!startIso || !endTime) return null
  const endIso = localDateTimeIso(dateKey, endTime)
  if (!endIso) return null
  const startDate = new Date(startIso)
  const endDate = new Date(endIso)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null
  if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1)
  return endDate.toISOString()
}

function fallbackYearFromAllowedDates(allowedDateKeys?: string[] | null) {
  const first = allowedDateKeys?.find((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
  return first ? Number(first.slice(0, 4)) : null
}

function decodeXmlText(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function parseXmlAttributes(input: string) {
  const attrs: Record<string, string> = {}
  for (const match of input.matchAll(/([A-Za-z_][\w:.-]*)="([^"]*)"/g)) {
    attrs[match[1]] = decodeXmlText(match[2])
  }
  return attrs
}

function columnIndexFromCellRef(ref: string) {
  const letters = (ref.match(/^[A-Z]+/i)?.[0] || '').toUpperCase()
  let index = 0
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64)
  }
  return index > 0 ? index - 1 : 0
}

async function readZipText(zip: JSZip, path: string) {
  return zip.file(path)?.async('text') || null
}

async function readSharedStrings(zip: JSZip) {
  const xml = await readZipText(zip, 'xl/sharedStrings.xml')
  if (!xml) return []
  const strings: string[] = []
  for (const match of xml.matchAll(/<si\b[\s\S]*?<\/si>/g)) {
    const parts = Array.from(match[0].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)).map((part) => decodeXmlText(part[1]))
    strings.push(parts.join(''))
  }
  return strings
}

async function readWorkbookSheets(zip: JSZip) {
  const workbookXml = await readZipText(zip, 'xl/workbook.xml')
  const relsXml = await readZipText(zip, 'xl/_rels/workbook.xml.rels')
  if (!workbookXml || !relsXml) return []

  const rels = new Map<string, string>()
  for (const match of relsXml.matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g)) {
    const attrs = parseXmlAttributes(match[1])
    if (!attrs.Id || !attrs.Target) continue
    const target = attrs.Target.startsWith('/')
      ? attrs.Target.replace(/^\//, '')
      : `xl/${attrs.Target.replace(/^\.\.\//, '')}`
    rels.set(attrs.Id, target)
  }

  return Array.from(workbookXml.matchAll(/<sheet\b([^>]*)\/?>(?:<\/sheet>)?/g)).flatMap((match) => {
    const attrs = parseXmlAttributes(match[1])
    const relationshipId = attrs['r:id'] || attrs.id
    const path = relationshipId ? rels.get(relationshipId) : null
    return attrs.name && path ? [{ name: attrs.name, path }] : []
  })
}

function cellTextFromXml(cellXml: string, attrs: Record<string, string>, sharedStrings: string[]) {
  if (attrs.t === 'inlineStr') {
    return Array.from(cellXml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)).map((match) => decodeXmlText(match[1])).join('')
  }

  const value = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1]
  if (value === undefined) return ''
  const decoded = decodeXmlText(value)
  if (attrs.t === 's') return sharedStrings[Number(decoded)] || ''
  return decoded
}

async function readWorksheetRows(zip: JSZip, path: string, sharedStrings: string[]) {
  const xml = await readZipText(zip, path)
  if (!xml) return []
  const rows: Array<Array<string>> = []

  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = []
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = parseXmlAttributes(cellMatch[1])
      const ref = attrs.r || ''
      row[columnIndexFromCellRef(ref)] = cellTextFromXml(cellMatch[2] || '', attrs, sharedStrings)
    }
    rows.push(row)
  }

  return rows
}

export async function previewEmpEventMasterDeploymentXlsx(input: {
  workbookBuffer: Buffer | ArrayBuffer | Uint8Array
  allowedDateKeys?: string[] | null
  fallbackYear?: number | null
}): Promise<EmpEventStaffingImportPreview> {
  const zip = await JSZip.loadAsync(input.workbookBuffer)
  const [sharedStrings, sheets] = await Promise.all([
    readSharedStrings(zip),
    readWorkbookSheets(zip),
  ])
  const selectedSheet = sheets.find((sheet) => sheet.name.toLowerCase() === 'master')
    || sheets.find((sheet) => sheet.name.toLowerCase().includes('master'))
    || sheets[0]
  if (!selectedSheet) {
    throw new Error('Master deployment workbook has no worksheets')
  }

  const rows = await readWorksheetRows(zip, selectedSheet.path, sharedStrings)
  const firstRow = rows[0] || []
  const secondRow = rows[1] || []
  const allowedDates = new Set(input.allowedDateKeys || [])
  const year = input.fallbackYear || fallbackYearFromAllowedDates(input.allowedDateKeys) || new Date().getFullYear()
  const dateGroups = firstRow
    .map((cell, index) => ({
      index,
      label: cleanImportText(cell),
      dateKey: parseMasterDeploymentDateLabel(cell, year),
      startHeader: cleanImportText(secondRow[index]),
      endHeader: cleanImportText(secondRow[index + 1]),
      hoursHeader: cleanImportText(secondRow[index + 2]),
    }))
    .filter((group) => (
      group.dateKey
      && group.startHeader.toLowerCase() === 'start'
      && group.endHeader.toLowerCase() === 'end'
      && group.hoursHeader.toLowerCase() === 'hours'
      && (allowedDates.size === 0 || allowedDates.has(group.dateKey))
    )) as Array<{ index: number; label: string; dateKey: string; startHeader: string; endHeader: string; hoursHeader: string }>

  if (dateGroups.length === 0) {
    throw new Error([
      'No deployment date columns were found in the MASTER worksheet',
      `First row: ${firstRow.slice(0, 16).map((cell) => cleanImportText(cell) || '-').join(' | ')}`,
      `Second row: ${secondRow.slice(0, 16).map((cell) => cleanImportText(cell) || '-').join(' | ')}`,
    ].join('. '))
  }

  const dayStats = new Map<string, {
    date: string
    label: string
    rowCount: number
    validCount: number
    skippedBlankNameCount: number
    skippedNoShowCount: number
  }>()
  const previewInputs: Parameters<typeof buildPreviewRows>[0] = []

  for (const group of dateGroups) {
    dayStats.set(group.dateKey, {
      date: group.dateKey,
      label: group.label,
      rowCount: 0,
      validCount: 0,
      skippedBlankNameCount: 0,
      skippedNoShowCount: 0,
    })
  }

  rows.slice(2).forEach((row, rowOffset) => {
    const rowNumber = rowOffset + 3
    const outlet = cleanImportText(row[1])
    const role = cleanImportText(row[2])
    const company = cleanImportText(row[3])
    const staffName = cleanImportText(row[4])

    for (const group of dateGroups) {
      const startText = cleanImportText(row[group.index])
      const endText = cleanImportText(row[group.index + 1])
      const hoursText = cleanImportText(row[group.index + 2])
      if (!startText && !endText && !hoursText) continue

      const stats = dayStats.get(group.dateKey)
      if (stats) stats.rowCount += 1
      const statusText = `${startText} ${endText}`.toLowerCase().replace(/[^a-z]+/g, ' ').trim()
      if (statusText === 'no show') {
        if (stats) stats.skippedNoShowCount += 1
        continue
      }

      const errors: string[] = []
      const warnings: string[] = []
      if (!staffName) {
        errors.push('Staff name is required')
        if (stats) stats.skippedBlankNameCount += 1
      }

      const startTime = parseMasterDeploymentTime(startText)
      const endTime = parseMasterDeploymentTime(endText)
      const hours = parseMasterDeploymentHours(hoursText)
      if (startText && !startTime) errors.push(`Invalid start time "${startText}"`)
      if (endText && !endTime) warnings.push(`Invalid end time "${endText}"`)

      const shiftStart = startTime ? localDateTimeIso(group.dateKey, startTime) : null
      const shiftEnd = addHoursIso(shiftStart, hours) || endTimeIso(group.dateKey, shiftStart, endTime)
      if (staffName && shiftStart && stats) stats.validCount += 1

      const raw = {
        Date: group.label,
        Outlet: outlet,
        Role: role,
        Company: company,
        'Name of Person': staffName,
        Start: startText,
        End: endText,
        Hours: hoursText,
        'Source row': String(rowNumber),
      }

      previewInputs.push({
        rowNumber,
        raw,
        candidate: {
          staffName,
          agency: company || null,
          email: null,
          phone: null,
          siaBadgeNumber: null,
          siaExpiryDate: null,
          position: role || null,
          area: outlet || null,
          shiftStart,
          shiftEnd,
          notes: `Imported from master deployment ${group.label}, workbook row ${rowNumber}.`,
        },
        errors,
        warnings,
      })
    }
  })

  return buildPreviewResult({
    sourceType: 'master_deployment_xlsx',
    sourceLabel: `Master deployment: ${selectedSheet.name}`,
    headers: MASTER_DEPLOYMENT_HEADERS,
    mapping: MASTER_DEPLOYMENT_MAPPING,
    rows: buildPreviewRows(previewInputs),
    dayCounts: Array.from(dayStats.values()).filter((day) => day.rowCount > 0),
  })
}
