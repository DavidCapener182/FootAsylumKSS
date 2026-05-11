import {
  EMP_MASTER_TEMPLATES,
  getEmpMasterTemplateById,
  type EmpMasterTemplateDefinition,
  type EmpMasterTemplateNarrativeSection,
  type EmpMasterTemplateTable,
} from '@/lib/emp/master-templates'
import {
  BBC_RADIO_ONE_2026_SIGN_IN_DATES,
  findEmpStaffByName,
  getBbcRadioOneStaffForEvent,
  type EmpStaffSignInRow,
} from '@/lib/emp/bbc-radio-one-staff'

export const EMP_DEPLOYMENT_PREPARED_BY = 'David Capener'

export type EmpMasterTemplateTablePagePrefill = {
  fields?: Record<string, string>
  tableCells?: Record<string, string>
}

export type EmpMasterTemplatePrefillData = {
  eventName: string
  eventDate: string
  templateFieldValues: Record<string, Record<string, string>>
  templateTableCellValues: Record<string, Record<string, string>>
  templateTablePageValues?: Record<string, EmpMasterTemplateTablePagePrefill[]>
}

export type EmpMasterTemplatePlanPrefill = {
  planId: string
  planTitle: string
  eventName: string
  eventDate: string
  prefillData: EmpMasterTemplatePrefillData
}

type EmpMasterTemplateRiskRow = {
  hazard: string
  personsAffected: string
  controlMeasures: string
  rating: string
}

type EmpDeploymentMatrixRow = {
  zone: string
  position: string
  assigned: string
  supervisor: string
  start: string
  end: string
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

function clean(value: unknown) {
  return String(value || '').trim()
}

function normalizeLabel(value: string) {
  return clean(value).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()
}

function normalizedLabelHasWord(normalizedLabel: string, word: string) {
  return new RegExp(`\\b${word}\\b`).test(normalizedLabel)
}

function stripEventDateSuffix(value: string) {
  return clean(value).replace(/\s+-\s+\d{1,2}\/\d{1,2}\/20\d{2}\s*$/, '')
}

function toIsoDate(year: string, month: string, day: string) {
  const parsedDay = Number.parseInt(day, 10)
  const parsedMonth = Number.parseInt(month, 10)
  if (!year || !Number.isFinite(parsedDay) || !Number.isFinite(parsedMonth)) return ''
  if (parsedDay < 1 || parsedDay > 31 || parsedMonth < 1 || parsedMonth > 12) return ''
  return `${year}-${String(parsedMonth).padStart(2, '0')}-${String(parsedDay).padStart(2, '0')}`
}

function addDaysToIsoDate(value: string, days: number) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  date.setUTCDate(date.getUTCDate() + days)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function expandIsoDateRange(startIso: string, endIso: string) {
  if (!startIso || !endIso) return startIso ? [startIso] : []
  const dates: string[] = []
  let current = startIso

  for (let index = 0; index < 31; index += 1) {
    dates.push(current)
    if (current === endIso) break
    const next = addDaysToIsoDate(current, 1)
    if (!next || next === current) break
    current = next
  }

  return dates
}

export function extractEmpTemplateIsoDates(value: unknown) {
  const raw = clean(value)
  if (!raw) return []

  const numericRangeMatch = raw.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b.*?(?:to|until|–|—)\s*(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/i)
  if (numericRangeMatch) {
    return expandIsoDateRange(
      toIsoDate(numericRangeMatch[3], numericRangeMatch[2], numericRangeMatch[1]),
      toIsoDate(numericRangeMatch[6], numericRangeMatch[5], numericRangeMatch[4])
    )
  }

  const textFullRangeMatch = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(20\d{2})\b.*?(?:to|until|–|—)\s*(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(20\d{2})\b/i)
  if (textFullRangeMatch) {
    const startMonth = MONTH_LOOKUP[textFullRangeMatch[2].toLowerCase()]
    const endMonth = MONTH_LOOKUP[textFullRangeMatch[5].toLowerCase()]
    if (startMonth && endMonth) {
      return expandIsoDateRange(
        toIsoDate(textFullRangeMatch[3], startMonth, textFullRangeMatch[1]),
        toIsoDate(textFullRangeMatch[6], endMonth, textFullRangeMatch[4])
      )
    }
  }

  const textSameMonthRangeMatch = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|to|until|–|—)\s*(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(20\d{2})\b/i)
  if (textSameMonthRangeMatch) {
    const month = MONTH_LOOKUP[textSameMonthRangeMatch[3].toLowerCase()]
    if (month) {
      return expandIsoDateRange(
        toIsoDate(textSameMonthRangeMatch[4], month, textSameMonthRangeMatch[1]),
        toIsoDate(textSameMonthRangeMatch[4], month, textSameMonthRangeMatch[2])
      )
    }
  }

  const firstDate = extractFirstEmpTemplateIsoDate(raw)
  return firstDate ? [firstDate] : []
}

