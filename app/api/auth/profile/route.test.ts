import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

describe('authenticated profile endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          user_metadata: { intended_role: 'admin' },
        },
      },
    })
  })

  it('fails closed when an administrator has not provisioned a profile', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { POST } = await import('./route')

    const response = await POST()
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error).toContain('not been provisioned')
    expect(mockFrom).toHaveBeenCalledWith('fa_profiles')
    expect(mockFrom.mock.results[0]?.value).not.toHaveProperty('insert')
  })

  it('returns an existing trusted profile without consulting role metadata', async () => {
    const profile = {
      id: 'user-1',
      full_name: 'Test User',
      role: 'readonly',
      account_status: 'active',
    }
    mockMaybeSingle.mockResolvedValue({ data: profile, error: null })
    const { POST } = await import('./route')

    const response = await POST()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.profile).toEqual(profile)
    expect(json.profile.role).toBe('readonly')
  })

  it('returns forbidden for a provisioned but non-active profile', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'user-1',
        full_name: 'Test User',
        role: 'admin',
        account_status: 'suspended',
      },
      error: null,
    })
    const { POST } = await import('./route')

    const response = await POST()

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Account is not active',
      account_status: 'suspended',
    })
  })
})
