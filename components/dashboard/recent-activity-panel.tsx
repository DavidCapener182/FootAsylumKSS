import { Activity } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatActivityItem, getActivityIcon, getActivityTone } from './dashboard-utils'
import { Panel } from './panel'

export function RecentActivityPanel({ activity }: { activity: Array<Record<string, unknown>> }) {
  const items = activity.map(formatActivityItem).slice(0, 4)

  return (
    <Panel title="Recent Activity" icon={Activity} actionHref="/activity" actionLabel="View all activity">
      {items.length === 0 ? (
        <EmptyState icon={Activity} title="No recent activity" description="Completed audits, FRA updates and actions will appear here." />
      ) : (
        <div className="space-y-2.5 sm:space-y-4">
          {items.map((item) => {
            const Icon = getActivityIcon(item.type)
            return (
              <div key={item.id} className="flex gap-2.5 sm:gap-3">
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 sm:h-8 sm:w-8">
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-slate-500">{item.time}</p>
                    <StatusBadge label={item.type} tone={getActivityTone(item.type)} className="flex-shrink-0 px-1.5 text-[9px] sm:px-2 sm:text-[11px]" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-4 text-slate-800 sm:text-sm sm:leading-5">{item.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
