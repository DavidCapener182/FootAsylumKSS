import React, { type ReactNode } from 'react'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DocumentPreview({ title, metadata, toolbar, children, className }: { title: string; metadata?: ReactNode; toolbar?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-slate-100', className)} aria-label={`${title} preview`}>
      <div className="flex min-h-[56px] flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <FileText className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
            {metadata ? <div className="mt-0.5 text-xs text-slate-500">{metadata}</div> : null}
          </div>
        </div>
        {toolbar ? <div className="flex min-h-[44px] flex-wrap items-center gap-2">{toolbar}</div> : null}
      </div>
      <div className="overflow-auto p-3 sm:p-5">{children}</div>
    </section>
  )
}