export function extractFirstEmpTemplateIsoDate(value: unknown) {
  const raw = clean(value)
  if (!raw) return ''

  const isoMatch = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  if (isoMatch) return toIsoDate(isoMatch[1], isoMatch[2], isoMatch[3])

  const numericMatch = raw.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/)
  if (numericMatch) return toIsoDate(numericMatch[3], numericMatch[2], numericMatch[1])

  const monthRangeMatch = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|to|until|–|—)\s*\d{1,2}(?:st|nd|rd|th)?\s+([a-z]+)\s+(20\d{2})\b/i)
  if (monthRangeMatch) {
    const month = MONTH_LOOKUP[monthRangeMatch[2].toLowerCase()]
    if (month) return toIsoDate(monthRangeMatch[3], month, monthRangeMatch[1])
  }

  const textMatch = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(20\d{2})\b/i)
  if (textMatch) {
    const month = MONTH_LOOKUP[textMatch[2].toLowerCase()]
    if (month) return toIsoDate(textMatch[3], month, textMatch[1])
  }

  return ''
}

function formatIsoDateForDisplay(value: string) {
  const match = clean(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return clean(value)
  return `${match[3]}/${match[2]}/${match[1]}`
}

function getValue(fieldValues: Record<string, string>, key: string) {
  return clean(fieldValues[key])
}

function firstMeaningfulLine(value: string) {
  return clean(value)
    .split(/\n|\. /)
    .map((line) => clean(line))
    .find(Boolean) || ''
}

function stripPlaceholderName(value: string) {
  const text = clean(value)
  if (!text || /^(name|tbc|n\/a)$/i.test(text)) return ''
  return text
}

function splitStructuredLine(line: string) {
  const raw = clean(line)
  if (!raw) return []

  if (raw.includes('|')) {
    return raw.split('|').map(clean).filter(Boolean)
  }

  if (raw.includes(' - ')) {
    return raw.split(/\s+-\s+/).map(clean).filter(Boolean)
  }

  const colonParts = raw.split(/\s*:\s+/).map(clean).filter(Boolean)
  return colonParts.length > 1 ? colonParts : [raw]
}

function parseContactRows(fieldValues: Record<string, string>) {
  const source = [
    getValue(fieldValues, 'key_contacts_directory'),
    getValue(fieldValues, 'contact_directory'),
    getValue(fieldValues, 'named_command_roles'),
  ].filter(Boolean).join('\n')

  const rows: Array<{ role: string; name: string; mobile?: string; radioChannel?: string; callSign?: string }> = []

  source.split(/\r?\n/).forEach((line) => {
    const parts = splitStructuredLine(line)
    if (parts.length < 2) return

    const role = clean(parts[0])
    const name = stripPlaceholderName(parts[1])
    if (!role || !name) return

    const contactPart = parts.find((part, index) => index > 1 && /(\+?\d[\d\s().-]{6,}|channel|ch\b|call sign|radio)/i.test(part))
    rows.push({
      role,
      name,
      mobile: contactPart && /\+?\d[\d\s().-]{6,}/.test(contactPart) ? contactPart : '',
      radioChannel: contactPart && /(channel|ch\b|radio)/i.test(contactPart) ? contactPart : '',
      callSign: parts.find((part) => /call sign/i.test(part)) || '',
    })
  })

  return rows.slice(0, 15)
}

function parseDeploymentRows(fieldValues: Record<string, string>): EmpDeploymentMatrixRow[] {
  const source = getValue(fieldValues, 'staffing_by_zone_and_time')
  if (!source) return []

  return source
    .split(/\r?\n/)
    .flatMap((line) => {
      const parts = splitStructuredLine(line)
      if (parts.length < 2) return []

      const timePattern = /\b(\d{1,2}:\d{2})\s*(?:-|–|to)\s*(\d{1,2}:\d{2})\b/
      const timeIndex = parts.findIndex((part) => timePattern.test(part))
      const timeSource = timeIndex >= 0 ? parts[timeIndex] : parts[0]
      const timeMatch = timeSource.match(timePattern)
      const maybeZone = timeIndex === 0
        ? parts[1]
        : parts[0]
      const maybePosition = timeIndex === 0
        ? parts[2] || parts[1]
        : parts[1]
      const baseRow = {
        zone: clean(maybeZone),
        assigned: '',
        start: timeMatch?.[1] || '',
        end: timeMatch?.[2] || '',
      }

      return parseDeploymentRoleRows(maybePosition).map((role) => ({
        ...baseRow,
        position: role.position,
        supervisor: /supervisor/i.test(role.position) ? role.position : '',
      }))
    })
    .filter((row) => Boolean(row.zone || row.position))
}

export function getDeploymentMatrixRowsFromCells(tableCells: Record<string, string> | undefined): EmpDeploymentMatrixRow[] {
  const rowIndexes = Object.keys(tableCells || {})
    .map((cellKey) => Number.parseInt(cellKey.split(':')[0] || '', 10))
    .filter((rowIndex) => Number.isFinite(rowIndex) && rowIndex >= 0)

  const maxRowIndex = rowIndexes.length ? Math.max(...rowIndexes) : -1
  const rows: EmpDeploymentMatrixRow[] = []

  for (let rowIndex = 0; rowIndex <= maxRowIndex; rowIndex += 1) {
    const row = {
      zone: clean(tableCells?.[`${rowIndex}:zone`]),
      position: clean(tableCells?.[`${rowIndex}:position`]),
      assigned: clean(tableCells?.[`${rowIndex}:assigned`]),
      supervisor: clean(tableCells?.[`${rowIndex}:supervisor`]),
      start: clean(tableCells?.[`${rowIndex}:start`]),
      end: clean(tableCells?.[`${rowIndex}:end`]),
    }

    if (Object.values(row).some(Boolean)) rows.push(row)
  }

  return rows
}

function parseDeploymentRoleRows(value: string) {
  const raw = clean(value)
  if (!raw) return [{ position: '' }]

  const roleParts = raw
    .split(/\s*;\s*/)
    .map((part) => clean(part))
    .filter(Boolean)

  const parts = roleParts.length > 1 ? roleParts : [raw]

  return parts.flatMap((part) => {
    const countMatch = part.match(/\bx\s*(\d+)\b/i)
    const requiredCount = countMatch ? Math.max(Number.parseInt(countMatch[1], 10), 1) : 1
    const position = clean(part.replace(/\bx\s*\d+\b/gi, '').replace(/\s{2,}/g, ' '))
    return Array.from({ length: requiredCount }).map(() => ({
      position: position || part,
    }))
  })
}

function setCell(
  cells: Record<string, Record<string, string>>,
  templateId: string,
  rowIndex: number,
  columnKey: string,
  value: string
) {
  const cleaned = clean(value)
  if (!cleaned) return
  cells[templateId] = cells[templateId] || {}
  cells[templateId][`${rowIndex}:${columnKey}`] = cleaned
}

function getRiskActionRequired(row: EmpMasterTemplateRiskRow) {
  const rating = clean(row.rating)
  if (/high|red/i.test(rating)) return 'Escalate controls before deployment and keep under live command review.'
  if (/medium|amber/i.test(rating)) return 'Monitor live conditions and escalate if triggers are reached.'
  return 'Maintain controls and record any change through Event Control.'
}

function buildTemplateTableCellValues(
  fieldValues: Record<string, string>,
  options: { planTitle?: string; riskAssessmentRows?: EmpMasterTemplateRiskRow[] } = {}
) {
  const cells: Record<string, Record<string, string>> = {}
  const riskRows = options.riskAssessmentRows || []
  const staffRows = getBbcRadioOneStaffForEvent(getValue(fieldValues, 'event_name'), options.planTitle)

  riskRows.forEach((row, rowIndex) => {
    setCell(cells, 'security-risk-assessment', rowIndex, 'hazard', row.hazard)
    setCell(cells, 'security-risk-assessment', rowIndex, 'who', row.personsAffected)
    setCell(cells, 'security-risk-assessment', rowIndex, 'controls', row.controlMeasures)
    setCell(cells, 'security-risk-assessment', rowIndex, 'risk', row.rating)
    setCell(cells, 'security-risk-assessment', rowIndex, 'action_required', getRiskActionRequired(row))
    setCell(cells, 'security-risk-assessment', rowIndex, 'action_by', 'KSS / Event Control')
    setCell(cells, 'security-risk-assessment', rowIndex, 'status', 'Planned')
  })

  parseContactRows(fieldValues).forEach((row, rowIndex) => {
    const staffRow = findEmpStaffByName(staffRows, row.name)
    setCell(cells, 'contact-and-cascade-list', rowIndex, 'role', row.role)
    setCell(cells, 'contact-and-cascade-list', rowIndex, 'name', row.name)
    setCell(cells, 'contact-and-cascade-list', rowIndex, 'mobile', row.mobile || staffRow?.mobileNumber || '')
    setCell(cells, 'contact-and-cascade-list', rowIndex, 'radio_channel', row.radioChannel || '')
    setCell(cells, 'contact-and-cascade-list', rowIndex, 'call_sign', row.callSign || '')
  })

  parseDeploymentRows(fieldValues).forEach((row, rowIndex) => {
    setCell(cells, 'deployment-matrix', rowIndex, 'zone', row.zone)
    setCell(cells, 'deployment-matrix', rowIndex, 'position', row.position)
    setCell(cells, 'deployment-matrix', rowIndex, 'assigned', row.assigned)
    setCell(cells, 'deployment-matrix', rowIndex, 'supervisor', row.supervisor)
    setCell(cells, 'deployment-matrix', rowIndex, 'start', row.start)
    setCell(cells, 'deployment-matrix', rowIndex, 'end', row.end)
  })

  return cells
}

function getEventAddress(fieldValues: Record<string, string>) {
  const venueName = getValue(fieldValues, 'venue_name')
  const venueAddress = getValue(fieldValues, 'venue_address')
  return venueAddress || venueName.split('/')[0]?.trim() || venueName
}

function formatIsoDateWithWeekday(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return clean(value)
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  const weekday = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(date)
  return `${weekday} ${formatIsoDateForDisplay(value)}`
}

function chunkRows<T>(rows: T[], chunkSize: number) {
  const chunks: T[][] = []
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize))
  }
  return chunks.length ? chunks : [[]]
}

