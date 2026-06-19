import { Badge } from '@/components/ui/badge'
import type { EmpEventDayEquipmentAssignment } from '@/lib/emp/event-day-data'

const EQUIPMENT_LABELS: Record<string, string> = {
  radio: 'Radio',
  hi_vis: 'Hi-vis',
  earpiece: 'Earpiece',
  clicker: 'Clicker',
  search_wand: 'Wand',
  other: 'Other',
}

export function EquipmentBadges({ equipment }: { equipment: EmpEventDayEquipmentAssignment[] }) {
  if (equipment.length === 0) {
    return <span className="text-xs text-slate-400">No kit</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {equipment.map((item) => (
        <Badge
          key={item.id}
          variant={item.status === 'issued' ? 'default' : 'secondary'}
          className={item.status === 'issued' ? 'bg-emerald-700' : undefined}
        >
          {EQUIPMENT_LABELS[item.equipmentType] || item.equipmentType}
          {item.itemNumber ? ` ${item.itemNumber}` : ''}
          {item.status !== 'issued' ? ` · ${item.status}` : ''}
        </Badge>
      ))}
    </div>
  )
}
