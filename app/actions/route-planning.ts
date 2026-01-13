'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateStoreLocation(
  storeId: string,
  latitude: number | null,
  longitude: number | null
) {
  const supabase = createClient()

  const { error } = await supabase
    .from('fa_stores')
    .update({
      latitude: latitude || null,
      longitude: longitude || null,
    })
    .eq('id', storeId)

  if (error) {
    console.error('Error updating store location:', error)
    return { error: error.message }
  }

  revalidatePath('/route-planning')
  return { success: true }
}

export async function updateManagerHomeAddress(
  userId: string,
  homeAddress: string | null,
  latitude: number | null,
  longitude: number | null
) {
  const supabase = createClient()

  const { error } = await supabase
    .from('fa_profiles')
    .update({
      home_address: homeAddress || null,
      home_latitude: latitude || null,
      home_longitude: longitude || null,
    })
    .eq('id', userId)

  if (error) {
    console.error('Error updating manager home address:', error)
    return { error: error.message }
  }

  revalidatePath('/route-planning')
  return { success: true }
}

export async function updateRoutePlannedDate(
  storeId: string,
  plannedDate: string | null
) {
  const supabase = createClient()

  const { error } = await supabase
    .from('fa_stores')
    .update({
      compliance_audit_2_planned_date: plannedDate || null,
      // Clear route sequence when clearing planned date
      ...(plannedDate === null && { route_sequence: null }),
    })
    .eq('id', storeId)

  if (error) {
    console.error('Error updating planned date:', error)
    return { error: error.message }
  }

  revalidatePath('/route-planning')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateRouteSequence(
  storeIds: string[],
  routeKey: string
) {
  const supabase = createClient()

  // Update each store with its sequence number
  const updates = storeIds.map((storeId, index) => {
    const sequence = index + 1 // Start from 1
    return supabase
      .from('fa_stores')
      .update({ route_sequence: sequence })
      .eq('id', storeId)
  })

  const results = await Promise.all(updates)
  const errors = results.filter(r => r.error)

  if (errors.length > 0) {
    console.error('Error updating route sequence:', errors)
    return { error: 'Failed to update route sequence' }
  }

  revalidatePath('/route-planning')
  return { success: true }
}

export async function completeRoute(storeIds: string[]) {
  const supabase = createClient()

  // Update all stores in the route: clear planned date (don't set audit date - audit hasn't happened yet)
  const updates = storeIds.map(storeId => {
    return supabase
      .from('fa_stores')
      .update({
        compliance_audit_2_planned_date: null,
        route_sequence: null,
      })
      .eq('id', storeId)
  })

  const results = await Promise.all(updates)
  const errors = results.filter(r => r.error)

  if (errors.length > 0) {
    console.error('Error completing route:', errors)
    return { error: 'Failed to complete route' }
  }

  revalidatePath('/route-planning')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function rescheduleRoute(storeIds: string[], newDate: string) {
  const supabase = createClient()

  // Update all stores in the route with new planned date
  const updates = storeIds.map(storeId => {
    return supabase
      .from('fa_stores')
      .update({
        compliance_audit_2_planned_date: newDate,
      })
      .eq('id', storeId)
  })

  const results = await Promise.all(updates)
  const errors = results.filter(r => r.error)

  if (errors.length > 0) {
    console.error('Error rescheduling route:', errors)
    return { error: 'Failed to reschedule route' }
  }

  revalidatePath('/route-planning')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function cleanupIncompleteAudit2Dates() {
  const supabase = createClient()

  // Clear compliance_audit_2_date for stores where audit 2 percentage is null (audit not actually completed)
  const { error } = await supabase
    .from('fa_stores')
    .update({
      compliance_audit_2_date: null,
    })
    .not('compliance_audit_2_date', 'is', null)
    .is('compliance_audit_2_overall_pct', null)

  if (error) {
    console.error('Error cleaning up incomplete audit 2 dates:', error)
    return { error: error.message }
  }

  revalidatePath('/audit-tracker')
  revalidatePath('/dashboard')
  return { success: true }
}

export interface OperationalItem {
  id: string
  title: string
  location: string | null
  start_time: string
  duration_minutes: number
}

export async function getRouteOperationalItems(
  managerUserId: string,
  plannedDate: string,
  region: string | null
): Promise<{ data: OperationalItem[] | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('fa_route_operational_items')
    .select('id, title, location, start_time, duration_minutes')
    .eq('manager_user_id', managerUserId)
    .eq('planned_date', plannedDate)
    .eq('region', region)
    .order('start_time')

  if (error) {
    console.error('Error fetching operational items:', error)
    return { data: null, error: error.message }
  }

  return { data: data || [], error: null }
}

export async function saveRouteOperationalItem(
  managerUserId: string,
  plannedDate: string,
  region: string | null,
  title: string,
  location: string | null,
  startTime: string,
  durationMinutes: number
): Promise<{ data: OperationalItem | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('fa_route_operational_items')
    .insert({
      manager_user_id: managerUserId,
      planned_date: plannedDate,
      region: region,
      title: title,
      location: location,
      start_time: startTime,
      duration_minutes: durationMinutes,
    })
    .select('id, title, location, start_time, duration_minutes')
    .single()

  if (error) {
    console.error('Error saving operational item:', error)
    return { data: null, error: error.message }
  }

  revalidatePath('/route-planning')
  return { data, error: null }
}

export async function updateRouteOperationalItem(
  id: string,
  title: string,
  location: string | null,
  startTime: string,
  durationMinutes: number
): Promise<{ data: OperationalItem | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('fa_route_operational_items')
    .update({
      title: title,
      location: location,
      start_time: startTime,
      duration_minutes: durationMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, title, location, start_time, duration_minutes')
    .single()

  if (error) {
    console.error('Error updating operational item:', error)
    return { data: null, error: error.message }
  }

  revalidatePath('/route-planning')
  return { data, error: null }
}

export async function deleteRouteOperationalItem(
  id: string
): Promise<{ error: string | null }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('fa_route_operational_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting operational item:', error)
    return { error: error.message }
  }

  revalidatePath('/route-planning')
  return { error: null }
}

export interface VisitTime {
  id: string
  store_id: string
  start_time: string
  end_time: string
}

export async function getRouteVisitTimes(
  managerUserId: string,
  plannedDate: string,
  region: string | null
): Promise<{ data: VisitTime[] | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('fa_route_visit_times')
    .select('id, store_id, start_time, end_time')
    .eq('manager_user_id', managerUserId)
    .eq('planned_date', plannedDate)
    .eq('region', region)

  if (error) {
    console.error('Error fetching visit times:', error)
    return { data: null, error: error.message }
  }

  return { data: data || [], error: null }
}

export async function saveRouteVisitTime(
  managerUserId: string,
  plannedDate: string,
  region: string | null,
  storeId: string,
  startTime: string,
  endTime: string
): Promise<{ data: VisitTime | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('fa_route_visit_times')
    .upsert({
      manager_user_id: managerUserId,
      planned_date: plannedDate,
      region: region,
      store_id: storeId,
      start_time: startTime,
      end_time: endTime,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'manager_user_id,planned_date,region,store_id'
    })
    .select('id, store_id, start_time, end_time')
    .single()

  if (error) {
    console.error('Error saving visit time:', error)
    return { data: null, error: error.message }
  }

  revalidatePath('/route-planning')
  return { data, error: null }
}

export async function deleteRouteVisitTime(
  id: string
): Promise<{ error: string | null }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('fa_route_visit_times')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting visit time:', error)
    return { error: error.message }
  }

  revalidatePath('/route-planning')
  return { error: null }
}

export async function deleteAllRouteVisitTimes(
  managerUserId: string,
  plannedDate: string,
  region: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient()

  let query = supabase
    .from('fa_route_visit_times')
    .delete()
    .eq('manager_user_id', managerUserId)
    .eq('planned_date', plannedDate)
  
  if (region !== null) {
    query = query.eq('region', region)
  } else {
    query = query.is('region', null)
  }

  const { error } = await query

  if (error) {
    console.error('Error deleting all visit times:', error)
    return { error: error.message }
  }

  revalidatePath('/route-planning')
  return { error: null }
}

export async function deleteAllRouteOperationalItems(
  managerUserId: string,
  plannedDate: string,
  region: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient()

  let query = supabase
    .from('fa_route_operational_items')
    .delete()
    .eq('manager_user_id', managerUserId)
    .eq('planned_date', plannedDate)
  
  if (region !== null) {
    query = query.eq('region', region)
  } else {
    query = query.is('region', null)
  }

  const { error } = await query

  if (error) {
    console.error('Error deleting all operational items:', error)
    return { error: error.message }
  }

  revalidatePath('/route-planning')
  return { error: null }
}
