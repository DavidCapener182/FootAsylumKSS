import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/lib/auth'

export type FraActionReadScope =
  | { kind: 'kss_all' }
  | { kind: 'client_stores'; storeIds: string[]; role: 'client_admin' | 'area_manager' }
  | { kind: 'denied'; storeIds: [] }

/**
 * Server-side scope for the FRA Action Plans page. Membership rows, rather
 * than store contact names, operational regions or the legacy client role,
 * decide which stores can be returned. Database RLS must enforce the same
 * boundary; this helper is not a substitute for it.
 */
export async function getFraActionReadScope(profile: UserProfile): Promise<FraActionReadScope> {
  if (profile.role === 'admin' || profile.role === 'ops') return { kind: 'kss_all' }
  if (profile.role !== 'client_admin' && profile.role !== 'area_manager') {
    return { kind: 'denied', storeIds: [] }
  }

  const supabase = createClient()
  const { data: membership, error: membershipError } = await supabase
    .from('fa_client_memberships')
    .select('client_id, access_level')
    .eq('user_id', profile.id)
    .eq('access_level', profile.role)
    .eq('is_active', true)
    .maybeSingle()

  if (membershipError || !membership?.client_id) return { kind: 'denied', storeIds: [] }

  if (profile.role === 'client_admin') {
    const { data, error } = await supabase
      .from('fa_client_store_memberships')
      .select('store_id')
      .eq('client_id', membership.client_id)
    if (error || !data) return { kind: 'denied', storeIds: [] }
    return { kind: 'client_stores', role: 'client_admin', storeIds: data.map(row => row.store_id) }
  }

  const { data: assignedAreas, error: areasError } = await supabase
    .from('fa_client_area_assignments')
    .select('area_id')
    .eq('user_id', profile.id)
    .eq('client_id', membership.client_id)
  if (areasError || !assignedAreas?.length) return { kind: 'denied', storeIds: [] }

  const { data: stores, error: storesError } = await supabase
    .from('fa_client_store_memberships')
    .select('store_id')
    .eq('client_id', membership.client_id)
    .in('area_id', assignedAreas.map(row => row.area_id))
    .eq('manager_visible', true)
  if (storesError || !stores) return { kind: 'denied', storeIds: [] }
  return { kind: 'client_stores', role: 'area_manager', storeIds: stores.map(row => row.store_id) }
}
