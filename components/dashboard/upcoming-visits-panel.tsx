import { Calendar, CalendarDays } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { normaliseUpcomingVisits } from './dashboard-utils'
import { Panel } from './panel'

export function UpcomingVisitsPanel({ routes }: { routes: Array<Record<string, unknown>> }) {
  const visits = normaliseUpcomingVisits(routes).slice(0, 4)

  return (
    <Panel title="Upcoming Visits" icon={CalendarDays} actionHref="/calendar" actionLabel="View calendar">
      <p className="mb-3 hidden text-xs text-slate-500 sm:block">Future planned route groups only; past planned dates are excluded.</p>
      {visits.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No upcoming visits planned" description="Plan compliance visits from route planning." />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-3">
          {visits.map((visit) => (
            <div key={visit.id} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 sm:p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900 sm:text-base">{visit.store}</p>
                  <p className="mt-1 text-xs text-slate-500">{visit.region}</p>
                </div>
                <StatusBadge label={visit.visitType} tone="info" className="flex-shrink-0 px-1.5 text-[9px] sm:px-2 sm:text-[11px]" />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 sm:mt-3 sm:text-xs">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{visit.date}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
