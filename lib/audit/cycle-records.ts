import type { AuditRow } from '@/components/audit/audit-table-helpers'
export type CycleRecord = {
  id: string; store_id: string; audit_year: number; audit_number: number | null;
  visit_date: string; percentage: number | null; pdf_path: string | null; captured_at?: string;
}
/** Current slots win over snapshots; older years and report revisions remain history. */
export function cycleRecords(stores: AuditRow[], history: CycleRecord[]): CycleRecord[] {
  const records = new Map<string, CycleRecord>()
  for (const record of [...history].sort((a, b) => (a.captured_at || '').localeCompare(b.captured_at || ''))) {
    records.set(`${record.store_id}:${record.audit_year}:${record.audit_number}`, record)
  }
  for (const store of stores) for (const round of [1, 2, 3] as const) {
    const date = store[`compliance_audit_${round}_date`]
    if (!date) continue
    const year = Number(date.slice(0, 4))
    const key = `${store.id}:${year}:${round}`
    const pdf = store[`compliance_audit_${round}_pdf_path`]
    records.set(key, { id: key, store_id: store.id, audit_year: year, audit_number: round, visit_date: date,
      percentage: store[`compliance_audit_${round}_overall_pct`], pdf_path: pdf || records.get(key)?.pdf_path || null })
  }
  return [...records.values()]
}
