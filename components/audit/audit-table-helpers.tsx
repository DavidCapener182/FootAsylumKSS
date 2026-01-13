import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
}

export function pctBadge(value: number | null) {
  if (value === null || value === undefined || isNaN(value)) return <span className="text-muted-foreground text-xs">—</span>
  const pct = Number(value)
  const tone =
    pct >= 90 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    pct >= 80 ? 'bg-amber-100 text-amber-800 border-amber-200' :
    'bg-rose-100 text-rose-800 border-rose-200'
  return <Badge variant="outline" className={cn('font-mono font-normal', tone)}>{Math.round(pct)}%</Badge>
}

export function boolBadge(value: boolean | null) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
  return (
    <Badge variant="outline" className={cn('font-normal', value ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200')}>
      {value ? 'Yes' : 'No'}
    </Badge>
  )
}

export function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB')
}

// Helper: Get the most recent percentage. Returns null if no audits exist.
export function getLatestPct(row: AuditRow): number | null {
  if (row.compliance_audit_2_overall_pct !== null) return row.compliance_audit_2_overall_pct
  if (row.compliance_audit_1_overall_pct !== null) return row.compliance_audit_1_overall_pct
  return null 
}

// Helper: For sorting, treat null as -1 so it goes to bottom
export function getLatestPctForSort(row: AuditRow): number {
  const val = getLatestPct(row)
  return val === null ? -1 : val
}

