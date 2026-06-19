'use client'

import { ArrowRight, Search, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type {
  EmpEventDayKioskStaffResult,
  EmpEventDayKioskUnavailableReason,
} from '@/lib/emp/event-day-data'
import { formatAppDate, formatAppTime } from '@/lib/utils'

type LookupStatus = 'idle' | 'too_short' | 'no_match' | 'ambiguous' | 'matched' | 'unavailable'

function shiftLabel(start: string | null, end: string | null) {
  if (!start && !end) return 'Shift not set'
  const date = start ? formatAppDate(start, { weekday: 'short', day: '2-digit', month: 'short' }, '') : ''
  const startTime = start ? formatAppTime(start) : '-'
  const endTime = end ? formatAppTime(end) : '-'
  if (date && startTime === '00:00' && !end) return date
  return date ? `${date} · ${startTime} - ${endTime}` : `${startTime} - ${endTime}`
}

function statusCopy(status: LookupStatus, mode: 'clock-in' | 'clock-out') {
  if (status === 'matched') return ''
  if (status === 'unavailable') return ''
  if (status === 'ambiguous') return 'More than one person still matches.'
  if (status === 'no_match') return mode === 'clock-out' ? 'No clocked-in shift matches yet.' : 'No scheduled shift matches yet.'
  return 'Keep typing your first and last name.'
}

function unavailableCopy(reason: EmpEventDayKioskUnavailableReason | null, mode: 'clock-in' | 'clock-out') {
  if (reason === 'already_clocked_in') return 'This shift is already clocked in. Choose Clock Out to finish the shift.'
  if (reason === 'already_completed') return 'This shift has already been clocked out. Ask an admin if this needs changing.'
  if (reason === 'marked_no_show') return 'This shift is marked no-show. Ask an admin to reinstate it first.'
  if (reason === 'not_clocked_in') return mode === 'clock-out'
    ? 'This shift has not been clocked in yet.'
    : 'This shift is not available for clock-in.'
  return 'This shift is not available for this action.'
}

export function KioskStaffSearch({
  mode,
  query,
  staff,
  unavailableStaff,
  unavailableReason,
  lookupStatus,
  isBusy,
  onQueryChange,
  onConfirm,
}: {
  mode: 'clock-in' | 'clock-out'
  query: string
  staff: EmpEventDayKioskStaffResult | null
  unavailableStaff: EmpEventDayKioskStaffResult | null
  unavailableReason: EmpEventDayKioskUnavailableReason | null
  lookupStatus: LookupStatus
  isBusy: boolean
  onQueryChange: (query: string) => void
  onConfirm: () => void
}) {
  const helper = statusCopy(lookupStatus, mode)
  return (
    <section className="mx-auto max-w-4xl">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
              {mode === 'clock-in' ? 'Clock in' : 'Clock out'}
            </p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-4xl">Find your shift</h2>
          </div>
        </div>

        <Input
          autoFocus
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && staff) onConfirm()
          }}
          placeholder="First name and surname"
          className="h-20 rounded-lg border-2 border-slate-200 bg-slate-50 px-6 text-2xl font-bold shadow-inner focus-visible:border-emerald-600 focus-visible:ring-emerald-100"
        />

        <div className="mt-5 min-h-[210px]">
          {staff ? (
            <button
              type="button"
              onClick={onConfirm}
              className="w-full rounded-lg border-2 border-emerald-500 bg-emerald-50 p-5 text-left shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-100"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-700 text-white">
                    <UserCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-slate-950">{staff.staffName}</div>
                    <div className="mt-1 text-base font-semibold text-slate-600">
                      {[staff.agency, staff.position, staff.area].filter(Boolean).join(' · ') || 'Shift details'}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-white px-4 py-3 text-base font-black text-slate-900 shadow-sm">
                  {shiftLabel(staff.shiftStart, staff.shiftEnd)}
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-lg bg-emerald-700 px-5 py-4 text-lg font-black text-white">
                <span>This is me</span>
                <ArrowRight className="h-6 w-6" />
              </div>
            </button>
          ) : unavailableStaff ? (
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-5 text-left shadow-lg shadow-amber-900/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-amber-600 text-white">
                    <UserCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-slate-950">{unavailableStaff.staffName}</div>
                    <div className="mt-1 text-base font-semibold text-slate-600">
                      {[unavailableStaff.agency, unavailableStaff.position, unavailableStaff.area].filter(Boolean).join(' · ') || 'Shift details'}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-white px-4 py-3 text-base font-black text-slate-900 shadow-sm">
                  {shiftLabel(unavailableStaff.shiftStart, unavailableStaff.shiftEnd)}
                </div>
              </div>
              <div className="mt-5 rounded-lg bg-amber-100 px-5 py-4 text-lg font-black text-amber-950">
                {unavailableCopy(unavailableReason, mode)}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[210px] items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-6 text-center">
              <p className="text-xl font-bold text-slate-500">{isBusy ? 'Checking...' : helper}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
