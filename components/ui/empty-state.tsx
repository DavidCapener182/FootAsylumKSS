import type React from 'react'

import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-slate-50/70 px-6 py-10 text-center', className)}>
      <Icon className="mx-auto h-10 w-10 rounded-xl bg-white p-2 text-slate-500 shadow-sm" />
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  )
}
