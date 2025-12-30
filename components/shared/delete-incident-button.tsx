'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteIncident } from '@/app/actions/incidents'
import { useRouter } from 'next/navigation'

interface DeleteIncidentButtonProps {
  incidentId: string
  referenceNo: string
}

export function DeleteIncidentButton({ incidentId, referenceNo }: DeleteIncidentButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete incident ${referenceNo}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteIncident(incidentId)
      if (result?.success) {
        // Force a full page refresh to ensure data is updated
        window.location.reload()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to delete incident:', error)
      alert(`Failed to delete incident: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}

