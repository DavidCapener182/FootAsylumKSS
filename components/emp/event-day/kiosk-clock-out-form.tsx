'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { EmpEventDayKioskClockedInStaffResult } from '@/lib/emp/event-day-data'

export function KioskClockOutForm({
  staff,
  error,
  isBusy,
  onSubmit,
}: {
  staff: EmpEventDayKioskClockedInStaffResult
  error: string | null
  isBusy: boolean
  onSubmit: (input: {
    returns: Array<{ assignmentId: string; status: string; notes?: string }>
    notes: string
  }) => void
}) {
  const initialStatuses = useMemo(
    () => Object.fromEntries(staff.equipmentAssignments.map((item) => [item.id, 'returned'])),
    [staff.equipmentAssignments]
  )
  const [statuses, setStatuses] = useState<Record<string, string>>(initialStatuses)
  const [notes, setNotes] = useState('')

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 sm:p-7">
      <div className="rounded-lg bg-[#071018] p-5 text-white">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">Clock out</p>
        <h2 className="mt-2 text-4xl font-black">Return equipment</h2>
        <p className="mt-1 text-lg font-semibold text-slate-300">{staff.staffName}</p>
      </div>
      {staff.equipmentAssignments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">No issued equipment recorded.</div>
      ) : (
        <div className="grid gap-3">
          {staff.equipmentAssignments.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_220px] md:items-center">
              <div>
                <div className="text-xl font-black capitalize text-slate-900">{item.equipmentType.replace('_', ' ')} {item.itemNumber || ''}</div>
                <div className="text-sm font-semibold text-slate-500">{item.notes || 'No notes'}</div>
              </div>
              <Select
                value={statuses[item.id] || 'returned'}
                onValueChange={(value) => setStatuses({ ...statuses, [item.id]: value })}
              >
                <SelectTrigger className="h-12 bg-white font-black"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <Label className="font-black">Faults, damage, lost kit, or notes</Label>
        <Textarea className="min-h-24 rounded-lg text-lg" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}
      <Button
        type="button"
        className="h-16 w-full bg-emerald-700 text-xl font-black hover:bg-emerald-800"
        disabled={isBusy}
        onClick={() => onSubmit({
          returns: staff.equipmentAssignments.map((item) => ({
            assignmentId: item.id,
            status: statuses[item.id] || 'returned',
            notes,
          })),
          notes,
        })}
      >
        Clock Out
      </Button>
    </div>
  )
}
