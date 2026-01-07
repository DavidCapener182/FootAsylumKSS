import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { RoutePlanningClient } from '@/components/route-planning/route-planning-client'

async function getRoutePlanningData() {
  const supabase = createClient()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  // Get all active stores with their locations and audit status
  // Try to fetch route_sequence, but handle gracefully if column doesn't exist
  let stores: any[] = []
  let storesError: any = null
  
  try {
    const result = await supabase
      .from('fa_stores')
      .select(`
        id,
        store_code,
        store_name,
        address_line_1,
        city,
        postcode,
        region,
        latitude,
        longitude,
        compliance_audit_1_date,
        compliance_audit_2_date,
        compliance_audit_2_planned_date,
        compliance_audit_2_assigned_manager_user_id,
        route_sequence,
        assigned_manager:fa_profiles!fa_stores_compliance_audit_2_assigned_manager_user_id_fkey(
          id,
          full_name,
          home_address,
          home_latitude,
          home_longitude
        )
      `)
      .eq('is_active', true)
      .order('store_name', { ascending: true })
    
    stores = result.data || []
    storesError = result.error
  } catch (err: any) {
    // If route_sequence column doesn't exist, fetch without it
    if (err.message?.includes('route_sequence') || err.message?.includes('column')) {
      const result = await supabase
        .from('fa_stores')
        .select(`
          id,
          store_code,
          store_name,
          address_line_1,
          city,
          postcode,
          region,
          latitude,
          longitude,
          compliance_audit_1_date,
          compliance_audit_2_date,
          compliance_audit_2_planned_date,
          compliance_audit_2_assigned_manager_user_id,
          assigned_manager:fa_profiles!fa_stores_compliance_audit_2_assigned_manager_user_id_fkey(
            id,
            full_name,
            home_address,
            home_latitude,
            home_longitude
          )
        `)
        .eq('is_active', true)
        .order('store_name', { ascending: true })
      
      stores = result.data || []
      storesError = result.error
    } else {
      storesError = err
    }
  }

  if (storesError) {
    console.error('Error fetching stores:', storesError)
    return { stores: [], profiles: [] }
  }

  // Get all profiles for manager selection
  const { data: profiles, error: profilesError } = await supabase
    .from('fa_profiles')
    .select('id, full_name, home_address, home_latitude, home_longitude')
    .order('full_name', { ascending: true })

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
  }

  // Process stores to handle assigned_manager array (keep ALL stores for the component)
  const processedStores = (stores || []).map((store: any) => ({
    ...store,
    route_sequence: store.route_sequence ?? null, // Default to null if column doesn't exist
    assigned_manager: Array.isArray(store.assigned_manager)
      ? (store.assigned_manager[0] || null)
      : store.assigned_manager || null,
  }))

  return {
    stores: processedStores,
    profiles: profiles || [],
  }
}

export default async function RoutePlanningPage() {
  await requireAuth()
  const data = await getRoutePlanningData()

  return <RoutePlanningClient initialData={data} />
}
