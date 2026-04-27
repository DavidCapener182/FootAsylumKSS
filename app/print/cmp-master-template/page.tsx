import { ArrowLeft, Download } from 'lucide-react'
import { CmpMasterTemplateDocument } from '@/components/cmp/cmp-master-template-document'
import { CmpMasterTemplatePrintToolbar } from '@/components/cmp/cmp-master-template-print-toolbar'
import { buttonVariants } from '@/components/ui/button'
import { requireCmpAccess } from '@/lib/cmp/access'
import { getCmpMasterTemplateById } from '@/lib/cmp/master-templates'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function CmpMasterTemplatePrintPage({
  searchParams,
}: {
  searchParams: { templateId?: string; prefill?: string }
}) {
  await requireCmpAccess()

  const template = getCmpMasterTemplateById(searchParams?.templateId)

  if (!template) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          Unknown master template.
        </div>
      </div>
    )
  }

  const pageSize = template.orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'
  const prefillRaw = String(searchParams?.prefill || '')
  let prefillValues: { eventName?: string; eventDate?: string; fields?: Record<string, string> } = {}

  if (prefillRaw) {
    try {
      const parsed = JSON.parse(prefillRaw)
      if (parsed && typeof parsed === 'object') {
        prefillValues = parsed
      }
    } catch {
      prefillValues = {}
    }
  }

  const queryParams = new URLSearchParams({ templateId: template.id })
  queryParams.set('prefill', JSON.stringify(prefillValues))

  return (
    <div className="cmp-master-template-print-root bg-white">
      <style>{`@page { size: ${pageSize}; margin: 0; }`}</style>

      <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/admin/crowd-management-plans/master-templates"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </a>
          <CmpMasterTemplatePrintToolbar />
          <a
            href={`/api/cmp/master-templates/generate-pdf?${queryParams.toString()}`}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </a>
        </div>
        <div className="text-sm font-medium text-slate-600">{template.title}</div>
      </div>

      <div className="cmp-master-template-print-stage bg-slate-200 px-4 py-6 md:px-6">
        <CmpMasterTemplateDocument template={template} prefillValues={prefillValues} />
      </div>
    </div>
  )
}
