export interface RoutePlanningAuditStatus {
  compliance_audit_1_date?: string | null
  compliance_audit_1_overall_pct?: number | null
  compliance_audit_2_date: string | null
  compliance_audit_2_overall_pct: number | null
}

export function hasCompletedSecondAudit(store: RoutePlanningAuditStatus): boolean {
  return Boolean(store.compliance_audit_2_date && store.compliance_audit_2_overall_pct != null)
}

export function requiresAuditRevisit(store: RoutePlanningAuditStatus): boolean {
  const score = hasCompletedSecondAudit(store)
    ? store.compliance_audit_2_overall_pct
    : store.compliance_audit_1_date ? store.compliance_audit_1_overall_pct : null
  return score != null && score < 80
}

export function needsAuditVisit(store: RoutePlanningAuditStatus): boolean {
  return !hasCompletedSecondAudit(store) || requiresAuditRevisit(store)
}
