import { describe, expect, it } from 'vitest'
import { buildMonthlyNewsletterData } from './monthly-newsletter'
import { getReportingAreaContact, normalizeReportingAreaCode } from '../areas'

function client() {
  const stores = [
    { id: 'retail', store_name: 'Bolton', store_code: 'S0017', reporting_area: 'AREA2', compliance_audit_1_overall_pct: 100 },
    { id: 'photo', store_name: 'Photo Studio', store_code: 'S0900', reporting_area: 'NON_RETAIL', compliance_audit_1_overall_pct: 50 },
    { id: 'heywood', store_name: 'Heywood', store_code: 'WH003', reporting_area: 'NON_RETAIL' },
    { id: 'middleton', store_name: 'Middleton', store_code: 'WH004', reporting_area: 'NON_RETAIL' },
  ]
  return {
    from(table: string) {
      const result = { data: table === 'fa_stores' ? stores : [], error: null }
      const query: any = { then: (resolve: any) => Promise.resolve(result).then(resolve) }
      for (const method of ['select', 'eq', 'in', 'not', 'order', 'limit', 'gte', 'lte']) {
        query[method] = () => query
      }
      return query
    },
  } as any
}

describe('Non-retail reporting area', () => {
  it('recognises the area without assigning a retail manager', () => {
    expect(normalizeReportingAreaCode(' non_retail ')).toBe('NON_RETAIL')
    expect(normalizeReportingAreaCode('toString')).toBeNull()
    expect(getReportingAreaContact('NON_RETAIL')).toEqual({
      label: 'Non-retail sites', managerName: null, managerEmail: null,
    })
  })

  it('excludes all three sites from Stuart and makes their report selectable', async () => {
    const retail = await buildMonthlyNewsletterData(client(), { month: '2026-07', areaCode: 'AREA2' })
    expect(retail.areaReports).toHaveLength(1)
    expect(retail.availableAreas.find(area => area.code === 'AREA2')?.storeCount).toBe(1)
    expect(retail.availableAreas.find(area => area.code === 'NON_RETAIL')?.storeCount).toBe(3)
    const nonRetail = await buildMonthlyNewsletterData(client(), { month: '2026-07', areaCode: 'NON_RETAIL' })
    expect(nonRetail.areaReports).toHaveLength(1)
    expect(nonRetail.areaReports[0].areaCode).toBe('NON_RETAIL')
    expect(nonRetail.availableAreas.find(area => area.code === 'NON_RETAIL')?.managerEmail).toBeNull()
  })
})
