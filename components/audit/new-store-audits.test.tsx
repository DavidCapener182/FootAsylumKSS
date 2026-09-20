import React from 'react'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AuditTable } from './audit-table'
import { AuditStatsCards } from './audit-stats-cards'
import { AuditRow, getCompletedAuditCount, getLatestAuditComparison } from './audit-table-helpers'
import { isNewStoreFirstAudit } from '@/lib/audit/new-store-applicability'

vi.stubGlobal('React', React)
afterAll(() => { vi.unstubAllGlobals() })
vi.mock('@/components/shared/pdf-viewer-modal', () => ({ PDFViewerModal: () => null }))

const stores = [
  ['76c6774f-4dab-452e-81a9-a1fcea8f29d8', 'Trafford Centre New Store', 80],
  ['56d176db-bc7c-4f60-b04c-a40cefa89c62', 'Merthyr Tydfil', 93.26],
].map(([id, store_name, score]) => ({
  id, store_name, store_code: null, region: null, reporting_area: 'AREA2', is_active: true,
  compliance_audit_1_date: null, compliance_audit_1_overall_pct: null, compliance_audit_1_pdf_path: null,
  compliance_audit_2_date: '2026-08-13', compliance_audit_2_overall_pct: score, compliance_audit_2_pdf_path: 'existing.pdf',
  compliance_audit_3_date: null, compliance_audit_3_overall_pct: null,
  action_plan_1_sent: false, action_plan_2_sent: false, action_plan_3_sent: false,
})) as AuditRow[]

describe('new-store first audit applicability', () => {
  for (const row of stores) {
    it(`shows ${row.store_name} as a new store without a missing first-audit prompt`, () => {
      const html = renderToStaticMarkup(<AuditTable rows={[row]} userRole="admin" />)
      expect(html).toContain('New store')
      expect(html).toContain('Audit 1 not required')
      expect(html).not.toContain('+ Add Audit 1')
      expect(html).not.toContain('Not recorded')
      expect(html).toContain('Audit 2 Complete')
      expect(getCompletedAuditCount(row)).toBe(1)
      expect(getLatestAuditComparison(row)).toBeNull()
    })
  }
  it('uses only the actual audit scores in averages', () => {
    const html = renderToStaticMarkup(<AuditStatsCards stores={stores} selectedArea="all" />)
    expect(html).toContain('86.63%')
  })
  it('does not hide genuinely missing audits or carry exceptions into another year', () => {
    const row = stores[0]
    expect(isNewStoreFirstAudit({...row, id: 'other-store'})).toBe(false)
    expect(isNewStoreFirstAudit({...row, compliance_audit_2_date: '2027-08-13'})).toBe(false)
    expect(isNewStoreFirstAudit({...row, compliance_audit_1_overall_pct: 0})).toBe(false)
    expect(isNewStoreFirstAudit({...row, compliance_audit_1_date: '2026-01-01'})).toBe(false)
    expect(isNewStoreFirstAudit({...row, compliance_audit_1_pdf_path: 'audit1.pdf'})).toBe(false)
  })
})
