export interface RoutePlanningAuditStatus {
  compliance_audit_2_date: string | null
}

export function hasCompletedSecondAudit(store: RoutePlanningAuditStatus): boolean {
  return Boolean(store.compliance_audit_2_date)
}
