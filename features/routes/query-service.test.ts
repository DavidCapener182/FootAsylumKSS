import { describe, expect, it } from 'vitest'
import { presentRoutePlanningData } from './query-service'

const baseStore = {
  id: '11111111-1111-4111-8111-111111111111', is_active: true, store_code: '01', store_name: 'Test', address_line_1: null,
  city: null, postcode: null, region: 'N', latitude: 53, longitude: -2, compliance_audit_1_date: null,
  compliance_audit_1_overall_pct: null, compliance_audit_2_date: null, compliance_audit_2_planned_date: null,
  compliance_audit_2_assigned_manager_user_id: null, route_sequence: null, assigned_manager: null,
}
const profile = { id: '22222222-2222-4222-8222-222222222222', full_name: 'Manager', home_address: null, home_latitude: null, home_longitude: null, role: 'ops' }

describe('route planning query presenter', () => {
  it('removes completed second audits from the planner', () => {
    expect(presentRoutePlanningData([{ ...baseStore, compliance_audit_2_date: '2026-08-20' }], [profile]).stores).toHaveLength(0)
  })
  it('fails when the contracted route sequence column is missing', () => {
    const { route_sequence: _missing, ...invalid } = baseStore
    expect(() => presentRoutePlanningData([invalid], [profile])).toThrow()
  })
})
