import { describe, expect, it } from 'vitest'
import { auditRowsForYear } from './year-view'
import { auditPairLabel } from './cycles'
import type { AuditRow } from '@/components/audit/audit-table-helpers'
const store = { id: 'store', store_name: 'Example', compliance_audit_1_date: '2026-02-01', compliance_audit_1_overall_pct: 90, compliance_audit_1_pdf_path: 'first.pdf', compliance_audit_2_date: '2026-09-01', compliance_audit_2_overall_pct: 75, compliance_audit_2_pdf_path: 'second.pdf', action_plan_2_sent: true, total_audits_to_date: 2 } as AuditRow
const historical = { id: 'history', store_id: 'store', audit_year: 2025, audit_number: 1, visit_date: '2025-02-01', percentage: 81, pdf_path: 'archive.pdf' }
describe('audit year views', () => {
  it('preserves current scores and report links without mutating the source', () => {
    const row = auditRowsForYear([store], [historical], 2026, 2026)[0]
    expect(row.compliance_audit_2_overall_pct).toBe(75)
    expect(row.action_plan_2_sent).toBe(true)
    expect(row.audit_read_only).toBe(false)
    expect(store.total_audits_to_date).toBe(2)
  })
  it('shows an empty next year rather than relabelling existing scores', () => {
    const row = auditRowsForYear([store], [historical], 2027, 2026)[0]
    expect(row.compliance_audit_1_overall_pct).toBeNull()
    expect(row.compliance_audit_2_pdf_path).toBeNull()
    expect(row.total_audits_to_date).toBe(0)
    expect(row.audit_read_only).toBe(true)
    expect(auditPairLabel(2027)).toBe('2027 · Audit 3 & Audit 4')
    expect(auditPairLabel(2028)).toBe('2028 · Audit 5 & Audit 6')
  })
  it('restores archived scores and reports while protecting current slots', () => {
    const row = auditRowsForYear([store], [historical], 2025, 2026)[0]
    expect(row.compliance_audit_1_overall_pct).toBe(81)
    expect(row.compliance_audit_1_pdf_path).toBe('archive.pdf')
    expect(row.compliance_audit_2_date).toBeNull()
    expect(row.audit_read_only).toBe(true)
  })
  it('cannot edit older slots when the calendar rolls over', () => {
    expect(auditRowsForYear([store], [], 2027, 2027)[0].audit_read_only).toBe(true)
  })
})
