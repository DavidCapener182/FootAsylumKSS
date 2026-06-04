import { Badge } from '@/components/ui/badge'
import { cn, formatAppDate, formatPercent } from '@/lib/utils'

export interface AuditRow {
  id: string
  region: string | null
  store_code: string | null
  store_name: string
  is_active: boolean
  compliance_audit_1_date: string | null
  compliance_audit_1_overall_pct: number | null
  action_plan_1_sent: boolean | null
  compliance_audit_1_pdf_path: string | null
  compliance_audit_2_date: string | null
  compliance_audit_2_overall_pct: number | null
  action_plan_2_sent: boolean | null
  compliance_audit_2_pdf_path: string | null
  compliance_audit_3_date: string | null
  compliance_audit_3_overall_pct: number | null
  action_plan_3_sent: boolean | null
  area_average_pct: number | null
  total_audits_to_date: number | null
  fire_risk_assessment_date: string | null
  fire_risk_assessment_pdf_path: string | null
  fire_risk_assessment_notes: string | null
  fire_risk_assessment_pct: number | null
}

export type AuditNumber = 1 | 2 | 3

export interface AuditSnapshot {
  auditNumber: AuditNumber
  date: string | null
  pct: number
}

export interface AuditComparison {
  previous: AuditSnapshot
  latest: AuditSnapshot
  change: number
}

export function pctBadge(value: number | null) {
  if (value === null || value === undefined || isNaN(value)) {
    return <span className="text-xs text-slate-400">—</span>
  }
  const pct = Number(value)
  const tone =
    pct >= 90 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
    pct >= 80 ? 'bg-amber-50 text-amber-800 border-amber-300' :
    'bg-rose-50 text-rose-800 border-rose-300'
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-6 rounded-full border px-2.5 font-mono text-[11px] font-semibold tabular-nums leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
        tone
      )}
    >
      {formatPercent(pct)}
    </Badge>
  )
}

export function changeBadge(value: number | null) {
  if (value === null || value === undefined || isNaN(value)) {
    return <span className="text-xs text-slate-400">—</span>
  }

  const change = Number(value)
  const tone =
    change > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
    change < 0 ? 'bg-rose-50 text-rose-800 border-rose-300' :
    'bg-slate-50 text-slate-700 border-slate-300'
  const prefix = change > 0 ? '+' : ''

  return (
    <Badge
      variant="outline"
      className={cn(
        'h-6 rounded-full border px-2.5 font-mono text-[11px] font-semibold tabular-nums leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
        tone
      )}
    >
      {prefix}{formatPercent(change)}
    </Badge>
  )
}

export function boolBadge(value: boolean | null) {
  if (value === null || value === undefined) return <span className="text-xs text-slate-400">—</span>
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-6 rounded-full border px-2.5 text-[11px] font-semibold leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
        value
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
          : 'bg-slate-50 text-slate-700 border-slate-300'
      )}
    >
      {value ? 'Yes' : 'No'}
    </Badge>
  )
}

export function formatDate(value: string | null) {
  if (!value) return '—'
  return formatAppDate(value)
}

export function getScoredAuditSnapshots(row: AuditRow): AuditSnapshot[] {
  const snapshots: AuditSnapshot[] = []

  if (row.compliance_audit_1_overall_pct !== null) {
    snapshots.push({
      auditNumber: 1,
      date: row.compliance_audit_1_date,
      pct: row.compliance_audit_1_overall_pct,
    })
  }

  if (row.compliance_audit_2_overall_pct !== null) {
    snapshots.push({
      auditNumber: 2,
      date: row.compliance_audit_2_date,
      pct: row.compliance_audit_2_overall_pct,
    })
  }

  if (row.compliance_audit_3_overall_pct !== null) {
    snapshots.push({
      auditNumber: 3,
      date: row.compliance_audit_3_date,
      pct: row.compliance_audit_3_overall_pct,
    })
  }

  return snapshots.sort((a, b) => a.auditNumber - b.auditNumber)
}

export function getLatestAuditComparison(row: AuditRow): AuditComparison | null {
  const snapshots = getScoredAuditSnapshots(row)
  if (snapshots.length < 2) return null

  const previous = snapshots[snapshots.length - 2]
  const latest = snapshots[snapshots.length - 1]

  if (!previous || !latest) return null

  return {
    previous,
    latest,
    change: latest.pct - previous.pct,
  }
}

// Helper: Get the most recent percentage. Returns null if no audits exist.
export function getLatestPct(row: AuditRow): number | null {
  if (row.compliance_audit_3_overall_pct !== null) return row.compliance_audit_3_overall_pct
  if (row.compliance_audit_2_overall_pct !== null) return row.compliance_audit_2_overall_pct
  if (row.compliance_audit_1_overall_pct !== null) return row.compliance_audit_1_overall_pct
  return null
}

// Helper: For sorting, treat null as -1 so it goes to bottom
export function getLatestPctForSort(row: AuditRow): number {
  const val = getLatestPct(row)
  return val === null ? -1 : val
}

export function isWarehouseAuditRow(row: Pick<AuditRow, 'store_code' | 'store_name'>): boolean {
  const code = String(row.store_code || '').trim().toUpperCase()
  const name = String(row.store_name || '').trim().toLowerCase()

  return (
    ['WH003', 'WH004', 'M3', 'POINT 62', 'POINT62', 'P62'].includes(code) ||
    ['heywood', 'middleton', 'point 62', 'point62'].includes(name)
  )
}

export function hasCompletedAudit(row: AuditRow, auditNumber: AuditNumber): boolean {
  const date =
    auditNumber === 1
      ? row.compliance_audit_1_date
      : auditNumber === 2
        ? row.compliance_audit_2_date
        : row.compliance_audit_3_date
  const pct =
    auditNumber === 1
      ? row.compliance_audit_1_overall_pct
      : auditNumber === 2
        ? row.compliance_audit_2_overall_pct
        : row.compliance_audit_3_overall_pct

  if (!date) return false
  return pct !== null || isWarehouseAuditRow(row)
}

export function getCompletedAuditCount(row: AuditRow): number {
  let count = 0
  if (hasCompletedAudit(row, 1)) count++
  if (hasCompletedAudit(row, 2)) count++
  if (hasCompletedAudit(row, 3)) count++
  return count
}
