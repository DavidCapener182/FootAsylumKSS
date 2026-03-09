export const MULTI_AREA_REGION = 'MULTI'

export const INTERNAL_AREA_LABELS: Record<string, string> = {
  [MULTI_AREA_REGION]: 'Multi-Area Route',
  A1: 'North & Scotland',
  A2: 'Yorkshire & Midlands',
  A3: 'Manchester',
  A4: 'Lancashire & Merseyside',
  A5: 'Birmingham',
  A6: 'Wales',
  A7: 'South',
  A8: 'London',
}

export const REPORTING_AREA_CONTACTS = {
  AREA1: {
    label: 'Area 1',
    managerName: 'Jill Gunn',
    managerEmail: 'Jill.Gunn@footasylum.com',
  },
  AREA2: {
    label: 'Area 2',
    managerName: 'Stu Hunter',
    managerEmail: 'Stuart.Hunter@footasylum.com',
  },
  AREA3: {
    label: 'Area 3',
    managerName: 'Liam Harvey',
    managerEmail: 'Liam.Harvey@footasylum.com',
  },
  AREA4: {
    label: 'Area 4',
    managerName: 'Brett Llewellyn',
    managerEmail: 'brett.llewellyn@footasylum.com',
  },
  AREA5: {
    label: 'Area 5',
    managerName: 'Shaynul Uddin',
    managerEmail: 'Shaynul.Uddin@footasylum.com',
  },
} as const

export type ReportingAreaCode = keyof typeof REPORTING_AREA_CONTACTS

export function normalizeInternalAreaCode(raw: string | null | undefined): string | null {
  const normalized = raw?.trim().toUpperCase()
  return normalized && normalized.length > 0 ? normalized : null
}

export function getInternalAreaLabel(areaCode: string | null | undefined): string | null {
  const normalized = normalizeInternalAreaCode(areaCode)
  if (!normalized) return null
  return INTERNAL_AREA_LABELS[normalized] || null
}

export function getInternalAreaDisplayName(
  areaCode: string | null | undefined,
  options?: {
    fallback?: string
    includeCode?: boolean
  }
): string {
  const normalized = normalizeInternalAreaCode(areaCode)
  const fallback = options?.fallback || 'Unassigned'

  if (!normalized) return fallback

  const label = INTERNAL_AREA_LABELS[normalized]
  if (!label) return normalized
  if (normalized === MULTI_AREA_REGION) return label
  if (options?.includeCode === false) return label

  return `${normalized} - ${label}`
}

export function normalizeReportingAreaCode(raw: string | null | undefined): ReportingAreaCode | null {
  const normalized = raw?.trim().toUpperCase().replace(/\s+/g, '')
  if (!normalized) return null

  if (normalized === 'AREA1' || normalized === 'AREA2' || normalized === 'AREA3' || normalized === 'AREA4' || normalized === 'AREA5') {
    return normalized
  }

  return null
}

export function getReportingAreaContact(areaCode: string | null | undefined) {
  const normalized = normalizeReportingAreaCode(areaCode)
  return normalized ? REPORTING_AREA_CONTACTS[normalized] : null
}

export function getReportingAreaLabel(areaCode: string | null | undefined): string | null {
  return getReportingAreaContact(areaCode)?.label || null
}

export function getReportingAreaDisplayName(
  areaCode: string | null | undefined,
  fallback = 'Unassigned'
): string {
  return getReportingAreaLabel(areaCode) || fallback
}
