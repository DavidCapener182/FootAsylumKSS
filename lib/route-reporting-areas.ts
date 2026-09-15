import { getReportingAreaDisplayName, normalizeReportingAreaCode } from './areas'

export function getRouteStoreArea(store: { reporting_area: string | null }): string {
  return normalizeReportingAreaCode(store.reporting_area) || 'UNASSIGNED'
}

// Display only: saved route metadata retains its existing geographic region key.
export function getRouteAreaLabel(stores: Array<{ reporting_area: string | null }>): string {
  const areas = Array.from(new Set(stores.map(getRouteStoreArea)))
  return areas.length > 1 ? 'Multi-Area Route' : getReportingAreaDisplayName(areas[0])
}
