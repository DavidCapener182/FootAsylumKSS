'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createOfflineId,
  deleteOfflineDraft,
  deleteOfflineQueueItem,
  enqueueOfflineRequest,
  listOfflineDrafts,
  listOfflineQueue,
  saveOfflineDraft,
  updateOfflineQueueItem,
} from '@/lib/offline/indexed-db'
import { sendOfflineQueueItem } from '@/lib/offline/sync'
import type { OfflineDraft, OfflineDraftKind, OfflineQueueItem, OfflineSyncSnapshot } from '@/lib/offline/types'

type OfflineSyncContextValue = OfflineSyncSnapshot & {
  saveDraft: <T>(input: { id: string; kind: OfflineDraftKind; recordId?: string | null; payload: T }) => Promise<void>
  discardDraft: (id: string) => Promise<void>
  queueRequest: (input: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'attempts'> & { id?: string }) => Promise<string>
  syncNow: () => Promise<void>
  refresh: () => Promise<void>
}

const initialSnapshot: OfflineSyncSnapshot = {
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  draftsCount: 0,
  lastSyncedAt: null,
}

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null)

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<OfflineSyncSnapshot>(initialSnapshot)

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined' || !window.indexedDB) return
    const [queue, drafts] = await Promise.all([listOfflineQueue(), listOfflineDrafts()])
    setSnapshot((current) => ({
      ...current,
      isOnline: navigator.onLine,
      pendingCount: queue.length,
      failedCount: queue.filter((item) => Boolean(item.lastError)).length,
      draftsCount: drafts.length,
    }))
  }, [])

  const syncNow = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine || snapshot.isSyncing) return
    setSnapshot((current) => ({ ...current, isSyncing: true, isOnline: true }))

    try {
      const queue = await listOfflineQueue()
      for (const item of queue) {
        try {
          await sendOfflineQueueItem(item)
          await deleteOfflineQueueItem(item.id)
          if (item.draftId) await deleteOfflineDraft(item.draftId)
        } catch (error) {
          await updateOfflineQueueItem({
            ...item,
            attempts: item.attempts + 1,
            lastAttemptAt: new Date().toISOString(),
            lastError: error instanceof Error ? error.message : 'Synchronisation failed.',
          })
        }
      }
      setSnapshot((current) => ({ ...current, lastSyncedAt: new Date().toISOString() }))
    } finally {
      setSnapshot((current) => ({ ...current, isSyncing: false }))
      await refresh()
    }
  }, [refresh, snapshot.isSyncing])

  useEffect(() => {
    const setOnlineState = () => {
      setSnapshot((current) => ({ ...current, isOnline: navigator.onLine }))
      if (navigator.onLine) void syncNow()
    }
    void refresh()
    window.addEventListener('online', setOnlineState)
    window.addEventListener('offline', setOnlineState)
    return () => {
      window.removeEventListener('online', setOnlineState)
      window.removeEventListener('offline', setOnlineState)
    }
  }, [refresh, syncNow])

  const saveDraft = useCallback(async <T,>(input: { id: string; kind: OfflineDraftKind; recordId?: string | null; payload: T }) => {
    const existing = (await listOfflineDrafts()).find((draft) => draft.id === input.id)
    const now = new Date().toISOString()
    const draft: OfflineDraft<T> = {
      id: input.id,
      kind: input.kind,
      recordId: input.recordId,
      payload: input.payload,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      platformSavedAt: existing?.platformSavedAt || null,
    }
    await saveOfflineDraft(draft)
    await refresh()
  }, [refresh])

  const discardDraft = useCallback(async (id: string) => {
    await deleteOfflineDraft(id)
    await refresh()
  }, [refresh])

  const queueRequest = useCallback(async (input: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'attempts'> & { id?: string }) => {
    const id = input.id || createOfflineId(input.kind)
    await enqueueOfflineRequest({ ...input, id, createdAt: new Date().toISOString(), attempts: 0 })
    await refresh()
    const registration = await navigator.serviceWorker?.ready.catch(() => null)
    const syncManager = registration && 'sync' in registration
      ? (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync
      : null
    await syncManager?.register('fa-field-sync').catch(() => undefined)
    if (navigator.onLine) void syncNow()
    return id
  }, [refresh, syncNow])

  const value = useMemo<OfflineSyncContextValue>(() => ({
    ...snapshot,
    saveDraft,
    discardDraft,
    queueRequest,
    syncNow,
    refresh,
  }), [discardDraft, queueRequest, refresh, saveDraft, snapshot, syncNow])

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>
}

export function useOfflineSync(): OfflineSyncContextValue {
  const value = useContext(OfflineSyncContext)
  if (!value) throw new Error('useOfflineSync must be used inside OfflineSyncProvider.')
  return value
}
