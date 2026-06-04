import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CMP_DEMO_EVENT_NAME } from '@/lib/cmp/demo-plan'
import type { CmpPlanSummary } from '@/lib/cmp/data'
import { CMP_MASTER_TEMPLATES } from '@/lib/cmp/master-templates'
import { cn, formatAppDateTime } from '@/lib/utils'

export function CmpWorkspace({ plans }: { plans: CmpPlanSummary[] }) {
  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:gap-4 sm:rounded-2xl sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Crowd Management Plans</h1>
            <p className="hidden text-sm text-slate-600 sm:block">
              Admin-only KSS workspace for crowd management and security operations plans.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:w-auto md:flex md:flex-wrap">
            <form method="post" action="/api/cmp/create" className="inline-flex w-full md:w-auto">
              <input type="hidden" name="kind" value="example" />
              <input type="hidden" name="redirectTo" value="/admin/crowd-management-plans/:planId" />
              <button type="submit" className={cn(buttonVariants({ variant: 'outline' }), 'w-full md:w-auto')}>
                Create Example Event
              </button>
            </form>
            <form method="post" action="/api/cmp/create" className="inline-flex w-full md:w-auto">
              <input type="hidden" name="kind" value="blank" />
              <input type="hidden" name="redirectTo" value="/admin/crowd-management-plans/:planId" />
              <button
                type="submit"
                className={cn(buttonVariants({ variant: 'default' }), 'w-full bg-emerald-700 hover:bg-emerald-800 md:w-auto')}
              >
                New CMP
              </button>
            </form>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Master Templates</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-600">
                Blank event-day forms for sign-in, equipment issue, control logging, and incident records.
              </p>
              <Badge variant="outline">{CMP_MASTER_TEMPLATES.length} PDFs</Badge>
            </div>
            <p className="hidden text-sm text-slate-500 sm:block">
              Keep printable crowd management paperwork separate from the CMP plan builder and ready for live events.
            </p>
          </div>

          <a href="/admin/crowd-management-plans/master-templates" className={cn(buttonVariants({ variant: 'outline' }), 'w-full md:w-auto')}>
            <FileText className="mr-2 h-4 w-4" />
            Open Master Templates
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {plans.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No crowd management plans have been created yet.
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4 md:py-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">{plan.title}</h2>
                    <Badge variant="outline">{plan.documentStatus || 'Draft'}</Badge>
                    {plan.eventName === CMP_DEMO_EVENT_NAME ? (
                      <Badge variant="secondary">Example</Badge>
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

                <div className="relative z-20 grid grid-cols-2 gap-2 pointer-events-auto sm:flex sm:flex-wrap">
                  <a
                    href={`/admin/crowd-management-plans/${plan.id}`}
                    className={cn(buttonVariants({ variant: 'outline' }), 'pointer-events-auto w-full sm:w-auto')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Edit
                  </a>
                  <a
                    href={`/admin/crowd-management-plans/${plan.id}/preview`}
                    className={cn(buttonVariants({ variant: 'default' }), 'pointer-events-auto w-full sm:w-auto')}
                  >
                    Preview
                  </a>
                  <form method="post" action="/api/cmp/delete" className="inline-flex w-full sm:w-auto">
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="redirectTo" value="/admin/crowd-management-plans" />
                    <button
                      type="submit"
                      className={cn(
                        buttonVariants({ variant: 'outline' }),
                        'pointer-events-auto w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 sm:w-auto'
                      )}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
