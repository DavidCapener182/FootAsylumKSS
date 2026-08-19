import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockGetAuthenticatorAssuranceLevel = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      mfa: { getAuthenticatorAssuranceLevel: mockGetAuthenticatorAssuranceLevel },
    },
  })),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(() => ({ from: mockFrom })),
}))
vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn() }))

describe('CMP account status access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    })
  })

  it('accepts an active administrator', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', role: 'admin', account_status: 'active' },
      error: null,
    })
    const { isCurrentCmpAdmin } = await import('./access')

    await expect(isCurrentCmpAdmin()).resolves.toBe(true)
  })

  it('rejects a suspended administrator', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', role: 'admin', account_status: 'suspended' },
      error: null,
    })
    const { isCurrentCmpAdmin } = await import('./access')

    await expect(isCurrentCmpAdmin()).resolves.toBe(false)
  })

  it('rejects an active AAL1 administrator', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', role: 'admin', account_status: 'active' },
      error: null,
    })
    mockGetAuthenticatorAssuranceLevel.mockResolvedValueOnce({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    })
    const { isCurrentCmpAdmin } = await import('./access')

    await expect(isCurrentCmpAdmin()).resolves.toBe(false)
  })
})
