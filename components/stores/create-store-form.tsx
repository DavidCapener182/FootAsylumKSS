'use client'

import React, { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createStore } from '@/app/actions/create-store'
import { createStoreSchema } from '@/lib/store-creation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateStoreForm() {
  const router = useRouter()
  const requestId = useRef<string | null>(null)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    const form = new FormData(event.currentTarget)
    requestId.current ||= crypto.randomUUID()
    const input = {
      requestId: requestId.current,
      store_name: String(form.get('store_name') || ''),
      store_code: String(form.get('store_code') || ''),
      address_line_1: String(form.get('address_line_1') || ''),
      city: String(form.get('city') || ''),
      postcode: String(form.get('postcode') || ''),
      region: String(form.get('region') || ''),
      reporting_area: String(form.get('reporting_area') || '') as '' | 'AREA1' | 'AREA2' | 'AREA3' | 'AREA4' | 'AREA5' | 'NON_RETAIL',
    }
    const parsed = createStoreSchema.safeParse(input)
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }

    inFlight.current = true
    setSaving(true)
    setError(null)
    try {
      const result = await createStore(input)
      if (!mounted.current) return
      if (!result.ok) { setError(result.error); return }
      router.replace(`/stores/${result.id}`)
      router.refresh()
    } catch {
      if (mounted.current) setError('The result could not be confirmed. Retry with the same details to check whether the store was saved.')
    } finally {
      inFlight.current = false
      if (mounted.current) setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-label="New store details" aria-busy={saving}>
      <fieldset disabled={saving} className="min-w-0 space-y-4">
        <legend className="sr-only">Store details</legend>
        <div className="space-y-2">
          <Label htmlFor="store_name">Store name</Label>
          <Input id="store_name" name="store_name" required maxLength={160} autoComplete="organization" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="store_code">Store code (optional)</Label>
          <Input id="store_code" name="store_code" maxLength={32} aria-describedby="store-code-help" />
          <p id="store-code-help" className="text-sm text-slate-600">Leave blank if unknown. Do not reuse the code of a closed store.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address_line_1">Address</Label>
          <Input id="address_line_1" name="address_line_1" required maxLength={240} autoComplete="street-address" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">Town or city</Label>
            <Input id="city" name="city" required maxLength={100} autoComplete="address-level2" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode</Label>
            <Input id="postcode" name="postcode" required maxLength={12} autoComplete="postal-code" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="region">Region (optional)</Label>
            <Input id="region" name="region" maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reporting_area">Reporting area (optional)</Label>
            <select id="reporting_area" name="reporting_area" defaultValue="" className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Not confirmed</option>
              {[1, 2, 3, 4, 5].map(area => <option key={area} value={`AREA${area}`}>Area {area}</option>)}
              <option value="NON_RETAIL">Non-retail</option>
            </select>
          </div>
        </div>
      </fieldset>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <p className="text-sm text-slate-600">This creates the location only. Audit scores, reports and visit bookings are not added.</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={saving} onClick={() => router.push('/stores')}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Creating store…' : 'Create store'}</Button>
      </div>
    </form>
  )
}
