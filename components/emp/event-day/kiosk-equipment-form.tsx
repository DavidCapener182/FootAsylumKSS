'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type KioskEquipmentState = {
  hasRadio: boolean
  radioNumber: string
  hasHiVis: boolean
  hiVisDetails: string
  hasEarpiece: boolean
  hasClicker: boolean
  clickerNumber: string
  hasSearchWand: boolean
  searchWandNumber: string
  otherKit: string
  notes: string
}

export const emptyKioskEquipmentState: KioskEquipmentState = {
  hasRadio: false,
  radioNumber: '',
  hasHiVis: false,
  hiVisDetails: '',
  hasEarpiece: false,
  hasClicker: false,
  clickerNumber: '',
  hasSearchWand: false,
  searchWandNumber: '',
  otherKit: '',
  notes: '',
}

function Toggle({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      className={active ? 'h-14 bg-emerald-700 text-lg font-black hover:bg-emerald-800' : 'h-14 text-lg font-black'}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}

export function KioskEquipmentForm({
  value,
  error,
  isBusy,
  onChange,
  onSubmit,
}: {
  value: KioskEquipmentState
  error: string | null
  isBusy: boolean
  onChange: (value: KioskEquipmentState) => void
  onSubmit: () => void
}) {
  const set = (patch: Partial<KioskEquipmentState>) => onChange({ ...value, ...patch })
  const missingRadioNumber = value.hasRadio && !value.radioNumber.trim()

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 sm:p-7">
      <div className="rounded-lg bg-[#071018] p-5 text-white">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">Clock in</p>
        <h2 className="mt-2 text-4xl font-black">Equipment issued</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-base font-black">Radio</Label>
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={value.hasRadio} label="Yes" onClick={() => set({ hasRadio: true })} />
            <Toggle active={!value.hasRadio} label="No" onClick={() => set({ hasRadio: false, radioNumber: '' })} />
          </div>
          {value.hasRadio ? (
            <div className="space-y-1">
              <Input
                className="h-14 rounded-lg text-lg font-bold"
                placeholder="Required radio number"
                value={value.radioNumber}
                aria-invalid={missingRadioNumber}
                onChange={(event) => set({ radioNumber: event.target.value })}
              />
              {missingRadioNumber ? <p className="text-sm font-medium text-red-700">Radio number is required.</p> : null}
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label className="text-base font-black">Hi-vis</Label>
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={value.hasHiVis} label="Yes" onClick={() => set({ hasHiVis: true })} />
            <Toggle active={!value.hasHiVis} label="No" onClick={() => set({ hasHiVis: false, hiVisDetails: '' })} />
          </div>
          {value.hasHiVis ? <Input className="h-14 rounded-lg text-lg font-bold" placeholder="Colour / type / size" value={value.hiVisDetails} onChange={(event) => set({ hiVisDetails: event.target.value })} /> : null}
        </div>
        <div className="space-y-2">
          <Label className="text-base font-black">Earpiece</Label>
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={value.hasEarpiece} label="Yes" onClick={() => set({ hasEarpiece: true })} />
            <Toggle active={!value.hasEarpiece} label="No" onClick={() => set({ hasEarpiece: false })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-base font-black">Clicker</Label>
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={value.hasClicker} label="Yes" onClick={() => set({ hasClicker: true })} />
            <Toggle active={!value.hasClicker} label="No" onClick={() => set({ hasClicker: false, clickerNumber: '' })} />
          </div>
          {value.hasClicker ? <Input className="h-14 rounded-lg text-lg font-bold" placeholder="Number / notes" value={value.clickerNumber} onChange={(event) => set({ clickerNumber: event.target.value })} /> : null}
        </div>
        <div className="space-y-2">
          <Label className="text-base font-black">Search wand</Label>
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={value.hasSearchWand} label="Yes" onClick={() => set({ hasSearchWand: true })} />
            <Toggle active={!value.hasSearchWand} label="No" onClick={() => set({ hasSearchWand: false, searchWandNumber: '' })} />
          </div>
          {value.hasSearchWand ? <Input className="h-14 rounded-lg text-lg font-bold" placeholder="Number / notes" value={value.searchWandNumber} onChange={(event) => set({ searchWandNumber: event.target.value })} /> : null}
        </div>
        <div className="space-y-2">
          <Label className="text-base font-black">Other kit</Label>
          <Input className="h-14 rounded-lg text-lg font-bold" placeholder="Other issued kit" value={value.otherKit} onChange={(event) => set({ otherKit: event.target.value })} />
        </div>
      </div>
      <Textarea className="min-h-24 rounded-lg text-lg" placeholder="Any notes" value={value.notes} onChange={(event) => set({ notes: event.target.value })} />
      {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}
      <Button type="button" className="h-16 w-full bg-emerald-700 text-xl font-black hover:bg-emerald-800" disabled={isBusy || missingRadioNumber} onClick={onSubmit}>
        {missingRadioNumber ? 'Enter radio number to clock in' : 'Clock In'}
      </Button>
    </div>
  )
}
