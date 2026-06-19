'use client'

import { useEffect, useState } from 'react'
import { Clock3, Edit3, Undo2, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EquipmentBadges } from '@/components/emp/event-day/equipment-badges'
import { MealTokenButton } from '@/components/emp/event-day/meal-token-button'
import {
  clockVarianceForShift,
  type ClockVarianceType,
  workedDurationLabel,
} from '@/components/emp/event-day/event-day-time-status'
import { formatAppDate, formatAppTime } from '@/lib/utils'
import type {
  EmpEventDayClockEvent,
  EmpEventDayEquipmentAssignment,
  EmpEventDayMealToken,
  EmpEventDayStaffShift,
} from '@/lib/emp/event-day-data'

function shiftTimeParts(start: string | null, end: string | null) {
  if (!start && !end) return { date: 'Shift not set', time: 'No shift time' }
  const date = start ? formatAppDate(start, { weekday: 'short', day: '2-digit', month: 'short' }, '') : ''
  const startTime = start ? formatAppTime(start) : '-'
  const endTime = end ? formatAppTime(end) : '-'
  if (date && startTime === '00:00' && !end) return { date, time: 'No shift time' }
  return {
    date: date || 'No date',
    time: `${startTime} - ${endTime}`,
  }
}

function useWorkedTimeNow(shifts: EmpEventDayStaffShift[]) {
  const [now, setNow] = useState(() => Date.now())
  const hasLiveShift = shifts.some((shift) => shift.clockedInAt && !shift.clockedOutAt)

  useEffect(() => {
    if (!hasLiveShift) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [hasLiveShift])

  return now
}

export function EventDayStaffCardList({
  shifts,
  equipmentByShift,
  clockEvents,
  mealTokens,
  today,
  onIssueMeal,
  onNoShow,
  onReinstate,
  onEditEquipment,
  onAdjustClock,
  onConfirmVariance,
}: {
  shifts: EmpEventDayStaffShift[]
  equipmentByShift: Map<string, EmpEventDayEquipmentAssignment[]>
  clockEvents: EmpEventDayClockEvent[]
  mealTokens: EmpEventDayMealToken[]
  today: string
  onIssueMeal: (shiftId: string) => void
  onNoShow: (shift: EmpEventDayStaffShift) => void
  onReinstate: (shift: EmpEventDayStaffShift) => void
  onEditEquipment: (shift: EmpEventDayStaffShift) => void
  onAdjustClock: (shift: EmpEventDayStaffShift, clockType?: ClockVarianceType) => void
  onConfirmVariance: (shift: EmpEventDayStaffShift, clockType: ClockVarianceType) => void
}) {
  const now = useWorkedTimeNow(shifts)

  return (
    <div className="grid gap-3 lg:hidden">
      {shifts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No staff in this view.</div>
      ) : null}
      {shifts.map((shift) => {
        const equipment = equipmentByShift.get(shift.id) || []
        const scheduled = shiftTimeParts(shift.shiftStart, shift.shiftEnd)
        const worked = workedDurationLabel(shift, now)
        const variances = (['clock_in', 'clock_out'] as ClockVarianceType[])
          .map((clockType) => clockVarianceForShift(shift, clockEvents, clockType))
          .filter(Boolean)
        return (
          <article key={shift.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">{shift.staffName}</h3>
                <p className="text-sm text-slate-500">{shift.agency || 'No agency'}</p>
              </div>
              <Badge variant="outline">{shift.status.replace('_', ' ')}</Badge>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              <div><strong>Position:</strong> {shift.position || '-'} {shift.area ? `· ${shift.area}` : ''}</div>
              <div><strong>Shift:</strong> {scheduled.date} · {scheduled.time}</div>
              <div><strong>Actual:</strong> {shift.clockedInAt ? `In ${formatAppTime(shift.clockedInAt)}` : 'Not in'} {shift.clockedOutAt ? `· Out ${formatAppTime(shift.clockedOutAt)}` : ''}</div>
              {worked ? (
                <div className="inline-flex w-fit rounded-md bg-slate-950 px-2 py-1 font-mono text-xs font-semibold tabular-nums text-white">
                  Worked {worked}
                </div>
              ) : null}
              {variances.map((variance) => variance ? (
                <div
                  key={`${shift.id}-${variance.clockType}`}
                  className={variance.confirmed
                    ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800'
                    : 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800'}
                >
                  <div>{variance.clockType === 'clock_in' ? 'Clock-in' : 'Clock-out'} is {variance.label}</div>
                  {variance.confirmed ? (
                    <div className="mt-1 text-emerald-700">Reason recorded</div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 h-8 border-red-200 bg-white text-red-700 hover:bg-red-50"
                      onClick={() => onConfirmVariance(shift, variance.clockType)}
                    >
                      Confirm reason
                    </Button>
                  )}
                </div>
              ) : null)}
              <EquipmentBadges equipment={equipment} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MealTokenButton
                shiftId={shift.id}
                tokenDate={today}
                mealTokens={mealTokens}
                onIssue={onIssueMeal}
                disabled={shift.status === 'cancelled'}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => onEditEquipment(shift)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Kit
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onAdjustClock(shift, shift.clockedOutAt ? 'clock_out' : 'clock_in')}>
                <Clock3 className="mr-2 h-4 w-4" />
                Clock
              </Button>
              {shift.status === 'scheduled' ? (
                <Button type="button" variant="outline" size="sm" className="border-amber-200 text-amber-700" onClick={() => onNoShow(shift)}>
                  <UserX className="mr-2 h-4 w-4" />
                  Mark no-show
                </Button>
              ) : null}
              {shift.status === 'no_show' ? (
                <Button type="button" variant="outline" size="sm" className="border-emerald-200 text-emerald-700" onClick={() => onReinstate(shift)}>
                  <Undo2 className="mr-2 h-4 w-4" />
                  Reinstate
                </Button>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
