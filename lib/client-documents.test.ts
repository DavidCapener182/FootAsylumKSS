import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  scope: vi.fn(),
  stores: vi.fn(),
  history: vi.fn(),
  historyLookup: vi.fn(),
  historyStoreEq: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/fra/action-access', () => ({ getFraActionReadScope: mocks.scope }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => table === 'fa_stores'
      ? { select: () => ({ in: () => ({ order: mocks.stores }) }) }
      : { select: () => ({
        in: () => ({ not: () => ({ order: mocks.history }) }),
        eq: mocks.historyLookup,
      }) },
  }),
}))

const storeId = '11111111-1111-4111-8111-111111111111'
const otherId = '22222222-2222-4222-8222-222222222222'
const documentId = '33333333-3333-4333-8333-333333333333'
const profile = { id: 'client-1', role: 'client_admin', account_status: 'active' } as any

describe('client document scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.scope.mockResolvedValue({ kind: 'client_stores', role: 'client_admin', storeIds: [storeId] })
    mocks.stores.mockResolvedValue({ data: [{ id: storeId, store_code: 'S0001', store_name: 'Test Store',
      compliance_audit_1_date: '2026-09-01', compliance_audit_1_pdf_path: 'store/test/audit.pdf',
      compliance_audit_2_date: null, compliance_audit_2_pdf_path: null,
      compliance_audit_3_date: null, compliance_audit_3_pdf_path: null,
      fire_risk_assessment_date: null, fire_risk_assessment_pdf_path: null }], error: null })
    mocks.history.mockResolvedValue({ data: [{ id: documentId, store_id: storeId, kind: 'H&S', audit_number: 1, visit_date: '2026-09-01', pdf_path: 'store/test/audit.pdf' }], error: null })
    mocks.historyLookup.mockReturnValue({ eq: mocks.historyStoreEq })
    mocks.historyStoreEq.mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { kind: 'H&S', pdf_path: 'store/test/audit.pdf' }, error: null }) })
  })

  it('lists only stores returned by the explicit Client Admin grant scope', async () => {
    const { getClientDocuments } = await import('./client-documents')
    const rows = await getClientDocuments(profile)
    expect(rows).toMatchObject([{ storeId, kind: 'H&S' }])
    expect(mocks.scope).toHaveBeenCalledWith(profile)
  })

  it('refuses a PDF from a store outside the grant scope before looking up history', async () => {
    const { getClientDocumentPath } = await import('./client-documents')
    expect(await getClientDocumentPath(profile, otherId, documentId)).toBeNull()
    expect(mocks.history).not.toHaveBeenCalled()
  })

  it('binds a history PDF lookup to the granted store and rejects raw paths', async () => {
    const { getClientDocumentPath } = await import('./client-documents')
    expect(await getClientDocumentPath(profile, storeId, 'store/test/audit.pdf')).toBeNull()
    expect(await getClientDocumentPath(profile, storeId, documentId)).toBe('store/test/audit.pdf')
    expect(mocks.historyLookup).toHaveBeenCalledWith('id', documentId)
    expect(mocks.historyStoreEq).toHaveBeenCalledWith('store_id', storeId)
  })

  it('refuses Area Manager access to the client document collection', async () => {
    const { getClientDocuments } = await import('./client-documents')
    expect(await getClientDocuments({ ...profile, role: 'area_manager' })).toEqual([])
    expect(mocks.stores).not.toHaveBeenCalled()
  })
})
