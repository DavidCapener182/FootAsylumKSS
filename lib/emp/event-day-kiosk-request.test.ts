import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(),
}))

import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
  clearEmpEventDayWorkerVerificationFailures,
  createEmpEventDayKioskRequestContext,
  empEventDayWorkerLimitKey,
  EmpEventDayRateLimitError,
  reserveEmpEventDayKioskPinAttempt,
  reserveEmpEventDayWorkerVerificationAttempt,
  throwIfEmpEventDayProofAttemptBlocked,
} from '@/lib/emp/event-day-kiosk-request'

describe('event-day kiosk request identity', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the Vercel-controlled source instead of a client forwarding header', () => {
    vi.stubEnv('VERCEL', '1')
    const request = new Request('https://example.test', {
      headers: {
        'x-vercel-forwarded-for': '203.0.113.10',
        'x-forwarded-for': '198.51.100.1',
      },
    })
    const spoofedRequest = new Request('https://example.test', {
      headers: {
        'x-vercel-forwarded-for': '203.0.113.10',
        'x-forwarded-for': '198.51.100.200',
      },
    })
    const first = createEmpEventDayKioskRequestContext(request, 'token-one', 'verify')
    const second = createEmpEventDayKioskRequestContext(spoofedRequest, 'token-two', 'verify')

    expect(first.clientKeyHash).toBe(second.clientKeyHash)
    expect(first.pinKeyHash).not.toBe(second.pinKeyHash)
  })

  it('shares PIN lockout state for one credential across request sources', () => {
    vi.stubEnv('VERCEL', '1')
    const first = createEmpEventDayKioskRequestContext(new Request('https://example.test', {
      headers: { 'x-vercel-forwarded-for': '203.0.113.10' },
    }), 'same-token', 'verify')
    const second = createEmpEventDayKioskRequestContext(new Request('https://example.test', {
      headers: { 'x-vercel-forwarded-for': '203.0.113.11' },
    }), 'same-token', 'search_staff')

    expect(first.clientKeyHash).not.toBe(second.clientKeyHash)
    expect(first.pinKeyHash).toBe(second.pinKeyHash)
    expect(first.correlationId).not.toBe(second.correlationId)
  })

  it('does not trust generic forwarding headers outside Vercel by default', () => {
    vi.stubEnv('VERCEL', '')
    const first = createEmpEventDayKioskRequestContext(new Request('https://example.test', {
      headers: { 'x-forwarded-for': '203.0.113.10', 'x-real-ip': '203.0.113.10' },
    }), 'token-one', 'verify')
    const second = createEmpEventDayKioskRequestContext(new Request('https://example.test', {
      headers: { 'x-forwarded-for': '198.51.100.20', 'x-real-ip': '198.51.100.20' },
    }), 'token-two', 'verify')

    expect(first.clientKeyHash).toBe(second.clientKeyHash)
  })

  it('supports an explicitly configured proxy-overwritten source header', () => {
    vi.stubEnv('VERCEL', '')
    vi.stubEnv('EMP_EVENT_DAY_TRUSTED_IP_HEADER', 'x-kss-client-ip')
    const first = createEmpEventDayKioskRequestContext(new Request('https://example.test', {
      headers: { 'x-kss-client-ip': '203.0.113.10' },
    }), 'token-one', 'verify')
    const second = createEmpEventDayKioskRequestContext(new Request('https://example.test', {
      headers: { 'x-kss-client-ip': '203.0.113.11' },
    }), 'token-two', 'verify')

    expect(first.clientKeyHash).not.toBe(second.clientKeyHash)
  })

  it('binds worker failure buckets to both the kiosk credential and selected shift', () => {
    const firstContext = createEmpEventDayKioskRequestContext(
      new Request('https://example.test'),
      'token-one',
      'clock_in'
    )
    const sameCredentialContext = createEmpEventDayKioskRequestContext(
      new Request('https://example.test'),
      'token-one',
      'clock_out'
    )
    const otherCredentialContext = createEmpEventDayKioskRequestContext(
      new Request('https://example.test'),
      'token-two',
      'clock_in'
    )

    expect(empEventDayWorkerLimitKey(firstContext, 'shift-one')).toBe(
      empEventDayWorkerLimitKey(sameCredentialContext, 'shift-one')
    )
    expect(empEventDayWorkerLimitKey(firstContext, 'shift-one')).not.toBe(
      empEventDayWorkerLimitKey(firstContext, 'shift-two')
    )
    expect(empEventDayWorkerLimitKey(firstContext, 'shift-one')).not.toBe(
      empEventDayWorkerLimitKey(otherCredentialContext, 'shift-one')
    )
  })

  it('atomically reserves PIN and worker attempts without a zero-increment precheck', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        allowed: true,
        retry_after_seconds: 0,
        current_count: 1,
        locked_until: null,
        reservation_window_started_at: '2026-08-19T22:00:00.000Z',
        attempt_reserved: true,
      }],
      error: null,
    })
    vi.mocked(createAdminSupabaseClient).mockReturnValue({ rpc } as any)
    const context = createEmpEventDayKioskRequestContext(
      new Request('https://example.test'),
      'token-one',
      'clock_in'
    )

    await expect(reserveEmpEventDayKioskPinAttempt(context)).resolves.toMatchObject({
      allowed: true,
      currentCount: 1,
    })
    await expect(
      reserveEmpEventDayWorkerVerificationAttempt(context, 'shift-one')
    ).resolves.toMatchObject({ allowed: true, currentCount: 1 })

    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls.every(([, args]) => args.p_increment === 1)).toBe(true)
    expect(rpc.mock.calls.map(([, args]) => args.p_action)).toEqual(['pin', 'worker'])
  })

  it('lets the threshold-owning reservation compare once, then reports 429 on a bad proof', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        allowed: false,
        retry_after_seconds: 900,
        current_count: 5,
        locked_until: '2026-08-19T22:15:00.000Z',
        reservation_window_started_at: '2026-08-19T22:00:00.000Z',
        attempt_reserved: true,
      }],
      error: null,
    })
    vi.mocked(createAdminSupabaseClient).mockReturnValue({ rpc } as any)
    const context = createEmpEventDayKioskRequestContext(
      new Request('https://example.test'),
      'token-one',
      'clock_in'
    )

    const reservation = await reserveEmpEventDayKioskPinAttempt(context)

    expect(reservation).toMatchObject({ allowed: false, currentCount: 5 })
    expect(() => throwIfEmpEventDayProofAttemptBlocked(reservation)).toThrow(
      EmpEventDayRateLimitError
    )
  })

  it('rejects an already-locked proof bucket before comparison', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        allowed: false,
        retry_after_seconds: 600,
        current_count: 5,
        locked_until: '2026-08-19T22:15:00.000Z',
        reservation_window_started_at: '2026-08-19T22:00:00.000Z',
        attempt_reserved: false,
      }],
      error: null,
    })
    vi.mocked(createAdminSupabaseClient).mockReturnValue({ rpc } as any)
    const context = createEmpEventDayKioskRequestContext(
      new Request('https://example.test'),
      'token-one',
      'clock_in'
    )

    await expect(reserveEmpEventDayKioskPinAttempt(context)).rejects.toBeInstanceOf(
      EmpEventDayRateLimitError
    )
  })

  it('clears only the selected worker bucket after a correct proof', async () => {
    const context = createEmpEventDayKioskRequestContext(
      new Request('https://example.test'),
      'token-one',
      'clock_in'
    )
    const countEq = vi.fn().mockResolvedValue({ error: null })
    const windowEq = vi.fn().mockReturnValue({ eq: countEq })
    const actionEq = vi.fn().mockReturnValue({ eq: windowEq })
    const keyEq = vi.fn().mockReturnValue({ eq: actionEq })
    const deleteRows = vi.fn().mockReturnValue({ eq: keyEq })
    const from = vi.fn().mockReturnValue({ delete: deleteRows })
    vi.mocked(createAdminSupabaseClient).mockReturnValue({ from } as any)

    const reservation = {
      allowed: true,
      retryAfterSeconds: 0,
      currentCount: 3,
      windowStartedAt: '2026-08-19T22:00:00.000Z',
    }

    await clearEmpEventDayWorkerVerificationFailures(context, 'shift-one', reservation)

    expect(from).toHaveBeenCalledWith('emp_event_kiosk_request_limits')
    expect(keyEq).toHaveBeenCalledWith(
      'key_hash',
      empEventDayWorkerLimitKey(context, 'shift-one')
    )
    expect(actionEq).toHaveBeenCalledWith('action', 'worker')
    expect(windowEq).toHaveBeenCalledWith('window_started_at', reservation.windowStartedAt)
    expect(countEq).toHaveBeenCalledWith('request_count', reservation.currentCount)
    expect(empEventDayWorkerLimitKey(context, 'shift-one')).not.toBe(
      empEventDayWorkerLimitKey(context, 'shift-two')
    )
  })
})
