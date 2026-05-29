import React, { type ReactNode } from 'react'
import { RadioOneDailySecurityBriefBooklet } from '@/components/emp/radio-one-daily-security-brief-booklet'
import {
  type EmpMasterTemplateDefinition,
  type EmpMasterTemplateEmergencyActionPlan,
  type EmpMasterTemplateField,
  type EmpMasterTemplateIncidentForm,
  type EmpMasterTemplateNarrativeForm,
  type EmpMasterTemplateNarrativeSection,
  type EmpMasterTemplateNotice,
  type EmpMasterTemplateNoticeTone,
  type EmpMasterTemplateSuspiciousItemReport,
  type EmpMasterTemplateTable,
  type EmpMasterTemplateTone,
  type EmpMasterTemplateTitleTone,
} from '@/lib/emp/master-templates'
import { cn } from '@/lib/utils'

type EmpMasterTemplatePrefillValues = {
  eventName?: string
  eventDate?: string
  fields?: Record<string, string>
  tableCells?: Record<string, string>
  tablePages?: Array<{
    fields?: Record<string, string>
    tableCells?: Record<string, string>
  }>
}

function formatPrefillDate(value: string | undefined) {
  const raw = String(value || '').trim()
  const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!isoDateMatch) return raw
  const [, year, month, day] = isoDateMatch
  return `${day}/${month}/${year}`
}

const HEADER_CARD_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const HEADER_CARD_WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function formatHeaderCardDate(value: string | undefined) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const slashDateMatch = raw.match(/^(?:(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})$/i)
  const longDateMatch = raw.match(
    /^(?:(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\s+)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i,
  )

  let year = 0
  let month = 0
  let day = 0

  if (isoDateMatch) {
    year = Number(isoDateMatch[1])
    month = Number(isoDateMatch[2])
    day = Number(isoDateMatch[3])
  } else if (slashDateMatch) {
    day = Number(slashDateMatch[1])
    month = Number(slashDateMatch[2])
    year = Number(slashDateMatch[3])
  } else if (longDateMatch) {
    day = Number(longDateMatch[1])
    month = HEADER_CARD_MONTH_NAMES.findIndex((monthName) => (
      monthName.toLowerCase() === longDateMatch[2].toLowerCase()
    )) + 1
    year = Number(longDateMatch[3])
  } else {
    return raw
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    !Number.isFinite(date.getTime())
    || date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return raw
  }

  return `${HEADER_CARD_WEEKDAY_NAMES[date.getUTCDay()]} ${day} ${HEADER_CARD_MONTH_NAMES[month - 1]} ${year}`
}

