'use client'

import React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { AlertTriangle, ArrowRight, ArrowUpRight, Camera, ClipboardCheck, Flame, MapPin, Navigation } from 'lucide-react'
import { OfflineStatus } from '@/components/offline/offline-status'
import { Button } from '@/components/ui/button'
import type { DashboardData } from './dashboard-types'
import { normalisePriorityStores, normaliseUpcomingVisits, safeNumber } from './dashboard-utils'

export function TodayMobile({ data, profileName }: { data: DashboardData; profileName?: string | null }) {
  const nextVisit = normaliseUpcomingVisits(Array.isArray(data.personalPlannedRoutes) ? data.personalPlannedRoutes : [])[0]
  const stores = normalisePriorityStores(data).slice(0, 3)
  const firstName = profileName?.trim().split(/\s+/)[0] || 'there'
  const shortcuts = [
    { href: '/incidents/new', icon: AlertTriangle, label: 'Incident' },
    { href: '/audit-tracker', icon: ClipboardCheck, label: 'Audit' },
    { href: '/fire-risk-assessment', icon: Flame, label: 'FRA' },
    { href: '/stores', icon: Camera, label: 'Evidence' },
  ]
  return (
    <div className="field-today md:hidden">
      <div className="field-intro"><p className="workspace-eyebrow">{format(new Date(), 'EEEE d MMMM')}</p><h1>Hello, {firstName}.</h1><p>Your day. Ready to go.</p><div className="field-online"><OfflineStatus compact /></div></div>
      <section className="field-next" aria-labelledby="next-stop-heading">
        <div className="field-next-top"><h2 id="next-stop-heading">NEXT ON YOUR ROUTE</h2><Navigation size={20} aria-hidden="true" /></div>
        {nextVisit ? <>
          <p className="field-next-date">{nextVisit.date} <span>· {nextVisit.visitType}</span></p>
          <h3>{nextVisit.store}</h3>
          <p className="field-next-region"><MapPin size={15} aria-hidden="true" />{nextVisit.region}</p>
          <div className="field-next-actions"><Button asChild><Link href="/route-planning">Open route <ArrowUpRight size={16} /></Link></Button><Link href="/audit-tracker">Start visit <ArrowRight size={15} /></Link></div>
        </> : <><h3>Your next visit starts here.</h3><p className="mt-3 text-sm">No upcoming visits assigned to you.</p><Button asChild className="mt-5"><Link href="/route-planning">Plan a route <ArrowUpRight size={16} /></Link></Button></>}
        <Link className="field-schedule" href="/calendar">View full schedule <ArrowRight size={14} /></Link>
      </section>
      <nav className="field-shortcuts" aria-label="Quick actions">{shortcuts.map(({href,icon:Icon,label}) => <Link key={href} href={href}><span><Icon size={20} aria-hidden="true" /></span>{label}</Link>)}</nav>
      <section className="field-overview" aria-label="Store snapshot"><div><strong>{safeNumber(data.auditStats?.firstAuditsComplete)}<small>/{safeNumber(data.auditStats?.totalStores)}</small></strong><span>Stores audited</span></div><div><strong>{safeNumber(data.fraStats?.inDateCoveragePercentage)}<small>%</small></strong><span>FRA in date</span></div><div><strong>{safeNumber(data.complianceTracking?.awaitingSecondAuditCount)}</strong><span>Second audits due</span></div></section>
      <section className="field-work" aria-labelledby="my-work-heading"><div className="field-section-title"><h2 id="my-work-heading">Keep things moving.</h2><Link href="/actions">All actions <ArrowUpRight size={14} /></Link></div><div className="field-work-grid"><Link href="/actions?status=overdue"><span>Overdue actions</span><strong>{safeNumber(data.combinedActionStats?.totalOverdue ?? data.overdueActions)}</strong><ArrowUpRight size={16} aria-hidden="true" /></Link><Link href="/incidents?status=open"><span>Open incidents</span><strong>{safeNumber(data.openIncidents)}</strong><ArrowUpRight size={16} aria-hidden="true" /></Link></div></section>
      {stores.length > 0 && <section className="field-stores" aria-labelledby="risk-heading"><div className="field-section-title"><h2 id="risk-heading">Stores to focus on.</h2><Link href="/stores">Directory <ArrowUpRight size={14} /></Link></div>{stores.map((store,index) => <Link className="field-store-row" key={store.id} href={store.href || '/stores'}><span className="field-store-index">0{index + 1}</span><span><strong>{store.name}</strong><small>{store.auditStatus} · {store.openActions} actions</small><small>{store.fraStatus}</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>)}</section>}
    </div>
  )
}
