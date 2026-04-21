'use client'

import { useState, useTransition } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CmpDeletePlanButton({
  planId,
  planTitle,
}: {
  planId: string
  planTitle: string
}) {
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  const handleDelete = () => {
    const confirmed = window.confirm(`Delete "${planTitle}"? This will remove the plan and any uploaded source files.`)
    if (!confirmed) return

    startTransition(async () => {
      try {
        setActionError(null)
        const response = await fetch('/api/cmp/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId }),
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.error || data.details || `Failed to delete CMP plan (${response.status})`)
        }

        window.location.reload()
      } catch (error: any) {
        setActionError(error?.message || 'Failed to delete CMP plan')
      }
    })
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleDelete}
        disabled={isPending}
        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="mr-2 h-4 w-4" />
        )}
        Delete
      </Button>
      {actionError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {actionError}
        </div>
      ) : null}
    </div>
  )
}
