import type { FRAStatus } from '@/lib/compliance-forecast'

export interface MonthlyNewsletterRequestBody {
  month?: string
  areaCode?: string | null
  managerId?: string | null
  hsAuditText?: string
  reminders?: string[]
  legislationUpdates?: string[]
}

export interface NewsletterStoreScore {
  storeName: string
  storeCode: string | null
  score: number
  auditDate: string | null
}

export interface NewsletterAreaStoreRow {
  storeName: string
  storeCode: string | null
  latestAuditScore: number | null
  latestAuditDate: string | null
  plannedVisitDate: string | null
  fraStatus: FRAStatus
  requiresAction: boolean
}

export interface NewsletterFRANotableItem {
  storeName: string
  storeCode: string | null
  status: 'overdue' | 'required' | 'due'
  fraDate: string | null
  note: string | null
}

export interface NewsletterAuditMetrics {
  averageLatestScore: number | null
  auditsCompletedThisMonth: number
  belowThresholdCount: number
  topStores: NewsletterStoreScore[]
  focusStores: NewsletterStoreScore[]
}

export interface NewsletterFRAMetrics {
  upToDate: number
  dueSoon: number
  overdue: number
  required: number
  notableItems: NewsletterFRANotableItem[]
}

export interface NewsletterHSAuditMetrics {
  auditsCompletedThisMonth: number
  averageScore: number | null
  highlights: string[]
  manualInputUsed: boolean
}

export interface NewsletterStoreActionFocusItem {
  topic: string
  actionCount: number
  storeCount: number
  highPriorityCount: number
  overdueCount: number
  managerPrompt: string
}

export interface NewsletterStoreActionMetrics {
  activeCount: number
  highPriorityCount: number
  overdueCount: number
  dueThisMonthCount: number
  focusItems: NewsletterStoreActionFocusItem[]
}

export interface NewsletterRevisitRiskRadarPoint {
  axis: string
  risk: number
  target: number
  benchmark: number
}

export interface NewsletterRevisitRiskStore {
  storeName: string
  storeCode: string | null
  startOfYearAuditScore: number | null
  projectedEndOfYearScore: number | null
  riskScore: number
  openP1Actions: number
  openP2Actions: number
  predictedRevisit: boolean
}

export interface NewsletterRevisitRiskMetrics {
  atRiskStoreCount: number
  borderlineStoreCount: number
  predictedRevisitCount: number
  alreadyBelowThresholdCount: number
  openP1Count: number
  openP2Count: number
  overdueP1AtRiskCount: number
  storesWithOpenIncidentsAtRiskCount: number
  closeActionsTarget: number
  immediateActionTarget: number
  radar: NewsletterRevisitRiskRadarPoint[]
  highRiskStores: NewsletterRevisitRiskStore[]
  narrative: string
}

export interface NewsletterAIPromptPack {
  generateBriefing: string
  composeNewsletter: string
  analyzeRegionalRisk: string
}

export interface AreaNewsletterReport {
  areaCode: string
  areaLabel: string
  areaManagerName: string | null
  areaManagerEmail: string | null
  storeCount: number
  stores: NewsletterAreaStoreRow[]
  auditMetrics: NewsletterAuditMetrics
  fraMetrics: NewsletterFRAMetrics
  hsAuditMetrics: NewsletterHSAuditMetrics
  storeActionMetrics: NewsletterStoreActionMetrics
  revisitRiskMetrics: NewsletterRevisitRiskMetrics
  reminders: string[]
  legislationUpdates: string[]
  newsletterMarkdown: string
}

export interface MonthlyNewsletterResponse {
  generatedAt: string
  period: {
    month: string
    label: string
    start: string
    end: string
  }
  summary: {
    areaCount: number
    storeCount: number
    storesWithAuditScore: number
    fraOverdueOrRequired: number
    activeStoreActions: number
  }
  availableAreas: Array<{
    code: string
    label: string
    managerName: string | null
    managerEmail: string | null
    storeCount: number
  }>
  areaReports: AreaNewsletterReport[]
}
