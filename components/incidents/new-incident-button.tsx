'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { NewIncidentDialog } from './new-incident-dialog'

export function NewIncidentButton() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button 
        className="bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Log New Incident
      </Button>
      <NewIncidentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}

