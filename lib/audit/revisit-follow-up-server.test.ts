import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ permission: vi.fn(), admin: vi.fn() }))
vi.mock('@/lib/permissions', () => ({ requirePermission: mock.permission }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabaseClient: mock.admin }))
import { loadAuditRevisitFollowUps } from './revisit-follow-up-server'
const query = (data: unknown, error: unknown = null) => { const q: any = { select: vi.fn(() => q), in: vi.fn(() => q), eq: vi.fn(() => q), then: (resolve: any) => Promise.resolve({ data, error }).then(resolve) }; return q }
describe('server revisit summary authorization', () => {
  beforeEach(() => { vi.resetAllMocks() })
  it('returns unavailable and never uses the admin client when role access is denied', async () => {
    mock.permission.mockRejectedValue(new Error('denied'))
    expect(await loadAuditRevisitFollowUps([{ id: 'store' }])).toEqual({ store: { status: 'unavailable', originals: [] } })
    expect(mock.admin).not.toHaveBeenCalled()
  })
  it('does not use privileged reads for stores hidden by RLS', async () => {
    mock.permission.mockResolvedValue({ supabase: { from: () => query([]) } })
    await loadAuditRevisitFollowUps([{ id: 'store' }]); expect(mock.admin).not.toHaveBeenCalled()
  })
  it('restricts history queries to visible stores and keeps denied stores unavailable', async () => {
    mock.permission.mockResolvedValue({ supabase: { from: () => query([{ id: 'allowed' }]) } })
    const history = query([]); mock.admin.mockReturnValue({ from: () => history })
    expect(await loadAuditRevisitFollowUps([{ id: 'allowed' }, { id: 'denied' }])).toEqual({ allowed: { status: 'available', originals: [] }, denied: { status: 'unavailable', originals: [] } })
    expect(history.in).toHaveBeenCalledWith('store_id', ['allowed'])
  })
  it('does not silently mark revisit complete when history or evidence access fails', async () => {
    mock.permission.mockResolvedValue({ supabase: { from: () => query([{ id: 'store' }]) } })
    mock.admin.mockReturnValue({ from: () => query(null, { message: 'unavailable' }) })
    expect((await loadAuditRevisitFollowUps([{ id: 'store' }])).store.status).toBe('unavailable')
  })
})
