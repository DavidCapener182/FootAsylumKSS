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

import { canPlanAuditInYear, hasOutstandingBooking } from './route-planning-store-eligibility'
describe('planning the following pair', () => {
  const complete = { ...firstAudit, compliance_audit_2_date: '2026-10-01', compliance_audit_2_overall_pct: 90 }
  it('unlocks 2027 after Audit 2 while retaining completed scores', () => {
    expect(canPlanAuditInYear(complete, 2027, 2026)).toBe(true)
    expect(canPlanAuditInYear(complete, 2026, 2026)).toBe(false)
    expect(complete.compliance_audit_2_overall_pct).toBe(90)
  })
  it('does not book next year before the second result is recorded', () => {
    expect(canPlanAuditInYear({...complete,compliance_audit_2_overall_pct:null},2027,2026)).toBe(false)
  })
  it('works at rollover and for subsequent years', () => {
    expect(canPlanAuditInYear(complete,2027,2027)).toBe(true)
    expect(canPlanAuditInYear({...complete,compliance_audit_2_date:'2027-10-01'},2028,2027)).toBe(true)
    expect(canPlanAuditInYear(complete,2028,2026)).toBe(false)
  })
  it('consumes completed passing bookings but protects future and failed revisit bookings', () => {
    expect(hasOutstandingBooking({...complete,compliance_audit_2_planned_date:'2026-10-01'})).toBe(false)
    expect(hasOutstandingBooking({...complete,compliance_audit_2_planned_date:'2027-01-10'})).toBe(true)
    expect(hasOutstandingBooking({...complete,compliance_audit_2_overall_pct:70,compliance_audit_2_planned_date:'2026-10-01'})).toBe(true)
  })
})
