'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EmpEventDayKioskStaffResult } from '@/lib/emp/event-day-data'
import { formatAppDate, formatAppTime } from '@/lib/utils'

function shiftLabel(start: string | null, end: string | null) {
  if (!start && !end) return 'Shift not set'
  const date = start ? formatAppDate(start, { weekday: 'short', day: '2-digit', month: 'short' }, '') : ''
  const startTime = start ? formatAppTime(start) : '-'
  const endTime = end ? formatAppTime(end) : '-'
  if (date && startTime === '00:00' && !end) return date
  return date ? `${date} · ${startTime} - ${endTime}` : `${startTime} - ${endTime}`
}

export function KioskStaffConfirmCard({
  staff,
  actionLabel,
  onBack,
  onContinue,
}: {
  staff: EmpEventDayKioskStaffResult
  actionLabel: string
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 sm:p-7">
      <Button type="button" variant="outline" className="h-12 bg-white" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="rounded-lg bg-[#071018] p-6 text-white">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">Confirm staff</p>
        <h2 className="mt-2 text-4xl font-black text-white">{staff.staffName}</h2>
        <p className="mt-1 text-lg font-semibold text-slate-300">{staff.agency || 'No agency'}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Shift</div>
          <div className="mt-2 text-lg font-black text-slate-900">{shiftLabel(staff.shiftStart, staff.shiftEnd)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Position</div>
          <div className="mt-2 text-lg font-black text-slate-900">{staff.position || '-'}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Area</div>
          <div className="mt-2 text-lg font-black text-slate-900">{staff.area || '-'}</div>
        </div>
      </div>
      <Button type="button" className="h-16 w-full bg-emerald-700 text-xl font-black hover:bg-emerald-800" onClick={onContinue}>
        {actionLabel}
      </Button>
    </div>
  )
}
