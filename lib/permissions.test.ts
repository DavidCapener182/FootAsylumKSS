import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('server permission enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockMaybeSingle.mockResolvedValue({
      data: { role: 'readonly', account_status: 'active' },
      error: null,
    })
  })

  it('classifies a missing Auth session as unauthorized', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const { requirePermission } = await import('./permissions')

    await expect(requirePermission('exportReports')).rejects.toMatchObject({
      name: 'PermissionError',
      status: 401,
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('fails closed with forbidden when the Auth user has no trusted profile', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { requirePermission } = await import('./permissions')

    await expect(requirePermission('exportReports')).rejects.toMatchObject({
      name: 'PermissionError',
      status: 403,
    })
  })

  it('returns the trusted permission context when the stored role has the capability', async () => {
    const { requirePermission } = await import('./permissions')

    await expect(requirePermission('exportReports')).resolves.toEqual({
      supabase: mockSupabase,
      userId: 'user-1',
      role: 'readonly',
      accountStatus: 'active',
    })
  })

  it.each(['invited', 'pending', 'suspended', 'deactivated'])(
    'rejects a %s account even when its stored role has the capability',
    async (accountStatus) => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { role: 'admin', account_status: accountStatus },
        error: null,
      })
      const { requirePermission } = await import('./permissions')

      await expect(requirePermission('adminUsers')).rejects.toMatchObject({
        name: 'PermissionError',
        status: 403,
      })
    }
  )

  it('returns an active administrator permission without an authenticator-assurance API', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { role: 'admin', account_status: 'active' },
      error: null,
    })
    const { requirePermission } = await import('./permissions')

    await expect(requirePermission('adminUsers')).resolves.toMatchObject({
      userId: 'user-1',
      role: 'admin',
      accountStatus: 'active',
    })
  })
})
