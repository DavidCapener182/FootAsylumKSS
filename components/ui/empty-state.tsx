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
    <div className={cn('rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center', className)}>
      <Icon className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  )
}
