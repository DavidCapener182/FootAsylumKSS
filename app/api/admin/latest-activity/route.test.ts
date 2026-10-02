import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const auth = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: auth.getUser }, from: auth.from }),
}))

const request = () => new NextRequest('http://localhost/api/admin/latest-activity', {
  method: 'POST',
  body: JSON.stringify({ userIds: [] }),
})

describe('latest admin activity authorization', () => {
  beforeEach(() => {
    auth.getUser.mockReset()
    auth.profile.mockReset()
    auth.from.mockReset()
    auth.getUser.mockResolvedValue({ data: { user: { id: '091f7f25-9edb-4120-8d50-cfa4070f1352' } } })
    auth.profile.mockResolvedValue({ data: { role: 'admin', account_status: 'active' }, error: null })
    auth.from.mockImplementation((table: string) => {
      if (table !== 'fa_profiles') throw new Error(`Unexpected table ${table}`)
      return { select: () => ({ eq: () => ({ maybeSingle: auth.profile }) }) }
    })
  })

  it('allows David Capener as an active KSS administrator', async () => {
    const { POST } = await import('./route')
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ latestByUser: {} })
  })

  it('denies another active administrator', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'another-admin' } } })
    const { POST } = await import('./route')
    expect((await POST(request())).status).toBe(403)
    expect(auth.from).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['area_manager', 'active'],
    ['client_admin', 'active'],
    ['admin', 'suspended'],
  ])('denies %s in %s status before reading activity', async (role, account_status) => {
    auth.profile.mockResolvedValue({ data: { role, account_status }, error: null })
    const { POST } = await import('./route')
    const response = await POST(request())
    expect(response.status).toBe(403)
    expect(auth.from).toHaveBeenCalledTimes(1)
  })
})
