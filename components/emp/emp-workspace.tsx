import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EMP_DEMO_EVENT_NAME } from '@/lib/emp/demo-plan'
import type { EmpPlanSummary } from '@/lib/emp/data'
import { EMP_MASTER_TEMPLATES } from '@/lib/emp/master-templates'
import { cn, formatAppDateTime } from '@/lib/utils'

export function EmpWorkspace({ plans }: { plans: EmpPlanSummary[] }) {
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
                className={cn(buttonVariants({ variant: 'default' }), 'bg-emerald-700 hover:bg-emerald-800')}
              >
                New EMP
              </button>
            </form>
          </div>
        </div>
      </div>

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
              <Badge variant="outline">{EMP_MASTER_TEMPLATES.length} PDFs</Badge>
            </div>
            <p className="text-sm text-slate-500">
              Keep printable event management paperwork separate from the EMP plan builder and ready for live events.
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
          <CardTitle>Plan History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {plans.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No event management plans have been created yet.
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">{plan.title}</h2>
                    <Badge variant="outline">{plan.documentStatus || 'Draft'}</Badge>
                    {plan.eventName === EMP_DEMO_EVENT_NAME ? (
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

                <div className="relative z-20 flex flex-wrap gap-2 pointer-events-auto">
                  <a
                    href={`/admin/event-management-plans/${plan.id}`}
                    className={cn(buttonVariants({ variant: 'outline' }), 'pointer-events-auto')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Edit
                  </a>
                  <a
                    href={`/admin/event-management-plans/${plan.id}/preview`}
                    className={cn(buttonVariants({ variant: 'default' }), 'pointer-events-auto')}
                  >
                    Preview
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
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
