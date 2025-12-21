'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { updateIncident } from '@/app/actions/incidents'
import { useRouter } from 'next/navigation'

interface CloseIncidentButtonProps {
  incidentId: string
  incidentReference: string
  currentStatus: string
}

export function CloseIncidentButton({ incidentId, incidentReference, currentStatus }: CloseIncidentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const isClosed = currentStatus === 'closed'

  const handleClose = async () => {
    if (isClosed) return
    
    if (!confirm(`Close incident "${incidentReference}"? This will mark the incident as closed.`)) {
      return
    }

    setIsLoading(true)
    try {
      await updateIncident(incidentId, { status: 'closed' })
      router.refresh()
    } catch (error: any) {
      console.error('Failed to close incident:', error)
      const errorMessage = error?.message || 'Unknown error occurred'
      alert(`Failed to close incident: ${errorMessage}`)
      setIsLoading(false)
    }
  }

  if (isClosed) {
    return null
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-slate-600 hover:text-green-600 hover:bg-green-50"
      onClick={handleClose}
      disabled={isLoading}
      title="Close incident"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          Closing...
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

