'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteAction } from '@/app/actions/actions'
import { useRouter } from 'next/navigation'

interface DeleteActionButtonProps {
  actionId: string
  actionTitle: string
}

export function DeleteActionButton({ actionId, actionTitle }: DeleteActionButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete action "${actionTitle}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteAction(actionId)
      router.refresh()
    } catch (error) {
      console.error('Failed to delete action:', error)
      alert('Failed to delete action. Please try again.')
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

