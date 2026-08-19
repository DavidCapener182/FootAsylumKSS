import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequirePermission = vi.fn()
const mockAuditRange = vi.fn()
const mockActionRange = vi.fn()

function createQuery(range: typeof mockAuditRange) {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    range,
  }
  query.select.mockReturnValue(query)
  query.order.mockReturnValue(query)
  return query
}

const auditQuery = createQuery(mockAuditRange)
const actionQuery = createQuery(mockActionRange)
const mockFrom = vi.fn((table: string) => {
  if (table === 'fa_audit_instances') return auditQuery
  if (table === 'fa_store_actions') return actionQuery
  throw new Error(`Unexpected table: ${table}`)
})

vi.mock('@/lib/permissions', () => ({
  requirePermission: mockRequirePermission,
}))

describe('audit history export server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      supabase: { from: mockFrom },
      userId: 'user-1',
      role: 'ops',
    })
    mockAuditRange.mockResolvedValue({
      data: [
        {
          id: 'audit-1',
          template_id: 'template-1',
          store_id: 'store-1',
          conducted_by_user_id: 'user-1',
          conducted_at: '2026-08-19T10:00:00.000Z',
          overall_score: 95,
          status: 'completed',
          created_at: '2026-08-19T09:00:00.000Z',
          updated_at: '2026-08-19T10:30:00.000Z',
          fa_audit_templates: {
            id: 'template-1',
            title: 'H&S Audit',
            category: 'footasylum_audit',
            is_active: true,
          },
          fa_stores: {
            id: 'store-1',
            store_code: '001',
            store_name: 'Manchester',
            region: 'A1',
            city: 'Manchester',
            is_active: true,
          },
        },
      ],
      error: null,
    })
    mockActionRange.mockResolvedValue({ data: [], error: null })
  })

  it('requires report-export permission and queries both authoritative history sources', async () => {
    const { exportAuditHistoryCsv } = await import('@/lib/reports/audit-history-server')

    const response = await exportAuditHistoryCsv()
    const csv = await response.text()

    expect(mockRequirePermission).toHaveBeenCalledWith('exportReports')
    expect(mockFrom).toHaveBeenCalledWith('fa_audit_instances')
    expect(mockFrom).toHaveBeenCalledWith('fa_store_actions')
    expect(mockAuditRange).toHaveBeenCalledWith(0, 999)
    expect(mockActionRange).toHaveBeenCalledWith(0, 999)
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="safehub-audit-history-\d{4}-\d{2}-\d{2}\.csv"$/
    )
    expect(csv).toContain('"Audit Instance"')
    expect(csv).toContain('"audit-1"')
  })

  it('stops before querying data when permission verification fails', async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error('Unauthorized'))
    const { exportAuditHistoryCsv } = await import('@/lib/reports/audit-history-server')

    await expect(exportAuditHistoryCsv()).rejects.toThrow('Unauthorized')
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
