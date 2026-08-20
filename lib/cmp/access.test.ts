import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
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

  it('rejects an active non-administrator', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', role: 'ops', account_status: 'active' },
      error: null,
    })
    const { isCurrentCmpAdmin } = await import('./access')

    await expect(isCurrentCmpAdmin()).resolves.toBe(false)
  })
})
