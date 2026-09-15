'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/permissions'
import { getReportingAreaContact } from '@/lib/areas'
import { FY27_AREA_CHANGES } from '@/lib/retail-structure-fy27'

export async function applyFY27RetailStructure() {
  const { supabase } = await requirePermission('adminUsers')
  const { data: stores, error } = await supabase.from('fa_stores')
    .select('id, store_code, store_name, reporting_area, reporting_area_manager_name, reporting_area_manager_email, is_active, updated_at')
    .in('store_code', FY27_AREA_CHANGES.map(change => change.code))
  if (error) throw new Error('Unable to check current store assignments')

  // Check every identity before the first write. Retries accept already-applied rows.
  for (const change of FY27_AREA_CHANGES) {
    const matches = stores?.filter(store => store.store_code === change.code) || []
    const store = matches[0]
    if (matches.length !== 1 || store.store_name !== change.name || !store.is_active ||
      ![change.before, change.after].includes(store.reporting_area)) {
      throw new Error(`${change.name} has changed since review. No new updates were applied.`)
    }
  }

  for (const change of FY27_AREA_CHANGES) {
    const store = stores!.find(store => store.store_code === change.code)!
    const contact = getReportingAreaContact(change.after)!
    if (store.reporting_area === change.after &&
      store.reporting_area_manager_name === contact.managerName &&
      store.reporting_area_manager_email === contact.managerEmail) continue
    // The user's Supabase session supplies the real actor to RLS and the audit log.
    const { data, error: updateError } = await supabase.from('fa_stores').update({
      reporting_area: change.after,
      reporting_area_manager_name: contact.managerName,
      reporting_area_manager_email: contact.managerEmail,
      updated_at: new Date().toISOString(),
    }).eq('id', store.id).eq('reporting_area', store.reporting_area)
      .eq('updated_at', store.updated_at).select('id').single()
    if (updateError || !data) {
      throw new Error(`Stopped at ${change.name}; earlier rows may have been updated. Refresh to review before retrying.`)
    }
  }
  revalidatePath('/reports')
  revalidatePath('/stores')
  revalidatePath('/stores/retail-structure')
}
