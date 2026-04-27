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
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-lime-600" />
        <h2 className="text-sm font-bold text-slate-900">Needs Attention Today</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${classes.card}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${classes.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-xs font-semibold text-slate-600">{title}</p>
      </div>
      <div className="flex items-end gap-2">
        <p className={`text-3xl font-bold leading-none ${classes.value}`}>{value}</p>
        {suffix ? <p className="pb-0.5 text-xs font-semibold text-slate-500">{suffix}</p> : null}
      </div>
    </div>
  )
}
