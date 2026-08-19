import React, { type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Breadcrumb = {
  label: string
  href?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs = [],
  primaryAction,
  secondaryActions,
  className,
}: {
  title: string
  description?: string
  eyebrow?: string
  breadcrumbs?: Breadcrumb[]
  primaryAction?: ReactNode
  secondaryActions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('border-b border-slate-200 bg-white px-4 py-5 sm:rounded-2xl sm:border sm:p-6 sm:shadow-sm', className)}>
      {breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-3 overflow-x-auto">
          <ol className="flex min-w-max items-center gap-1 text-xs text-slate-500">
            {breadcrumbs.map((item, index) => (
              <li key={`${item.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                {item.href ? (
                  <Link href={item.href} className="rounded px-1 py-1 font-medium hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="px-1 py-1 text-slate-700">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p> : null}
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {primaryAction || secondaryActions ? (
          <div className="flex min-h-[44px] shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {secondaryActions}
            {primaryAction}
          </div>
        ) : null}
      </div>
    </header>
  )
}