function groupStaffByCompany(rows: EmpStaffSignInRow[]) {
  const order: string[] = []
  const grouped: Record<string, EmpStaffSignInRow[]> = {}

  rows.forEach((row) => {
    const company = clean(row.company)
    if (!company) return
    if (!grouped[company]) {
      grouped[company] = []
      order.push(company)
    }
    grouped[company].push(row)
  })

  return order.map((company) => ({ company, rows: grouped[company] }))
}

function getStaffSignInDates(
  fieldValues: Record<string, string>,
  eventName: string,
  planTitle = ''
) {
  const dateCandidates = [
    extractEmpTemplateIsoDates(getValue(fieldValues, 'show_dates')),
    extractEmpTemplateIsoDates(getValue(fieldValues, 'build_dates')),
    extractEmpTemplateIsoDates(getValue(fieldValues, 'issue_date')),
  ]
  const extractedDates = dateCandidates.find((dates) => dates.length) || []
  const bbcRadioOneStaff = getBbcRadioOneStaffForEvent(eventName, planTitle)

  if (bbcRadioOneStaff.length && extractedDates.length <= 1) {
    return BBC_RADIO_ONE_2026_SIGN_IN_DATES
  }

  return extractedDates
}

function buildStaffSignInTablePages(
  fieldValues: Record<string, string>,
  context: {
    eventName: string
    planTitle?: string
  }
) {
  const staffRows = getBbcRadioOneStaffForEvent(context.eventName, context.planTitle)
  if (!staffRows.length) return []

  const template = getEmpMasterTemplateById('staff-sign-in-sign-out-sheet') as EmpMasterTemplateTable | null
  const rowsPerPage = template?.kind === 'table' ? template.emptyRows : 14
  const dates = getStaffSignInDates(fieldValues, context.eventName, context.planTitle).filter(Boolean)
  const eventAddress = getEventAddress(fieldValues)
  const pages: EmpMasterTemplateTablePagePrefill[] = []

  dates.forEach((eventDate) => {
    groupStaffByCompany(staffRows).forEach(({ company, rows }) => {
      chunkRows(rows, rowsPerPage).forEach((chunk, chunkIndex) => {
        const tableCells: Record<string, string> = {}
        chunk.forEach((row, rowIndex) => {
          tableCells[`${rowIndex}:staff_name`] = row.staffName
          tableCells[`${rowIndex}:sia_badge_number`] = row.siaBadgeNumber
          tableCells[`${rowIndex}:expiry_date`] = row.expiryDate
        })

        pages.push({
          fields: {
            'Event Name / Code': context.eventName,
            Date: formatIsoDateWithWeekday(eventDate),
            'Location / Venue': eventAddress,
            Company: chunkIndex > 0 ? `${company} (continued)` : company,
          },
          tableCells,
        })
      })
    })
  })

  return pages
}

