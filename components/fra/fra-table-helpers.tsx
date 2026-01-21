import { Badge } from '@/components/ui/badge'
import { cn, formatPercent } from '@/lib/utils'

/**
 * Render a percentage badge (similar to audit table)
 */
export function pctBadge(value: number | null) {
  if (value === null || value === undefined || isNaN(value)) return <span className="text-muted-foreground text-xs">—</span>
  const pct = Number(value)
  const tone =
    pct >= 90 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    pct >= 80 ? 'bg-amber-100 text-amber-800 border-amber-200' :
    'bg-rose-100 text-rose-800 border-rose-200'
  return <Badge variant="outline" className={cn('font-mono font-normal', tone)}>{formatPercent(pct)}</Badge>
}

export interface FRARow {
  id: string
  region: string | null
  store_code: string | null
  store_name: string
  is_active: boolean
  compliance_audit_1_date: string | null
  compliance_audit_2_date: string | null
  fire_risk_assessment_date: string | null
  fire_risk_assessment_pdf_path: string | null
  fire_risk_assessment_notes: string | null
  fire_risk_assessment_pct: number | null
}

export type FRAStatus = 'up_to_date' | 'due' | 'overdue' | 'not_required' | 'required'

/**
 * Calculate the next FRA due date (12 months from last FRA date)
 */
export function calculateNextDueDate(fraDate: string | null): Date | null {
  if (!fraDate) return null
  
  const date = new Date(fraDate)
  const nextDue = new Date(date)
  nextDue.setMonth(nextDue.getMonth() + 12)
  return nextDue
}

/**
 * Get the FRA status based on the last FRA date
 */
export function getFRAStatus(fraDate: string | null, needsFRA: boolean): FRAStatus {
  if (!needsFRA) return 'not_required'
  if (!fraDate) return 'required'
  
  const nextDue = calculateNextDueDate(fraDate)
  if (!nextDue) return 'required'
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(nextDue)
  dueDate.setHours(0, 0, 0, 0)
  
  const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysDiff < 0) return 'overdue'
  if (daysDiff <= 30) return 'due'
  return 'up_to_date'
}

/**
 * Get days until due (positive) or days overdue (negative)
 */
export function getDaysUntilDue(fraDate: string | null): number | null {
  if (!fraDate) return null
  
  const nextDue = calculateNextDueDate(fraDate)
  if (!nextDue) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(nextDue)
  dueDate.setHours(0, 0, 0, 0)
  
  return Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Format a date string to UK format
 */
export function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB')
}

/**
 * Render a status badge for FRA status
 */
export function statusBadge(status: FRAStatus, days: number | null) {
  switch (status) {
    case 'up_to_date':
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
          Up to date
        </Badge>
      )
    case 'due':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-normal">
          Due in {days} {days === 1 ? 'day' : 'days'}
        </Badge>
      )
    case 'overdue':
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-normal">
          {days && days < 0 ? `${Math.abs(days)} days overdue` : 'Overdue'}
        </Badge>
      )
    case 'required':
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-normal">
          Required
        </Badge>
      )
    case 'not_required':
      return (
        <span className="text-muted-foreground text-xs">—</span>
      )
    default:
      return <span className="text-muted-foreground text-xs">—</span>
  }
}

/**
 * Check if a store needs an FRA (only after at least one completed H&S audit)
 */
export function storeNeedsFRA(row: FRARow): boolean {
  return Boolean(row.compliance_audit_1_date || row.compliance_audit_2_date)
}
