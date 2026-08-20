import { describe, expect, it, vi } from 'vitest'
import { buildOfflineRequestInit, canSubmitFinalRecord, sendOfflineQueueItem } from './sync'
import type { OfflineQueueItem } from './types'

const item: OfflineQueueItem = {
  id: 'incident-123',
  kind: 'incident',
  createdAt: '2026-08-20T09:00:00.000Z',
  attempts: 0,
  request: { url: '/api/example', method: 'POST', body: { summary: 'Test' } },
}

describe('offline sync', () => {
  it('adds an idempotency key and same-origin credentials to queued requests', () => {
    expect(buildOfflineRequestInit(item)).toMatchObject({
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify({ summary: 'Test' }),
      headers: expect.objectContaining({ 'X-Idempotency-Key': 'incident-123' }),
    })
  })

  it('keeps final submission unavailable until the device is online and idle', () => {
    expect(canSubmitFinalRecord(false, false)).toBe(false)
    expect(canSubmitFinalRecord(true, true)).toBe(false)
    expect(canSubmitFinalRecord(true, false)).toBe(true)
  })

  it('surfaces a platform rejection instead of dropping the queued item', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('Validation failed', { status: 422 }))
    await expect(sendOfflineQueueItem(item, fetcher)).rejects.toThrow('Validation failed')
  })
})
