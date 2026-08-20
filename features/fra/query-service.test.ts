import { describe, expect, it } from 'vitest'
import { presentFraRows } from './query-service'

const store = {
  id: '11111111-1111-4111-8111-111111111111', store_code: '01', store_name: 'Test', region: 'N', city: null,
  is_active: true, compliance_audit_1_date: null, compliance_audit_2_date: null,
  fire_risk_assessment_date: null, fire_risk_assessment_pdf_path: null, fire_risk_assessment_notes: null,
  fire_risk_assessment_pct: null,
}

describe('FRA query presenter', () => {
  it('uses the latest completed FRA instance without schema fallbacks', () => {
    const rows = presentFraRows([store], [{
      id: '22222222-2222-4222-8222-222222222222', store_id: store.id, fra_overall_risk_rating: 'Substantial',
      conducted_at: '2026-08-20', created_at: '2026-08-20T09:00:00Z',
      fa_audit_templates: { category: 'fire_risk_assessment' }, fa_audit_responses: [],
    }])
    expect(rows[0]).toMatchObject({ fire_risk_assessment_rating: 'Substantial', fire_risk_assessment_instance_id: '22222222-2222-4222-8222-222222222222' })
  })

  it('rejects a missing contracted FRA column', () => {
    const { fire_risk_assessment_pct: _missing, ...invalidStore } = store
    expect(() => presentFraRows([invalidStore], [])).toThrow()
  })
})