function buildDailyStaffTablePages(
  _templateId: 'uniform-ppe-allocation-log' | 'radio-kit-sign-out-sheet',
  fieldValues: Record<string, string>,
  context: {
    eventName: string
    planTitle?: string
  }
) {
  const staffRows = getBbcRadioOneStaffForEvent(context.eventName, context.planTitle)
  if (!staffRows.length) return []

  const dates = getStaffSignInDates(fieldValues, context.eventName, context.planTitle).filter(Boolean)
  const pageCount = 2
  const pages: EmpMasterTemplateTablePagePrefill[] = []

  dates.forEach((eventDate) => {
    Array.from({ length: pageCount }).forEach(() => {
      pages.push({
        fields: {
          'Event Name / Code': context.eventName,
          Date: formatIsoDateWithWeekday(eventDate),
        },
        tableCells: {},
      })
    })
  })

  return pages
}

function buildDeploymentMatrixTablePages(
  fieldValues: Record<string, string>,
  context: {
    eventName: string
    planTitle?: string
  }
) {
  const deploymentRows = parseDeploymentRows(fieldValues)
  const dates = getStaffSignInDates(fieldValues, context.eventName, context.planTitle).filter(Boolean)
  const hasBbcRadioOneStaff = getBbcRadioOneStaffForEvent(context.eventName, context.planTitle).length > 0
  if (!deploymentRows.length || !hasBbcRadioOneStaff || dates.length <= 1) return []

  const template = getEmpMasterTemplateById('deployment-matrix') as EmpMasterTemplateTable | null
  const rowsPerPage = template?.kind === 'table' ? template.emptyRows : 23
  const pages: EmpMasterTemplateTablePagePrefill[] = []

  dates.forEach((eventDate) => {
    chunkRows(deploymentRows, rowsPerPage).forEach((chunk) => {
      const tableCells: Record<string, string> = {}

      chunk.forEach((row, rowIndex) => {
        tableCells[`${rowIndex}:zone`] = row.zone
        tableCells[`${rowIndex}:position`] = row.position
        tableCells[`${rowIndex}:assigned`] = row.assigned
        tableCells[`${rowIndex}:supervisor`] = row.supervisor
        tableCells[`${rowIndex}:start`] = row.start
        tableCells[`${rowIndex}:end`] = row.end
      })

      pages.push({
        fields: {
          'Event Name': context.eventName,
          Date: formatIsoDateWithWeekday(eventDate),
          'Prepared By': EMP_DEPLOYMENT_PREPARED_BY,
        },
        tableCells,
      })
    })
  })

  return pages
}

