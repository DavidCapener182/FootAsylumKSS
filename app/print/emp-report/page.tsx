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

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { planId?: string }
}): Promise<Metadata> {
  const planId = String(searchParams?.planId || '').trim()
  if (!planId) return { title: 'EMP Print Preview' }

  try {
    const previewData = await getEmpPreviewData(planId)
    return {
      title: previewData.model.title,
    }
  } catch {
    return {
      title: 'EMP Print Preview',
    }
  }
}

export default async function EmpPrintReportPage({
  searchParams,
}: {
  searchParams: { planId?: string }
}) {
  const planId = String(searchParams?.planId || '').trim()

  await requireEmpAccess()

  if (!planId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmpSetupRequired details="Missing EMP planId for print preview." />
      </div>
    )
  }

  try {
    const previewData = await getEmpPreviewData(planId)

    return (
      <div className="emp-print-page-root bg-white">
        <EmpDocumentTitle title={previewData.model.title} />
        <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/admin/event-management-plans/${planId}`}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Editor
            </a>
            <a
              href={`/api/emp/generate-pdf?planId=${planId}`}
              className={cn(buttonVariants({ variant: 'default' }))}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </a>
            <a
              href={`/api/emp/generate-docx?planId=${planId}`}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              <FileText className="mr-2 h-4 w-4" />
              Download DOCX
            </a>
          </div>
          <div className="text-sm font-medium text-slate-600">EMP Preview</div>
        </div>
        <EmpPreviewDocument model={previewData.model} />
      </div>
    )
  } catch (error) {
    if (error instanceof EmpSetupRequiredError) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-8">
          <EmpSetupRequired details={error.message} />
        </div>
      )
    }

    throw error
  }
}
