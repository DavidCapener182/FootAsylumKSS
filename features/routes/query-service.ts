import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { applyStoreCoordinateOverride, shouldAlwaysIncludeStore, shouldHideStore } from '@/lib/store-normalization'
import { hasCompletedSecondAudit } from '@/lib/route-planning-store-eligibility'

const managerSchema = z.object({
  id: z.string().uuid(), full_name: z.string().nullable(), home_address: z.string().nullable(),
  home_latitude: z.number().nullable(), home_longitude: z.number().nullable(),
}).nullable()

const routeStoreSchema = z.object({
  id: z.string().uuid(), is_active: z.boolean(), store_code: z.string().nullable(), store_name: z.string(),
  address_line_1: z.string().nullable(), city: z.string().nullable(), postcode: z.string().nullable(), region: z.string().nullable(),
  latitude: z.number().nullable(), longitude: z.number().nullable(), compliance_audit_1_date: z.string().nullable(),
  compliance_audit_1_overall_pct: z.number().nullable(), compliance_audit_2_date: z.string().nullable(),
  compliance_audit_2_planned_date: z.string().nullable(), compliance_audit_2_assigned_manager_user_id: z.string().nullable(),
  route_sequence: z.number().int().nullable(), assigned_manager: z.union([managerSchema, z.array(managerSchema)]),
})

const profileSchema = managerSchema.unwrap().extend({ role: z.enum(['admin', 'ops']) })
export type RoutePlanningData = {
  stores: Array<Omit<z.infer<typeof routeStoreSchema>, 'assigned_manager' | 'is_active'> & { assigned_manager: z.infer<typeof managerSchema> }>
  profiles: Array<Omit<z.infer<typeof profileSchema>, 'role'>>
}

export function presentRoutePlanningData(storeRows: unknown[], profileRows: unknown[], now = new Date()): RoutePlanningData {
  const stores = z.array(routeStoreSchema).parse(storeRows)
  const profiles = z.array(profileSchema).parse(profileRows)
  const oneMonthAgo = new Date(now)
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  oneMonthAgo.setHours(0, 0, 0, 0)

  const visibleStores = stores
    .map((store) => applyStoreCoordinateOverride(store))
    .filter((store) => {
      if (!store.is_active && !shouldAlwaysIncludeStore(store)) return false
      if (shouldHideStore(store) || hasCompletedSecondAudit(store)) return false
      if (store.compliance_audit_1_date && typeof store.compliance_audit_1_overall_pct === 'number' && store.compliance_audit_1_overall_pct >= 80) {
        const completedAt = new Date(store.compliance_audit_1_date)
        completedAt.setHours(0, 0, 0, 0)
        if (completedAt >= oneMonthAgo) return false
      }
      return true
    })
    .map(({ is_active: _isActive, ...store }) => ({
      ...store,
      assigned_manager: Array.isArray(store.assigned_manager) ? store.assigned_manager[0] || null : store.assigned_manager,
    }))

  return { stores: visibleStores, profiles: profiles.map(({ role: _role, ...profile }) => profile) }
}

export async function getRoutePlanningData(): Promise<RoutePlanningData> {
  const supabase = createClient()
  const [storesResult, profilesResult] = await Promise.all([
    supabase.from('fa_stores').select(`id, is_active, store_code, store_name, address_line_1, city, postcode, region,
      latitude, longitude, compliance_audit_1_date, compliance_audit_1_overall_pct, compliance_audit_2_date,
      compliance_audit_2_planned_date, compliance_audit_2_assigned_manager_user_id, route_sequence,
      assigned_manager:fa_profiles!fa_stores_compliance_audit_2_assigned_manager_user_id_fkey(id, full_name, home_address, home_latitude, home_longitude)`)
      .order('store_name', { ascending: true }),
    supabase.from('fa_profiles').select('id, full_name, home_address, home_latitude, home_longitude, role')
      .in('role', ['ops', 'admin']).order('full_name', { ascending: true }),
  ])
  if (storesResult.error) throw new Error(`Unable to load route-planning stores: ${storesResult.error.message}`)
  if (profilesResult.error) throw new Error(`Unable to load route-planning managers: ${profilesResult.error.message}`)
  return presentRoutePlanningData(storesResult.data || [], profilesResult.data || [])
}