function groupDeploymentRowsByZone(rows: ReturnType<typeof parseDeploymentRows>) {
  const order: string[] = []
  const grouped: Record<string, ReturnType<typeof parseDeploymentRows>> = {}

  rows.forEach((row) => {
    const zone = clean(row.zone) || 'General Deployment'
    if (!grouped[zone]) {
      grouped[zone] = []
      order.push(zone)
    }
    grouped[zone].push(row)
  })

  return order.map((zone) => ({
    zone,
    rows: grouped[zone],
  }))
}

export function buildSupervisorDeploymentTablePagesFromRows(
  deploymentRows: EmpDeploymentMatrixRow[],
  context: {
    eventName: string
    eventDate: string
  }
) {
  const template = getEmpMasterTemplateById('supervisor-deployment') as EmpMasterTemplateTable | null
  const rowsPerPage = template?.kind === 'table' ? template.emptyRows : 15
  const pages: EmpMasterTemplateTablePagePrefill[] = []

  groupDeploymentRowsByZone(deploymentRows).forEach(({ zone, rows }) => {
    const supervisorRows = rows.filter((row) => /supervisor/i.test(row.position))
    if (!supervisorRows.length) return

    const staffRows = rows.filter((row) => !/supervisor/i.test(row.position))
    const supervisorLabel = `${zone} ${supervisorRows[0].position}`.replace(/\s+/g, ' ').trim()

    chunkRows([...supervisorRows, ...staffRows], rowsPerPage).forEach((chunk, chunkIndex) => {
      const tableCells: Record<string, string> = {}
      chunk.forEach((row, rowIndex) => {
        tableCells[`${rowIndex}:position`] = row.position
        tableCells[`${rowIndex}:assigned`] = row.assigned
        tableCells[`${rowIndex}:start`] = row.start
        tableCells[`${rowIndex}:end`] = row.end
      })

      pages.push({
        fields: {
          'Event Name': context.eventName,
          Date: formatIsoDateWithWeekday(context.eventDate),
          'Supervisor / Zone': chunkIndex > 0 ? `${supervisorLabel} (continued)` : supervisorLabel,
          'Prepared By': EMP_DEPLOYMENT_PREPARED_BY,
        },
        tableCells,
      })
    })
  })

  return pages
}

