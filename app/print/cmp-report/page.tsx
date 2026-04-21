import { ArrowLeft, Download, FileText } from 'lucide-react'
import { CmpPreviewDocument } from '@/components/cmp/cmp-preview-document'
import { CmpSetupRequired } from '@/components/cmp/cmp-setup-required'
import { buttonVariants } from '@/components/ui/button'
import { requireCmpAccess } from '@/lib/cmp/access'
import { CmpSetupRequiredError, getCmpPreviewData } from '@/lib/cmp/data'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function CmpPrintReportPage({
  searchParams,
}: {
  searchParams: { planId?: string }
}) {
  const planId = String(searchParams?.planId || '').trim()

  await requireCmpAccess()

  if (!planId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <CmpSetupRequired details="Missing CMP planId for print preview." />
      </div>
    )
  }

  try {
    const previewData = await getCmpPreviewData(planId)

    return (
      <div className="cmp-print-page-root bg-white">
        <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/admin/crowd-management-plans/${planId}`}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Editor
            </a>
            <a
              href={`/api/cmp/generate-pdf?planId=${planId}`}
              className={cn(buttonVariants({ variant: 'default' }))}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </a>
            <a
              href={`/api/cmp/generate-docx?planId=${planId}`}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              <FileText className="mr-2 h-4 w-4" />
              Download DOCX
            </a>
          </div>
          <div className="text-sm font-medium text-slate-600">CMP Preview</div>
        </div>
        <CmpPreviewDocument model={previewData.model} />
      </div>
    )
  } catch (error) {
    if (error instanceof CmpSetupRequiredError) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-8">
          <CmpSetupRequired details={error.message} />
        </div>
      )
    }

    throw error
  }
}
