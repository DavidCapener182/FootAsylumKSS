export type DashboardTone = 'success' | 'danger' | 'warning' | 'info' | 'teal'

export type RegionalCompliance = {
  region: string
  total: number
  inDate: number
  inDatePercentage: number
}

export type PriorityStore = {
  id: string
  name: string
  auditStatus: string
  fraStatus: string
  openActions: number
  href?: string
}

export type VisitRow = {
  id: string
  date: string
  region: string
  store: string
  visitType: string
}

export type ActivityItem = {
  id: string
  time: string
  label: string
  type: 'Audit' | 'FRA' | 'Action' | 'Planning' | 'Update'
}

export type DashboardData = {
  openIncidents?: number
  underInvestigation?: number
  overdueActions?: number
  highCritical?: number
  statusCounts?: Record<string, number>
  totalIncidents?: number
  severityCounts?: Record<string, number>
  incidentBreakdownByPeriod?: Record<string, unknown>
  topStores?: Array<Record<string, unknown>>
  maxStoreCount?: number
  recentActivity?: Array<Record<string, unknown>>
  storesNeedingSecondVisit?: Array<Record<string, unknown>>
  profiles?: Array<Record<string, unknown>>
  plannedRoutes?: Array<Record<string, unknown>>
  auditStats?: {
    totalStores?: number
    firstAuditsComplete?: number
    secondAuditsComplete?: number
    totalAuditsComplete?: number
    firstAuditPercentage?: number
    secondAuditPercentage?: number
    totalAuditPercentage?: number
  }
  storeActionStats?: {
    totalTracked?: number
    active?: number
    overdue?: number
    highUrgent?: number
    statusCounts?: Record<string, number>
    priorityCounts?: Record<string, number>
    topStores?: Array<Record<string, unknown>>
  }
  combinedActionStats?: {
    incidentOverdue?: number
    storeOverdue?: number
    totalOverdue?: number
  }
  complianceTracking?: {
    noAuditStartedCount?: number
    audit1CompleteCount?: number
    audit2CompleteCount?: number
    awaitingSecondAuditCount?: number
    secondAuditPlannedCount?: number
    secondAuditUnplannedCount?: number
    storesNeedingSecondVisitCount?: number
    plannedRoutesCount?: number
    plannedVisitsNext14Days?: number
  }
  fraStats?: {
    required?: number
    due?: number
    overdue?: number
    upToDate?: number
    inDate?: number
    inDateCoveragePercentage?: number
  }
  storesRequiringFRA?: number
  regionalCompliance?: RegionalCompliance[]
  complianceForecast?: {
    stores?: unknown[]
  }
}
