import { describe, expect, it, vi } from 'vitest'
import { isChunkLoadError, recoverFromClientError } from './client-error-recovery'

describe('client error recovery', () => {
  it.each([
    { name: 'ChunkLoadError', message: 'A script failed' },
    { name: 'Error', message: 'Loading chunk 5543 failed.\n(error: https://example.test/_next/static/chunks/5543.js)' },
    { name: 'Error', message: 'Loading CSS chunk 12 failed.' },
    { name: 'TypeError', message: 'Failed to fetch dynamically imported module: https://example.test/module.js' },
    { name: 'TypeError', message: 'Importing a module script failed.' },
    { name: 'TypeError', message: 'error loading dynamically imported module' },
  ])('reloads for an asset load failure: $message', (error) => {
    const reset = vi.fn()
    const reload = vi.fn()
    expect(isChunkLoadError(error)).toBe(true)
    recoverFromClientError(error, reset, reload)
    expect(reload).toHaveBeenCalledOnce()
    expect(reset).not.toHaveBeenCalled()
  })

  it.each(['Failed to fetch', 'Database unavailable', 'Permission denied', ''])('preserves React retry for other failures: %s', (message) => {
    const error = new Error(message)
    const reset = vi.fn()
    const reload = vi.fn()
    expect(isChunkLoadError(error)).toBe(false)
    recoverFromClientError(error, reset, reload)
    expect(reset).toHaveBeenCalledOnce()
    expect(reload).not.toHaveBeenCalled()
  })
})
