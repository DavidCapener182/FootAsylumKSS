import { describe, expect, it, vi } from 'vitest'

import { getMfaChallengeHref, hasRequiredMfaForRole, roleRequiresMfa } from '@/lib/mfa/policy'

describe('mandatory MFA policy', () => {
  it('requires MFA only for admin and operations roles', () => {
    expect(roleRequiresMfa('admin')).toBe(true)
    expect(roleRequiresMfa('ops')).toBe(true)
    expect(roleRequiresMfa('readonly')).toBe(false)
    expect(roleRequiresMfa('client')).toBe(false)
    expect(roleRequiresMfa('pending')).toBe(false)
  })

  it('requires current AAL2 and fails closed on missing or errored assurance', async () => {
    const auth = {
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn()
          .mockResolvedValueOnce({ data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null })
          .mockResolvedValueOnce({ data: { currentLevel: 'aal2', nextLevel: 'aal1' }, error: null })
          .mockResolvedValueOnce({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null })
          .mockResolvedValueOnce({ data: null, error: { message: 'unavailable' } }),
      },
    }

    await expect(hasRequiredMfaForRole(auth, 'admin')).resolves.toBe(true)
    await expect(hasRequiredMfaForRole(auth, 'admin')).resolves.toBe(false)
    await expect(hasRequiredMfaForRole(auth, 'ops')).resolves.toBe(false)
    await expect(hasRequiredMfaForRole(auth, 'ops')).resolves.toBe(false)
  })

  it('does not make an assurance request for a non-privileged role', async () => {
    const getAuthenticatorAssuranceLevel = vi.fn()
    await expect(hasRequiredMfaForRole({ mfa: { getAuthenticatorAssuranceLevel } }, 'readonly'))
      .resolves.toBe(true)
    expect(getAuthenticatorAssuranceLevel).not.toHaveBeenCalled()
  })

  it('encodes the protected destination', () => {
    expect(getMfaChallengeHref('/reports?week=2')).toBe('/login/mfa?redirectTo=%2Freports%3Fweek%3D2')
  })
})
