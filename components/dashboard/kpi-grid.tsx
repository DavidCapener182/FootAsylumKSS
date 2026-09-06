import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { DashboardData } from './dashboard-types'
import { clampPercentage, percent, safeNumber } from './dashboard-utils'

export function KpiGrid({ data }: { data: DashboardData }) {
  const total = safeNumber(data.auditStats?.totalStores)
  const complete = safeNumber(data.auditStats?.firstAuditsComplete)
  const progress = clampPercentage(safeNumber(data.auditStats?.firstAuditPercentage, percent(complete, total)))
  const metrics = [
    { value: `${safeNumber(data.fraStats?.inDateCoveragePercentage)}%`, label: 'FRA in-date coverage', detail: 'Target 90% · stores requiring FRA' },
    { value: safeNumber(data.complianceTracking?.awaitingSecondAuditCount), label: 'Second audits required', detail: `${percent(safeNumber(data.complianceTracking?.awaitingSecondAuditCount), total)}% of active stores` },
    { value: safeNumber(data.complianceTracking?.plannedRoutesCount ?? data.complianceTracking?.plannedVisitsNext14Days), label: 'Planned visits', detail: 'Route groups this month' },
  ]
  return (
    <section className="overview-board" aria-labelledby="overview-board-title">
      <div className="overview-board-top"><span className="overview-kicker">THE BIG PICTURE</span><span className="overview-count">{total} active stores</span></div>
      <div className="overview-board-main">
        <div>
          <h2 id="overview-board-title">Your stores.<br />At a glance.</h2>
          <p>{complete} of {total} stores have completed their first audit.</p>
          <Link href="/audit-tracker" className="overview-board-link">Explore audit progress <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="overview-orbit" role="img" aria-label={`${progress}% of stores have completed their first audit`}>
          <svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="79" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.14" /><circle cx="90" cy="90" r="79" fill="none" stroke="currentColor" strokeWidth="5" pathLength="100" strokeDasharray={`${progress} 100`} transform="rotate(-90 90 90)" /></svg>
          <div><strong>{progress}<small>%</small></strong><span>FIRST AUDIT COMPLETE</span></div>
        </div>
      </div>
      <dl className="overview-metrics">{metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd><dd className="overview-metric-detail">{metric.detail}</dd></div>)}</dl>
    </section>
  )
}
