import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

vi.mock('@/lib/env', () => ({
  getSupabasePublicConfig: vi.fn(() => ({
    url: 'https://example.supabase.co',
    anonKey: 'test-anon-key',
  })),
}))

async function runMiddleware(path: string) {
  const { middleware } = await import('./middleware')
  return middleware(new NextRequest(`https://app.example.com${path}`))
}

describe('middleware profile authorization boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('redirects a missing-profile browser session to the safe account setup page', async () => {
    const response = await runMiddleware('/reports')

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://app.example.com/login/account-setup')
  })

  it('returns forbidden for a missing-profile API session', async () => {
    const response = await runMiddleware('/api/reports/weekly-digest')

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Account profile is not authorized' })
  })

  it('allows the missing-profile session to render account setup without a redirect loop', async () => {
    const response = await runMiddleware('/login/account-setup')

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('allows protected traffic when the trusted profile exists', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'user-1', role: 'readonly', account_status: 'active' },
      error: null,
    })

    const response = await runMiddleware('/reports')

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it.each(['invited', 'pending', 'suspended', 'deactivated'])(
    'returns forbidden for an authenticated %s account API request',
    async (accountStatus) => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'user-1', role: 'admin', account_status: accountStatus },
        error: null,
      })

      const response = await runMiddleware('/api/reports/weekly-digest')

      expect(response.status).toBe(403)
    }
  )

  it('does not expose account setup as a valid session page to signed-out users', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })

    const response = await runMiddleware('/login/account-setup')

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://app.example.com/login')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it.each(['admin', 'ops'])(
    'allows an active %s account through without an authenticator-assurance API',
    async (role) => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'user-1', role, account_status: 'active' },
        error: null,
      })

      const response = await runMiddleware('/reports?week=2')
      expect(response.status).toBe(200)
      expect(response.headers.get('x-middleware-next')).toBe('1')
    }
  )

  it('rejects a backslash open redirect from the login destination', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'user-1', role: 'readonly', account_status: 'active' },
      error: null,
    })

    const response = await runMiddleware('/login?redirectTo=%2F%5Cattacker.example')
    expect(response.headers.get('location')).toBe('https://app.example.com/')
  })
})
