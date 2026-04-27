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
        className="h-10 w-full rounded-xl bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-95 sm:w-auto"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Log New Incident
      </Button>
      <NewIncidentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
