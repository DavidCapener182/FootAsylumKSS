import Link from 'next/link'
import type React from 'react'

export function Panel({
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

export function ProgressBar({ value, className }: { value: number; className: string }) {
  const width = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)))

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all duration-700 ${className}`} style={{ width: `${width}%` }} />
    </div>
  )
}
