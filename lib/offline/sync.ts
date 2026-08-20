import type { OfflineQueueItem } from './types'

export function buildOfflineRequestInit(item: OfflineQueueItem): RequestInit {
  const hasBody = item.request.body !== undefined && item.request.method !== 'DELETE'
  return {
    method: item.request.method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Idempotency-Key': item.id,
    },
    body: hasBody ? JSON.stringify(item.request.body) : undefined,
  }
}

export async function sendOfflineQueueItem(item: OfflineQueueItem, fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher(item.request.url, buildOfflineRequestInit(item))
  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Platform returned ${response.status}.`)
  }
}

export function canSubmitFinalRecord(isOnline: boolean, isSyncing: boolean): boolean {
  return isOnline && !isSyncing
}
