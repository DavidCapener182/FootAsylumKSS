import { BadgeCheck, Clock, Headphones, Radio, Utensils, Users } from 'lucide-react'
import { WorkspaceMetrics } from '@/components/product/workspace-metrics'
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
  return <WorkspaceMetrics label="Event day overview" items={KPI_CONFIG.map(item => ({
    label: item.label,
    value: metrics[item.key],
    detail: 'subKey' in item ? (metrics[item.subKey] === null ? 'Stock not set' : `${metrics[item.subKey]} ${item.subLabel}`) : undefined,
  }))} />
}
