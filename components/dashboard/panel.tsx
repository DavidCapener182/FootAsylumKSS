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
    <section className="h-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-5">
        <h2 className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-900 sm:text-sm">
          <Icon className="h-4 w-4 flex-shrink-0 text-slate-500" />
          <span className="truncate">{title}</span>
        </h2>
        {actionHref && actionLabel ? (
          <Link href={actionHref} prefetch={false} className="max-w-[8rem] flex-shrink-0 truncate text-[11px] font-semibold text-blue-600 hover:text-blue-800 sm:text-xs">
            {actionLabel}
          </Link>
        ) : actionLabel ? (
          <span className="max-w-[8rem] flex-shrink-0 truncate rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 sm:text-xs">{actionLabel}</span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function ProgressBar({ value, className }: { value: number; className: string }) {
  const width = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)))

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 sm:h-2">
      <div className={`h-full rounded-full transition-all duration-700 ${className}`} style={{ width: `${width}%` }} />
    </div>
  )
}