function normalizePrefillLabel(label: string) {
  return String(label || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()
}

function prefillLabelHasWord(label: string, word: string) {
  const normalized = normalizePrefillLabel(label)
  return new RegExp(`\\b${word}\\b`).test(normalized)
}

function stripEventDateSuffix(value: string) {
  return String(value || '').trim().replace(/\s+-\s+\d{1,2}\/\d{1,2}\/20\d{2}\s*$/, '')
}

function resolvePrefillValue(label: string, prefillValues?: EmpMasterTemplatePrefillValues) {
  const normalizedLabel = normalizePrefillLabel(label)
  const exactFieldValue = prefillValues?.fields?.[label]
  if (typeof exactFieldValue === 'string' && exactFieldValue.trim()) {
    if (normalizedLabel === 'event name and date') return stripEventDateSuffix(exactFieldValue)
    return prefillLabelHasWord(label, 'date') ? formatPrefillDate(exactFieldValue.trim()) : exactFieldValue.trim()
  }

  const normalizedFieldEntries = Object.entries(prefillValues?.fields || {})
  const matchingFieldEntry = normalizedFieldEntries.find(([key]) => normalizePrefillLabel(key) === normalizedLabel)
  if (matchingFieldEntry?.[1]?.trim()) {
    if (normalizedLabel === 'event name and date') return stripEventDateSuffix(matchingFieldEntry[1])
    return prefillLabelHasWord(label, 'date') ? formatPrefillDate(matchingFieldEntry[1].trim()) : matchingFieldEntry[1].trim()
  }

  const eventName = String(prefillValues?.eventName || '').trim()
  const eventDate = formatPrefillDate(prefillValues?.eventDate)

  if (normalizedLabel === 'date of incident' || normalizedLabel === 'date time') {
    return ''
  }

  if (normalizedLabel === 'event name and date') {
    return eventName
  }

  if (normalizedLabel.includes('event') && prefillLabelHasWord(label, 'date')) {
    if (eventName && eventDate) return `${eventName} - ${eventDate}`
    return eventName || eventDate
  }

  if (normalizedLabel.includes('event')) {
    return eventName
  }

  if (prefillLabelHasWord(label, 'date')) {
    return eventDate
  }

  return ''
}

function getInfoGridClass(fieldCount: number) {
  if (fieldCount >= 4) {
    return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
  }

  if (fieldCount === 3) {
    return 'grid-cols-1 md:grid-cols-3'
  }

  return 'grid-cols-1 md:grid-cols-2'
}

function getToneClasses(tone: EmpMasterTemplateTone | undefined) {
  switch (tone) {
    case 'positive':
      return {
        header: 'bg-emerald-50 text-emerald-950',
        cell: 'bg-emerald-50/70',
      }
    case 'negative':
      return {
        header: 'bg-rose-50 text-rose-950',
        cell: 'bg-rose-50/70',
      }
    default:
      return {
        header: 'bg-slate-100 text-slate-900',
        cell: 'bg-white',
      }
  }
}

function getTitleToneClass(tone: EmpMasterTemplateTitleTone | undefined) {
  switch (tone) {
    case 'danger':
      return 'text-red-700'
    case 'warning':
      return 'text-amber-700'
    default:
      return 'text-slate-950'
  }
}

function getNoticeToneClasses(tone: EmpMasterTemplateNoticeTone | undefined) {
  switch (tone) {
    case 'danger':
      return 'border-red-300 bg-red-50 text-red-900'
    case 'warning':
      return 'border-amber-300 bg-amber-50 text-amber-900'
    default:
      return 'border-sky-300 bg-sky-50 text-sky-900'
  }
}

function getSectionToneClasses(tone: EmpMasterTemplateNoticeTone | undefined) {
  switch (tone) {
    case 'danger':
      return {
        header: 'bg-red-50 text-red-900',
        body: 'bg-white',
      }
    case 'warning':
      return {
        header: 'bg-amber-50 text-amber-900',
        body: 'bg-white',
      }
    default:
      return {
        header: 'bg-slate-100 text-slate-900',
        body: 'bg-white',
      }
  }
}

function getTemplateHeaderFields(template: EmpMasterTemplateDefinition): EmpMasterTemplateField[] {
  switch (template.kind) {
    case 'table':
      return template.infoFields
    case 'narrative_form':
      return template.headerFields
    default:
      return []
  }
}

function getHeaderCardDateLabel(
  template: EmpMasterTemplateDefinition,
  prefillValues?: EmpMasterTemplatePrefillValues,
) {
  const headerDateField = getTemplateHeaderFields(template).find((field) => (
    prefillLabelHasWord(field.label, 'date')
  ))
  const headerDateValue = headerDateField ? resolvePrefillValue(headerDateField.label, prefillValues) : ''
  if (headerDateValue) return formatHeaderCardDate(headerDateValue)

  const matchingFieldDate = Object.entries(prefillValues?.fields || {}).find(([label, value]) => (
    prefillLabelHasWord(label, 'date') && String(value || '').trim()
  ))

  if (matchingFieldDate?.[1]) return formatHeaderCardDate(matchingFieldDate[1])

  const directEventDate = formatHeaderCardDate(prefillValues?.eventDate)
  if (directEventDate) return directEventDate

  const hasLocationOnlyPrefill = Object.entries(prefillValues?.fields || {}).some(([label, value]) => (
    normalizePrefillLabel(label) === 'location venue' && String(value || '').trim()
  ))
  if (hasLocationOnlyPrefill) return ''

  return 'Event Date'
}

function getHeaderCardLocationLabel(prefillValues?: EmpMasterTemplatePrefillValues) {
  const locationField = Object.entries(prefillValues?.fields || {}).find(([label, value]) => (
    normalizePrefillLabel(label) === 'location venue' && String(value || '').trim()
  ))

  return String(locationField?.[1] || '').trim()
}

function getDocumentDescription(
  template: EmpMasterTemplateDefinition,
  prefillValues?: EmpMasterTemplatePrefillValues
) {
  return String(prefillValues?.fields?.['Document Description'] || template.description).trim()
}

function getTableColumnLabel(
  column: EmpMasterTemplateTable['columns'][number],
  prefillValues?: EmpMasterTemplatePrefillValues
) {
  return String(prefillValues?.fields?.[`Column Label: ${column.key}`] || column.label).trim()
}

function isTableColumnHidden(
  column: EmpMasterTemplateTable['columns'][number],
  prefillValues?: EmpMasterTemplatePrefillValues
) {
  return String(prefillValues?.fields?.[`Column Hidden: ${column.key}`] || '').trim().toLowerCase() === 'true'
}

function getTableEmptyRowCount(
  template: EmpMasterTemplateTable,
  prefillValues?: EmpMasterTemplatePrefillValues
) {
  const overrideRows = Number.parseInt(String(prefillValues?.fields?.['Table Empty Rows'] || ''), 10)
  return Number.isFinite(overrideRows) && overrideRows > 0
    ? overrideRows
    : template.emptyRows
}

function MasterTemplateHeader({
  template,
  prefillValues,
}: {
  template: EmpMasterTemplateDefinition
  prefillValues?: EmpMasterTemplatePrefillValues
}) {
  const headerFields = getTemplateHeaderFields(template)
  const fieldCount = template.kind === 'incident_form' ? 4 : headerFields.length
  const headerDateLabel = getHeaderCardDateLabel(template, prefillValues)
  const headerLocationLabel = getHeaderCardLocationLabel(prefillValues)
  const headerCardMiddleLabel = headerDateLabel || headerLocationLabel
  const description = getDocumentDescription(template, prefillValues)

  return (
    <div className="emp-master-template-header mb-4 border-b border-slate-300 pb-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-24 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1">
            <img src="/kss-logo.png" alt="KSS logo" className="max-h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              KSS Event Management
            </p>
            <h1 className={cn('mt-1 text-[22px] font-bold leading-tight', getTitleToneClass(template.titleTone))}>
              {template.title}
            </h1>
            <p className="mt-1 max-w-[620px] text-[11px] leading-5 text-slate-600">
              {description}
            </p>
          </div>
        </div>

        <div className="min-w-[180px] rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
            KSS NW LTD
          </p>
          <p className="mt-1 text-sm font-semibold leading-tight text-slate-950">{headerCardMiddleLabel}</p>
          <p className="text-[11px] font-semibold text-slate-600">{template.documentCode}</p>
        </div>
      </div>

      {fieldCount > 0 ? (
        <div
          data-field-count={fieldCount}
          className={cn('emp-master-template-info-grid grid gap-3', getInfoGridClass(fieldCount))}
        >
          {template.kind === 'incident_form' ? (
            <>
              <div className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Form Completed By
                </div>
                <div className="mt-4 h-[18px] border-b border-slate-700" />
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Form Checked By
                </div>
                <div className="mt-4 h-[18px] border-b border-slate-700" />
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Reference No.
                </div>
                <div className="mt-4 h-[18px] border-b border-slate-700" />
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Page
                </div>
                <div className="mt-4 h-[18px] border-b border-slate-700" />
              </div>
            </>
          ) : (
            headerFields.map((field) => (
              <div key={field.label} className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {field.label}
                </div>
                <div className="relative mt-4 h-[18px]">
                  <div className="absolute inset-x-0 bottom-0 border-b border-slate-700" />
                  <div className="absolute inset-x-0 bottom-[3px] truncate text-[10px] font-medium leading-none text-slate-900">
                    {resolvePrefillValue(field.label, prefillValues)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

function NoticeBanner({ notice }: { notice: EmpMasterTemplateNotice }) {
  const paragraphs = Array.isArray(notice.body) ? notice.body : [notice.body]

  return (
    <div className={cn('rounded-md border px-4 py-3 text-[10px] leading-5', getNoticeToneClasses(notice.tone))}>
      {notice.title ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]">{notice.title}</p>
      ) : null}
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  )
}

function getFooterDocumentLabel(prefillValues?: EmpMasterTemplatePrefillValues) {
  const eventName = String(prefillValues?.eventName || '').trim()
  if (eventName) return eventName

  const eventField = Object.entries(prefillValues?.fields || {}).find(([label, value]) => {
    const normalizedLabel = label.toLowerCase()
    return normalizedLabel.includes('event') && String(value || '').trim()
  })

  return String(eventField?.[1] || '').trim() || 'Controlled blank document'
}

function DocumentFooter({
  template,
  prefillValues,
}: {
  template: EmpMasterTemplateDefinition
  prefillValues?: EmpMasterTemplatePrefillValues
}) {
  const documentLabel = getFooterDocumentLabel(prefillValues)

  return (
    <footer className="mt-3 flex items-center justify-between gap-4 border-t border-slate-300 pt-2 text-[10px] text-slate-500">
      <span>KSS NW LTD | {template.title} | {template.documentCode}</span>
      <span className="max-w-[55%] text-right leading-tight">{documentLabel}</span>
    </footer>
  )
}

function PairInfoTable({
  rows,
  prefillValues,
}: {
  rows: Array<[string, string]>
  prefillValues?: EmpMasterTemplatePrefillValues
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-300">
      <table className="w-full table-fixed border-collapse text-[10px] leading-[1.3]">
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('-')}>
              <td className="w-1/4 border border-slate-300 bg-slate-100 px-2 py-2 font-semibold text-slate-900">
                {row[0]}
              </td>
              <td className="w-1/4 border border-slate-300 px-2 py-2 font-medium text-slate-900">
                {resolvePrefillValue(row[0], prefillValues)}
              </td>
              <td className="w-1/4 border border-slate-300 bg-slate-100 px-2 py-2 font-semibold text-slate-900">
                {row[1]}
              </td>
              <td className="border border-slate-300 px-2 py-2 font-medium text-slate-900">
                {resolvePrefillValue(row[1], prefillValues)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionBox({
  title,
  heightClass,
  tone,
  children,
}: {
  title: string
  heightClass?: string
  tone?: EmpMasterTemplateNoticeTone
  children?: ReactNode
}) {
  const toneClasses = getSectionToneClasses(tone)

  return (
    <section className="overflow-hidden rounded-md border border-slate-300">
      <div
        className={cn(
          'border-b border-slate-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]',
          toneClasses.header
        )}
      >
        {title}
      </div>
      <div className={cn('px-3 py-3 text-[10px] text-slate-700', toneClasses.body, heightClass)}>{children}</div>
    </section>
  )
}

function TableTemplateDocument({ template }: { template: EmpMasterTemplateTable }) {
  return <TableTemplateDocumentWithPrefill template={template} />
}

function TableTemplateDocumentWithPrefill({
  template,
  prefillValues,
  rowOffset = 0,
}: {
  template: EmpMasterTemplateTable
  prefillValues?: EmpMasterTemplatePrefillValues
  rowOffset?: number
}) {
  const visibleColumns = template.columns.filter((column) => !isTableColumnHidden(column, prefillValues))
  const emptyRows = getTableEmptyRowCount(template, prefillValues)

  return (
    <div className="emp-master-template-table-layout flex min-h-0 flex-1 flex-col">
      <div className="emp-master-template-table-shell min-h-0 flex-1 overflow-hidden rounded-md border border-slate-300">
        <table className="w-full table-fixed border-collapse text-[10px] leading-[1.25]">
          <thead>
            <tr>
              {visibleColumns.map((column) => {
                const tone = getToneClasses(column.tone)
                return (
                  <th
                    key={column.key}
                    style={{ width: column.width }}
                    className={cn(
                      'emp-master-template-table-head-cell border border-slate-300 px-2 py-2 text-left align-top text-[9px] font-semibold uppercase tracking-[0.08em]',
                      tone.header,
                      column.align === 'center' ? 'text-center' : ''
                    )}
                  >
                    {getTableColumnLabel(column, prefillValues)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: emptyRows }).map((_, rowIndex) => (
              <tr
                key={`${template.id}-row-${rowOffset + rowIndex}`}
                className={cn('emp-master-template-table-row', template.rowHeightClass || 'h-[31px]')}
              >
                {visibleColumns.map((column) => {
                  const tone = getToneClasses(column.tone)
                  return (
                    <td
                      key={`${template.id}-${column.key}-${rowIndex}`}
                      className={cn(
                        'emp-master-template-table-cell border border-slate-300 px-2 py-2 align-top',
                        tone.cell,
                        column.align === 'center' ? 'text-center' : ''
                      )}
                    >
                      {prefillValues?.tableCells?.[`${rowOffset + rowIndex}:${column.key}`] || ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {template.footerNote || template.footerRight ? (
        <div className="emp-master-template-table-note mt-3 flex items-end justify-between gap-4 text-[10px] leading-5 text-slate-600">
          <div className="max-w-[720px]">{template.footerNote ? <p>{template.footerNote}</p> : <span />}</div>
          {template.footerRight ? (
            <div className="whitespace-nowrap font-medium text-slate-500">{template.footerRight}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function getPrefilledTableRowCount(tableCells: Record<string, string> | undefined) {
  const rowIndexes = Object.entries(tableCells || {})
    .filter(([, value]) => String(value || '').trim())
    .map(([cellKey]) => Number.parseInt(cellKey.split(':')[0] || '', 10))
    .filter((rowIndex) => Number.isFinite(rowIndex) && rowIndex >= 0)

  return rowIndexes.length ? Math.max(...rowIndexes) + 1 : 0
}

function getTablePageOffsets(template: EmpMasterTemplateTable, prefillValues?: EmpMasterTemplatePrefillValues) {
  const filledRowCount = getPrefilledTableRowCount(prefillValues?.tableCells)
  const pageCount = Math.max(1, Math.ceil(Math.max(filledRowCount, template.emptyRows) / template.emptyRows))
  return Array.from({ length: pageCount }).map((_, pageIndex) => pageIndex * template.emptyRows)
}

function getTablePagePrefillValues(
  prefillValues: EmpMasterTemplatePrefillValues | undefined,
  tablePage: NonNullable<EmpMasterTemplatePrefillValues['tablePages']>[number] | undefined
) {
  if (!tablePage) return prefillValues

  return {
    ...prefillValues,
    fields: {
      ...(prefillValues?.fields || {}),
      ...(tablePage.fields || {}),
    },
    tableCells: tablePage.tableCells || {},
  }
}

function MasterTemplatePage({
  template,
  prefillValues,
  tableRowOffset = 0,
}: {
  template: EmpMasterTemplateDefinition
  prefillValues?: EmpMasterTemplatePrefillValues
  tableRowOffset?: number
}) {
  return (
    <article
      className={cn(
        'emp-master-template-page',
        template.orientation === 'landscape'
          ? 'emp-master-template-page--landscape'
          : 'emp-master-template-page--portrait'
      )}
    >
      <MasterTemplateHeader template={template} prefillValues={prefillValues} />

      <div className="emp-master-template-page-body flex min-h-0 flex-1 flex-col gap-3">
        {template.notice ? <NoticeBanner notice={template.notice} /> : null}

        {template.kind === 'table' ? (
          <TableTemplateDocumentWithPrefill
            template={template}
            prefillValues={prefillValues}
            rowOffset={tableRowOffset}
          />
        ) : template.kind === 'incident_form' ? (
          <IncidentTemplateDocument template={template} prefillValues={prefillValues} />
        ) : template.kind === 'narrative_form' ? (
          <NarrativeTemplateDocumentWithPrefill template={template} prefillValues={prefillValues} />
        ) : template.kind === 'emergency_action_plan' ? (
          <EmergencyActionPlanDocument template={template} prefillValues={prefillValues} />
        ) : template.kind === 'suspicious_item_report' ? (
          <SuspiciousItemTemplateDocument template={template} prefillValues={prefillValues} />
        ) : null}
      </div>

      <DocumentFooter template={template} prefillValues={prefillValues} />
    </article>
  )
}

function IncidentTemplateDocument({
  template,
  prefillValues,
}: {
  template: EmpMasterTemplateIncidentForm
  prefillValues?: EmpMasterTemplatePrefillValues
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PairInfoTable rows={template.infoRows} prefillValues={prefillValues} />

      <SectionBox title="Category (tick all that apply)">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-3">
          {template.categories.map((category) => (
            <div key={category} className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 border border-slate-700" />
              <span>{category === 'Other' ? 'Other: ____________________' : category}</span>
            </div>
          ))}
        </div>
      </SectionBox>

      <SectionBox title="Incident Description (facts only, what happened?)" heightClass="h-[128px]" />
      <SectionBox title="Immediate Action Taken" heightClass="h-[84px]" />
      <SectionBox
        title="Persons Involved / Witnesses (Names, Contacts, Descriptions)"
        heightClass="h-[84px]"
      />

      <div className="overflow-hidden rounded-md border border-slate-300">
        <table className="w-full table-fixed border-collapse text-[10px] leading-[1.3]">
          <tbody>
            <tr>
              <td className="w-1/4 border border-slate-300 bg-slate-100 px-2 py-2 font-semibold">Police Informed?</td>
              <td className="w-1/4 border border-slate-300 px-2 py-2">[ ] Yes  [ ] No</td>
              <td className="w-1/4 border border-slate-300 bg-slate-100 px-2 py-2 font-semibold">Officer Badge #</td>
              <td className="w-1/4 border border-slate-300 px-2 py-2" />
            </tr>
            <tr>
              <td className="border border-slate-300 bg-slate-100 px-2 py-2 font-semibold">Medics Required?</td>
              <td className="border border-slate-300 px-2 py-2">[ ] Yes  [ ] No</td>
              <td className="border border-slate-300 bg-slate-100 px-2 py-2 font-semibold">Medic Ref #</td>
              <td className="border border-slate-300 px-2 py-2" />
            </tr>
            <tr>
              <td className="border border-slate-300 bg-slate-100 px-2 py-2 font-semibold">Supervisor Review</td>
              <td className="border border-slate-300 px-2 py-2" />
              <td className="border border-slate-300 bg-slate-100 px-2 py-2 font-semibold">Signature</td>
              <td className="border border-slate-300 px-2 py-2" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KeyLinesSection({ section }: { section: Extract<EmpMasterTemplateNarrativeSection, { type: 'key_lines' }> }) {
  return (
    <SectionBox title={section.title}>
      <div className="space-y-3">
        {section.fields.map((field) => (
          <div key={field.label} className="flex items-end gap-3">
            <span
              className={cn(
                'w-48 text-[10px] font-semibold',
                field.tone === 'danger'
                  ? 'text-red-700'
                  : field.tone === 'success'
                    ? 'text-emerald-700'
                    : 'text-slate-900'
              )}
            >
              {field.label}
            </span>
            <div className="h-4 flex-1 border-b border-slate-700" />
          </div>
        ))}
      </div>
    </SectionBox>
  )
}

function NumberedLinesSection({
  section,
}: {
  section: Extract<EmpMasterTemplateNarrativeSection, { type: 'numbered_lines' }>
}) {
  return (
    <SectionBox title={section.title}>
      <div className="space-y-3">
        {Array.from({ length: section.count }).map((_, index) => (
          <div key={`${section.title}-${index}`} className="flex items-end gap-3">
            <span className="w-5 font-semibold text-slate-900">{index + 1}.</span>
            <div className="h-4 flex-1 border-b border-slate-700" />
          </div>
        ))}
      </div>
    </SectionBox>
  )
}

function NarrativeTemplateDocument({ template }: { template: EmpMasterTemplateNarrativeForm }) {
  return <NarrativeTemplateDocumentWithPrefill template={template} />
}

function NarrativeTemplateDocumentWithPrefill({
  template,
  prefillValues,
}: {
  template: EmpMasterTemplateNarrativeForm
  prefillValues?: EmpMasterTemplatePrefillValues
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {template.sections.map((section) => {
        if (section.type === 'textbox') {
          const sectionPrefill = resolvePrefillValue(section.title, prefillValues)
          return (
            <SectionBox
              key={section.title}
              title={section.title}
              heightClass={section.heightClass}
              tone={section.tone}
            >
              {sectionPrefill ? <p className="whitespace-pre-wrap leading-5">{sectionPrefill}</p> : null}
            </SectionBox>
          )
        }

        if (section.type === 'key_lines') {
          return <KeyLinesSection key={section.title} section={section} />
        }

        return <NumberedLinesSection key={section.title} section={section} />
      })}
    </div>
  )
}

function EmergencyActionPlanDocument({
  template,
  prefillValues,
}: {
  template: EmpMasterTemplateEmergencyActionPlan
  prefillValues?: EmpMasterTemplatePrefillValues
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PairInfoTable rows={template.infoRows} prefillValues={prefillValues} />

      <SectionBox title="Immediate Escalation Actions">
        <div className="space-y-3 text-[10px] leading-5">
          {template.escalationSteps.map((step) => (
            <p key={step.label}>
              <span className="font-semibold text-slate-900">{step.label}:</span> {step.body}
            </p>
          ))}
        </div>
      </SectionBox>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-300">
        <div className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-900">
          Emergency Contacts
        </div>
        <table className="w-full table-fixed border-collapse text-[10px] leading-[1.3]">
          <thead>
            <tr>
              <th className="w-[34%] border border-slate-300 bg-slate-100 px-2 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.08em]">
                Role / Service
              </th>
              <th className="w-[26%] border border-slate-300 bg-slate-100 px-2 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.08em]">
                Name
              </th>
              <th className="border border-slate-300 bg-slate-100 px-2 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.08em]">
                Contact Number / Radio Channel
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: template.emergencyContactRows }).map((_, rowIndex) => (
              <tr key={`${template.id}-contact-${rowIndex}`} className="h-[34px]">
                <td className="border border-slate-300 px-2 py-2" />
                <td className="border border-slate-300 px-2 py-2" />
                <td className="border border-slate-300 px-2 py-2" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SuspiciousItemTemplateDocument({
  template,
  prefillValues,
}: {
  template: EmpMasterTemplateSuspiciousItemReport
  prefillValues?: EmpMasterTemplatePrefillValues
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PairInfoTable rows={template.infoRows} prefillValues={prefillValues} />

      <SectionBox title="HOT Assessment (Hidden, Obviously Suspicious, Typical)" tone="warning">
        <div className="space-y-3">
          {template.hotQuestions.map((question) => (
            <div key={question} className="flex items-center justify-between gap-4">
              <span>{question}</span>
              <span className="whitespace-nowrap">[ ] Yes   [ ] No</span>
            </div>
          ))}
        </div>
      </SectionBox>

      <SectionBox title="Description of Item or Behaviour" heightClass="h-[86px]" />
      <SectionBox title="Initial Action Taken (Cordon, Distances, Notifications)" heightClass="h-[86px]" />

      <div className="overflow-hidden rounded-md border border-slate-300">
        <table className="w-full table-fixed border-collapse text-[10px] leading-[1.3]">
          <tbody>
            <tr>
              <td className="w-1/4 border border-slate-300 bg-slate-100 px-2 py-2 font-semibold">Control Room Notified?</td>
              <td className="w-1/4 border border-slate-300 px-2 py-2">[ ] Yes   Time: ______</td>
              <td className="w-1/4 border border-slate-300 bg-slate-100 px-2 py-2 font-semibold">Police Notified?</td>
              <td className="w-1/4 border border-slate-300 px-2 py-2">[ ] Yes   Time: ______</td>
            </tr>
            <tr>
              <td className="border border-slate-300 bg-slate-100 px-2 py-2 font-semibold">Resolution</td>
              <td colSpan={3} className="h-[58px] border border-slate-300 px-2 py-2" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function EmpMasterTemplateDocument({
  template,
  prefillValues,
  radioOneLayout = 'booklet',
}: {
  template: EmpMasterTemplateDefinition
  prefillValues?: EmpMasterTemplatePrefillValues
  radioOneLayout?: 'pages' | 'booklet'
}) {
  if (template.kind === 'radio_one_daily_brief_booklet') {
    return (
      <div
        id="print-root"
        data-pdf-title={template.title}
        data-pdf-template-id={template.id}
        data-pdf-filename={template.filename}
        data-pdf-event-name={prefillValues?.eventName || "BBC Radio 1's Big Weekend Sunderland 2026"}
        data-pdf-event-date={prefillValues?.eventDate || ''}
        data-pdf-prefill-fields={JSON.stringify(prefillValues?.fields || {})}
        className="emp-master-template-root"
      >
        <div className="emp-master-template-content emp-radio-one-brief-content">
          <RadioOneDailySecurityBriefBooklet layout={radioOneLayout} />
        </div>
      </div>
    )
  }

  const tablePageInputs = template.kind === 'table' && prefillValues?.tablePages?.length
    ? prefillValues.tablePages.map((tablePage, pageIndex) => ({
        key: `${template.id}-page-${pageIndex}`,
        prefillValues: getTablePagePrefillValues(prefillValues, tablePage),
        tableRowOffset: 0,
      }))
    : template.kind === 'table'
      ? getTablePageOffsets(template, prefillValues).map((rowOffset) => ({
          key: `${template.id}-${rowOffset}`,
          prefillValues,
          tableRowOffset: rowOffset,
        }))
      : [{
          key: template.id,
          prefillValues,
          tableRowOffset: 0,
        }]

  return (
    <div
      id="print-root"
      data-pdf-title={template.title}
      data-pdf-template-id={template.id}
      data-pdf-filename={template.filename}
      data-pdf-event-name={prefillValues?.eventName || ''}
      data-pdf-event-date={prefillValues?.eventDate || ''}
      data-pdf-prefill-fields={JSON.stringify(prefillValues?.fields || {})}
      className="emp-master-template-root"
    >
      <div className="emp-master-template-content">
        {tablePageInputs.map((page) => (
          <MasterTemplatePage
            key={page.key}
            template={template}
            prefillValues={page.prefillValues}
            tableRowOffset={page.tableRowOffset}
          />
        ))}
      </div>
    </div>
  )
}
