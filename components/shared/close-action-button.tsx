'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { updateAction } from '@/app/actions/actions'
import { useRouter } from 'next/navigation'

interface CloseActionButtonProps {
  actionId: string
  actionTitle: string
  currentStatus: string
  onComplete?: () => void
}

export function CloseActionButton({ actionId, actionTitle, currentStatus, onComplete }: CloseActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const isComplete = currentStatus === 'complete' || currentStatus === 'cancelled'

  const handleClose = async () => {
    if (isComplete) return
    
    if (!confirm(`Mark action "${actionTitle}" as complete?`)) {
      return
    }

    setIsLoading(true)
    try {
      await updateAction(actionId, { status: 'complete' })
      onComplete?.()
      router.refresh()
    } catch (error) {
      console.error('Failed to close action:', error)
      alert('Failed to close action. Please try again.')
      setIsLoading(false)
    }
  }

  if (isComplete) {
    return null
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-slate-600 hover:text-green-600 hover:bg-green-50"
      onClick={handleClose}
      disabled={isLoading}
      title="Mark as complete"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          Completing...
        </>
      ) : (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Complete
        </>
      )}
    </Button>
  )
}

