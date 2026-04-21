import { ArrowLeft, Download, FileText } from 'lucide-react'
import { CmpPreviewDocument } from '@/components/cmp/cmp-preview-document'
import { CmpSetupRequired } from '@/components/cmp/cmp-setup-required'
import { buttonVariants } from '@/components/ui/button'
import { requireCmpAccess } from '@/lib/cmp/access'
import { CmpSetupRequiredError, getCmpPreviewData } from '@/lib/cmp/data'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function CrowdManagementPlanPreviewPage({
  params,
}: {
  params: { planId: string }
}) {
  await requireCmpAccess()

  try {
    const previewData = await getCmpPreviewData(params.planId)

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <a
                href={`/admin/crowd-management-plans/${params.planId}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to CMP editor
              </a>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Preview & Export</h1>
              <p className="text-sm text-slate-600">
                Review the issued CMP layout, then export the approved PDF or DOCX version.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/cmp/generate-pdf?planId=${params.planId}`}
                className={cn(buttonVariants({ variant: 'default' }))}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </a>
              <a
                href={`/api/cmp/generate-docx?planId=${params.planId}`}
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                <FileText className="mr-2 h-4 w-4" />
                Download DOCX
              </a>
            </div>
          </div>
        </div>

        <CmpPreviewDocument model={previewData.model} />
      </div>
    )
  } catch (error) {
    if (error instanceof CmpSetupRequiredError) {
      return <CmpSetupRequired details={error.message} />
    }

    throw error
  }
}
