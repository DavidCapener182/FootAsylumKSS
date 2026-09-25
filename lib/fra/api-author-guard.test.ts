import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: auth.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: auth.profile }) }) }),
  }),
}))

describe('raw FRA API author gate', () => {
  beforeEach(() => {
    auth.getUser.mockReset()
    auth.profile.mockReset()
    auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    auth.profile.mockResolvedValue({ data: { role: 'ops', account_status: 'active' }, error: null })
  })

  it('continues for an active KSS assessor', async () => {
    const { fraAuthorDenialResponse } = await import('./api-author-guard')
    await expect(fraAuthorDenialResponse()).resolves.toBeNull()
  })

  it.each(['client_admin', 'area_manager', 'client'])('rejects %s before an assessment query', async (role) => {
    auth.profile.mockResolvedValue({ data: { role, account_status: 'active' }, error: null })
    const { fraAuthorDenialResponse } = await import('./api-author-guard')
    const denial = await fraAuthorDenialResponse()
    expect(denial?.status).toBe(403)
  })

  it('rejects a suspended KSS assessor', async () => {
    auth.profile.mockResolvedValue({ data: { role: 'ops', account_status: 'suspended' }, error: null })
    const { fraAuthorDenialResponse } = await import('./api-author-guard')
    const denial = await fraAuthorDenialResponse()
    expect(denial?.status).toBe(403)
  })

  it('returns 401 for no Auth user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null } })
    const { fraAuthorDenialResponse } = await import('./api-author-guard')
    const denial = await fraAuthorDenialResponse()
    expect(denial?.status).toBe(401)
  })
})
