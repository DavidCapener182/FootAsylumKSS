import type React from 'react'
import { AlertCircle, Calendar, CalendarDays, CheckCircle2, Clock, Flame, ShieldCheck } from 'lucide-react'

import type { DashboardData, DashboardTone } from './dashboard-types'
import { safeNumber, toneMap } from './dashboard-utils'

export function NeedsAttentionSection({ data }: { data: DashboardData }) {
  const items = [
    { title: 'Overdue Actions', value: safeNumber(data.combinedActionStats?.totalOverdue ?? data.overdueActions), icon: AlertCircle, tone: 'danger' as const },
    { title: 'FRAs Overdue', value: safeNumber(data.fraStats?.overdue), suffix: 'Stores', icon: Flame, tone: 'danger' as const },
    { title: 'FRAs Due Soon', value: safeNumber(data.fraStats?.due), icon: Clock, tone: 'warning' as const },
    { title: 'Second Audits Required', value: safeNumber(data.complianceTracking?.awaitingSecondAuditCount), icon: ShieldCheck, tone: 'info' as const },
    { title: 'Second Audits Unplanned', value: safeNumber(data.complianceTracking?.secondAuditUnplannedCount), icon: Calendar, tone: 'warning' as const },
    { title: 'Visits Next 14 Days', value: safeNumber(data.complianceTracking?.plannedVisitsNext14Days), icon: CalendarDays, tone: 'teal' as const },
  ]

  return (
    <section>
      <div className="mb-2 flex items-center gap-2 sm:mb-3">
        <CheckCircle2 className="h-4 w-4 text-lime-600" />
        <h2 className="text-sm font-bold text-slate-900">Needs Attention Today</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <AttentionCard key={item.title} {...item} />
        ))}
      </div>
    </section>
  )
}

function AttentionCard({
  title,
  value,
  suffix,
  icon: Icon,
  tone,
}: {
  title: string
  value: number | string
  suffix?: string
  icon: React.ComponentType<{ className?: string }>
  tone: DashboardTone
}) {
  const classes = toneMap[tone]

  return (
    <div className={`min-w-0 rounded-xl border bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-4 ${classes.card}`}>
      <div className="mb-2 flex items-start gap-2 sm:mb-4 sm:items-center sm:gap-3">
        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 ${classes.icon}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <p className="min-w-0 text-[10px] font-semibold leading-tight text-slate-600 sm:text-xs">{title}</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-end gap-x-1 gap-y-0.5 sm:gap-x-2">
        <p className={`break-words text-2xl font-bold leading-none sm:text-3xl ${classes.value}`}>{value}</p>
        {suffix ? <p className="pb-0.5 text-xs font-semibold text-slate-500">{suffix}</p> : null}
      </div>
    </div>
  )
}