export function buildSupervisorDeploymentTablePagesFromDeploymentCells(
  tableCells: Record<string, string> | undefined,
  context: {
    eventName: string
    eventDate: string
  }
) {
  return buildSupervisorDeploymentTablePagesFromRows(getDeploymentMatrixRowsFromCells(tableCells), context)
}

export function buildSupervisorDeploymentTablePagesFromDeploymentTablePages(
  deploymentPages: EmpMasterTemplateTablePagePrefill[]
) {
  const order: string[] = []
  const grouped: Record<string, {
    eventName: string
    eventDate: string
    rows: EmpDeploymentMatrixRow[]
  }> = {}

  deploymentPages.forEach((page) => {
    const eventName = String(page.fields?.['Event Name'] || '').trim()
    const eventDate = String(page.fields?.Date || '').trim()
    const groupKey = `${eventName}|||${eventDate}`

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        eventName,
        eventDate,
        rows: [],
      }
      order.push(groupKey)
    }

    grouped[groupKey].rows.push(...getDeploymentMatrixRowsFromCells(page.tableCells))
  })

  return order.flatMap((groupKey) => buildSupervisorDeploymentTablePagesFromRows(
    grouped[groupKey].rows,
    {
      eventName: grouped[groupKey].eventName,
      eventDate: grouped[groupKey].eventDate,
    }
  ))
}

function getTemplateLabels(template: EmpMasterTemplateDefinition) {
  if (template.kind === 'table') return template.infoFields.map((field) => field.label)

  if (template.kind === 'narrative_form') {
    const sectionLabels = template.sections
      .filter((section): section is Extract<EmpMasterTemplateNarrativeSection, { type: 'textbox' }> => section.type === 'textbox')
      .map((section) => section.title)
    return [...template.headerFields.map((field) => field.label), ...sectionLabels]
  }

  if (template.kind === 'radio_one_daily_brief_booklet') return []

  return template.infoRows.flatMap((row) => [row[0], row[1]])
}

