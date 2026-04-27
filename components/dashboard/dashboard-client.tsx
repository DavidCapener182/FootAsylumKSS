'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type React from 'react'
import {
  Activity,
  AlertCircle,
  Bell,
  Calendar,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  Flame,
  MapPin,
  Route,
  Search,
  ShieldCheck,
  Store,
} from 'lucide-react'
import { format } from 'date-fns'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

const ReportModal = dynamic(
  () => import('./report-modal').then((mod) => mod.ReportModal),
  { ssr: false }
)

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'teal'
type StatusTone = Tone | 'muted'

type PriorityStore = {
  id: string
  name: string
  auditStatus: string
  fraStatus: string
  openActions: number
  href?: string
}

type VisitRow = {
  id: string
  date: string
  region: string
  store: string
  visitType: string
}

type ActivityItem = {
  id: string
  time: string
  label: string
  type: 'Audit' | 'FRA' | 'Action' | 'Planning' | 'Update'
}

interface DashboardClientProps {
  initialData: any
}

const toneMap: Record<Tone, { card: string; icon: string; value: string; bar: string }> = {
  danger: {
    card: 'border-red-100 bg-red-50/40',
    icon: 'bg-red-100 text-red-600',
    value: 'text-red-600',
    bar: 'bg-red-500',
  },
  warning: {
    card: 'border-amber-100 bg-amber-50/40',
    icon: 'bg-amber-100 text-amber-600',
    value: 'text-amber-600',
    bar: 'bg-amber-500',
  },
  info: {
    card: 'border-blue-100 bg-blue-50/40',
    icon: 'bg-blue-100 text-blue-600',
    value: 'text-blue-600',
    bar: 'bg-blue-500',
  },
  success: {
    card: 'border-emerald-100 bg-emerald-50/40',
    icon: 'bg-emerald-100 text-emerald-600',
    value: 'text-emerald-600',
    bar: 'bg-emerald-500',
  },
  teal: {
    card: 'border-teal-100 bg-teal-50/40',
    icon: 'bg-teal-100 text-teal-600',
    value: 'text-teal-600',
    bar: 'bg-teal-500',
  },
}

const statusToneMap: Record<StatusTone, string> = {
  success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  danger: 'border-red-100 bg-red-50 text-red-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  info: 'border-blue-100 bg-blue-50 text-blue-700',
  teal: 'border-teal-100 bg-teal-50 text-teal-700',
  muted: 'border-slate-200 bg-slate-100 text-slate-600',
}

