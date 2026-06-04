'use client'

import { useState, useTransition } from 'react'
import { FileText, Loader2, Plus, ChevronRight, Sparkles, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CMP_DEMO_EVENT_NAME } from '@/lib/cmp/demo-plan'
import type { CmpPlanSummary } from '@/lib/cmp/data'
import { cn, formatAppDateTime } from '@/lib/utils'

export function CmpWorkspaceClient({ plans }: { plans: CmpPlanSummary[] }) {
  const [isPending, startTransition] = useTransition()
  const [planList, setPlanList] = useState(plans)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'new' | 'example' | null>(null)

  const navigateTo = (href: string) => {
    window.location.assign(href)
  }

  const createPlan = async (kind: 'blank' | 'example') => {
    const response = await fetch('/api/cmp/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || data.details || `Failed to create CMP plan (${response.status})`)
    }

    const planId = String(data.planId || '').trim()
    if (!planId) {
      throw new Error('CMP plan created without a valid id')
    }

    return planId
  }

  const handleCreate = () => {
    startTransition(async () => {
      try {
        setActionError(null)
        setPendingAction('new')
        const planId = await createPlan('blank')
        navigateTo(`/admin/crowd-management-plans/${planId}`)
      } catch (error: any) {
        setActionError(error?.message || 'Failed to create CMP plan')
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
        navigateTo(`/admin/crowd-management-plans/${planId}`)
      } catch (error: any) {
        setActionError(error?.message || 'Failed to create example CMP plan')
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleDelete = (plan: CmpPlanSummary) => {
    const confirmed = window.confirm(`Delete "${plan.title}"? This will remove the plan and any uploaded source files.`)
    if (!confirmed) return

    startTransition(async () => {
      try {
        setActionError(null)
        setDeleteTargetId(plan.id)
        const response = await fetch('/api/cmp/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: plan.id }),
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.error || data.details || `Failed to delete CMP plan (${response.status})`)
        }

        setPlanList((current) => current.filter((item) => item.id !== plan.id))
      } catch (error: any) {
        setActionError(error?.message || 'Failed to delete CMP plan')
      } finally {
        setDeleteTargetId(null)
      }
    })
  }

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
            <Button type="button" onClick={handleCreateExample} disabled={isPending} variant="outline" className="w-full md:w-auto">
              {isPending && pendingAction === 'example' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Create Example Event
            </Button>
            <Button type="button" onClick={handleCreate} disabled={isPending} className="w-full bg-emerald-700 hover:bg-emerald-800 md:w-auto">
              {isPending && pendingAction === 'new' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              New CMP
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
        <CardContent className="space-y-3 sm:space-y-4">
          {planList.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No crowd management plans have been created yet.
            </div>
          ) : (
            planList.map((plan) => (
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

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <a
                    href={`/admin/crowd-management-plans/${plan.id}`}
                    className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Edit
                  </a>
                  <a
                    href={`/admin/crowd-management-plans/${plan.id}/preview`}
                    className={cn(buttonVariants({ variant: 'default' }), 'w-full sm:w-auto')}
                  >
                    Preview
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDelete(plan)}
                    disabled={isPending && deleteTargetId === plan.id}
                    className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 sm:w-auto"
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
