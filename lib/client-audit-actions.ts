import 'server-only'
import type { UserProfile } from '@/lib/auth'
import { getClientDocumentStores } from '@/lib/client-documents'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function getClientAuditActions(profile: UserProfile) {
  if (profile.role !== 'area_manager' || profile.account_status !== 'active') return []
  const stores = await getClientDocumentStores(profile)
  if (!stores.length) return []
  const byId = new Map(stores.map(store => [store.id, store]))
  const { data, error } = await createAdminSupabaseClient().from('fa_store_actions')
    .select('id,store_id,title,description,priority,due_date,status,source_audit_number,source_audit_date')
    .in('store_id', stores.map(store => store.id)).order('due_date')
  if (error) throw new Error('Unable to load your store audit actions')
  return (data || []).filter(row => byId.has(row.store_id)).map(row => ({
    ...row, storeName: byId.get(row.store_id)!.store_name, storeCode: byId.get(row.store_id)!.store_code,
  }))
}
