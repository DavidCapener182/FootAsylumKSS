import { describe, expect, it } from 'vitest'
import { hasCompletedSecondAudit, needsAuditVisit, requiresAuditRevisit } from './route-planning-store-eligibility'

const firstAudit = { compliance_audit_1_date: '2026-01-08', compliance_audit_1_overall_pct: 95.96 }

describe('route planning store eligibility', () => {
  it('keeps date-only second audits eligible, as in Meadowhall, Rotherham and Doncaster', () => {
    const store = { ...firstAudit, compliance_audit_2_date: '2026-01-08', compliance_audit_2_overall_pct: null }
    expect(hasCompletedSecondAudit(store)).toBe(false)
    expect(needsAuditVisit(store)).toBe(true)
  })
  it.each([0, 76.84, 79, 79.17])('requires a revisit for a second audit scoring %s', score => {
    const store = { ...firstAudit, compliance_audit_2_date: '2026-09-02', compliance_audit_2_overall_pct: score }
    expect(hasCompletedSecondAudit(store)).toBe(true)
    expect(needsAuditVisit(store)).toBe(true)
    expect(requiresAuditRevisit(store)).toBe(true)
  })
  it.each([80, 95.96])('excludes a completed passing second audit scoring %s', score => {
    const store = { ...firstAudit, compliance_audit_1_overall_pct: 70, compliance_audit_2_date: '2026-09-02', compliance_audit_2_overall_pct: score }
    expect(needsAuditVisit(store)).toBe(false)
    expect(requiresAuditRevisit(store)).toBe(false)
  })
  it('keeps an outstanding second visit and labels a failed first audit for revisit', () => {
    const store = { ...firstAudit, compliance_audit_1_overall_pct: 74.19, compliance_audit_2_date: null, compliance_audit_2_overall_pct: null }
    expect(needsAuditVisit(store)).toBe(true)
    expect(requiresAuditRevisit(store)).toBe(true)
  })
})
