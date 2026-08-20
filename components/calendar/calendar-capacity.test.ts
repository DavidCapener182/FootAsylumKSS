import { describe, expect, it } from 'vitest'
import { getManagerCapacitySummary } from './calendar-client'

describe('manager capacity', () => {
  const days = [{
    date: '2026-08-20',
    completedStores: [],
    plannedRoutes: [{ key: 'one', managerId: '1', managerName: 'Alex', area: 'N', plannedDate: '2026-08-20', storeCount: 3, stores: [] }],
  }]

  it('uses configurable working, visit and travel assumptions', () => {
    const [summary] = getManagerCapacitySummary(days, { workingDayHours: 10, visitHoursPerStop: 1, travelHoursPerStop: 0.5 })
    expect(summary).toMatchObject({ managerName: 'Alex', estimatedHours: 4.5, utilizationPct: 45, overbookedDays: 0 })
  })

  it('reports conflicts for every manager above the configured day', () => {
    const [summary] = getManagerCapacitySummary(days, { workingDayHours: 4, visitHoursPerStop: 1, travelHoursPerStop: 0.5 })
    expect(summary.overbookedDays).toBe(1)
  })
})
