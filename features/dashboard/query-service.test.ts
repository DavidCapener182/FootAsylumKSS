import { describe, expect, it, vi } from 'vitest'

const routeRows = [
  { id: 'southampton', store_name: 'Southampton', managerId: 'andy', date: '2026-09-08' },
  { id: 'braehead', store_name: 'Braehead', managerId: 'david', date: '2026-09-16' },
  { id: 'unassigned', store_name: 'Unassigned visit', managerId: null, date: '2026-09-09' },
].map((row) => ({
  id: row.id, store_name: row.store_name, store_code: null, region: 'Test region',
  compliance_audit_2_planned_date: row.date,
  compliance_audit_2_assigned_manager_user_id: row.managerId,
}))
const stores = routeRows.map((row) => ({
  ...row, is_active: true, compliance_audit_1_date: '2026-01-01',
  compliance_audit_1_overall_pct: 90, compliance_audit_2_date: null,
  compliance_audit_2_overall_pct: null, fire_risk_assessment_date: '2026-01-01',
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ from: (table: string) => ({ select: (columns: string) => {
    const data = table === 'fa_stores'
      ? columns.includes('compliance_audit_2_assigned_manager_user_id') ? routeRows : stores
      : []
    const query: Record<string, unknown> = {
      then: (resolve: (result: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve),
    }
    for (const method of ['eq', 'not', 'gte', 'order', 'limit']) query[method] = () => query
    return query
  } }) }),
}))
vi.mock('@/lib/observability', () => ({ observeQuery: (_name: string, operation: () => unknown) => operation() }))

import { getDashboardData } from './query-service'

describe('personal dashboard routes', () => {
  it('keeps Andy’s earlier visit out of David’s next-route data while retaining the team schedule', async () => {
    const result = await getDashboardData('david')
    expect(result.personalPlannedRoutes?.map((route) => route.key)).toEqual(['braehead'])
    expect(result.plannedRoutes).toHaveLength(3)
    expect((await getDashboardData('andy')).personalPlannedRoutes?.map((route) => route.key)).toEqual(['southampton'])
  })

  it('does not substitute another manager or an unassigned visit when the user has no route', async () => {
    expect((await getDashboardData('no-assigned-visits')).personalPlannedRoutes).toEqual([])
  })
})
