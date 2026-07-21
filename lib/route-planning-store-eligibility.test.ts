import { describe, expect, it } from 'vitest'
import { hasCompletedSecondAudit } from './route-planning-store-eligibility'

describe('route planning store eligibility', () => {
  it('treats a store with a completed second audit as permanently complete', () => {
    expect(hasCompletedSecondAudit({ compliance_audit_2_date: '2026-01-15' })).toBe(true)
  })

  it('keeps a store without a second audit eligible for planning', () => {
    expect(hasCompletedSecondAudit({ compliance_audit_2_date: null })).toBe(false)
  })
})
