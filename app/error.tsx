'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isChunkLoadError, recoverFromClientError } from '@/lib/client-error-recovery'

export default function ApplicationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const chunkLoadFailed = isChunkLoadError(error)

  useEffect(() => {
    void fetch('/api/observability/client', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'client_error', message: error.message, digest: error.digest, route: window.location.pathname }) }).catch(() => {
      // A failed telemetry request must not interrupt the recovery screen.
    })
  }, [error])

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-5">
      <section role="alert" className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <AlertTriangle className="h-7 w-7 text-red-600" />
        <h1 className="workspace-title mt-4 text-xl font-bold text-slate-950">This workspace could not be loaded</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {chunkLoadFailed
            ? 'Part of the application failed to download. Reload the workspace to try again. If this continues, check your connection and contact support.'
            : 'Retry the request. If this continues, contact support.'}
          {error.digest && <> Reference: <strong>{error.digest}</strong>.</>}
        </p>
        <Button
          className="mt-5 min-h-[44px]"
          onClick={() => recoverFromClientError(error, reset, () => window.location.reload())}
        >
          {chunkLoadFailed ? 'Reload workspace' : 'Try again'}
        </Button>
      </section>
    </main>
  )
}
