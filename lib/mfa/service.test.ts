import { describe, expect, it, vi } from 'vitest'

import {
  beginTotpEnrollment,
  inspectMfaRequirement,
  verifyTotpCode,
  type MfaAuthApi,
} from '@/lib/mfa/service'

function buildAuth(overrides: Partial<MfaAuthApi['mfa']> = {}): MfaAuthApi {
  return {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    mfa: {
      listFactors: vi.fn().mockResolvedValue({ data: { all: [], totp: [] }, error: null }),
      getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
        data: { currentLevel: 'aal1', nextLevel: 'aal1' },
        error: null,
      }),
      enroll: vi.fn().mockResolvedValue({
        data: {
          id: 'factor-new',
          type: 'totp',
          totp: { qr_code: '<svg></svg>', secret: 'ABC234' },
        },
        error: null,
      }),
      unenroll: vi.fn().mockResolvedValue({ data: { id: 'factor-old' }, error: null }),
      challengeAndVerify: vi.fn().mockResolvedValue({ data: { access_token: 'redacted' }, error: null }),
      ...overrides,
    },
  }
}

describe('MFA service', () => {
  it('treats an invalid or missing authenticated user as signed out', async () => {
    const auth = buildAuth()
    auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } })

    await expect(inspectMfaRequirement(auth)).resolves.toEqual({ kind: 'signed-out' })
    expect(auth.mfa.listFactors).not.toHaveBeenCalled()
  })

  it('allows continuation only for an AAL2 session', async () => {
    const auth = buildAuth({
      getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
        data: { currentLevel: 'aal2', nextLevel: 'aal2' },
        error: null,
      }),
    })

    await expect(inspectMfaRequirement(auth)).resolves.toEqual({ kind: 'satisfied' })
  })

  it('returns verified TOTP factors for an AAL1 challenge', async () => {
    const auth = buildAuth({
      listFactors: vi.fn().mockResolvedValue({
        data: {
          all: [],
          totp: [
            { id: 'factor-1', factor_type: 'totp', status: 'verified', friendly_name: 'Work phone' },
            { id: 'factor-2', factor_type: 'totp', status: 'unverified' },
          ],
        },
        error: null,
      }),
      getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
        data: { currentLevel: 'aal1', nextLevel: 'aal2' },
        error: null,
      }),
    })

    await expect(inspectMfaRequirement(auth)).resolves.toEqual({
      kind: 'challenge',
      factors: [{ id: 'factor-1', label: 'Work phone' }],
    })
  })

  it('requires enrollment when no verified TOTP factor exists', async () => {
    await expect(inspectMfaRequirement(buildAuth())).resolves.toEqual({ kind: 'enroll' })
  })

  it('fails closed when assurance cannot be established', async () => {
    const auth = buildAuth({
      getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: null, error: { message: 'offline' } }),
    })

    await expect(inspectMfaRequirement(auth)).rejects.toMatchObject({ stage: 'inspection' })
  })

  it('removes only abandoned TOTP setup before returning a new enrollment', async () => {
    const unenroll = vi.fn().mockResolvedValue({ data: { id: 'old-totp' }, error: null })
    const auth = buildAuth({
      listFactors: vi.fn().mockResolvedValue({
        data: {
          all: [
            { id: 'old-totp', factor_type: 'totp', status: 'unverified' },
            { id: 'verified-totp', factor_type: 'totp', status: 'verified' },
            { id: 'old-phone', factor_type: 'phone', status: 'unverified' },
          ],
          totp: [],
        },
        error: null,
      }),
      unenroll,
    })

    const enrollment = await beginTotpEnrollment(auth)

    expect(unenroll).toHaveBeenCalledTimes(1)
    expect(unenroll).toHaveBeenCalledWith({ factorId: 'old-totp' })
    expect(enrollment.factorId).toBe('factor-new')
    expect(enrollment.qrCodeDataUrl).toMatch(/^data:image\/svg\+xml/)
    expect(enrollment.secret).toBe('ABC234')
  })

  it('does not expose malformed enrollment material in errors', async () => {
    const auth = buildAuth({
      enroll: vi.fn().mockResolvedValue({
        data: {
          id: 'factor-new',
          type: 'totp',
          totp: { qr_code: 'secret-value-in-invalid-qr', secret: 'ABC234' },
        },
        error: null,
      }),
    })

    let error: Error | null = null
    try {
      await beginTotpEnrollment(auth)
    } catch (caught) {
      error = caught as Error
    }
    expect(error).not.toBeNull()
    if (!error) throw new Error('Expected enrollment to fail')
    expect(error.message).toBe('MFA enrollment failed')
    expect(error.message).not.toContain('secret-value-in-invalid-qr')
  })

  it('verifies the refreshed session is AAL2 before succeeding', async () => {
    const auth = buildAuth({
      getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
        data: { currentLevel: 'aal2', nextLevel: 'aal2' },
        error: null,
      }),
    })

    await expect(verifyTotpCode(auth, 'factor-1', '123456')).resolves.toBe(true)
    expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'factor-1', code: '123456' })
  })

  it('rejects malformed codes without calling Supabase and fails closed after a stale refresh', async () => {
    const auth = buildAuth()
    await expect(verifyTotpCode(auth, 'factor-1', '12345')).resolves.toBe(false)
    expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled()

    await expect(verifyTotpCode(auth, 'factor-1', '123456')).rejects.toMatchObject({
      stage: 'verification',
    })
  })

  it('fails closed when the verified JWT is stale after its factor was removed', async () => {
    const auth = buildAuth({
      getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
        data: { currentLevel: 'aal2', nextLevel: 'aal1' },
        error: null,
      }),
    })

    await expect(verifyTotpCode(auth, 'factor-1', '123456')).rejects.toMatchObject({
      stage: 'verification',
    })
  })
})
