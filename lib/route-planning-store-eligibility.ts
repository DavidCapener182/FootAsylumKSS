import { completedAuditRevisit, latestAuditForRevisit, type RevisitAuditStore } from '@/lib/audit/revisit-follow-up'
export interface RoutePlanningAuditStatus extends RevisitAuditStore {
  compliance_audit_1_date?: string | null
  compliance_audit_1_overall_pct?: number | null
  compliance_audit_2_date: string | null
  compliance_audit_2_overall_pct: number | null
}

export function hasCompletedSecondAudit(store: RoutePlanningAuditStatus): boolean {
  return Boolean(store.compliance_audit_2_date && store.compliance_audit_2_overall_pct != null)
}

export function requiresAuditRevisit(store: RoutePlanningAuditStatus): boolean {
  const latest = latestAuditForRevisit(store)
  return latest !== null && typeof latest.score === 'number' && Number.isFinite(latest.score) && latest.score < 80 && completedAuditRevisit(store) === null
}

export function needsAuditVisit(store: RoutePlanningAuditStatus): boolean {
  const latest = latestAuditForRevisit(store)
  return !hasCompletedSecondAudit(store) || (latest !== null && latest.score == null) || requiresAuditRevisit(store)
}
