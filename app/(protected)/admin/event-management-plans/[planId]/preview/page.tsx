import { ArrowLeft, Download, FileText } from 'lucide-react'
import type { Metadata } from 'next'
import { EmpDocumentTitle } from '@/components/emp/emp-document-title'
import { EmpPreviewDocument } from '@/components/emp/emp-preview-document'
import { EmpSetupRequired } from '@/components/emp/emp-setup-required'
import { buttonVariants } from '@/components/ui/button'
import { requireEmpAccess } from '@/lib/emp/access'
import { EmpSetupRequiredError, getEmpPreviewData } from '@/lib/emp/data'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function isTransientNetworkError(error: unknown) {
  const message = String((error as any)?.message || '').toLowerCase()
  return (
    message.includes('network error')
    || message.includes('fetch failed')
    || message.includes('econnreset')
    || message.includes('socket hang up')
    || message.includes('timeout')
  )
}

async function loadPreviewDataWithRetry(planId: string) {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getEmpPreviewData(planId)
    } catch (error) {
      lastError = error
      if (!isTransientNetworkError(error) || attempt === 2) {
        throw error
      }
    }
  }
  throw lastError
}

export async function generateMetadata({
  params,
}: {
  params: { planId: string }
}): Promise<Metadata> {
  try {
    const previewData = await loadPreviewDataWithRetry(params.planId)
    return {
      title: previewData.model.title,
    }
  } catch {
    return {
      title: 'EMP Preview',
    }
  }
}

export default async function CrowdManagementPlanPreviewPage({
  params,
}: {
  params: { planId: string }
}) {
  await requireEmpAccess()

  try {
    const previewData = await loadPreviewDataWithRetry(params.planId)

    return (
      <div className="space-y-6">
        <EmpDocumentTitle title={previewData.model.title} />
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <a
                href={`/admin/event-management-plans/${params.planId}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to EMP editor
              </a>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Preview & Export</h1>
              <p className="text-sm text-slate-600">
                Review the issued EMP layout, then export the approved PDF or DOCX version.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/emp/generate-pdf?planId=${params.planId}`}
                className={cn(buttonVariants({ variant: 'default' }))}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </a>
              <a
                href={`/api/emp/generate-docx?planId=${params.planId}`}
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                <FileText className="mr-2 h-4 w-4" />
                Download DOCX
              </a>
            </div>
          </div>
        </div>

        <EmpPreviewDocument model={previewData.model} />
      </div>
    )
  } catch (error) {
    if (error instanceof EmpSetupRequiredError) {
      return <EmpSetupRequired details={error.message} />
    }

    const errorMessage = String((error as any)?.message || 'Failed to load preview')
    return (
      <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-semibold text-red-900">Preview failed to load</h1>
        <p className="text-sm text-red-700">
          {errorMessage}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/admin/event-management-plans/${params.planId}`}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            Back to editor
          </a>
          <a
            href={`/admin/event-management-plans/${params.planId}/preview`}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            Retry preview
          </a>
        </div>
      </div>
    )
  }
}
