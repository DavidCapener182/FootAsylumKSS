// Confirmed new-store exceptions for the 2026 first audit cycle only.
// Keep scores null: a non-applicable audit is neither a zero nor a completion.
const NEW_STORE_AUDIT_1_YEAR: Record<string, string> = {
  '76c6774f-4dab-452e-81a9-a1fcea8f29d8': '2026', // Trafford Centre New Store
  '56d176db-bc7c-4f60-b04c-a40cefa89c62': '2026', // Merthyr Tydfil
}

interface NewStoreAuditInput {
  id: string
  compliance_audit_1_date: string | null
  compliance_audit_1_overall_pct: number | null
  compliance_audit_1_pdf_path: string | null
  compliance_audit_2_date: string | null
}

export function isNewStoreFirstAudit(row: NewStoreAuditInput): boolean {
  const year = NEW_STORE_AUDIT_1_YEAR[row.id]
  return Boolean(year && row.compliance_audit_2_date?.startsWith(`${year}-`) &&
    row.compliance_audit_1_date == null && row.compliance_audit_1_overall_pct == null &&
    row.compliance_audit_1_pdf_path == null)
}
