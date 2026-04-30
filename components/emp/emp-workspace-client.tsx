'use client'

import { useState, useTransition } from 'react'
import { FileText, Loader2, Plus, ChevronRight, Sparkles, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EMP_DEMO_EVENT_NAME } from '@/lib/emp/demo-plan'
import type { EmpPlanSummary } from '@/lib/emp/data'
import { cn, formatAppDateTime } from '@/lib/utils'

export function EmpWorkspaceClient({ plans }: { plans: EmpPlanSummary[] }) {
  const [isPending, startTransition] = useTransition()
  const [planList, setPlanList] = useState(plans)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'new' | 'example' | null>(null)

  const navigateTo = (href: string) => {
    window.location.assign(href)
  }

  const createPlan = async (kind: 'blank' | 'example') => {
    const response = await fetch('/api/emp/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || data.details || `Failed to create EMP plan (${response.status})`)
    }

    const planId = String(data.planId || '').trim()
    if (!planId) {
      throw new Error('EMP plan created without a valid id')
    }

    return planId
  }

  const handleCreate = () => {
    startTransition(async () => {
      try {
        setActionError(null)
        setPendingAction('new')
        const planId = await createPlan('blank')
        navigateTo(`/admin/event-management-plans/${planId}`)
      } catch (error: any) {
        setActionError(error?.message || 'Failed to create EMP plan')
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleCreateExample = () => {
    startTransition(async () => {
      try {
        setActionError(null)
        setPendingAction('example')
        const planId = await createPlan('example')
        navigateTo(`/admin/event-management-plans/${planId}`)
      } catch (error: any) {
        setActionError(error?.message || 'Failed to create example EMP plan')
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleDelete = (plan: EmpPlanSummary) => {
    const confirmed = window.confirm(`Delete "${plan.title}"? This will remove the plan and any uploaded source files.`)
    if (!confirmed) return

    startTransition(async () => {
      try {
        setActionError(null)
        setDeleteTargetId(plan.id)
        const response = await fetch('/api/emp/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: plan.id }),
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.error || data.details || `Failed to delete EMP plan (${response.status})`)
        }

        setPlanList((current) => current.filter((item) => item.id !== plan.id))
      } catch (error: any) {
        setActionError(error?.message || 'Failed to delete EMP plan')
      } finally {
        setDeleteTargetId(null)
      }
    })
  }

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
            <Button type="button" onClick={handleCreateExample} disabled={isPending} variant="outline">
              {isPending && pendingAction === 'example' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Create Example Event
            </Button>
            <Button type="button" onClick={handleCreate} disabled={isPending} className="bg-emerald-700 hover:bg-emerald-800">
              {isPending && pendingAction === 'new' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              New EMP
            </Button>
          </div>
        </div>
        {actionError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {planList.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No event management plans have been created yet.
            </div>
          ) : (
            planList.map((plan) => (
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

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/admin/event-management-plans/${plan.id}`}
                    className={cn(buttonVariants({ variant: 'outline' }))}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Edit
                  </a>
                  <a
                    href={`/admin/event-management-plans/${plan.id}/preview`}
                    className={cn(buttonVariants({ variant: 'default' }))}
                  >
                    Preview
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDelete(plan)}
                    disabled={isPending && deleteTargetId === plan.id}
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    {isPending && deleteTargetId === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
