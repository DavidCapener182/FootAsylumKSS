'use client'

import { useState, useTransition } from 'react'
import { Loader2, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmpWorkspaceToolbarClient() {
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<'new' | 'example' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

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

  const handleCreate = (kind: 'blank' | 'example') => {
    startTransition(async () => {
      try {
        setActionError(null)
        setPendingAction(kind === 'example' ? 'example' : 'new')
        const planId = await createPlan(kind)
        window.location.assign(`/admin/event-management-plans/${planId}`)
      } catch (error: any) {
        setActionError(error?.message || 'Failed to create EMP plan')
      } finally {
        setPendingAction(null)
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => handleCreate('example')} disabled={isPending} variant="outline">
          {isPending && pendingAction === 'example' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Create Example Event
        </Button>
        <Button type="button" onClick={() => handleCreate('blank')} disabled={isPending} className="bg-emerald-700 hover:bg-emerald-800">
          {isPending && pendingAction === 'new' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          New EMP
        </Button>
      </div>
      {actionError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}
    </div>
  )
}
