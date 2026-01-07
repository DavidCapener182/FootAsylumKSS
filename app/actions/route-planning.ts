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
