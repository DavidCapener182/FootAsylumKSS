'use client'

import type {
  EmpEventDayClockEvent,
  EmpEventDayStaffShift,
} from '@/lib/emp/event-day-data'

export type ClockVarianceType = 'clock_in' | 'clock_out'

const VARIANCE_TOLERANCE_MS = 60_000

function parseDate(value: string | null) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatVarianceDuration(ms: number) {
  const totalMinutes = Math.max(1, Math.round(Math.abs(ms) / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return `${minutes}m`
  if (!minutes) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function workedDurationLabel(shift: EmpEventDayStaffShift, now: number) {
  const start = parseDate(shift.clockedInAt)
  if (!start) return null
  const end = parseDate(shift.clockedOutAt) || now
  return formatDuration(end - start)
}

export function hasConfirmedClockVariance(
  shift: EmpEventDayStaffShift,
  clockEvents: EmpEventDayClockEvent[],
  clockType: ClockVarianceType
) {
  return clockEvents.some((event) => {
    const metadata = event.metadata as { clockType?: unknown } | null
    return event.staffShiftId === shift.id
      && event.eventType === 'admin_adjustment'
      && event.reason?.trim()
      && metadata?.clockType === clockType
  })
}

export function clockVarianceForShift(
  shift: EmpEventDayStaffShift,
  clockEvents: EmpEventDayClockEvent[],
  clockType: ClockVarianceType
) {
  const scheduled = parseDate(clockType === 'clock_in' ? shift.shiftStart : shift.shiftEnd)
  const actual = parseDate(clockType === 'clock_in' ? shift.clockedInAt : shift.clockedOutAt)
  if (!scheduled || !actual) return null

  const diff = actual - scheduled
  if (Math.abs(diff) < VARIANCE_TOLERANCE_MS) return null

  const confirmed = hasConfirmedClockVariance(shift, clockEvents, clockType)
  const direction = diff > 0
    ? clockType === 'clock_in' ? 'late' : 'late leaving'
    : clockType === 'clock_in' ? 'early' : 'early leaving'

  return {
    clockType,
    confirmed,
    label: `${direction} by ${formatVarianceDuration(diff)}`,
  }
}
