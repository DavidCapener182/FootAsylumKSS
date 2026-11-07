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

/** The chosen visit year determines eligibility; historical scores stay intact. */
export function canPlanAuditInYear(store: RoutePlanningAuditStatus, year: number, currentYear = new Date().getFullYear()): boolean {
  if (!Number.isInteger(year) || year < currentYear || year > currentYear + 1) return false
  const secondYear = Number(store.compliance_audit_2_date?.slice(0, 4))
  const firstYear = Number(store.compliance_audit_1_date?.slice(0, 4))
  if (Math.max(firstYear, secondYear) > year) return false
  if (year > currentYear) {
    // Open the following pair only after this year's second visit is recorded.
    return hasCompletedSecondAudit(store) && secondYear === year - 1
  }
  if (secondYear < year) return true
  return needsAuditVisit(store)
}

export function hasOutstandingBooking(store: RoutePlanningAuditStatus & { compliance_audit_2_planned_date: string | null }): boolean {
  const planned = store.compliance_audit_2_planned_date
  if (!planned) return false
  // Passing second visits consume their old booking. Failed visits retain it
  // until explicitly rescheduled, so an unresolved revisit is never overwritten.
  return !(hasCompletedSecondAudit(store) && !requiresAuditRevisit(store) && store.compliance_audit_2_date! >= planned)
}
