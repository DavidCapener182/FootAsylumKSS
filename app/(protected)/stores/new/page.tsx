import React from 'react'
import { requireRole } from '@/lib/auth'
import { CreateStoreForm } from '@/components/stores/create-store-form'

export default async function NewStorePage() {
  await requireRole(['admin'])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-3 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Add new store</h1>
        <p className="mt-2 text-sm text-slate-600">Create a separate active location using verified details. Existing store records and audit history are kept unchanged.</p>
      </header>
      <CreateStoreForm />
    </div>
  )
}
