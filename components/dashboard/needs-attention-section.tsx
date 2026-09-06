import Link from 'next/link'
import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import type { DashboardData } from './dashboard-types'
import { safeNumber } from './dashboard-utils'

export function NeedsAttentionSection({ data }: { data: DashboardData }) {
  const overdue = safeNumber(data.combinedActionStats?.totalOverdue ?? data.overdueActions)
  const fraOverdue = safeNumber(data.fraStats?.overdue)
  const items = [
    ...(overdue > 0 ? [{ title: 'Overdue actions', detail: 'Review work past its due date', value: overdue, href: '/actions?status=overdue' }] : []),
    ...(fraOverdue > 0 ? [{ title: 'Overdue FRAs', detail: 'Review overdue assessments', value: fraOverdue, href: '/fire-risk-assessment' }] : []),
    { title: 'Second audits to schedule', detail: 'Required visits without a plan', value: safeNumber(data.complianceTracking?.secondAuditUnplannedCount), href: '/route-planning' },
    { title: 'FRAs coming due', detail: 'Review assessments due soon', value: safeNumber(data.fraStats?.due), href: '/fire-risk-assessment' },
    { title: 'Visits in the next 14 days', detail: 'Review the upcoming schedule', value: safeNumber(data.complianceTracking?.plannedVisitsNext14Days), href: '/calendar' },
  ]
  return (
    <section className="overview-focus" aria-labelledby="overview-focus-title">
      <div className="overview-focus-heading"><div><p className="workspace-eyebrow">WHERE TO FOCUS</p><h2 id="overview-focus-title">Next on your list.</h2></div><span className="overview-focus-mark" aria-hidden="true">↗</span></div>
      <div className="overview-focus-list">{items.map((item, index) => <Link href={item.href} key={item.title} className="overview-focus-row"><span className="overview-row-index">0{index + 1}</span><span className="overview-row-copy"><strong>{item.title}</strong><small>{item.detail}</small></span><span className="overview-row-value">{item.value}</span><ArrowUpRight size={16} aria-hidden="true" /></Link>)}</div>
      <div className="overview-focus-footer"><CheckCircle2 size={16} className={overdue || fraOverdue ? 'text-amber-700' : 'text-emerald-700'} aria-hidden="true" /><Link href="/actions?status=overdue"><strong>{overdue}</strong> overdue actions</Link><span aria-hidden="true">·</span><Link href="/fire-risk-assessment"><strong>{fraOverdue}</strong> overdue FRAs</Link></div>
    </section>
  )
}
