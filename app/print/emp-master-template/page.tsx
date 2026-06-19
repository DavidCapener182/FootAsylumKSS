import { ArrowLeft, Download } from 'lucide-react'
import { EmpMasterTemplateDocument } from '@/components/emp/emp-master-template-document'
import { EmpMasterTemplatePrintToolbar } from '@/components/emp/emp-master-template-print-toolbar'
import { buttonVariants } from '@/components/ui/button'
import { requireEmpAccess } from '@/lib/emp/access'
import { getEmpMasterTemplatePlanPrefill } from '@/lib/emp/data'
import {
  applyDeploymentMatrixSourcePageOverrides,
  buildSupervisorDeploymentTablePagesFromDeploymentMatrixOverrides,
  refreshStaffSignInTablePagesForEvent,
  syncDeploymentMatrixEventPagesFromSourcePages,
} from '@/lib/emp/master-template-prefill'
import { resolveEmpMasterTemplateForEvent } from '@/lib/emp/master-templates'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function EmpMasterTemplatePrintPage({
  searchParams,
}: {
  searchParams: { templateId?: string; prefill?: string; planId?: string; deploymentOverrides?: string }
}) {
  await requireEmpAccess()

  const planId = String(searchParams?.planId || '').trim()
  const prefillRaw = String(searchParams?.prefill || '')
  const deploymentOverridesRaw = String(searchParams?.deploymentOverrides || '')
  let planPrefill: Awaited<ReturnType<typeof getEmpMasterTemplatePlanPrefill>> | null = null
  let prefillValues: {
    eventName?: string
    eventDate?: string
    fields?: Record<string, string>
    tableCells?: Record<string, string>
    tablePages?: Array<{
      fields?: Record<string, string>
      tableCells?: Record<string, string>
    }>
  } = {}

  if (prefillRaw) {
    try {
      const parsed = JSON.parse(prefillRaw)
      if (parsed && typeof parsed === 'object') {
        prefillValues = parsed
      }
    } catch {
      prefillValues = {}
    }
  } else if (planId) {
    planPrefill = await getEmpMasterTemplatePlanPrefill(planId)
  }

  const template = resolveEmpMasterTemplateForEvent(searchParams?.templateId, {
    eventName: prefillValues.eventName || planPrefill?.prefillData.eventName,
    planTitle: planPrefill?.planTitle,
  })

  if (!template) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          Unknown master template.
        </div>
      </div>
    )
  }

  const pageSize =
    template.kind === 'radio_one_daily_brief_booklet'
      ? 'A4 landscape'
      : template.orientation === 'landscape'
        ? 'A4 landscape'
        : 'A4 portrait'
  let deploymentOverrides: Array<{
    fields?: Record<string, string>
    tableCells?: Record<string, string>
  }> = []
  if (!prefillRaw && planId && planPrefill) {
    if (deploymentOverridesRaw) {
      try {
        const parsedOverrides = JSON.parse(deploymentOverridesRaw)
        deploymentOverrides = Array.isArray(parsedOverrides) ? parsedOverrides : []
      } catch {
        deploymentOverrides = []
      }
    }

    const tablePages = planPrefill.prefillData.templateTablePageValues?.[template.id] || []
    const deploymentMatrixPages = planPrefill.prefillData.templateTablePageValues?.['deployment-matrix'] || []
    const supervisorDeploymentPages = template.id === 'supervisor-deployment' && deploymentOverrides.length
      ? buildSupervisorDeploymentTablePagesFromDeploymentMatrixOverrides(deploymentMatrixPages, deploymentOverrides)
      : []
    prefillValues = {
      eventName: planPrefill.prefillData.eventName,
      eventDate: planPrefill.prefillData.eventDate,
      fields: planPrefill.prefillData.templateFieldValues?.[template.id] || {},
      tableCells: planPrefill.prefillData.templateTableCellValues?.[template.id] || {},
      tablePages: template.id === 'deployment-matrix'
        ? applyDeploymentMatrixSourcePageOverrides(tablePages, deploymentOverrides)
        : template.id === 'supervisor-deployment' && supervisorDeploymentPages.length
          ? supervisorDeploymentPages
        : tablePages,
    }
  }

  if (template.id === 'deployment-matrix' && prefillValues.tablePages?.length) {
    prefillValues = {
      ...prefillValues,
      tablePages: syncDeploymentMatrixEventPagesFromSourcePages(prefillValues.tablePages),
    }
  }

  if (template.id === 'staff-sign-in-sign-out-sheet') {
    prefillValues = {
      ...prefillValues,
      tablePages: refreshStaffSignInTablePagesForEvent(prefillValues.tablePages, {
        eventName: prefillValues.eventName,
        eventDate: prefillValues.eventDate,
        planTitle: planPrefill?.planTitle,
        fields: prefillValues.fields,
      }),
    }
  }

  const queryParams = new URLSearchParams({ templateId: template.id })
  if (planId && !prefillRaw) {
    queryParams.set('planId', planId)
    if (deploymentOverridesRaw) {
      queryParams.set('deploymentOverrides', deploymentOverridesRaw)
    }
  } else {
    queryParams.set('prefill', JSON.stringify(prefillValues))
  }
  const pdfHref = `/api/emp/master-templates/generate-pdf?${queryParams.toString()}`

  return (
    <div className="emp-master-template-print-root bg-white">
      <style>{`@page { size: ${pageSize}; margin: 0; }`}</style>

      <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/admin/event-management-plans/master-templates"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </a>
          <EmpMasterTemplatePrintToolbar pdfHref={pdfHref} />
          <a
            href={pdfHref}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </a>
        </div>
        <div className="text-sm font-medium text-slate-600">{template.title}</div>
      </div>

      <div className="emp-master-template-print-stage bg-slate-200 px-4 py-6 md:px-6">
        <EmpMasterTemplateDocument
          template={template}
          prefillValues={prefillValues}
          radioOneLayout={template.kind === 'radio_one_daily_brief_booklet' ? 'booklet' : 'pages'}
        />
      </div>
    </div>
  )
}
