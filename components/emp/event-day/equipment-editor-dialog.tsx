'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { EmpEventDayEquipmentAssignment, EmpEventDayStaffShift } from '@/lib/emp/event-day-data'

export function EquipmentEditorDialog({
  open,
  planId,
  shift,
  equipment,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  planId: string
  shift: EmpEventDayStaffShift | null
  equipment: EmpEventDayEquipmentAssignment[]
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [assignmentId, setAssignmentId] = useState('')
  const [status, setStatus] = useState('returned')
  const [itemNumber, setItemNumber] = useState('')
  const [reason, setReason] = useState('')
  const [replacementNumber, setReplacementNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const shiftEquipment = useMemo(
    () => equipment.filter((item) => item.staffShiftId === shift?.id),
    [equipment, shift?.id]
  )

  useEffect(() => {
    setAssignmentId(shiftEquipment[0]?.id || '')
    setStatus('returned')
    setItemNumber(shiftEquipment[0]?.itemNumber || '')
    setReason('')
    setReplacementNumber('')
    setError(null)
  }, [open, shiftEquipment])

  async function save() {
    if (!assignmentId) return
    setIsBusy(true)
    setError(null)
    try {
      const selected = shiftEquipment.find((item) => item.id === assignmentId)
      const response = await fetch(`/api/emp/event-day/${planId}/equipment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(status === 'replace'
          ? {
              action: 'replace',
              assignmentId,
              previousStatus: 'replaced',
              replacementItemNumber: replacementNumber,
              replacementNotes: `Replacement for ${selected?.itemNumber || selected?.equipmentType || 'kit'}`,
              reason,
            }
          : {
              assignmentId,
              status,
              itemNumber,
              reason,
            }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Equipment update failed')
      onSaved()
      onOpenChange(false)
    } catch (nextError: any) {
      setError(nextError?.message || 'Equipment update failed')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit equipment</DialogTitle>
          <DialogDescription>{shift ? `Update kit for ${shift.staffName}.` : 'Update issued kit.'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {shiftEquipment.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">No equipment is currently recorded for this staff member.</div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Equipment</Label>
                <Select value={assignmentId} onValueChange={(value) => {
                  const next = shiftEquipment.find((item) => item.id === value)
                  setAssignmentId(value)
                  setItemNumber(next?.itemNumber || '')
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftEquipment.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.equipmentType.replace('_', ' ')} {item.itemNumber ? `· ${item.itemNumber}` : ''} · {item.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="returned">Returned</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="replace">Replace item</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{status === 'replace' ? 'Replacement number' : 'Item number'}</Label>
                  <Input value={status === 'replace' ? replacementNumber : itemNumber} onChange={(event) => {
                    if (status === 'replace') setReplacementNumber(event.target.value)
                    else setItemNumber(event.target.value)
                  }} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for audit history." />
              </div>
            </>
          )}
          {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={!assignmentId || !reason.trim() || isBusy} onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
