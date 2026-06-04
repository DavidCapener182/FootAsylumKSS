import { describe, expect, it } from 'vitest'
import {
  AuditRow,
  getCompletedAuditCount,
  getLatestAuditComparison,
  getLatestPct,
} from './audit-table-helpers'

function makeAuditRow(overrides: Partial<AuditRow>): AuditRow {
  return {
    id: 'store-1',
    region: 'North',
    store_code: '123',
    store_name: 'Test Store',
    is_active: true,
    compliance_audit_1_date: null,
    compliance_audit_1_overall_pct: null,
    action_plan_1_sent: null,
    compliance_audit_1_pdf_path: null,
    compliance_audit_2_date: null,
    compliance_audit_2_overall_pct: null,
    action_plan_2_sent: null,
    compliance_audit_2_pdf_path: null,
    compliance_audit_3_date: null,
    compliance_audit_3_overall_pct: null,
    action_plan_3_sent: null,
    area_average_pct: null,
    total_audits_to_date: null,
    fire_risk_assessment_date: null,
    fire_risk_assessment_pdf_path: null,
    fire_risk_assessment_notes: null,
    fire_risk_assessment_pct: null,
    ...overrides,
  }
}

describe('audit table helpers', () => {
  it('compares audit 2 against audit 1 for stores with two scored audits', () => {
    const row = makeAuditRow({
      compliance_audit_1_date: '2026-01-10',
      compliance_audit_1_overall_pct: 82,
      compliance_audit_2_date: '2026-06-04',
      compliance_audit_2_overall_pct: 91.5,
    })

    expect(getLatestAuditComparison(row)).toMatchObject({
      previous: { auditNumber: 1, pct: 82 },
      latest: { auditNumber: 2, pct: 91.5 },
      change: 9.5,
    })
  })

  it('returns a negative change when the latest scored audit is worse', () => {
    const row = makeAuditRow({
      compliance_audit_1_date: '2026-01-10',
      compliance_audit_1_overall_pct: 94,
      compliance_audit_2_date: '2026-06-04',
      compliance_audit_2_overall_pct: 88,
    })

    expect(getLatestAuditComparison(row)?.change).toBe(-6)
  })

  it('uses audit 3 as the latest scored audit when present', () => {
    const row = makeAuditRow({
      compliance_audit_1_date: '2026-01-10',
      compliance_audit_1_overall_pct: 80,
      compliance_audit_2_date: '2026-04-10',
      compliance_audit_2_overall_pct: 84,
      compliance_audit_3_date: '2026-06-04',
      compliance_audit_3_overall_pct: 92,
    })

    expect(getLatestPct(row)).toBe(92)
    expect(getCompletedAuditCount(row)).toBe(3)
    expect(getLatestAuditComparison(row)).toMatchObject({
      previous: { auditNumber: 2, pct: 84 },
      latest: { auditNumber: 3, pct: 92 },
      change: 8,
    })
  })

  it('does not create a comparison until two scored audits exist', () => {
    const row = makeAuditRow({
      compliance_audit_1_date: '2026-01-10',
      compliance_audit_1_overall_pct: 82,
    })

    expect(getLatestAuditComparison(row)).toBeNull()
  })
})
