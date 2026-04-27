import type React from 'react'
import { AlertCircle, CalendarDays, Clock, ShieldCheck, Store } from 'lucide-react'

import type { DashboardData, DashboardTone } from './dashboard-types'
import { percent, safeNumber, toneMap } from './dashboard-utils'
import { ProgressBar } from './panel'

export function KpiGrid({ data }: { data: DashboardData }) {
  const totalStores = safeNumber(data.auditStats?.totalStores)
  const firstAuditsComplete = safeNumber(data.auditStats?.firstAuditsComplete)
  const firstAuditPercentage = safeNumber(data.auditStats?.firstAuditPercentage, percent(firstAuditsComplete, totalStores))
  const secondAuditsRequired = safeNumber(data.complianceTracking?.awaitingSecondAuditCount)
  const fraCoverage = safeNumber(data.fraStats?.inDateCoveragePercentage)
  const overdueActions = safeNumber(data.combinedActionStats?.totalOverdue ?? data.overdueActions)
  const plannedVisits = safeNumber(data.complianceTracking?.plannedRoutesCount ?? data.complianceTracking?.plannedVisitsNext14Days)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard title="Stores Audited" value={`${firstAuditsComplete} / ${totalStores}`} subtitle={`${firstAuditPercentage}% of stores audited`} icon={Store} tone="success" progress={firstAuditPercentage} />
      <KpiCard title="Second Audits Required" value={secondAuditsRequired} subtitle={`${percent(secondAuditsRequired, totalStores)}% of stores`} icon={ShieldCheck} tone="info" />
      <KpiCard title="FRA In-Date Coverage" value={`${fraCoverage}%`} subtitle="Target: 90%" icon={Clock} tone="teal" progress={fraCoverage} />
      <KpiCard title="Overdue Actions" value={overdueActions} subtitle="Requires attention" icon={AlertCircle} tone="danger" />
      <KpiCard title="Planned Visits" value={plannedVisits} subtitle="This month" icon={CalendarDays} tone="info" />
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
  progress,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  tone: DashboardTone
  progress?: number
}) {
  const classes = toneMap[tone]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${classes.icon}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className={`mt-2 text-3xl font-bold leading-none ${classes.value}`}>{value}</p>
      {subtitle ? <p className="mt-2 text-xs text-slate-500">{subtitle}</p> : null}
      {typeof progress === 'number' ? <ProgressBar value={progress} className={`mt-4 ${classes.bar}`} /> : null}
    </div>
  )
}
