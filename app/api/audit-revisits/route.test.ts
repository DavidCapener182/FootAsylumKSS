import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ permission: vi.fn(), admin: vi.fn(), access: vi.fn(), append: vi.fn() }))
vi.mock('@/lib/permissions', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/permissions')>(), requirePermission: mocks.permission }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabaseClient: mocks.admin }))
vi.mock('@/lib/audit/revisit-evidence', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/audit/revisit-evidence')>(), assertStoreAccess: mocks.access, appendRevisit: mocks.append }))
import { GET, POST } from './route'
import { PermissionError } from '@/lib/permissions'
import { RevisitError } from '@/lib/audit/revisit-evidence'
const store = '11111111-1111-4111-8111-111111111111'
const evidence = '22222222-2222-4222-8222-222222222222'
const request = (suffix = '') => new NextRequest(`https://example.test/api/audit-revisits?storeId=${store}${suffix}`)

describe('revisit route access boundary', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.permission.mockResolvedValue({ supabase: {}, userId: store }); mocks.access.mockResolvedValue(undefined) })
  it.each([401, 403] as const)('fails closed for denied read permission %s before privileged queries', async status => {
    mocks.permission.mockRejectedValue(new PermissionError('Denied', status))
    const response = await GET(request())
    expect(response.status).toBe(status); expect(mocks.admin).not.toHaveBeenCalled()
  })
  it('requires manageAudits for uploads; a view-only caller never reaches storage', async () => {
    mocks.permission.mockRejectedValue(new PermissionError('Denied', 403))
    expect((await POST(new NextRequest('https://example.test/api/audit-revisits', { method: 'POST' }))).status).toBe(403)
    expect(mocks.permission).toHaveBeenCalledWith('manageAudits'); expect(mocks.admin).not.toHaveBeenCalled(); expect(mocks.append).not.toHaveBeenCalled()
  })
  it('rejects cross-origin writes before authentication or upload', async () => {
    const response = await POST(new NextRequest('https://example.test/api/audit-revisits', { method: 'POST', headers: { origin: 'https://untrusted.test' } }))
    expect(response.status).toBe(403); expect(mocks.permission).not.toHaveBeenCalled()
  })
  it('denies hidden stores before loading history', async () => {
    mocks.access.mockRejectedValue(new RevisitError('Store unavailable', 404))
    expect((await GET(request())).status).toBe(404); expect(mocks.admin).not.toHaveBeenCalled()
  })
  it('binds evidence downloads to the requested store and refuses another store before file access', async () => {
    const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn() }
    query.maybeSingle.mockResolvedValueOnce({ data: { original_history_id: evidence, storage_path: 'private.pdf' } }).mockResolvedValueOnce({ data: null })
    const storage = { from: vi.fn() }; mocks.admin.mockReturnValue({ from: () => query, storage })
    expect((await GET(request(`&evidenceId=${evidence}`))).status).toBe(404)
    expect(query.eq).toHaveBeenCalledWith('store_id', store); expect(storage.from).not.toHaveBeenCalled()
  })
  it('returns an error rather than a misleading empty history when schema is unavailable', async () => {
    mocks.admin.mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: async () => ({ data: null, error: { code: '42P01' } }) }) }) }) }) })
    expect((await GET(request())).status).toBe(503)
  })
  it('does not expose privileged exception details', async () => {
    mocks.permission.mockRejectedValue(new Error('secret connection details'))
    const response = await GET(request()); expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('secret')
  })
})
