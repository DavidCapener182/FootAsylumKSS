import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockGetSession = vi.fn()
const mockGetAuthenticatorAssuranceLevel = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockRedirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
      mfa: { getAuthenticatorAssuranceLevel: mockGetAuthenticatorAssuranceLevel },
    },
    from: mockFrom,
  })),
}))

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

describe('auth account status boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    })
    mockMaybeSingle.mockResolvedValue({
      data: { role: 'readonly', account_status: 'active' },
      error: null,
    })
    mockGetAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    })
  })

  it('returns an authenticated session only for an active account', async () => {
    const { requireAuth } = await import('./auth')

    await expect(requireAuth()).resolves.toMatchObject({ user: { id: 'user-1' } })
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it.each(['invited', 'pending', 'suspended', 'deactivated'])(
    'redirects an authenticated %s account to account setup',
    async (accountStatus) => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { role: 'admin', account_status: accountStatus },
        error: null,
      })
      const { requireAuth } = await import('./auth')

      await expect(requireAuth()).rejects.toThrow('REDIRECT:/login/account-setup')
      expect(mockRedirect).toHaveBeenCalledWith('/login/account-setup')
    }
  )

  it('redirects an active AAL1 administrator to the MFA flow', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { role: 'admin', account_status: 'active' },
      error: null,
    })
    mockGetAuthenticatorAssuranceLevel.mockResolvedValueOnce({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    })
    const { requireAuth } = await import('./auth')

    await expect(requireAuth()).rejects.toThrow('REDIRECT:/login/mfa')
  })

  it('returns the active administrator session at AAL2', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { role: 'admin', account_status: 'active' },
      error: null,
    })
    const { requireAuth } = await import('./auth')

    await expect(requireAuth()).resolves.toMatchObject({ user: { id: 'user-1' } })
  })
})
