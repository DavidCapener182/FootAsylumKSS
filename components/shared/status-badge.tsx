import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FaIncidentStatus, FaActionStatus, FaSeverity, FaInvestigationStatus } from '@/types/db'

interface StatusBadgeProps {
  status: FaIncidentStatus | FaActionStatus | FaSeverity | FaInvestigationStatus | string
  type?: 'incident' | 'action' | 'severity' | 'investigation' | 'fra' | 'audit'
  label?: string
  className?: string
}

const statusColors: Record<string, string> = {
  // Incident statuses
  open: 'bg-blue-50 text-blue-700',
  under_investigation: 'bg-yellow-50 text-yellow-700',
  actions_in_progress: 'bg-orange-50 text-orange-700',
  closed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-700',
  
  // Action statuses
  in_progress: 'bg-yellow-50 text-yellow-700',
  blocked: 'bg-red-50 text-red-700',
  complete: 'bg-emerald-50 text-emerald-700',
  
  // Severity
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-50 text-yellow-700',
  high: 'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700',
  
  // Investigation statuses
  not_started: 'bg-gray-100 text-gray-700',
  awaiting_actions: 'bg-orange-50 text-orange-700',

  // FRA statuses
  required: 'bg-orange-50 text-orange-800 border-orange-300',
  due: 'bg-amber-50 text-amber-800 border-amber-300',
  overdue: 'bg-rose-50 text-rose-800 border-rose-300',
  up_to_date: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  not_required: 'bg-gray-100 text-gray-700 border-gray-200',

  // Audit lifecycle statuses
  audit_1_complete: 'bg-blue-50 text-blue-800 border-blue-300',
  second_audit_required: 'bg-orange-50 text-orange-800 border-orange-300',
  audit_2_planned: 'bg-violet-50 text-violet-800 border-violet-300',
  audit_2_complete: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  compliant: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  escalation_required: 'bg-rose-50 text-rose-800 border-rose-300',
}

export function StatusBadge({ status, type, label, className }: StatusBadgeProps) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-700'
  const displayText = label || status.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
  const isComplianceStatus = type === 'fra' || type === 'audit'

  return (
    <Badge
      variant={isComplianceStatus ? 'outline' : 'default'}
      className={cn(
        'rounded-full shadow-sm',
        isComplianceStatus && 'h-6 border px-2.5 text-[11px] font-semibold leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
        colorClass,
        className
      )}
    >
      {displayText}
    </Badge>
  )
}
