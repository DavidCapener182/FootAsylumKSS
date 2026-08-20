import type { OfflineDraft, OfflineQueueItem } from './types'

const DATABASE_NAME = 'footasylum-kss-field-data'
const DATABASE_VERSION = 1
const DRAFT_STORE = 'drafts'
const QUEUE_STORE = 'sync-queue'

type StoreName = typeof DRAFT_STORE | typeof QUEUE_STORE

function requireIndexedDb(): IDBFactory {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('Offline storage is not available in this browser.')
  }
  return window.indexedDB
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = requireIndexedDb().open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(DRAFT_STORE)) {
        const drafts = database.createObjectStore(DRAFT_STORE, { keyPath: 'id' })
        drafts.createIndex('kind', 'kind', { unique: false })
        drafts.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      if (!database.objectStoreNames.contains(QUEUE_STORE)) {
        const queue = database.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
        queue.createIndex('createdAt', 'createdAt', { unique: false })
        queue.createIndex('draftId', 'draftId', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Unable to open offline storage.'))
  })
}

async function runRequest<T>(storeName: StoreName, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const request = operation(transaction.objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Offline storage operation failed.'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => reject(transaction.error || new Error('Offline storage transaction failed.'))
  })
}

export function createOfflineId(prefix: string): string {
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${randomId}`
}

export async function saveOfflineDraft<T>(draft: OfflineDraft<T>): Promise<void> {
  await runRequest(DRAFT_STORE, 'readwrite', (store) => store.put(draft))
}

export async function getOfflineDraft<T>(id: string): Promise<OfflineDraft<T> | null> {
  return (await runRequest(DRAFT_STORE, 'readonly', (store) => store.get(id))) as OfflineDraft<T> | undefined || null
}

export async function listOfflineDrafts(): Promise<OfflineDraft[]> {
  const drafts = await runRequest(DRAFT_STORE, 'readonly', (store) => store.getAll()) as OfflineDraft[]
  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function deleteOfflineDraft(id: string): Promise<void> {
  await runRequest(DRAFT_STORE, 'readwrite', (store) => store.delete(id))
}

export async function enqueueOfflineRequest(item: OfflineQueueItem): Promise<void> {
  await runRequest(QUEUE_STORE, 'readwrite', (store) => store.put(item))
}

export async function listOfflineQueue(): Promise<OfflineQueueItem[]> {
  const items = await runRequest(QUEUE_STORE, 'readonly', (store) => store.getAll()) as OfflineQueueItem[]
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function updateOfflineQueueItem(item: OfflineQueueItem): Promise<void> {
  await runRequest(QUEUE_STORE, 'readwrite', (store) => store.put(item))
}

export async function deleteOfflineQueueItem(id: string): Promise<void> {
  await runRequest(QUEUE_STORE, 'readwrite', (store) => store.delete(id))
}
