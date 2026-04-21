import React, { type ReactNode } from 'react'
import {
  type CmpMasterTemplateDefinition,
  type CmpMasterTemplateEmergencyActionPlan,
  type CmpMasterTemplateField,
  type CmpMasterTemplateIncidentForm,
  type CmpMasterTemplateNarrativeForm,
  type CmpMasterTemplateNarrativeSection,
  type CmpMasterTemplateNotice,
  type CmpMasterTemplateNoticeTone,
  type CmpMasterTemplateSuspiciousItemReport,
  type CmpMasterTemplateTable,
  type CmpMasterTemplateTone,
  type CmpMasterTemplateTitleTone,
} from '@/lib/cmp/master-templates'
import { cn } from '@/lib/utils'

function getInfoGridClass(fieldCount: number) {
  if (fieldCount >= 4) {
    return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
  }

  if (fieldCount === 3) {
    return 'grid-cols-1 md:grid-cols-3'
  }

  return 'grid-cols-1 md:grid-cols-2'
}

function getToneClasses(tone: CmpMasterTemplateTone | undefined) {
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

function getTitleToneClass(tone: CmpMasterTemplateTitleTone | undefined) {
  switch (tone) {
    case 'danger':
      return 'text-red-700'
    case 'warning':
      return 'text-amber-700'
    default:
      return 'text-slate-950'
  }
}

function getNoticeToneClasses(tone: CmpMasterTemplateNoticeTone | undefined) {
  switch (tone) {
    case 'danger':
      return 'border-red-300 bg-red-50 text-red-900'
    case 'warning':
      return 'border-amber-300 bg-amber-50 text-amber-900'
    default:
      return 'border-sky-300 bg-sky-50 text-sky-900'
  }
}

function getSectionToneClasses(tone: CmpMasterTemplateNoticeTone | undefined) {
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

function getTemplateHeaderFields(template: CmpMasterTemplateDefinition): CmpMasterTemplateField[] {
  switch (template.kind) {
    case 'table':
      return template.infoFields
    case 'narrative_form':
      return template.headerFields
    default:
      return []
  }
}

function MasterTemplateHeader({ template }: { template: CmpMasterTemplateDefinition }) {
  const headerFields = getTemplateHeaderFields(template)
  const fieldCount = template.kind === 'incident_form' ? 4 : headerFields.length

  return (
    <div className="cmp-master-template-header mb-4 border-b border-slate-300 pb-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-24 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1">
            <img src="/kss-logo.png" alt="KSS logo" className="max-h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              KSS Crowd Management
            </p>
            <h1 className={cn('mt-1 text-[22px] font-bold leading-tight', getTitleToneClass(template.titleTone))}>
              {template.title}
            </h1>
            <p className="mt-1 max-w-[620px] text-[11px] leading-5 text-slate-600">
              {template.description}
            </p>
          </div>
        </div>

        <div className="min-w-[180px] rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
            Master Template
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{template.documentCode}</p>
          <p className="text-[11px] text-slate-600">
            Crowd Management / {template.category}
          </p>
        </div>
      </div>

      {fieldCount > 0 ? (
        <div className={cn('grid gap-3', getInfoGridClass(fieldCount))}>
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
                <div className="mt-4 h-[18px] border-b border-slate-700" />
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

function NoticeBanner({ notice }: { notice: CmpMasterTemplateNotice }) {
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

function DocumentFooter({ template }: { template: CmpMasterTemplateDefinition }) {
  return (
    <footer className="mt-3 flex items-center justify-between gap-4 border-t border-slate-300 pt-2 text-[10px] text-slate-500">
      <span>KSS NW LTD | Crowd Management Master Templates | {template.documentCode}</span>
      <span>Controlled blank document</span>
    </footer>
  )
}

function PairInfoTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-300">
      <table className="w-full table-fixed border-collapse text-[10px] leading-[1.3]">
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('-')}>
              <td className="w-1/4 border border-slate-300 bg-slate-100 px-2 py-2 font-semibold text-slate-900">
                {row[0]}
              </td>
              <td className="w-1/4 border border-slate-300 px-2 py-2" />
              <td className="w-1/4 border border-slate-300 bg-slate-100 px-2 py-2 font-semibold text-slate-900">
                {row[1]}
              </td>
              <td className="border border-slate-300 px-2 py-2" />
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
  tone?: CmpMasterTemplateNoticeTone
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

function TableTemplateDocument({ template }: { template: CmpMasterTemplateTable }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-slate-300">
        <table className="w-full table-fixed border-collapse text-[10px] leading-[1.25]">
          <thead>
            <tr>
              {template.columns.map((column) => {
                const tone = getToneClasses(column.tone)
                return (
                  <th
                    key={column.key}
                    style={{ width: column.width }}
                    className={cn(
                      'border border-slate-300 px-2 py-2 text-left align-top text-[9px] font-semibold uppercase tracking-[0.08em]',
                      tone.header,
                      column.align === 'center' ? 'text-center' : ''
                    )}
                  >
                    {column.label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: template.emptyRows }).map((_, rowIndex) => (
              <tr key={`${template.id}-row-${rowIndex}`} className={template.rowHeightClass || 'h-[31px]'}>
                {template.columns.map((column) => {
                  const tone = getToneClasses(column.tone)
                  return (
                    <td
                      key={`${template.id}-${column.key}-${rowIndex}`}
                      className={cn(
                        'border border-slate-300 px-2 py-2 align-top',
                        tone.cell,
                        column.align === 'center' ? 'text-center' : ''
                      )}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {template.footerNote || template.footerRight ? (
        <div className="mt-3 flex items-end justify-between gap-4 text-[10px] leading-5 text-slate-600">
          <div className="max-w-[720px]">{template.footerNote ? <p>{template.footerNote}</p> : <span />}</div>
          {template.footerRight ? (
            <div className="whitespace-nowrap font-medium text-slate-500">{template.footerRight}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function IncidentTemplateDocument({ template }: { template: CmpMasterTemplateIncidentForm }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PairInfoTable rows={template.infoRows} />

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

function KeyLinesSection({ section }: { section: Extract<CmpMasterTemplateNarrativeSection, { type: 'key_lines' }> }) {
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
  section: Extract<CmpMasterTemplateNarrativeSection, { type: 'numbered_lines' }>
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

function NarrativeTemplateDocument({ template }: { template: CmpMasterTemplateNarrativeForm }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {template.sections.map((section) => {
        if (section.type === 'textbox') {
          return (
            <SectionBox
              key={section.title}
              title={section.title}
              heightClass={section.heightClass}
              tone={section.tone}
            />
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

function EmergencyActionPlanDocument({ template }: { template: CmpMasterTemplateEmergencyActionPlan }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PairInfoTable rows={template.infoRows} />

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

function SuspiciousItemTemplateDocument({ template }: { template: CmpMasterTemplateSuspiciousItemReport }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PairInfoTable rows={template.infoRows} />

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

export function CmpMasterTemplateDocument({ template }: { template: CmpMasterTemplateDefinition }) {
  return (
    <div
      id="print-root"
      data-pdf-title={template.title}
      data-pdf-template-id={template.id}
      data-pdf-filename={template.filename}
      className="cmp-master-template-root"
    >
      <div className="cmp-master-template-content">
        <article
          className={cn(
            'cmp-master-template-page',
            template.orientation === 'landscape'
              ? 'cmp-master-template-page--landscape'
              : 'cmp-master-template-page--portrait'
          )}
        >
          <MasterTemplateHeader template={template} />

          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {template.notice ? <NoticeBanner notice={template.notice} /> : null}

            {template.kind === 'table' ? (
              <TableTemplateDocument template={template} />
            ) : template.kind === 'incident_form' ? (
              <IncidentTemplateDocument template={template} />
            ) : template.kind === 'narrative_form' ? (
              <NarrativeTemplateDocument template={template} />
            ) : template.kind === 'emergency_action_plan' ? (
              <EmergencyActionPlanDocument template={template} />
            ) : (
              <SuspiciousItemTemplateDocument template={template} />
            )}
          </div>

          <DocumentFooter template={template} />
        </article>
      </div>
    </div>
  )
}
