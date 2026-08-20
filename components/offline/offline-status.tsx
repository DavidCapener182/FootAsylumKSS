'use client'

import { RefreshCw } from 'lucide-react'
import { OfflineSyncIndicator } from '@/components/product'
import { useOfflineSync } from './offline-sync-provider'

export function OfflineStatus({ compact = false }: { compact?: boolean }) {
  const { isOnline, isSyncing, pendingCount, failedCount, draftsCount, syncNow } = useOfflineSync()
  const state = !isOnline ? 'offline' : isSyncing ? 'syncing' : 'online'

  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      <OfflineSyncIndicator state={state} pendingCount={pendingCount} />
      {!compact && draftsCount > 0 ? (
        <span className="text-xs font-medium text-slate-600">{draftsCount} device draft{draftsCount === 1 ? '' : 's'}</span>
      ) : null}
      {isOnline && (pendingCount > 0 || failedCount > 0) ? (
        <button type="button" onClick={() => void syncNow()} disabled={isSyncing} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          Retry sync
        </button>
      ) : null}
    </div>
  )
}
