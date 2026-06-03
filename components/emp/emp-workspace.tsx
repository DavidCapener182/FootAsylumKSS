import { FileText, Files, Radio } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EMP_DEMO_EVENT_NAME } from '@/lib/emp/demo-plan'
import { EMP_DOWNLOAD_EVENT_NAME } from '@/lib/emp/download-plan'
import { EMP_PARKLIFE_EVENT_NAME } from '@/lib/emp/parklife-plan'
import { EMP_BUSINESS_TEMPLATE_DESCRIPTION } from '@/lib/emp/business-template'
import type { EmpPlanSummary } from '@/lib/emp/data'
import {
  EMP_IRELAND_JOBS_DESCRIPTION,
  EMP_IRELAND_JOBS_TITLE,
  EMP_IRELAND_JOB_LOCATIONS,
  EMP_IRELAND_SIGN_IN_PRESET_ID,
} from '@/lib/emp/ireland-jobs'
import { EMP_VISIBLE_MASTER_TEMPLATES } from '@/lib/emp/master-templates'
import { isRadioOneEmpPlan, sortActiveEmpPlansByDate, splitEmpPlansByHistory } from '@/lib/emp/plan-history'
import { cn, formatAppDateTime } from '@/lib/utils'

function EmpPlanRow({ plan, completed = false }: { plan: EmpPlanSummary; completed?: boolean }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">{plan.title}</h2>
          <Badge variant="outline">{plan.documentStatus || 'Draft'}</Badge>
          {completed ? <Badge variant="secondary">Completed</Badge> : null}
          {plan.eventName === EMP_DEMO_EVENT_NAME ? (
            <Badge variant="secondary">Example</Badge>
          ) : null}
          {plan.eventName === EMP_DOWNLOAD_EVENT_NAME ? (
            <Badge variant="secondary">Download</Badge>
          ) : null}
          {plan.eventName === EMP_PARKLIFE_EVENT_NAME ? (
            <Badge variant="secondary">Parklife</Badge>
          ) : null}
          {isRadioOneEmpPlan(plan) ? (
            <Badge variant="secondary">Radio 1</Badge>
          ) : null}
          {plan.selectedAnnexes.length > 0 ? (
            <Badge variant="secondary">{plan.selectedAnnexes.length} annexes</Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span>Event: {plan.eventName || 'Not set'}</span>
          <span>
            Updated:{' '}
            {formatAppDateTime(
              plan.updatedAt,
              {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              },
              plan.updatedAt
            )}
          </span>
        </div>
      </div>

      <div className="relative z-20 flex flex-wrap gap-2 pointer-events-auto">
        <a
          href={`/admin/event-management-plans/${plan.id}`}
          className={cn(buttonVariants({ variant: 'outline' }), 'pointer-events-auto')}
        >
          <FileText className="mr-2 h-4 w-4" />
          Edit
        </a>
        <a
          href={`/admin/event-management-plans/${plan.id}/event-control-log`}
          className={cn(buttonVariants({ variant: 'outline' }), 'pointer-events-auto')}
        >
          <Radio className="mr-2 h-4 w-4" />
          Event Control
        </a>
        <a
          href={`/admin/event-management-plans/${plan.id}/preview`}
          className={cn(buttonVariants({ variant: 'default' }), 'pointer-events-auto')}
        >
          Preview
        </a>
        <a
          href={`/admin/event-management-plans/master-templates?planId=${encodeURIComponent(plan.id)}`}
          className={cn(buttonVariants({ variant: 'outline' }), 'pointer-events-auto')}
        >
          <Files className="mr-2 h-4 w-4" />
          Documents
        </a>
        <form method="post" action="/api/emp/delete" className="inline-flex">
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="redirectTo" value="/admin/event-management-plans" />
          <button
            type="submit"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'pointer-events-auto border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800'
            )}
          >
            Delete
          </button>
        </form>
      </div>
    </div>
  )
}

