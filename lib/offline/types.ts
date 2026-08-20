export type OfflineDraftKind = 'incident' | 'audit' | 'fra' | 'action' | 'store-note' | 'event-log'

export type OfflineDraft<T = unknown> = {
  id: string
  kind: OfflineDraftKind
  recordId?: string | null
  payload: T
  createdAt: string
  updatedAt: string
  platformSavedAt?: string | null
}

export type OfflineQueueItem = {
  id: string
  draftId?: string | null
  kind: OfflineDraftKind
  request: {
    url: string
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: unknown
  }
  createdAt: string
  attempts: number
  lastAttemptAt?: string | null
  lastError?: string | null
}

export type OfflineSyncSnapshot = {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  failedCount: number
  draftsCount: number
  lastSyncedAt: string | null
}
