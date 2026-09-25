import 'server-only'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { UserProfile } from '@/lib/auth'

export type FraActionReadScope =
  | { kind: 'kss_all' }
  | { kind: 'client_stores'; storeIds: string[]; role: 'client_admin' | 'area_manager' }
  | { kind: 'denied'; storeIds: [] }

/**
 * Explicit per-user store grants are read only on the server with service_role.
 */
export async function getFraActionReadScope(profile: UserProfile): Promise<FraActionReadScope> {
  if (profile.account_status !== 'active') return { kind: 'denied', storeIds: [] }
  if (profile.role === 'admin' || profile.role === 'ops') return { kind: 'kss_all' }
  if (profile.role !== 'client_admin' && profile.role !== 'area_manager') {
    return { kind: 'denied', storeIds: [] }
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('fa_fra_store_access')
    .select('store_id')
    .eq('user_id', profile.id)
    .eq('access_level', profile.role)
    .eq('is_active', true)

  if (error || !Array.isArray(data) || !data.length) return { kind: 'denied', storeIds: [] }
  let storeIds: string[] = [...new Set(data.map((row: { store_id: string }) => row.store_id))]
  if (profile.role === 'area_manager') {
    const { data: activeStores, error: storeError } = await admin
      .from('fa_stores')
      .select('id')
      .in('id', storeIds)
      .eq('is_active', true)
    if (storeError || !Array.isArray(activeStores) || !activeStores.length) return { kind: 'denied', storeIds: [] }
    storeIds = activeStores.map((row: { id: string }) => row.id)
  }
  return { kind: 'client_stores', role: profile.role, storeIds }
}
