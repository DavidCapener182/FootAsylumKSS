import { BadgeCheck, Clock, Headphones, Radio, Utensils, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { EmpEventDayAdminData } from '@/lib/emp/event-day-data'

const KPI_CONFIG = [
  { key: 'scheduled', label: 'Scheduled', icon: Users, tone: 'text-slate-700' },
  { key: 'clockedIn', label: 'Clocked in', icon: Clock, tone: 'text-emerald-700' },
  { key: 'completed', label: 'Completed', icon: BadgeCheck, tone: 'text-blue-700' },
  { key: 'activeRadios', label: 'Radios out', icon: Radio, tone: 'text-amber-700', subKey: 'radiosAvailable', subLabel: 'left' },
  { key: 'earpiecesOut', label: 'Earpieces out', icon: Headphones, tone: 'text-blue-700', subKey: 'earpiecesAvailable', subLabel: 'left' },
  { key: 'mealTokensToday', label: 'Meals issued', icon: Utensils, tone: 'text-fuchsia-700', subKey: 'mealTokensRemaining', subLabel: 'left' },
] as const

export function EventDayKpiCards({ metrics }: { metrics: EmpEventDayAdminData['metrics'] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {KPI_CONFIG.map((item) => {
        const Icon = item.icon
        const subValue = 'subKey' in item ? metrics[item.subKey] : null
        return (
          <Card key={item.key} className="rounded-lg">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{metrics[item.key]}</p>
                {'subLabel' in item ? (
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {subValue === null ? 'Stock not set' : `${subValue} ${item.subLabel}`}
                  </p>
                ) : null}
              </div>
              <Icon className={`h-6 w-6 ${item.tone}`} />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
