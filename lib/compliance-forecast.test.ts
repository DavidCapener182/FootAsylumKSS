import { describe, expect, it } from 'vitest'
import { computeComplianceForecast, computeRevisitRiskForecast } from '@/lib/compliance-forecast'

describe('computeComplianceForecast', () => {
  it('carries the completed audit lifecycle into each priority-store forecast', () => {
    const result = computeComplianceForecast([
      {
        id: 'bromborough',
        store_name: 'Bromborough',
        store_code: 'S0120',
        region: 'Lancashire & Merseyside',
        compliance_audit_1_date: '2026-07-01',
        compliance_audit_1_overall_pct: 83,
        compliance_audit_2_date: '2026-09-02',
        compliance_audit_2_overall_pct: 76.8,
        compliance_audit_2_planned_date: null,
        fire_risk_assessment_date: '2026-09-02',
      },
    ], { referenceDate: new Date('2026-09-04T12:00:00Z') })

    expect(result.stores[0]).toMatchObject({
      latestAuditScore: 76.8,
      audit1Complete: true,
      audit2Complete: true,
    })
  })
})

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

it('does not reduce audit/action risk when a matching revisit is evidenced', async () => {
  const { computeComplianceForecast } = await import('./compliance-forecast')
  const store = { id: 'fictional', store_name: 'Fictional', store_code: 'TEST', region: 'A1', compliance_audit_1_date: '2026-01-22', compliance_audit_1_overall_pct: 83.67, compliance_audit_2_date: '2026-09-17', compliance_audit_2_overall_pct: 73.2, compliance_audit_2_pdf_path: 'original.pdf', fire_risk_assessment_date: '2026-09-01', compliance_audit_2_planned_date: null }
  const options = { overdueActionsByStore: { fictional: 15 }, referenceDate: new Date('2026-10-25') }
  const before = computeComplianceForecast([store], options).stores[0]
  const after = computeComplianceForecast([{ ...store, audit_revisit_follow_up: { status: 'available', originals: [{ id: 'original', auditNumber: 2, visitDate: '2026-09-17', percentage: 73.2, pdfPath: 'original.pdf', documentCount: 1, latestRevisitDate: '2026-10-22', latestEvidenceId: 'evidence' }] } }], options).stores[0]
  expect(after.auditRevisitCompleted).toBe(true); expect(after.auditRevisitRequired).toBe(false)
  expect(after.latestAuditScore).toBe(73.2); expect(after.overdueActions).toBe(15)
  expect(after.riskScore).toBe(before.riskScore); expect(after.drivers).toEqual(before.drivers)
})
