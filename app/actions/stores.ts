'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateComplianceAudit2Tracking(
  storeId: string,
  assignedManagerUserId: string | null,
  plannedDate: string | null
) {
  const supabase = createClient()

  const { error } = await supabase
    .from('fa_stores')
    .update({
      compliance_audit_2_assigned_manager_user_id: assignedManagerUserId || null,
      compliance_audit_2_planned_date: plannedDate || null,
    })
    .eq('id', storeId)

  if (error) {
    console.error('Error updating compliance audit tracking:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}


