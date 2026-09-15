import { describe, expect, it } from 'vitest'
import { getRouteStoreArea, getRouteAreaLabel } from './route-reporting-areas'

describe('route reporting areas', () => {
  it('uses the retail area even when the geographic region differs', () => {
    const bolton = { region: 'A3', reporting_area: 'AREA2' }
    expect(getRouteStoreArea(bolton)).toBe('AREA2')
    expect(getRouteAreaLabel([bolton])).toBe('Area 2')
  })
  it('groups non-retail sites together', () => {
    expect(getRouteAreaLabel([{ reporting_area: 'NON_RETAIL' }, { reporting_area: 'NON_RETAIL' }])).toBe('Non-retail sites')
  })
  it('labels mixed retail areas and missing assignments explicitly', () => {
    expect(getRouteAreaLabel([{ reporting_area: 'AREA2' }, { reporting_area: 'AREA3' }])).toBe('Multi-Area Route')
    expect(getRouteStoreArea({ reporting_area: null })).toBe('UNASSIGNED')
    expect(getRouteAreaLabel([{ reporting_area: null }])).toBe('Unassigned')
  })
})
