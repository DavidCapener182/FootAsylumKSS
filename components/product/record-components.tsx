import React, { type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  CircleDot,
  CloudOff,
  UploadCloud,
  LockKeyhole,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageFilters({
  children,
  actions,
  label = 'Page filters',
  className,
}: {
  children: ReactNode
  actions?: ReactNode
  label?: string
  className?: string
}) {
  return (
    <section aria-label={label} className={cn('border-y border-slate-200 bg-white p-4 sm:rounded-2xl sm:border', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
        {actions ? <div className="flex min-h-[44px] flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  )
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown'

const riskPresentation: Record<RiskLevel, { label: string; icon: typeof CircleDot; classes: string }> = {
  low: { label: 'Low risk', icon: CheckCircle2, classes: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  medium: { label: 'Medium risk', icon: CircleDot, classes: 'border-amber-200 bg-amber-50 text-amber-800' },
  high: { label: 'High risk', icon: AlertTriangle, classes: 'border-orange-200 bg-orange-50 text-orange-900' },
  critical: { label: 'Critical risk', icon: Ban, classes: 'border-red-300 bg-red-50 text-red-900' },
  unknown: { label: 'Risk not assessed', icon: CircleDot, classes: 'border-slate-200 bg-slate-100 text-slate-700' },
}

export function RiskBadge({ level, label, className }: { level: RiskLevel; label?: string; className?: string }) {
  const presentation = riskPresentation[level]
  const Icon = presentation.icon
  return (
    <span className={cn('inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', presentation.classes, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label || presentation.label}
    </span>
  )
}

export function TrendCard({
  label,
  value,
  change,
  changeLabel = 'from previous period',
  direction,
  className,
}: {
  label: string
  value: ReactNode
  change?: string
  changeLabel?: string
  direction?: 'up' | 'down' | 'flat'
  className?: string
}) {
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : ArrowRight
  return (
    <article className={cn('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      {change ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-600">
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className="font-semibold text-slate-800">{change}</span> {changeLabel}
        </p>
      ) : null}
    </article>
  )
}

export function MobileRecordCard({
  eyebrow,
  title,
  status,
  summary,
  metadata,
  actions,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  status?: ReactNode
  summary?: ReactNode
  metadata?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <article className={cn('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{eyebrow}</p> : null}
          <h2 className="mt-1 text-base font-semibold leading-6 text-slate-950">{title}</h2>
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
      {summary ? <div className="mt-3 text-sm leading-6 text-slate-700">{summary}</div> : null}
      {metadata ? <div className="mt-3 text-xs leading-5 text-slate-500">{metadata}</div> : null}
      {actions ? <div className="mt-4 flex min-h-[44px] flex-wrap items-center gap-2 border-t border-slate-100 pt-3">{actions}</div> : null}
    </article>
  )
}

export type TimelineItem = {
  id: string
  title: string
  timestamp: string
  description?: ReactNode
  actor?: string
  icon?: ReactNode
}

export function RecordTimeline({ items, emptyLabel = 'No activity recorded.' }: { items: TimelineItem[]; emptyLabel?: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">{emptyLabel}</p>

  return (
    <ol className="space-y-0" aria-label="Record timeline">
      {items.map((item, index) => (
        <li key={item.id} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
          {index < items.length - 1 ? <span className="absolute bottom-0 left-[13px] top-7 w-px bg-slate-200" aria-hidden="true" /> : null}
          <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
            {item.icon || <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {item.actor ? `${item.actor} · ` : ''}{item.timestamp}
            </p>
            {item.description ? <div className="mt-2 text-sm leading-6 text-slate-700">{item.description}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function ErrorState({ title = 'Something went wrong', description, retry }: { title?: string; description: string; retry?: ReactNode }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950">
      <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-red-800">{description}</p>
      {retry ? <div className="mt-4 flex min-h-[44px] items-center">{retry}</div> : null}
    </div>
  )
}

export function PermissionState({ title = 'Access restricted', description }: { title?: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-900">
      <LockKeyhole className="h-6 w-6 text-slate-500" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}

export function LoadingSkeleton({ rows = 3, label = 'Loading records' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl border border-slate-100 bg-slate-100" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function StickyMobileActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none', className)}>
      <div className="mx-auto flex max-w-lg min-h-[44px] items-center gap-2">{children}</div>
    </div>
  )
}

export function OfflineSyncIndicator({ state, pendingCount = 0 }: { state: 'online' | 'offline' | 'syncing'; pendingCount?: number }) {
  const Icon = state === 'offline' ? CloudOff : state === 'syncing' ? RefreshCw : UploadCloud
  const label = state === 'offline'
    ? `Offline${pendingCount ? ` · ${pendingCount} saved on this device` : ''}`
    : state === 'syncing'
      ? `Syncing${pendingCount ? ` ${pendingCount} item${pendingCount === 1 ? '' : 's'}` : ''}`
      : pendingCount
        ? `${pendingCount} item${pendingCount === 1 ? '' : 's'} waiting to sync`
        : 'Saved to platform'

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', state === 'offline' ? 'border-amber-200 bg-amber-50 text-amber-900' : state === 'syncing' || pendingCount ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900')}>
      <Icon className={cn('h-3.5 w-3.5', state === 'syncing' && 'animate-spin')} aria-hidden="true" />
      {label}
    </span>
  )
}
