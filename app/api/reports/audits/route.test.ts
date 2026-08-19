import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

const mockRequireReportAccess = vi.fn()
const mockExportAuditHistoryCsv = vi.fn()

vi.mock('@/lib/reports/authorization', () => ({
  requireReportAccess: mockRequireReportAccess,
  reportPermissionErrorResponse: vi.fn((error: unknown) => {
    if (!(error instanceof Error) || error.message !== 'denied') return null
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }),
}))

vi.mock('@/lib/reports/audit-history-server', () => ({
  exportAuditHistoryCsv: mockExportAuditHistoryCsv,
}))

describe('audit history export route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects before querying export data when report access is denied', async () => {
    mockRequireReportAccess.mockRejectedValue(new Error('denied'))
    const { GET } = await import('./route')

    const response = await GET()

    expect(response.status).toBe(403)
    expect(mockRequireReportAccess).toHaveBeenCalledTimes(1)
    expect(mockExportAuditHistoryCsv).not.toHaveBeenCalled()
  })

  it('returns the generated CSV after authorization succeeds', async () => {
    mockRequireReportAccess.mockResolvedValue({ role: 'ops' })
    mockExportAuditHistoryCsv.mockResolvedValue(
      new Response('csv-data', { headers: { 'Content-Type': 'text/csv' } })
    )
    const { GET } = await import('./route')

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/csv')
    await expect(response.text()).resolves.toBe('csv-data')
    expect(mockExportAuditHistoryCsv).toHaveBeenCalledTimes(1)
  })
})
