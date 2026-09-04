import { describe, expect, it } from 'vitest'

import type { DashboardData } from './dashboard-types'
import { normalisePriorityStores } from './dashboard-utils'

function makeDashboardData(stores: Array<Record<string, unknown>>): DashboardData {
  return { complianceForecast: { stores } }
}

describe('normalisePriorityStores', () => {
  it('labels completed low-scoring audits as revisits rather than second audits', () => {
    const stores = normalisePriorityStores(makeDashboardData([
      {
        storeId: 'bromborough',
        storeName: 'Bromborough',
        latestAuditScore: 76.8,
        audit1Complete: true,
        audit2Complete: true,
        plannedDate: null,
        drivers: ['Latest audit below pass threshold (77%)'],
      },
      {
        storeId: 'speke',
        storeName: 'Speke',
        latestAuditScore: 79,
        audit1Complete: true,
        audit2Complete: true,
        plannedDate: null,
        drivers: ['Latest audit below pass threshold (79%)'],
      },
    ]))

    expect(stores.map((store) => [store.name, store.auditStatus])).toEqual([
      ['Bromborough', 'Revisit Required'],
      ['Speke', 'Revisit Required'],
    ])
  })

  it('keeps routine second-audit and completed states distinct', () => {
    const stores = normalisePriorityStores(makeDashboardData([
      {
        storeId: 'routine-follow-up',
        storeName: 'Routine Follow-up',
        latestAuditScore: 91,
        audit1Complete: true,
        audit2Complete: false,
        plannedDate: null,
        drivers: [],
      },
      {
        storeId: 'completed',
        storeName: 'Completed',
        latestAuditScore: 93,
        audit1Complete: true,
        audit2Complete: true,
        plannedDate: null,
        drivers: [],
      },
    ]))

    expect(stores.map((store) => store.auditStatus)).toEqual([
      'Second Audit Required',
      'Audit 2 Complete',
    ])
  })
})
