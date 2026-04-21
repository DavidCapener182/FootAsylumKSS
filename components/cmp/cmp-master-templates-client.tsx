'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Map,
  MessageSquare,
  Phone,
  Printer,
  Radio,
  ScrollText,
  Shield,
  Clock,
  UserMinus,
  Users,
} from 'lucide-react'
import { CmpMasterTemplateDocument } from '@/components/cmp/cmp-master-template-document'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  CMP_MASTER_TEMPLATES,
  groupCmpMasterTemplatesByCategory,
  type CmpMasterTemplateDefinition,
  type CmpMasterTemplateIconKey,
} from '@/lib/cmp/master-templates'
import { cn } from '@/lib/utils'

const TEMPLATE_GROUPS = groupCmpMasterTemplatesByCategory()

const iconMap: Record<CmpMasterTemplateIconKey, typeof Shield> = {
  shield: Shield,
  radio: Radio,
  users: ClipboardCheck,
  list: ScrollText,
  alert: AlertTriangle,
  map: Map,
  phone: Phone,
  clock: Clock,
  message: MessageSquare,
  clipboard: ClipboardCheck,
  'user-minus': UserMinus,
  eye: Eye,
  document: FileText,
  team: Users,
}

export function CmpMasterTemplatesClient() {
  const [activeTemplateId, setActiveTemplateId] = useState(CMP_MASTER_TEMPLATES[0]?.id ?? '')

  const activeTemplate = useMemo<CmpMasterTemplateDefinition | null>(
    () => CMP_MASTER_TEMPLATES.find((template) => template.id === activeTemplateId) ?? CMP_MASTER_TEMPLATES[0] ?? null,
    [activeTemplateId]
  )

  if (!activeTemplate) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Master Templates</h1>
              <Badge variant="outline">{CMP_MASTER_TEMPLATES.length} documents</Badge>
            </div>
            <p className="max-w-3xl text-sm text-slate-600">
              Blank event-day plans, checklists, logs, and briefing sheets ready for live-event printing.
            </p>
          </div>
          <a
            href={`/api/cmp/master-templates/generate-pdf?templateId=${activeTemplate.id}`}
            className={cn(buttonVariants({ variant: 'default' }), 'bg-emerald-700 hover:bg-emerald-800')}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Active PDF
          </a>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
        <aside className="overflow-hidden rounded-lg border border-slate-200 bg-white xl:sticky xl:top-6 xl:flex xl:max-h-[calc(100vh-3rem)] xl:flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Crowd Management
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Event Documents</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Choose a master document, then print or download the PDF when you need it.
            </p>
          </div>

          <div className="px-3 py-4 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain">
            {TEMPLATE_GROUPS.map((group) => (
              <div key={group.category} className="mb-5 last:mb-0">
                <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {group.category}
                </div>

                <div className="space-y-1">
                  {group.templates.map((template) => {
                    const Icon = iconMap[template.icon]
                    const isActive = template.id === activeTemplate.id

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setActiveTemplateId(template.id)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors',
                          isActive
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border',
                            isActive
                              ? 'border-emerald-200 bg-white text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-500'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-950">{template.title}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">{template.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-950">{activeTemplate.title}</h2>
                  <Badge variant="outline">{activeTemplate.category}</Badge>
                  <Badge variant="secondary">
                    {activeTemplate.orientation === 'landscape' ? 'A4 Landscape' : 'A4 Portrait'}
                  </Badge>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">{activeTemplate.description}</p>
                <p className="text-sm font-medium text-slate-500">{activeTemplate.filename}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`/print/cmp-master-template?templateId=${activeTemplate.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: 'outline' }))}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print / Save as PDF
                </a>
                <a
                  href={`/api/cmp/master-templates/generate-pdf?templateId=${activeTemplate.id}`}
                  className={cn(buttonVariants({ variant: 'default' }), 'bg-emerald-700 hover:bg-emerald-800')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </a>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
              Live Preview
            </div>
            <div className="overflow-auto bg-slate-200 p-4 md:p-6">
              <CmpMasterTemplateDocument template={activeTemplate} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
