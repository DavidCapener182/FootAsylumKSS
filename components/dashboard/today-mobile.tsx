'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckSquare,
  ClipboardCheck,
  Flame,
  MapPin,
  Navigation,
  Route,
  Store,
} from 'lucide-react'
import { OfflineStatus } from '@/components/offline/offline-status'
import { MobileRecordCard, RiskBadge } from '@/components/product'
import { Button } from '@/components/ui/button'
import type { DashboardData } from './dashboard-types'
import { normalisePriorityStores, normaliseUpcomingVisits, safeNumber } from './dashboard-utils'

export function TodayMobile({ data, profileName }: { data: DashboardData; profileName?: string | null }) {
  const visits = normaliseUpcomingVisits(Array.isArray(data.plannedRoutes) ? data.plannedRoutes : [])
  const nextVisit = visits[0]
  const priorityStores = normalisePriorityStores(data).slice(0, 3)
  const overdueActions = safeNumber(data.combinedActionStats?.totalOverdue ?? data.overdueActions)
  const incidentCount = safeNumber(data.openIncidents)
  const firstName = profileName?.trim().split(/\s+/)[0] || 'there'

  return (
    <div className="min-h-full bg-[#edf2f7] pb-28 md:hidden">
      <section className="overflow-hidden rounded-b-[32px] bg-[#0e1925] px-4 pb-6 pt-5 text-white shadow-[0_18px_40px_rgba(14,25,37,0.18)]">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-300">Field operations</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Morning, {firstName}</h1>
            <p className="mt-1 text-sm text-slate-300">{format(new Date(), 'EEEE d MMMM')}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-2.5">
            <ClipboardCheck className="h-5 w-5 text-lime-300" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.07] p-3">
          <OfflineStatus compact />
        </div>
      </section>

      <div className="space-y-4 px-3 py-4">
        <section aria-labelledby="next-stop-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="next-stop-heading" className="text-sm font-bold text-slate-950">Next stop</h2>
            <Link href="/calendar" className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-semibold text-slate-600">
              Full schedule <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          {nextVisit ? (
            <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
              <div className="bg-[linear-gradient(135deg,#143457_0%,#0e1925_100%)] p-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-200">{nextVisit.date}</p>
                    <h3 className="mt-1 text-lg font-bold">{nextVisit.store}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
                      <MapPin className="h-4 w-4" aria-hidden="true" /> {nextVisit.region}
                    </p>
                  </div>
                  <span className="rounded-full bg-lime-300 px-2.5 py-1 text-xs font-bold text-slate-950">{nextVisit.visitType}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                <Button asChild className="min-h-[48px] rounded-xl bg-[#143457]">
                  <Link href="/route-planning"><Navigation className="mr-2 h-4 w-4" />Open route</Link>
                </Button>
                <Button asChild variant="outline" className="min-h-[48px] rounded-xl">
                  <Link href="/audit-tracker"><ClipboardCheck className="mr-2 h-4 w-4" />Start visit</Link>
                </Button>
              </div>
            </article>
          ) : (
            <MobileRecordCard
              title="No route published for today"
              summary="Open the calendar to review upcoming visits or ask an operations manager to publish your route."
              actions={<Button asChild variant="outline" className="min-h-[44px]"><Link href="/calendar">Open calendar</Link></Button>}
            />
          )}
        </section>

        <section aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="mb-2 text-sm font-bold text-slate-950">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction href="/incidents/new" icon={AlertTriangle} label="Report incident" tone="red" />
            <QuickAction href="/audit-tracker" icon={ClipboardCheck} label="Start audit" tone="blue" />
            <QuickAction href="/fire-risk-assessment" icon={Flame} label="Open FRA" tone="amber" />
            <QuickAction href="/stores" icon={Camera} label="Add evidence" tone="slate" />
          </div>
        </section>

        <section aria-labelledby="my-work-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="my-work-heading" className="text-sm font-bold text-slate-950">My work</h2>
            <Link href="/actions" className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-semibold text-slate-600">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/actions?status=overdue" className="rounded-2xl border border-red-100 bg-white p-3 shadow-sm">
              <CheckSquare className="h-5 w-5 text-red-600" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold text-slate-950">{overdueActions}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Overdue actions</p>
            </Link>
            <Link href="/incidents?status=open" className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold text-slate-950">{incidentCount}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Open incidents</p>
            </Link>
          </div>
        </section>

        {priorityStores.length > 0 ? (
          <section aria-labelledby="risk-heading">
            <h2 id="risk-heading" className="mb-2 text-sm font-bold text-slate-950">Needs attention</h2>
            <div className="space-y-2">
              {priorityStores.map((store) => (
                <MobileRecordCard
                  key={store.id}
                  eyebrow={store.auditStatus}
                  title={store.name}
                  status={<RiskBadge level={store.openActions > 2 ? 'high' : 'medium'} label={`${store.openActions} actions`} />}
                  metadata={store.fraStatus}
                  actions={<Button asChild variant="outline" className="min-h-[44px] w-full rounded-xl"><Link href={store.href || '/stores'}><Store className="mr-2 h-4 w-4" />Open store</Link></Button>}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

function QuickAction({ href, icon: Icon, label, tone }: { href: string; icon: typeof Route; label: string; tone: 'red' | 'blue' | 'amber' | 'slate' }) {
  const toneClasses = {
    red: 'bg-red-50 text-red-700 border-red-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-800 border-amber-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }[tone]
  return (
    <Link href={href} className={`flex min-h-[82px] flex-col justify-between rounded-2xl border p-3 text-sm font-bold shadow-sm ${toneClasses}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  )
}
