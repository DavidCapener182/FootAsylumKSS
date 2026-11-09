'use server'

import { revalidatePath } from 'next/cache'
import { isPermissionError, requirePermission } from '@/lib/permissions'
import { createStoreSchema, literalStoreSearch, type CreateStoreInput, type CreateStoreResult } from '@/lib/store-creation'

export async function createStore(input: CreateStoreInput): Promise<CreateStoreResult> {
  try {
    // The page guard is not sufficient: server actions must verify every call.
    const { supabase } = await requirePermission('manageStores')
    const parsed = createStoreSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const { requestId, ...fields } = parsed.data
    const record = { ...fields, is_active: true }
    const columns = 'id,store_name,store_code,address_line_1,city,postcode,region,reporting_area,is_active'

    // A frozen submission ID makes retrying a lost response safe. Never update
    // or reactivate an existing row, including a historical closed store.
    const existing = await supabase.from('fa_stores').select(columns).eq('id', requestId).maybeSingle()
    if (existing.error) return { ok: false, error: 'Unable to check this submission. Please try again.' }
    if (existing.data) {
      const saved: Record<string, unknown> = existing.data
      const sameRecord = Object.entries(record).every(([key, value]) => saved[key] === value)
      if (!sameRecord) return { ok: false, error: 'This submission was already saved with different details. Check the store directory before starting again.' }
      revalidatePath('/stores')
      return { ok: true, id: existing.data.id }
    }

    if (record.store_code) {
      const duplicateCode = await supabase.from('fa_stores').select('id')
        .ilike('store_code', literalStoreSearch(record.store_code)).limit(1).maybeSingle()
      if (duplicateCode.error) return { ok: false, error: 'Unable to check the store code. Please try again.' }
      if (duplicateCode.data) return { ok: false, error: 'That store code is already in use, including closed stores. Use the verified new code or leave it blank if unknown.' }
    }

    const duplicateLocation = await supabase.from('fa_stores').select('id')
      .ilike('store_name', literalStoreSearch(record.store_name))
      .ilike('postcode', literalStoreSearch(record.postcode)).limit(1).maybeSingle()
    if (duplicateLocation.error) return { ok: false, error: 'Unable to check for an existing location. Please try again.' }
    if (duplicateLocation.data) return { ok: false, error: 'A store with this name and postcode already exists. Check its record before adding another.' }

    // Use the caller's authenticated client: existing RLS and audit triggers
    // apply. There is deliberately no service-role client, upsert or update.
    const { data, error } = await supabase.from('fa_stores').insert({ id: requestId, ...record }).select('id').single()
    if (error || !data) return { ok: false, error: error?.code === '23505'
      ? 'This submission or store code already exists. Retry with the same details to check whether it was saved.'
      : 'Unable to create the store. Check the directory before retrying with the same details.' }

    for (const path of ['/stores', '/dashboard', '/audit-tracker', '/fire-risk-assessment', '/route-planning']) revalidatePath(path)
    return { ok: true, id: data.id }
  } catch (error) {
    return { ok: false, error: isPermissionError(error) ? error.message : 'Unable to create the store. Check your connection and retry with the same details.' }
  }
}
