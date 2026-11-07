import type { AuditRow } from '@/components/audit/audit-table-helpers'
import { cycleRecords, type CycleRecord } from './cycle-records'

/** Build a view of one year without changing the current store slots. */
export function auditRowsForYear(stores: AuditRow[], history: CycleRecord[], year: number, currentYear = new Date().getFullYear()): AuditRow[] {
  const records = cycleRecords(stores, history)
  return stores.map(store => {
    const row: AuditRow = { ...store, audit_view_year: year, audit_read_only: year !== currentYear }
    let count = 0
    for (const round of [1, 2, 3] as const) {
      const dateKey = `compliance_audit_${round}_date` as const
      const scoreKey = `compliance_audit_${round}_overall_pct` as const
      const pdfKey = `compliance_audit_${round}_pdf_path` as const
      const planKey = `action_plan_${round}_sent` as const
      const current = store[dateKey]?.startsWith(`${year}-`)
      const record = records.find(value => value.store_id === store.id && value.audit_year === year && value.audit_number === round)
      row[dateKey] = record?.visit_date || null
      row[scoreKey] = record?.percentage ?? null
      row[pdfKey] = record?.pdf_path || null
      row[planKey] = current ? store[planKey] : null
      if (record?.visit_date && record.percentage != null) count++
      // A historical snapshot must never be written into today's store slots.
      if ((!current && store[dateKey]) || (!current && record)) row.audit_read_only = true
    }
    row.total_audits_to_date = count
    row.area_average_pct = null
    row.compliance_audit_2_planned_date = store.compliance_audit_2_planned_date?.startsWith(`${year}-`) ? store.compliance_audit_2_planned_date : null
    row.audit_revisit_follow_up = store.audit_revisit_follow_up ? { ...store.audit_revisit_follow_up,
      originals: store.audit_revisit_follow_up.originals.filter(record => record.visitDate.startsWith(`${year}-`)) } : undefined
    return row
  })
}
