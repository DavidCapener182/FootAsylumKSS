/** Safe presentation metadata only; never contains storage paths for new evidence. */
export type AuditRevisitOriginal = {
  id: string
  auditNumber: number | null
  visitDate: string
  percentage: number | null
  pdfPath: string | null
  documentCount: number
  latestRevisitDate: string
  latestEvidenceId: string
}
export type AuditRevisitFollowUp = { status: 'available' | 'unavailable'; originals: AuditRevisitOriginal[] }
export type RevisitAuditStore = {
  audit_revisit_follow_up?: AuditRevisitFollowUp
  compliance_audit_1_date?: string | null; compliance_audit_1_overall_pct?: number | null; compliance_audit_1_pdf_path?: string | null
  compliance_audit_2_date?: string | null; compliance_audit_2_overall_pct?: number | null; compliance_audit_2_pdf_path?: string | null
  compliance_audit_3_date?: string | null; compliance_audit_3_overall_pct?: number | null; compliance_audit_3_pdf_path?: string | null
}

export function latestAuditForRevisit(store: RevisitAuditStore) {
  return ([1, 2, 3] as const).map(number => ({
    number, date: store[`compliance_audit_${number}_date`],
    score: store[`compliance_audit_${number}_overall_pct`],
    pdfPath: store[`compliance_audit_${number}_pdf_path`],
  })).filter(audit => audit.date)
    .sort((a, b) => b.date!.localeCompare(a.date!) || b.number - a.number)[0] || null
}

/** Match the exact current snapshot, including its PDF pointer; old revisions cannot complete a newer requirement. */
export function completedAuditRevisit(store: RevisitAuditStore): AuditRevisitOriginal | null {
  const latest = latestAuditForRevisit(store)
  if (!latest || typeof latest.score !== 'number' || !Number.isFinite(latest.score) || latest.score >= 80 || store.audit_revisit_follow_up?.status !== 'available') return null
  // An omitted pointer is unknown, not evidence that the current PDF is null.
  if (latest.pdfPath === undefined) return null
  return store.audit_revisit_follow_up.originals.find(original => original.documentCount > 0
    && original.auditNumber === latest.number && original.visitDate === latest.date
    && original.percentage === latest.score && original.pdfPath === latest.pdfPath
    && original.latestRevisitDate >= original.visitDate) || null
}

export function revisitEvidenceHref(storeId: string, evidenceId: string) {
  return `/api/audit-revisits?storeId=${encodeURIComponent(storeId)}&evidenceId=${encodeURIComponent(evidenceId)}`
}
export function revisitHistoryHref(storeId: string) {
  return `/stores/${encodeURIComponent(storeId)}?tab=audit-history#revisit-heading`
}
