import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type WorkspaceMetric = {
  label: string
  value: ReactNode
  detail?: string
  attention?: boolean
}

/** A single responsive summary with explicit labels and real operational values. */
export function WorkspaceMetrics({ items, label = 'Overview', className }: {
  items: WorkspaceMetric[]
  label?: string
  className?: string
}) {
  return (
    <section className={cn('workspace-metrics', className)} aria-label={label}>
      <dl>{items.map((item) => (
        <div key={item.label} className={item.attention ? 'workspace-metric-attention' : undefined}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          {item.detail ? <dd className="workspace-metric-detail">{item.detail}</dd> : null}
        </div>
      ))}</dl>
    </section>
  )
}
