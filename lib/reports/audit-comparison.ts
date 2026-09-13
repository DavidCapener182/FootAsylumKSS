export interface AuditComparisonInput {
  compliance_audit_1_date: string | null
  compliance_audit_1_overall_pct: number | null
  compliance_audit_2_date: string | null
  compliance_audit_2_overall_pct: number | null
}

export function halfYearLabel(month: string): string {
  return `${Number(month.slice(5, 7)) <= 6 ? 'First' : 'Second'} Half ${month.slice(0, 4)}`
}

export function compareAudits(store: AuditComparisonInput, year: string, cutoff: string) {
  const completed = (date: string | null, score: number | null) =>
    Boolean(date && date.slice(0, 4) === year && date <= cutoff && typeof score === 'number' && Number.isFinite(score))
  const audit1Score = completed(store.compliance_audit_1_date, store.compliance_audit_1_overall_pct) ? store.compliance_audit_1_overall_pct : null
  const audit2Score = completed(store.compliance_audit_2_date, store.compliance_audit_2_overall_pct) ? store.compliance_audit_2_overall_pct : null
  const change = audit1Score !== null && audit2Score !== null ? Math.round((audit2Score - audit1Score) * 100) / 100 : null
  return {audit1Score, audit2Score, audit1Date: audit1Score !== null ? store.compliance_audit_1_date : null, audit2Date: audit2Score !== null ? store.compliance_audit_2_date : null, auditChange: change}
}

export function auditMovement(change: number | null | undefined) {
  return change == null ? 'Awaiting comparison' : change > 0 ? 'Improved' : change < 0 ? 'Declined' : 'Unchanged'
}