function IrelandJobsDocumentsRow() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">{EMP_IRELAND_JOBS_TITLE}</h2>
          <Badge variant="outline">Documents only</Badge>
          <Badge variant="secondary">2 locations</Badge>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span>{EMP_IRELAND_JOBS_DESCRIPTION}</span>
          <span>Locations: {EMP_IRELAND_JOB_LOCATIONS.join(' / ')}</span>
        </div>
      </div>

      <a
        href={`/admin/event-management-plans/master-templates?preset=${EMP_IRELAND_SIGN_IN_PRESET_ID}`}
        className={cn(buttonVariants({ variant: 'outline' }), 'border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50')}
      >
        <Files className="mr-2 h-4 w-4" />
        Documents
      </a>
    </div>
  )
}

export function EmpWorkspace({ plans }: { plans: EmpPlanSummary[] }) {
  const { activePlans, historyPlans } = splitEmpPlansByHistory(plans)
  const sortedActivePlans = sortActiveEmpPlansByDate(activePlans)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Event Management Plans</h1>
            <p className="text-sm text-slate-600">
              Admin-only KSS workspace for event management and security operations plans.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form method="post" action="/api/emp/create" className="inline-flex">
              <input type="hidden" name="kind" value="business_template" />
              <input type="hidden" name="redirectTo" value="/admin/event-management-plans/:planId" />
              <button
                type="submit"
                className={cn(buttonVariants({ variant: 'default' }), 'bg-emerald-700 hover:bg-emerald-800')}
              >
                Create from EMP Template
              </button>
            </form>
            <form method="post" action="/api/emp/create" className="inline-flex">
              <input type="hidden" name="kind" value="download" />
              <input type="hidden" name="redirectTo" value="/admin/event-management-plans/:planId" />
              <button type="submit" className={cn(buttonVariants({ variant: 'outline' }))}>
                Create Download EMP
              </button>
            </form>
            <form method="post" action="/api/emp/create" className="inline-flex">
              <input type="hidden" name="kind" value="parklife" />
              <input type="hidden" name="redirectTo" value="/admin/event-management-plans/:planId" />
              <button type="submit" className={cn(buttonVariants({ variant: 'outline' }))}>
                Create Parklife EMP
              </button>
            </form>
            <form method="post" action="/api/emp/create" className="inline-flex">
              <input type="hidden" name="kind" value="example" />
              <input type="hidden" name="redirectTo" value="/admin/event-management-plans/:planId" />
              <button type="submit" className={cn(buttonVariants({ variant: 'outline' }))}>
                Create Example Event
              </button>
            </form>
            <form method="post" action="/api/emp/create" className="inline-flex">
              <input type="hidden" name="kind" value="blank" />
              <input type="hidden" name="redirectTo" value="/admin/event-management-plans/:planId" />
              <button
                type="submit"
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                New EMP
              </button>
            </form>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reusable EMP Template</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm leading-6 text-slate-600">{EMP_BUSINESS_TEMPLATE_DESCRIPTION}</p>
            <p className="text-sm text-slate-500">
              Use the guided helper to answer event-specific questions, generate wording, edit the full EMP, then preview, print, or export.
            </p>
          </div>
          <form method="post" action="/api/emp/create" className="inline-flex">
            <input type="hidden" name="kind" value="business_template" />
            <input type="hidden" name="redirectTo" value="/admin/event-management-plans/:planId" />
            <button type="submit" className={cn(buttonVariants({ variant: 'default' }), 'bg-emerald-700 hover:bg-emerald-800')}>
              Create from EMP Template
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Master Templates</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-600">
                Blank event-day forms for sign-in, equipment issue, control logging, and incident records.
              </p>
              <Badge variant="outline">{EMP_VISIBLE_MASTER_TEMPLATES.length} PDFs</Badge>
            </div>
            <p className="text-sm text-slate-500">
              Keep printable event management paperwork ready for live events, or open them from any plan row to prefill event details.
            </p>
          </div>

          <a href="/admin/event-management-plans/master-templates" className={cn(buttonVariants({ variant: 'outline' }))}>
            <FileText className="mr-2 h-4 w-4" />
            Open Master Templates
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <IrelandJobsDocumentsRow />
          {sortedActivePlans.map((plan) => <EmpPlanRow key={plan.id} plan={plan} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completed History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {historyPlans.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No completed event management plans are in history yet.
            </div>
          ) : (
            historyPlans.map((plan) => <EmpPlanRow key={plan.id} plan={plan} completed />)
          )}
        </CardContent>
      </Card>
    </div>
  )
}
