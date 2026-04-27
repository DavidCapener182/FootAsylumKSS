import { Calendar, CalendarDays } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { normaliseUpcomingVisits } from './dashboard-utils'
import { Panel } from './panel'

export function UpcomingVisitsPanel({ routes }: { routes: Array<Record<string, unknown>> }) {
  const visits = normaliseUpcomingVisits(routes).slice(0, 4)

  return (
    <Panel title="Upcoming Visits" icon={CalendarDays} actionHref="/calendar" actionLabel="View calendar">
      {visits.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No upcoming visits planned" description="Plan compliance visits from route planning." />
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <div key={visit.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{visit.store}</p>
                  <p className="mt-1 text-xs text-slate-500">{visit.region}</p>
                </div>
                <StatusBadge label={visit.visitType} tone="info" />
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {visit.date}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
