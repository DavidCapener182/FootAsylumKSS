import type React from 'react'
import { AlertCircle, CalendarDays, Clock, ShieldCheck, Store } from 'lucide-react'

import { cn } from '@/lib/utils'
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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard title="Stores Audited" value={`${firstAuditsComplete} / ${totalStores}`} subtitle="Active stores counted in the audit tracker" icon={Store} tone="success" progress={firstAuditPercentage} featured />
      <KpiCard title="Second Audits Required" value={secondAuditsRequired} subtitle={`${percent(secondAuditsRequired, totalStores)}% of active stores`} icon={ShieldCheck} tone="info" />
      <KpiCard title="FRA In-Date Coverage" value={`${fraCoverage}%`} subtitle="Stores requiring FRA; target 90%" icon={Clock} tone="teal" progress={fraCoverage} />
      <KpiCard title="Overdue Actions" value={overdueActions} subtitle="Open actions past due date" icon={AlertCircle} tone="danger" />
      <KpiCard title="Planned Visits" value={plannedVisits} subtitle="Route groups planned this month" icon={CalendarDays} tone="info" />
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
  featured = false,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  tone: DashboardTone
  progress?: number
  featured?: boolean
}) {
  const classes = toneMap[tone]

  return (
    <div className={cn('min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5', featured && 'col-span-2 sm:col-span-1')}>
      <div className="flex items-start justify-between gap-2 sm:block">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold leading-tight text-slate-700 sm:text-sm">{title}</p>
          <p className={`mt-1 break-words text-2xl font-bold leading-none sm:mt-2 sm:text-3xl ${classes.value}`}>{value}</p>
        </div>
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full sm:mb-4 sm:h-11 sm:w-11 ${classes.icon}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      </div>
      {subtitle ? <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-500 sm:mt-2 sm:text-xs">{subtitle}</p> : null}
      {typeof progress === 'number' ? <ProgressBar value={progress} className={`mt-2 sm:mt-4 ${classes.bar}`} /> : null}
    </div>
  )
}