const chartColours = ['#84cc16', '#0d9488', '#2563eb', '#f59e0b', '#dc2626', '#94a3b8']

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [data] = useState(initialData)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportContent, setReportContent] = useState('')
  const [reportSnapshot, setReportSnapshot] = useState<any>(null)
  const [reportGeneratedAt, setReportGeneratedAt] = useState<string | null>(null)

  const handleGenerateReport = async () => {
    setIsReportOpen(true)
    if (!reportContent || !reportSnapshot) {
      setReportLoading(true)
      try {
        const response = await fetch('/api/ai/compliance-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dashboardData: data }),
        })

        if (!response.ok) throw new Error('Failed to generate report')

        const result = await response.json()
        setReportContent(result.content || '<p>Error generating report. Please check your API configuration.</p>')
        setReportSnapshot(result.snapshot || null)
        setReportGeneratedAt(result.generatedAt || null)
      } catch (error) {
        console.error('Error generating report:', error)
        setReportContent('<p>Error generating report. Please check your API configuration.</p>')
        setReportSnapshot(null)
        setReportGeneratedAt(null)
      } finally {
        setReportLoading(false)
      }
    }
  }

  return (
    <div className="min-h-full bg-slate-50">
      {isReportOpen ? (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          content={reportContent}
          isLoading={reportLoading}
          snapshot={reportSnapshot}
          generatedAt={reportGeneratedAt}
        />
      ) : null}

      <DashboardHeader onGenerateReport={handleGenerateReport} reportLoading={reportLoading} />

      <div className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        <NeedsAttentionSection data={data} />
        <KpiGrid data={data} />

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <ComplianceProgressPanel data={data} />
          </div>
          <div className="xl:col-span-4">
            <PriorityStoresPanel stores={normalisePriorityStores(data).slice(0, 4)} />
          </div>
          <div className="xl:col-span-3">
            <UpcomingVisitsPanel routes={Array.isArray(data.plannedRoutes) ? data.plannedRoutes : []} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <RecentActivityPanel activity={Array.isArray(data.recentActivity) ? data.recentActivity : []} />
          </div>
          <div className="xl:col-span-4">
            <ComplianceByRegionPanel data={data} />
          </div>
          <div className="xl:col-span-4">
            <QuickLinksPanel />
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardHeader({
  onGenerateReport,
  reportLoading,
}: {
  onGenerateReport: () => void
  reportLoading: boolean
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Main Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Live view of audit progress, fire risk assessment status, actions and planned compliance visits.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
        <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          This Month
        </button>

        <label className="relative min-w-0 sm:w-64">
          <span className="sr-only">Search dashboard</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-lime-300 focus:ring-2 focus:ring-lime-100"
          />
        </label>

        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-lime-400 ring-2 ring-white" />
        </button>

        <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 shadow-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-100 text-xs font-bold text-lime-700">DC</span>
          <span className="hidden text-sm font-semibold text-slate-700 sm:inline">David Capener</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Ops</span>
        </div>

        <button
          type="button"
          onClick={onGenerateReport}
          disabled={reportLoading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Download className="h-4 w-4" />
          {reportLoading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
    </div>
  )
}

function NeedsAttentionSection({ data }: { data: any }) {
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
  tone: Tone
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

function KpiGrid({ data }: { data: any }) {
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
  tone: Tone
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

function ComplianceProgressPanel({ data }: { data: any }) {
  const totalStores = safeNumber(data.auditStats?.totalStores)
  const audit1Complete = safeNumber(data.auditStats?.firstAuditsComplete)
  const audit2Complete = safeNumber(data.auditStats?.secondAuditsComplete)
  const awaitingSecondAudit = safeNumber(data.complianceTracking?.awaitingSecondAuditCount)
  const fraRequired = safeNumber(data.storesRequiringFRA ?? data.fraStats?.required)
  const fraOverdue = safeNumber(data.fraStats?.overdue)
  const fraDueSoon = safeNumber(data.fraStats?.due)

  return (
    <Panel title="Compliance Progress" icon={Activity} actionLabel={`${totalStores} stores`}>
      <div className="space-y-4">
        <ComplianceProgressRow label="Audit 1 Complete" value={audit1Complete} percentage={safeNumber(data.auditStats?.firstAuditPercentage, percent(audit1Complete, totalStores))} tone="success" />
        <ComplianceProgressRow label="Audit 2 Complete" value={audit2Complete} percentage={safeNumber(data.auditStats?.secondAuditPercentage, percent(audit2Complete, totalStores))} tone="success" />
        <ComplianceProgressRow label="Awaiting Second Audit" value={awaitingSecondAudit} percentage={percent(awaitingSecondAudit, totalStores)} tone="info" />
        <ComplianceProgressRow label="FRA Required" value={fraRequired} percentage={percent(fraRequired, totalStores)} tone="warning" />
        <ComplianceProgressRow label="FRA Overdue" value={fraOverdue} percentage={percent(fraOverdue, totalStores)} tone="danger" />
        <ComplianceProgressRow label="FRA Due Soon" value={fraDueSoon} percentage={percent(fraDueSoon, totalStores)} tone="warning" />
      </div>

      <Link href="/reports" prefetch={false} className="mt-5 inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800">
        View full compliance report <ChevronRight className="ml-1 h-4 w-4" />
      </Link>
    </Panel>
  )
}

function ComplianceProgressRow({
  label,
  value,
  percentage,
  tone,
}: {
  label: string
  value: number
  percentage: number
  tone: StatusTone
}) {
  const barClass = tone === 'muted' ? 'bg-slate-300' : toneMap[tone as Tone]?.bar || 'bg-slate-300'

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">
          {value} <span className="text-xs font-medium text-slate-500">({clampPercentage(percentage)}%)</span>
        </span>
      </div>
      <ProgressBar value={percentage} className={barClass} />
    </div>
  )
}

function PriorityStoresPanel({ stores }: { stores: PriorityStore[] }) {
  return (
    <Panel title="Priority Stores" icon={Store} actionLabel={`${stores.length} shown`}>
      {stores.length === 0 ? (
        <EmptyState icon={Store} title="No priority stores" description="No stores currently need follow-up attention." />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {stores.map((store) => (
              <PriorityStoreCard key={store.id} store={store} />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="pb-3 pr-3">Store</th>
                  <th className="pb-3 pr-3">Audit Status</th>
                  <th className="pb-3 pr-3">FRA Status</th>
                  <th className="pb-3 text-right">Open Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.map((store) => (
                  <tr key={store.id} className="align-middle">
                    <td className="py-3 pr-3">
                      <Link href={store.href || '/stores'} prefetch={false} className="font-semibold text-slate-900 hover:text-blue-700">
                        {store.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-3"><StatusBadge label={store.auditStatus} tone={getStatusTone(store.auditStatus)} /></td>
                    <td className="py-3 pr-3"><StatusBadge label={store.fraStatus} tone={getStatusTone(store.fraStatus)} /></td>
                    <td className="py-3 text-right">
                      <Link href={store.href || '/actions'} prefetch={false} className="font-semibold text-red-600 hover:text-red-700">
                        {store.openActions} Open Actions
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  )
}

function PriorityStoreCard({ store }: { store: PriorityStore }) {
  return (
    <Link href={store.href || '/stores'} prefetch={false} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-slate-900">{store.name}</p>
        <span className="text-sm font-bold text-red-600">{store.openActions}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge label={store.auditStatus} tone={getStatusTone(store.auditStatus)} />
        <StatusBadge label={store.fraStatus} tone={getStatusTone(store.fraStatus)} />
      </div>
    </Link>
  )
}

function UpcomingVisitsPanel({ routes }: { routes: any[] }) {
  const visits = normaliseUpcomingVisits(routes).slice(0, 4)

  return (
    <Panel title="Upcoming Visits" icon={CalendarDays} actionHref="/calendar" actionLabel="View calendar">
      {visits.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No upcoming visits planned" description="Plan compliance visits from route planning." />
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <div key={visit.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{visit.store}</p>
                  <p className="mt-1 text-xs text-slate-500">{visit.region}</p>
                </div>
                <StatusBadge label={visit.visitType} tone="info" />
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {visit.date}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function RecentActivityPanel({ activity }: { activity: any[] }) {
  const items = activity.map(formatActivityItem).slice(0, 4)

  return (
    <Panel title="Recent Activity" icon={Activity} actionHref="/activity" actionLabel="View all activity">
      {items.length === 0 ? (
        <EmptyState icon={Activity} title="No recent activity" description="Completed audits, FRA updates and actions will appear here." />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const Icon = getActivityIcon(item.type)
            return (
              <div key={item.id} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-slate-500">{item.time}</p>
                    <StatusBadge label={item.type} tone={getActivityTone(item.type)} />
                  </div>
                  <p className="mt-1 text-sm font-medium leading-5 text-slate-800">{item.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

function ComplianceByRegionPanel({ data }: { data: any }) {
  const regions = Array.isArray(data.regionalCompliance) ? data.regionalCompliance : []
  const validRegions = regions
    .map((region: any) => ({
      name: String(region.region || region.name || 'Unknown'),
      percentage: clampPercentage(safeNumber(region.inDatePercentage ?? region.percentage)),
      inDate: safeNumber(region.inDate),
      total: safeNumber(region.total),
    }))
    .filter((region: any) => region.total > 0)

  const totalStores = validRegions.reduce((total: number, region: any) => total + region.total, 0)
  const totalInDate = validRegions.reduce((total: number, region: any) => total + region.inDate, 0)
  const overall = totalStores > 0 ? percent(totalInDate, totalStores) : safeNumber(data.fraStats?.inDateCoveragePercentage)

  return (
    <Panel title="Compliance by Region" icon={MapPin}>
      {validRegions.length === 0 ? (
        <EmptyState icon={MapPin} title="Regional compliance data unavailable" description="Region-level compliance will appear once the dashboard receives regional store status data." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-[180px_1fr] xl:grid-cols-1 2xl:grid-cols-[180px_1fr]">
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={validRegions} dataKey="inDate" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={2} strokeWidth={0}>
                  {validRegions.map((region: any, index: number) => (
                    <Cell key={region.name} fill={chartColours[index % chartColours.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-slate-900">{overall}%</p>
              <p className="text-xs font-semibold text-slate-500">Overall</p>
            </div>
          </div>

          <div className="space-y-2">
            {validRegions.slice(0, 6).map((region: any, index: number) => (
              <div key={region.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: chartColours[index % chartColours.length] }} />
                  <span className="truncate">{region.name}</span>
                </span>
                <span className="font-semibold text-slate-900">{region.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

function QuickLinksPanel() {
  const links = [
    { href: '/audit-tracker', title: 'Compliance Audits', description: 'Manage store audits', icon: ClipboardList },
    { href: '/fire-risk-assessment', title: 'Fire Risk Assessments', description: 'Manage FRAs', icon: Flame },
    { href: '/actions', title: 'Actions', description: 'View and manage actions', icon: CheckSquare },
    { href: '/route-planning', title: 'Route Planning', description: 'Plan and manage visits', icon: Route },
  ]

  return (
    <Panel title="Quick Links" icon={ChevronRight}>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} prefetch={false} className="group rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-lime-300 hover:bg-lime-50/40">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-50 text-lime-700 transition-colors group-hover:bg-lime-100">
                  <Icon className="h-5 w-5" />
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-lime-700" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-900">{link.title}</p>
              <p className="mt-1 text-xs text-slate-500">{link.description}</p>
            </Link>
          )
        })}
      </div>
    </Panel>
  )
}

function Panel({
  title,
  icon: Icon,
  actionHref,
  actionLabel,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  actionHref?: string
  actionLabel?: string
  children: React.ReactNode
}) {
  return (
    <section className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Icon className="h-4 w-4 text-slate-500" />
          {title}
        </h2>
        {actionHref && actionLabel ? (
          <Link href={actionHref} prefetch={false} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
            {actionLabel}
          </Link>
        ) : actionLabel ? (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">{actionLabel}</span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusToneMap[tone]}`}>
      {label}
    </span>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  )
}

function ProgressBar({ value, className }: { value: number; className: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all duration-700 ${className}`} style={{ width: `${clampPercentage(value)}%` }} />
    </div>
  )
}

function normalisePriorityStores(data: any): PriorityStore[] {
  const fromForecast = Array.isArray(data.complianceForecast?.stores)
    ? data.complianceForecast.stores.map((store: any) => {
        const drivers = Array.isArray(store.drivers) ? store.drivers.join(' ').toLowerCase() : ''
        const fraStatus = drivers.includes('no in-date fra') || drivers.includes('fra') ? 'FRA Required' : 'FRA Up to Date'
        return {
          id: String(store.storeId || store.id || store.storeName),
          name: String(store.storeName || store.name || 'Unknown Store'),
          auditStatus: drivers.includes('second') || drivers.includes('audit') ? 'Second Audit Required' : 'Not Started',
          fraStatus,
          openActions: safeNumber(store.overdueActions ?? store.actionCount ?? store.count),
          href: store.storeId ? `/stores/${store.storeId}` : '/stores',
        }
      })
    : []
  if (fromForecast.length > 0) return fromForecast

  const fromSecondVisits = Array.isArray(data.storesNeedingSecondVisit)
    ? data.storesNeedingSecondVisit.map((store: any) => ({
        id: String(store.id || store.store_id || store.store_name),
        name: String(store.store_name || store.storeName || 'Unknown Store'),
        auditStatus: store.compliance_audit_2_planned_date ? 'Audit 2 Planned' : 'Second Audit Required',
        fraStatus: 'FRA Required',
        openActions: safeNumber(store.openActions ?? store.count),
        href: store.id ? `/stores/${store.id}` : '/stores',
      }))
    : []
  if (fromSecondVisits.length > 0) return fromSecondVisits

  const fromStoreActions = Array.isArray(data.storeActionStats?.topStores)
    ? data.storeActionStats.topStores.map((store: any) => ({
        id: String(store.id || store.name),
        name: String(store.name || store.storeName || 'Unknown Store'),
        auditStatus: 'Second Audit Required',
        fraStatus: safeNumber(store.overdue) > 0 ? 'FRA Overdue' : 'FRA Required',
        openActions: safeNumber(store.count),
        href: store.id ? `/stores/${store.id}` : '/actions',
      }))
    : []
  if (fromStoreActions.length > 0) return fromStoreActions

  return Array.isArray(data.topStores)
    ? data.topStores.map((store: any) => ({
        id: String(store.id || store.name),
        name: String(store.name || store.storeName || 'Unknown Store'),
        auditStatus: 'Not Started',
        fraStatus: 'FRA Required',
        openActions: safeNumber(store.count),
        href: store.id ? `/stores/${store.id}` : '/stores',
      }))
    : []
}

function normaliseUpcomingVisits(routes: any[]): VisitRow[] {
  return [...routes]
    .sort((a, b) => String(a?.plannedDate || '').localeCompare(String(b?.plannedDate || '')))
    .map((route, index) => {
      const firstStore = Array.isArray(route?.stores) ? route.stores[0] : null
      const operationalItems = Array.isArray(route?.operationalItems) ? route.operationalItems : []
      const purpose = String(route?.purpose || operationalItems[0]?.title || '')
      const visitType = purpose.toLowerCase().includes('fra') ? 'FRA' : 'Audit'
      const storeName = firstStore?.name || firstStore?.store_name || route?.storeName
      const fallbackStore = safeNumber(route?.storeCount) > 1 ? `${route.storeCount} stores planned` : 'Route visit'
      return {
        id: String(route?.key || `${route?.plannedDate || 'route'}-${index}`),
        date: formatShortDate(route?.plannedDate),
        region: String(route?.area || route?.region || 'Unknown region'),
        store: String(storeName || fallbackStore),
        visitType,
      }
    })
}

function formatActivityItem(item: any): ActivityItem {
  return {
    id: String(item?.id || item?.created_at || Math.random()),
    time: formatActivityTime(item?.created_at),
    label: String(item?.description || item?.action || item?.details || 'Activity recorded'),
    type: inferActivityType(item),
  }
}

function inferActivityType(item: any): ActivityItem['type'] {
  const text = `${item?.description || ''} ${item?.action || ''} ${item?.entity_type || ''}`.toLowerCase()
  if (text.includes('fra') || text.includes('fire risk')) return 'FRA'
  if (text.includes('audit')) return 'Audit'
  if (text.includes('action')) return 'Action'
  if (text.includes('route') || text.includes('visit') || text.includes('planning')) return 'Planning'
  return 'Update'
}

function getActivityIcon(type: ActivityItem['type']) {
  if (type === 'FRA') return Flame
  if (type === 'Audit') return ClipboardList
  if (type === 'Action') return CheckSquare
  if (type === 'Planning') return Route
  return Activity
}

function getActivityTone(type: ActivityItem['type']): StatusTone {
  if (type === 'FRA') return 'warning'
  if (type === 'Audit') return 'success'
  if (type === 'Action') return 'danger'
  if (type === 'Planning') return 'info'
  return 'muted'
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function percent(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(safeNumber(value))))
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return format(parsed, 'd MMM yyyy')
}

function formatActivityTime(value: string | null | undefined) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return format(parsed, 'd MMM, HH:mm')
}

function getStatusTone(label: string): StatusTone {
  const lower = label.toLowerCase()
  if (lower.includes('up to date') || lower.includes('complete') || lower.includes('compliant')) return 'success'
  if (lower.includes('overdue') || lower.includes('escalation')) return 'danger'
  if (lower.includes('due soon') || lower.includes('required')) return 'warning'
  if (lower.includes('planned') || lower.includes('in progress')) return 'info'
  return 'muted'
}
