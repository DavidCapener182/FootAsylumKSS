import { describe, expect, it } from 'vitest'
import { presentRoutePlanningData } from './query-service'

const baseStore = {
  id: '11111111-1111-4111-8111-111111111111', is_active: true, store_code: '01', store_name: 'Test', address_line_1: null,
  city: null, postcode: null, region: 'A3', reporting_area: 'AREA2', latitude: 53, longitude: -2, compliance_audit_1_date: null,
  compliance_audit_1_overall_pct: null, compliance_audit_2_date: null, compliance_audit_2_overall_pct: null, compliance_audit_2_planned_date: null,
  compliance_audit_2_assigned_manager_user_id: null, route_sequence: null, assigned_manager: null,
}
const profile = { id: '22222222-2222-4222-8222-222222222222', full_name: 'Manager', home_address: null, home_latitude: null, home_longitude: null, role: 'ops' }

describe('route planning query presenter', () => {
  it('removes completed second audits from the planner', () => {
    expect(presentRoutePlanningData([{ ...baseStore, compliance_audit_2_date: '2026-08-20', compliance_audit_2_overall_pct: 90 }], [profile]).stores).toHaveLength(0)
  })
  it('fails when the contracted route sequence column is missing', () => {
    const { route_sequence: _missing, ...invalid } = baseStore
    expect(() => presentRoutePlanningData([invalid], [profile])).toThrow()
  })
})

describe('outstanding visits in the route presenter', () => {
  it('includes date-only second audits and second-audit failures', () => {
    for (const score of [null, 76.84, 79, 79.17]) {
      const store = { ...baseStore, compliance_audit_2_date: '2026-09-02', compliance_audit_2_overall_pct: score }
      expect(presentRoutePlanningData([store], []).stores).toHaveLength(1)
    }
  })
  it('includes recent first audits without a cooldown', () => {
    const store = { ...baseStore, compliance_audit_1_date: new Date().toISOString().slice(0, 10), compliance_audit_1_overall_pct: 95 }
    expect(presentRoutePlanningData([store], []).stores).toHaveLength(1)
  })
  it('preserves future and overdue bookings for revisits', () => {
    for (const date of ['2026-07-22', '2026-09-17']) {
      const store = { ...baseStore, compliance_audit_2_date: '2026-07-22', compliance_audit_2_overall_pct: 79, compliance_audit_2_planned_date: date, route_sequence: 2 }
      expect(presentRoutePlanningData([store], []).stores[0]).toMatchObject({ compliance_audit_2_planned_date: date, route_sequence: 2, compliance_audit_2_overall_pct: 79 })
    }
  })
  it('keeps closed Hanley excluded even with a failed audit', () => {
    const store = { ...baseStore, store_name: 'Hanley', store_code: 'S0014', is_active: false, compliance_audit_1_date: '2026-02-20', compliance_audit_1_overall_pct: 78.57 }
    expect(presentRoutePlanningData([store], []).stores).toHaveLength(0)
  })
})

it('retains the reporting area and existing route identity independently', () => {
  const store = { ...baseStore, compliance_audit_2_planned_date: '2026-09-17', route_sequence: 2 }
  expect(presentRoutePlanningData([store], []).stores[0]).toMatchObject({
    region: 'A3', reporting_area: 'AREA2', compliance_audit_2_planned_date: '2026-09-17', route_sequence: 2,
  })
})
