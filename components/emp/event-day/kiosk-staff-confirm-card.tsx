'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  verificationCode,
  error,
  isBusy,
  onBack,
  onVerificationCodeChange,
  onContinue,
}: {
  staff: EmpEventDayKioskStaffResult
  actionLabel: string
  verificationCode: string
  error: string | null
  isBusy: boolean
  onBack: () => void
  onVerificationCodeChange: (value: string) => void
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
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <Label htmlFor="worker-verification-code" className="text-base font-black text-slate-900">
          Verify it is you
        </Label>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          Enter the final 4 digits of your mobile number or SIA badge.
        </p>
        <Input
          id="worker-verification-code"
          autoFocus
          autoComplete="off"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          value={verificationCode}
          onChange={(event) => onVerificationCodeChange(event.target.value.replace(/\D/g, '').slice(0, 4))}
          className="mt-3 h-16 max-w-xs rounded-lg bg-white text-center text-2xl font-black tracking-[0.35em]"
          aria-describedby="worker-verification-help"
        />
        <p id="worker-verification-help" className="mt-2 text-xs font-semibold text-slate-500">
          If neither detail is held on your roster record, ask an event supervisor to help.
        </p>
      </div>
      {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}
      <Button
        type="button"
        className="h-16 w-full bg-emerald-700 text-xl font-black hover:bg-emerald-800"
        disabled={isBusy || verificationCode.length !== 4}
        onClick={onContinue}
      >
        {actionLabel}
      </Button>
    </div>
  )
}
