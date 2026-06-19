'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ClockVarianceType } from '@/components/emp/event-day/event-day-time-status'
import type { EmpEventDayStaffShift } from '@/lib/emp/event-day-data'

function toDateTimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function defaultEventTime(shift: EmpEventDayStaffShift | null, clockType: ClockVarianceType) {
  if (!shift) return ''
  if (clockType === 'clock_in') return toDateTimeLocal(shift.clockedInAt || shift.shiftStart || null)
  return toDateTimeLocal(shift.clockedOutAt || shift.shiftEnd || null)
}

export function ClockAdjustmentDialog({
  open,
  planId,
  shift,
  initialClockType = 'clock_in',
  intent = 'adjust',
  onOpenChange,
  onSaved,
}: {
  open: boolean
  planId: string
  shift: EmpEventDayStaffShift | null
  initialClockType?: ClockVarianceType
  intent?: 'adjust' | 'confirm_variance'
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [clockType, setClockType] = useState<ClockVarianceType>('clock_in')
  const [eventTime, setEventTime] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    setClockType(initialClockType)
    setEventTime(defaultEventTime(shift || null, initialClockType))
    setReason('')
    setError(null)
  }, [initialClockType, open, shift])

  async function save() {
    if (!shift) return
    setIsBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/emp/event-day/${planId}/clock-adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffShiftId: shift.id,
          clockType,
          eventTime,
          reason,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Clock adjustment failed')
      onSaved()
      onOpenChange(false)
    } catch (nextError: any) {
      setError(nextError?.message || 'Clock adjustment failed')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{intent === 'confirm_variance' ? 'Confirm time difference' : 'Adjust clock time'}</DialogTitle>
          <DialogDescription>
            {shift
              ? intent === 'confirm_variance'
                ? `Record the reason ${shift.staffName}'s time differs from the scheduled shift. The recorded time stays unchanged unless you edit it here.`
                : `Record an audited adjustment for ${shift.staffName}.`
              : 'Record an audited adjustment.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Clock field</Label>
              <Select value={clockType} onValueChange={(value) => setClockType(value as 'clock_in' | 'clock_out')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clock_in">Clock in</SelectItem>
                  <SelectItem value="clock_out">Clock out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{intent === 'confirm_variance' ? 'Recorded time' : 'Time'}</Label>
              <Input type="datetime-local" value={eventTime} onChange={(event) => setEventTime(event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{intent === 'confirm_variance' ? 'Reason for time difference' : 'Adjustment reason'}</Label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={intent === 'confirm_variance' ? 'Required. Explain why this person started or finished away from the scheduled time.' : 'Required. Explain the correction.'}
            />
          </div>
          {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={!eventTime || !reason.trim() || isBusy} onClick={save}>
            {intent === 'confirm_variance' ? 'Record reason' : 'Save adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
