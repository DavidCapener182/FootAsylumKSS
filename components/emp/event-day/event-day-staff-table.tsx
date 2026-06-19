'use client'

import { useEffect, useState } from 'react'
import { Clock3, Edit3, Undo2, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EquipmentBadges } from '@/components/emp/event-day/equipment-badges'
import { MealTokenButton } from '@/components/emp/event-day/meal-token-button'
import {
  clockVarianceForShift,
  type ClockVarianceType,
  workedDurationLabel,
} from '@/components/emp/event-day/event-day-time-status'
import { formatAppDate, formatAppDateTime, formatAppTime } from '@/lib/utils'
import type {
  EmpEventDayClockEvent,
  EmpEventDayEquipmentAssignment,
  EmpEventDayMealToken,
  EmpEventDayStaffShift,
} from '@/lib/emp/event-day-data'

const STATUS_TONES: Record<string, string> = {
  scheduled: 'border-slate-200 text-slate-700',
  clocked_in: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  completed: 'border-blue-200 bg-blue-50 text-blue-700',
  no_show: 'border-amber-200 bg-amber-50 text-amber-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
}

function shiftTimeParts(start: string | null, end: string | null) {
  if (!start && !end) return { date: 'Not set', time: 'No shift time' }
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

export function EventDayStaffTable({
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

  if (shifts.length === 0) {
    return <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No staff in this view.</div>
  }

  return (
    <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead>Actual</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Equipment</TableHead>
            <TableHead>Meal</TableHead>
            <TableHead className="w-[270px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => {
            const equipment = equipmentByShift.get(shift.id) || []
            const scheduled = shiftTimeParts(shift.shiftStart, shift.shiftEnd)
            const worked = workedDurationLabel(shift, now)
            const variances = (['clock_in', 'clock_out'] as ClockVarianceType[])
              .map((clockType) => clockVarianceForShift(shift, clockEvents, clockType))
              .filter(Boolean)
            return (
              <TableRow key={shift.id}>
                <TableCell>
                  <div className="font-medium text-slate-900">{shift.staffName}</div>
                  <div className="text-xs text-slate-500">{shift.agency || 'No agency'}</div>
                </TableCell>
                <TableCell>
                  <div>{shift.position || '-'}</div>
                  <div className="text-xs text-slate-500">{shift.area || '-'}</div>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="font-medium text-slate-900">{scheduled.date}</div>
                  <div className="text-xs font-semibold text-slate-500">{scheduled.time}</div>
                </TableCell>
                <TableCell className="min-w-[220px] text-xs text-slate-500">
                  <div>In: {shift.clockedInAt ? formatAppDateTime(shift.clockedInAt) : '-'}</div>
                  <div>Out: {shift.clockedOutAt ? formatAppDateTime(shift.clockedOutAt) : '-'}</div>
                  {worked ? (
                    <div className="mt-2 inline-flex items-center rounded-md bg-slate-950 px-2 py-1 font-mono text-[11px] font-semibold tabular-nums text-white">
                      Worked {worked}
                    </div>
                  ) : null}
                  {variances.map((variance) => variance ? (
                    <div
                      key={`${shift.id}-${variance.clockType}`}
                      className={variance.confirmed
                        ? 'mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800'
                        : 'mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-800'}
                    >
                      <div>{variance.clockType === 'clock_in' ? 'Clock-in' : 'Clock-out'} is {variance.label}</div>
                      {variance.confirmed ? (
                        <div className="mt-1 text-emerald-700">Reason recorded</div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 border-red-200 bg-white px-2 text-[11px] text-red-700 hover:bg-red-50"
                          onClick={() => onConfirmVariance(shift, variance.clockType)}
                        >
                          Confirm reason
                        </Button>
                      )}
                    </div>
                  ) : null)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_TONES[shift.status]}>{shift.status.replace('_', ' ')}</Badge>
                </TableCell>
                <TableCell><EquipmentBadges equipment={equipment} /></TableCell>
                <TableCell>
                  <MealTokenButton
                    shiftId={shift.id}
                    tokenDate={today}
                    mealTokens={mealTokens}
                    onIssue={onIssueMeal}
                    disabled={shift.status === 'cancelled'}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" size="icon" variant="outline" title="Edit equipment" onClick={() => onEditEquipment(shift)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="outline" title="Adjust clock" onClick={() => onAdjustClock(shift, shift.clockedOutAt ? 'clock_out' : 'clock_in')}>
                      <Clock3 className="h-4 w-4" />
                    </Button>
                    {shift.status === 'scheduled' ? (
                      <Button type="button" size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => onNoShow(shift)}>
                        <UserX className="mr-2 h-4 w-4" />
                        Mark no-show
                      </Button>
                    ) : null}
                    {shift.status === 'no_show' ? (
                      <Button type="button" size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => onReinstate(shift)}>
                        <Undo2 className="mr-2 h-4 w-4" />
                        Reinstate
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
