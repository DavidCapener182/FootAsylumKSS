'use client'

import { cn, formatPercent } from '@/lib/utils'
import type { PlannedRoute, CompletedStore } from '@/app/actions/calendar'

interface CalendarDayEventProps {
  type: 'planned' | 'completed'
  data: PlannedRoute | CompletedStore
  date: string
  onClick: () => void
}

export function CalendarDayEvent({ type, data, date, onClick }: CalendarDayEventProps) {
  if (type === 'planned') {
    const route = data as PlannedRoute
    return (
      <div
        onClick={onClick}
        className={cn(
          "text-xs p-1.5 rounded cursor-pointer transition-colors",
          "bg-blue-100 hover:bg-blue-200 border border-blue-300",
          "text-blue-900 font-medium"
        )}
        title={`${route.managerName} - ${route.area || 'Unknown Area'} - ${route.storeCount} store(s)`}
      >
        <div className="truncate font-semibold">{route.managerName}</div>
        <div className="truncate text-[10px] opacity-75">
          {route.area || 'Unknown'} • {route.storeCount} store{route.storeCount !== 1 ? 's' : ''}
        </div>
      </div>
    )
  }

  // Completed store
  const store = data as CompletedStore
  const hasAudit1 = store.audit1Date && store.audit1Pct !== null
  const hasAudit2 = store.audit2Date && store.audit2Pct !== null
  const hasFRA = store.fraDate && store.fraPct !== null

  // Check if any audit/FRA failed (less than 80%)
  const audit1Failed = hasAudit1 && store.audit1Pct !== null && store.audit1Pct < 80
  const audit2Failed = hasAudit2 && store.audit2Pct !== null && store.audit2Pct < 80
  const fraFailed = hasFRA && store.fraPct !== null && store.fraPct < 80
  const hasFailedAudit = audit1Failed || audit2Failed || fraFailed

  // Determine if this store was completed on this specific date
  const isAudit1Date = store.audit1Date === date
  const isAudit2Date = store.audit2Date === date
  const isFRADate = store.fraDate === date

  // Build display text
  let displayText = store.storeName
  const percentages: string[] = []
  
  if (isAudit1Date && hasAudit1) {
    percentages.push(`A1: ${formatPercent(store.audit1Pct)}`)
  }
  if (isAudit2Date && hasAudit2) {
    percentages.push(`A2: ${formatPercent(store.audit2Pct)}`)
  }
  if (isFRADate && hasFRA) {
    percentages.push(`FRA: ${formatPercent(store.fraPct)}`)
  }

  // If no specific completion on this date, show all available percentages
  if (percentages.length === 0) {
    if (hasAudit1) percentages.push(`A1: ${formatPercent(store.audit1Pct)}`)
    if (hasAudit2) percentages.push(`A2: ${formatPercent(store.audit2Pct)}`)
    if (hasFRA) percentages.push(`FRA: ${formatPercent(store.fraPct)}`)
  }

  // Use red styling if any audit failed, otherwise use green
  const bgColor = hasFailedAudit 
    ? "bg-red-50 hover:bg-red-100 border-red-300 text-red-900"
    : "bg-green-50 hover:bg-green-100 border-green-300 text-green-900"

  return (
    <div
      onClick={onClick}
      className={cn(
        "text-xs p-1.5 rounded cursor-pointer transition-colors",
        bgColor
      )}
      title={`${store.storeName}${store.managerName ? ` - ${store.managerName}` : ''}${percentages.length > 0 ? ` - ${percentages.join(', ')}` : ''}${hasFailedAudit ? ' - REVISIT NEEDED' : ''}`}
    >
      <div className="truncate font-medium">{store.storeName}</div>
      {percentages.length > 0 && (
        <div className="truncate text-[10px] opacity-75 mt-0.5">
          {percentages.join(', ')}
        </div>
      )}
      {store.managerName && (
        <div className="truncate text-[10px] opacity-60 mt-0.5">
          {store.managerName}
        </div>
      )}
      {hasFailedAudit && (
        <div className="truncate text-[10px] font-semibold mt-0.5 opacity-90">
          ⚠ Revisit Needed
        </div>
      )}
    </div>
  )
}