function resolveOperationalLead(fieldValues: Record<string, string>) {
  const rows = parseContactRows(fieldValues)
  return (
    rows.find((row) => /kss operational lead/i.test(row.role))?.name
    || rows.find((row) => /event director silver|silver commander|security manager|security lead/i.test(row.role))?.name
    || stripPlaceholderName(getValue(fieldValues, 'author_name'))
    || 'KSS NW LTD'
  )
}

function resolveTemplateLabelValue(
  label: string,
  context: {
    fieldValues: Record<string, string>
    eventName: string
    eventDate: string
    issueDate: string
    reviewDate: string
    operationalLead: string
  }
) {
  const normalized = normalizeLabel(label)
  const dateForDisplay = formatIsoDateForDisplay(context.eventDate)
  const issueDate = context.issueDate || context.eventDate
  const reviewDate = context.reviewDate || context.eventDate
  const eventAddress = getEventAddress(context.fieldValues)

  if (!normalized || normalized.includes('page number')) return ''
  if (normalized === 'review date') return reviewDate
  if (normalized.includes('date assessed')) return issueDate
  if (normalized.includes('event') && normalizedLabelHasWord(normalized, 'date')) {
    return [context.eventName, dateForDisplay].filter(Boolean).join(' - ')
  }
  if (normalized === 'event' || normalized.includes('event name') || normalized.includes('event code')) {
    return context.eventName
  }
  if (normalizedLabelHasWord(normalized, 'date')) return context.eventDate
  if (normalized.includes('rv point') || normalized.includes('rvp')) {
    return ''
  }
  if (normalized === 'assessor name') {
    return 'David Capener'
  }
  if (normalized.includes('location') || normalized.includes('venue') || normalized.includes('gate')) {
    return eventAddress
  }
  if (normalized === 'company') return ''
  if (
    normalized.includes('manager')
    || normalized.includes('controller')
    || normalized.includes('supervisor')
    || normalized.includes('prepared by')
    || normalized.includes('completed by')
    || normalized.includes('assessor')
    || normalized.includes('reported by')
    || normalized.includes('security lead')
  ) {
    return context.operationalLead
  }
  if (normalized.includes('audience profile') || normalized.includes('event overview')) {
    return [
      getValue(context.fieldValues, 'event_type'),
      getValue(context.fieldValues, 'expected_attendance') ? `Expected attendance: ${getValue(context.fieldValues, 'expected_attendance')}` : '',
      getValue(context.fieldValues, 'audience_age_profile'),
      getValue(context.fieldValues, 'attendance_profile'),
    ].filter(Boolean).join('\n')
  }
  if (normalized.includes('weather') || normalized.includes('environment')) {
    return getValue(context.fieldValues, 'degraded_route_weather_assumptions')
  }
  if (normalized.includes('site updates') || normalized.includes('hot spots') || normalized.includes('queue pinch')) {
    return [
      getValue(context.fieldValues, 'key_zones'),
      getValue(context.fieldValues, 'peak_periods'),
      getValue(context.fieldValues, 'queue_design'),
    ].filter(Boolean).join('\n')
  }
  if (normalized.includes('intelligence') || normalized.includes('threat')) {
    return getValue(context.fieldValues, 'historic_issues')
  }

  return ''
}

