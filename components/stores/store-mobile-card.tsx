'use client'

import { Card } from '@/components/ui/card'
import { MapPin, CheckCircle2, XCircle, ClipboardList, ArrowUpRight, Navigation, ShieldCheck } from 'lucide-react'
import { getDisplayStoreCode } from '@/lib/utils'
import {
  getAuditLifecycle,
  getLatestAuditScore,
  getOpenActions,
  getOverdueActions,
  getStoreComplianceSummary,
} from '@/lib/compliance-ui'
import Link from 'next/link'

interface StoreMobileCardProps {
  store: any
}

export function StoreMobileCard({ store }: StoreMobileCardProps) {
  const addressParts = [store.address_line_1, store.city, store.postcode].filter(Boolean)
  const fullAddress = addressParts.join(', ')
  const compactLocation = [store.city, store.postcode].filter(Boolean).join(' ')
  const appleMapsUrl = fullAddress
    ? `https://maps.apple.com/?q=${encodeURIComponent(store.store_name)}&address=${encodeURIComponent(fullAddress)}`
    : null
  const auditLifecycle = getAuditLifecycle(store)
  const latestAuditScore = getLatestAuditScore(store)
  const openActions = getOpenActions(store.actions)
  const overdueActions = getOverdueActions(store.actions)
  const complianceSummary = getStoreComplianceSummary({
    latestAuditScore,
    openActionCount: openActions.length,
    overdueActionCount: overdueActions.length,
    auditLifecycleStatus: auditLifecycle.status,
  })

  return (
    <Card className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-sm transition-shadow hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)] sm:rounded-2xl">
      <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,#fbfdff_0%,#f4f8ff_62%,#eef5f0_100%)] px-2.5 py-2.5 sm:px-4 sm:py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:block">Store Record</p>
            <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-slate-900 sm:mt-1 sm:text-[1.02rem]">{store.store_name}</p>
            {compactLocation ? (
              <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500 sm:hidden">{compactLocation}</p>
            ) : null}
          </div>
          {getDisplayStoreCode(store.store_code) ? (
            <span className="inline-flex rounded-full border border-slate-200 bg-white/95 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 shadow-sm sm:px-2.5 sm:py-1 sm:text-[11px]">
              {getDisplayStoreCode(store.store_code)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 p-2.5 sm:space-y-4 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="hidden text-xs font-medium text-slate-500 sm:block">Compliance summary</p>
            <div className={`inline-flex max-w-full items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide sm:mt-2 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[10px] ${complianceSummary.className}`}>
              <span className={`h-2 w-2 rounded-full ${complianceSummary.dotClassName}`} />
              <span className="truncate">{complianceSummary.label}<span className="hidden sm:inline"> · {complianceSummary.summary}</span></span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            {store.is_active ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 sm:px-2 sm:text-[10px]">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600 sm:px-2 sm:text-[10px]">
                <XCircle className="h-3 w-3" />
                Inactive
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 sm:gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-700 sm:px-2.5 sm:py-1 sm:text-[10px]">
            <ShieldCheck className="h-3 w-3" />
            {typeof latestAuditScore === 'number' ? `${latestAuditScore.toFixed(1)}% audit` : auditLifecycle.label}
          </span>
          <span className="hidden items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 sm:inline-flex">
            <ClipboardList className="h-3 w-3" />
            {auditLifecycle.label}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:px-2.5 sm:py-1 sm:text-[10px] ${
            overdueActions.length > 0
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-blue-200 bg-blue-50 text-blue-700'
          }`}>
            <ClipboardList className="h-3 w-3" />
            {openActions.length} open<span className="hidden sm:inline"> actions</span>
          </span>
        </div>

        {fullAddress && (
          <div className="hidden rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 sm:block sm:rounded-2xl sm:p-3.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Location</p>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <span className="line-clamp-2 flex-1 text-xs text-slate-700 sm:text-sm">{fullAddress}</span>
            </div>
          </div>
        )}

        <div className={`grid gap-1.5 pt-0.5 sm:flex sm:gap-2 sm:pt-1 ${appleMapsUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {appleMapsUrl ? (
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:min-h-[46px] sm:gap-2 sm:rounded-[18px] sm:px-4 sm:text-sm"
            >
              <Navigation className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" />
              Maps
            </a>
          ) : null}
          <Link
            href={`/stores/${store.id}`}
            prefetch={false}
            className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1 rounded-lg bg-[#143457] px-2 text-[11px] font-semibold text-white shadow-[0_12px_24px_rgba(20,52,87,0.18)] transition-colors hover:bg-[#183c65] sm:min-h-[46px] sm:gap-2 sm:rounded-[18px] sm:px-4 sm:text-sm"
          >
            Open
            <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Link>
        </div>
      </div>
    </Card>
  )
}
