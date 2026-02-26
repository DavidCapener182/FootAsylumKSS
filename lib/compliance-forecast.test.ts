import { describe, expect, it } from 'vitest'
import { computeRevisitRiskForecast } from '@/lib/compliance-forecast'

describe('computeRevisitRiskForecast', () => {
  it('predicts revisit risk for borderline stores with unresolved P1/P2 fire actions', () => {
    const result = computeRevisitRiskForecast([
      {
        storeId: 'store-1',
        storeName: 'Manchester Arndale',
        storeCode: 'MAN',
        region: 'A1',
        startOfYearAuditScore: 82,
        openP1Actions: 1,
        openP2Actions: 1,
        openFireSafetyActions: 2,
      },
      {
        storeId: 'store-2',
        storeName: 'Trafford Centre',
        storeCode: 'TRA',
        region: 'A1',
        startOfYearAuditScore: 84,
        openP1Actions: 0,
        openP2Actions: 1,
        openFireSafetyActions: 1,
      },
      {
        storeId: 'store-3',
        storeName: 'Leeds Trinity',
        storeCode: 'LDS',
        region: 'A1',
        startOfYearAuditScore: 91,
        openP1Actions: 0,
        openP2Actions: 0,
        openFireSafetyActions: 0,
      },
    ])

    expect(result.storeCount).toBe(3)
    expect(result.borderlineStoreCount).toBe(2)
    expect(result.atRiskStoreCount).toBe(2)
    expect(result.predictedRevisitCount).toBe(1)
    expect(result.openP1Count).toBe(1)
    expect(result.openP2Count).toBe(2)
    expect(result.closeActionsTarget).toBe(2)
    expect(result.predictedStores[0]?.storeName).toBe('Manchester Arndale')
    expect(result.predictedStores[0]?.projectedEndOfYearScore).toBe(78.7)
  })

  it('does not count already-below-threshold stores as predicted borderline revisits', () => {
    const result = computeRevisitRiskForecast([
      {
        storeId: 'store-1',
        storeName: 'Already Low',
        storeCode: null,
        region: 'A2',
        startOfYearAuditScore: 79,
        openP1Actions: 2,
        openP2Actions: 2,
        openFireSafetyActions: 4,
      },
    ])

    expect(result.borderlineStoreCount).toBe(0)
    expect(result.predictedRevisitCount).toBe(0)
    expect(result.atRiskStoreCount).toBe(1)
    expect(result.alreadyBelowThresholdCount).toBe(1)
    expect(result.closeActionsTarget).toBe(0)
    expect(result.immediateActionTarget).toBe(4)
    expect(result.alreadyBelowThresholdStores[0]?.storeName).toBe('Already Low')
    expect(result.stores[0]?.predictedRevisit).toBe(true)
  })

  it('normalizes invalid action counts and keeps radar values bounded', () => {
    const result = computeRevisitRiskForecast([
      {
        storeId: 'store-1',
        storeName: 'Unknown Score',
        storeCode: null,
        region: 'A3',
        startOfYearAuditScore: null,
        openP1Actions: -3,
        openP2Actions: 1.8,
        openFireSafetyActions: Number.NaN,
      },
    ])

    expect(result.stores[0]?.openP1Actions).toBe(0)
    expect(result.stores[0]?.openP2Actions).toBe(1)
    expect(result.stores[0]?.openFireSafetyActions).toBe(0)
    expect(result.stores[0]?.overdueP1Actions).toBe(0)
    expect(result.stores[0]?.openIncidents).toBe(0)
    expect(result.radar).toHaveLength(5)
    result.radar.forEach((point) => {
      expect(point.risk).toBeGreaterThanOrEqual(0)
      expect(point.risk).toBeLessThanOrEqual(100)
      expect(point.benchmark).toBeGreaterThanOrEqual(0)
      expect(point.benchmark).toBeLessThanOrEqual(100)
      expect(point.target).toBeGreaterThanOrEqual(0)
      expect(point.target).toBeLessThanOrEqual(100)
    })
  })
})
