'use client'

import { useEffect, useMemo, useState } from 'react'
import { Headphones, PackageCheck, Plus, Radio, Utensils } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type {
  EmpEventDayEquipmentStock,
  EmpEventDayStockSummary,
} from '@/lib/emp/event-day-data'
import type { EmpEventEquipmentType } from '@/lib/emp/event-day-schema'

const EQUIPMENT_OPTIONS: Array<{ value: EmpEventEquipmentType; label: string }> = [
  { value: 'radio', label: 'Radio' },
  { value: 'earpiece', label: 'Earpiece' },
  { value: 'hi_vis', label: 'Hi-vis' },
  { value: 'clicker', label: 'Clicker' },
  { value: 'search_wand', label: 'Search wand' },
  { value: 'other', label: 'Other kit' },
]

function formatStockValue(value: number | null) {
  return value === null ? 'Not set' : String(value)
}

function stockStatus(summary: EmpEventDayStockSummary, type: EmpEventEquipmentType) {
  return summary.equipment.find((item) => item.equipmentType === type)
}

export function EventDayStockControls({
  planId,
  equipmentStock,
  stockSummary,
  mealTokenTotal,
  onSaved,
}: {
  planId: string
  equipmentStock: EmpEventDayEquipmentStock[]
  stockSummary: EmpEventDayStockSummary
  mealTokenTotal: number | null
  onSaved: () => Promise<void> | void
}) {
  const [equipmentType, setEquipmentType] = useState<EmpEventEquipmentType>('radio')
  const [itemNumbers, setItemNumbers] = useState('')
  const [quantityTotal, setQuantityTotal] = useState('1')
  const [notes, setNotes] = useState('')
  const [mealTotal, setMealTotal] = useState(mealTokenTotal === null ? '' : String(mealTokenTotal))
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const activeStock = useMemo(() => equipmentStock.filter((item) => item.active), [equipmentStock])
  const inactiveStock = useMemo(() => equipmentStock.filter((item) => !item.active), [equipmentStock])

  async function saveStock() {
    setIsBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/emp/event-day/${planId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentType,
          itemNumbers,
          quantityTotal: Number.parseInt(quantityTotal || '0', 10),
          notes,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Stock update failed')
      setItemNumbers('')
      setQuantityTotal('1')
      setNotes('')
      await onSaved()
    } catch (nextError: any) {
      setError(nextError?.message || 'Stock update failed')
    } finally {
      setIsBusy(false)
    }
  }

  async function saveMealTokenTotal() {
    setIsBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/emp/event-day/${planId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealTokenTotal: mealTotal.trim() ? Number.parseInt(mealTotal, 10) : null,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Meal token stock update failed')
      await onSaved()
    } catch (nextError: any) {
      setError(nextError?.message || 'Meal token stock update failed')
    } finally {
      setIsBusy(false)
    }
  }

  async function retireStock(stockId: string) {
    setIsBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/emp/event-day/${planId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockId, active: false }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Stock update failed')
      await onSaved()
    } catch (nextError: any) {
      setError(nextError?.message || 'Stock update failed')
    } finally {
      setIsBusy(false)
    }
  }

  const radioStock = stockStatus(stockSummary, 'radio')
  const earpieceStock = stockStatus(stockSummary, 'earpiece')

  useEffect(() => {
    setMealTotal(mealTokenTotal === null ? '' : String(mealTokenTotal))
  }, [mealTokenTotal])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-lg">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Radios left</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{formatStockValue(radioStock?.available ?? null)}</p>
              <p className="mt-1 text-xs text-slate-500">{radioStock?.out || 0} out / {formatStockValue(radioStock?.total ?? null)} total</p>
            </div>
            <Radio className="h-7 w-7 text-amber-700" />
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Earpieces left</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{formatStockValue(earpieceStock?.available ?? null)}</p>
              <p className="mt-1 text-xs text-slate-500">{earpieceStock?.out || 0} out / {formatStockValue(earpieceStock?.total ?? null)} total</p>
            </div>
            <Headphones className="h-7 w-7 text-blue-700" />
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meals left</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{formatStockValue(stockSummary.mealTokens.available)}</p>
              <p className="mt-1 text-xs text-slate-500">{stockSummary.mealTokens.issued} issued / {formatStockValue(stockSummary.mealTokens.total)} total</p>
            </div>
            <Utensils className="h-7 w-7 text-fuchsia-700" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Equipment Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[180px_120px_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={equipmentType} onValueChange={(value) => setEquipmentType(value as EmpEventEquipmentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input inputMode="numeric" value={quantityTotal} onChange={(event) => setQuantityTotal(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Numbers / codes</Label>
                <Textarea
                  className="min-h-24"
                  value={itemNumbers}
                  onChange={(event) => setItemNumbers(event.target.value)}
                  placeholder="Optional. Enter radio codes one per line or comma separated."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional stock note" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={saveStock} disabled={isBusy}>
                <Plus className="mr-2 h-4 w-4" />
                Add / update stock
              </Button>
              <p className="text-xs text-slate-500">
                Codes create one stock item each. Quantity without codes sets pooled stock for that kit type.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Meal Tokens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Total meal tokens</Label>
              <Input
                inputMode="numeric"
                value={mealTotal}
                onChange={(event) => setMealTotal(event.target.value)}
                placeholder="Leave blank if not limited"
              />
            </div>
            <Button type="button" variant="outline" onClick={saveMealTokenTotal} disabled={isBusy}>
              Save meal token stock
            </Button>
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">
              <div className="flex justify-between"><span>Issued</span><strong>{stockSummary.mealTokens.issued}</strong></div>
              <div className="mt-1 flex justify-between"><span>Left</span><strong>{formatStockValue(stockSummary.mealTokens.available)}</strong></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Current stock list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeStock.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">No equipment stock has been configured yet.</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {activeStock.map((item) => (
                <div key={item.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold capitalize text-slate-950">{item.equipmentType.replace('_', ' ')}</div>
                      <div className="text-sm text-slate-500">{item.itemNumber || 'Pooled stock'}</div>
                    </div>
                    <Badge variant="outline">Qty {item.quantityTotal}</Badge>
                  </div>
                  {item.notes ? <p className="mt-2 text-xs text-slate-500">{item.notes}</p> : null}
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => retireStock(item.id)} disabled={isBusy}>
                    Retire
                  </Button>
                </div>
              ))}
            </div>
          )}
          {inactiveStock.length > 0 ? (
            <p className="text-xs text-slate-500">{inactiveStock.length} retired stock row{inactiveStock.length === 1 ? '' : 's'} hidden.</p>
          ) : null}
          {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}
        </CardContent>
      </Card>
    </div>
  )
}
