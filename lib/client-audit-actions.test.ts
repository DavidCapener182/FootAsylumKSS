import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ stores: vi.fn(), filter: vi.fn(), rows: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/client-documents', () => ({ getClientDocumentStores: mocks.stores }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabaseClient: () => ({
  from: () => ({ select: () => ({ in: mocks.filter }) }),
}) }))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.stores.mockResolvedValue([{ id: 'own-store', store_name: 'Own Store', store_code: 'S0001' }])
  mocks.filter.mockReturnValue({ order: mocks.rows })
  mocks.rows.mockResolvedValue({ data: [{ id: 'own', store_id: 'own-store' }, { id: 'other', store_id: 'other-store' }], error: null })
})
it('filters the database query and returned rows to granted stores', async () => {
  const { getClientAuditActions } = await import('./client-audit-actions')
  const result = await getClientAuditActions({ role: 'area_manager', account_status: 'active' } as any)
  expect(mocks.filter).toHaveBeenCalledWith('store_id', ['own-store'])
  expect(result.map(row => row.id)).toEqual(['own'])
})
it('does not query actions for an inactive user or an empty scope', async () => {
  const { getClientAuditActions } = await import('./client-audit-actions')
  expect(await getClientAuditActions({ role: 'area_manager', account_status: 'suspended' } as any)).toEqual([])
  mocks.stores.mockResolvedValue([])
  expect(await getClientAuditActions({ role: 'area_manager', account_status: 'active' } as any)).toEqual([])
  expect(mocks.filter).not.toHaveBeenCalled()
})
