'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ApplicationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch('/api/observability/client', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'client_error', message: error.message, digest: error.digest, route: window.location.pathname }) })
  }, [error])
  return <main className="flex min-h-[70vh] items-center justify-center p-5"><section role="alert" className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm"><AlertTriangle className="h-7 w-7 text-red-600" /><h1 className="mt-4 text-xl font-bold text-slate-950">This workspace could not be loaded</h1><p className="mt-2 text-sm leading-6 text-slate-600">The failure has been recorded. Retry the request; if it continues, contact support with reference <strong>{error.digest || 'unavailable'}</strong>.</p><Button className="mt-5 min-h-[44px]" onClick={reset}>Try again</Button></section></main>
}
