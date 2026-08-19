import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createContext: vi.fn(),
  enforceLimit: vi.fn(),
  recordRequest: vi.fn(),
}))

vi.mock('@/lib/emp/access', () => ({
  EmpAccessError: class EmpAccessError extends Error {},
}))
vi.mock('@/lib/emp/data', () => ({
  EmpSetupRequiredError: class EmpSetupRequiredError extends Error {},
}))
vi.mock('@/lib/emp/event-day-data', () => ({
  EmpEventDayError: class EmpEventDayError extends Error {
    status: number

    constructor(message: string, status = 400) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/emp/event-day-kiosk-request', () => ({
  createEmpEventDayKioskRequestContext: mocks.createContext,
  enforceEmpEventDayKioskRequestLimit: mocks.enforceLimit,
  recordEmpEventDayKioskRequest: mocks.recordRequest,
  EmpEventDayRateLimitError: class EmpEventDayRateLimitError extends Error {
    retryAfterSeconds: number

    constructor(retryAfterSeconds: number) {
      super('Too many kiosk requests. Try again shortly.')
      this.retryAfterSeconds = retryAfterSeconds
    }
  },
}))

import { EmpEventDayRateLimitError } from '@/lib/emp/event-day-kiosk-request'
import { empEventDayKioskRoute } from '@/lib/emp/event-day-route'

const context = {
  action: 'verify' as const,
  correlationId: '00000000-0000-4000-8000-000000000123',
  clientKeyHash: 'client-key',
  pinKeyHash: 'pin-key',
  planId: null,
  kioskAccessId: null,
  eventDate: null,
}

describe('event-day kiosk route boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createContext.mockReturnValue({ ...context })
    mocks.enforceLimit.mockResolvedValue(undefined)
    mocks.recordRequest.mockResolvedValue(undefined)
  })

  it('adds a correlation header and records a successful request', async () => {
    const response = await empEventDayKioskRoute({
      request: new Request('https://example.test/api/event-day/token/verify', { method: 'POST' }),
      token: 'token',
      action: 'verify',
      fallback: 'Verification failed',
      handler: async () => ({ verified: true }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toBe(context.correlationId)
    await expect(response.json()).resolves.toEqual({ verified: true })
    expect(mocks.recordRequest).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'success',
      statusCode: 200,
    }))
  })

  it('returns Retry-After and the same request ID when throttled', async () => {
    mocks.enforceLimit.mockRejectedValue(new EmpEventDayRateLimitError(17))

    const response = await empEventDayKioskRoute({
      request: new Request('https://example.test/api/event-day/token/verify', { method: 'POST' }),
      token: 'token',
      action: 'verify',
      fallback: 'Verification failed',
      handler: async () => ({ verified: true }),
    })

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('17')
    expect(response.headers.get('x-request-id')).toBe(context.correlationId)
    await expect(response.json()).resolves.toEqual({
      error: 'Too many kiosk requests. Try again shortly.',
      requestId: context.correlationId,
    })
    expect(mocks.recordRequest).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'rate_limited',
      statusCode: 429,
    }))
  })
})