export function buildEmpMasterTemplatePrefillFromFieldValues(
  fieldValues: Record<string, string>,
  options: { planTitle?: string; riskAssessmentRows?: EmpMasterTemplateRiskRow[] } = {}
): EmpMasterTemplatePrefillData {
  const eventName = getValue(fieldValues, 'event_name') || clean(options.planTitle)
  const eventDate =
    extractFirstEmpTemplateIsoDate(getValue(fieldValues, 'show_dates'))
    || extractFirstEmpTemplateIsoDate(getValue(fieldValues, 'build_dates'))
    || extractFirstEmpTemplateIsoDate(getValue(fieldValues, 'issue_date'))
  const issueDate = extractFirstEmpTemplateIsoDate(getValue(fieldValues, 'issue_date'))
  const reviewDate = extractFirstEmpTemplateIsoDate(getValue(fieldValues, 'review_date'))
  const operationalLead = resolveOperationalLead(fieldValues)
  const templateFieldValues: Record<string, Record<string, string>> = {}
  const staffSignInPages = buildStaffSignInTablePages(fieldValues, {
    eventName,
    planTitle: options.planTitle,
  })
  const uniformPpePages = buildDailyStaffTablePages('uniform-ppe-allocation-log', fieldValues, {
    eventName,
    planTitle: options.planTitle,
  })
  const radioKitPages = buildDailyStaffTablePages('radio-kit-sign-out-sheet', fieldValues, {
    eventName,
    planTitle: options.planTitle,
  })
  const deploymentMatrixCells = buildTemplateTableCellValues(fieldValues, {
    planTitle: options.planTitle,
    riskAssessmentRows: options.riskAssessmentRows,
  })
  const deploymentMatrixPages = buildDeploymentMatrixTablePages(fieldValues, {
    eventName,
    planTitle: options.planTitle,
  })
  const supervisorDeploymentPages = deploymentMatrixPages.length
    ? buildSupervisorDeploymentTablePagesFromDeploymentTablePages(deploymentMatrixPages)
    : buildSupervisorDeploymentTablePagesFromDeploymentCells(
        deploymentMatrixCells['deployment-matrix'],
        {
          eventName,
          eventDate,
        }
      )
  const templateTablePageValues: Record<string, EmpMasterTemplateTablePagePrefill[]> = {}

  if (staffSignInPages.length) {
    templateTablePageValues['staff-sign-in-sign-out-sheet'] = staffSignInPages
  }

  if (uniformPpePages.length) {
    templateTablePageValues['uniform-ppe-allocation-log'] = uniformPpePages
  }

  if (radioKitPages.length) {
    templateTablePageValues['radio-kit-sign-out-sheet'] = radioKitPages
  }

  if (deploymentMatrixPages.length) {
    templateTablePageValues['deployment-matrix'] = deploymentMatrixPages
  }

  if (supervisorDeploymentPages.length) {
    templateTablePageValues['supervisor-deployment'] = supervisorDeploymentPages
  }

  EMP_MASTER_TEMPLATES.forEach((template) => {
    const fields = getTemplateLabels(template)
      .map((label) => [label, resolveTemplateLabelValue(label, {
        fieldValues,
        eventName,
        eventDate,
        issueDate,
        reviewDate,
        operationalLead,
      })] as const)
      .filter(([, value]) => clean(value))

    if (fields.length) {
      templateFieldValues[template.id] = Object.fromEntries(fields)
    }
  })

  templateFieldValues['deployment-matrix'] = {
    ...(templateFieldValues['deployment-matrix'] || {}),
    'Prepared By': EMP_DEPLOYMENT_PREPARED_BY,
  }

  delete templateFieldValues['uniform-ppe-allocation-log']?.['Sheet Managed By']
  delete templateFieldValues['radio-kit-sign-out-sheet']?.['Comms Manager']
  delete templateFieldValues['incident-accident-form']?.['Reported By (Staff)']
  delete templateFieldValues['incident-accident-form']?.['Date of Incident']
  delete templateFieldValues['refusal-of-entry-ejection-log']?.Supervisor
  delete templateFieldValues['suspicious-item-concern-report']?.['Reported By']
  delete templateFieldValues['suspicious-item-concern-report']?.['Date / Time']
  delete templateFieldValues['daily-security-brief']?.['Duty Security Manager']
  if (templateFieldValues['daily-security-brief']?.['Event Name & Date']) {
    templateFieldValues['daily-security-brief']['Event Name & Date'] = stripEventDateSuffix(
      templateFieldValues['daily-security-brief']['Event Name & Date']
    )
  }
  delete templateFieldValues['duty-manager-debrief']?.['Completed By']
  if (templateFieldValues['duty-manager-debrief']?.['Event Name & Date']) {
    templateFieldValues['duty-manager-debrief']['Event Name & Date'] = stripEventDateSuffix(
      templateFieldValues['duty-manager-debrief']['Event Name & Date']
    )
  }

  return {
    eventName,
    eventDate,
    templateFieldValues,
    templateTableCellValues: deploymentMatrixCells,
    templateTablePageValues,
  }
}
