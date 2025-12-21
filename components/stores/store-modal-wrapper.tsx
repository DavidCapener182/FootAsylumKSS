'use client'

import { useState } from 'react'
import { StoreDetailsModal } from './store-details-modal'

interface StoreModalWrapperProps {
  store: any
  incidents: any[]
  actions: any[]
  children: React.ReactNode
}

export function StoreModalWrapper({ store, incidents, actions, children }: StoreModalWrapperProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer hover:underline">
        {children}
      </div>
      <StoreDetailsModal
        store={store}
        incidents={incidents}
        actions={actions}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

