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
