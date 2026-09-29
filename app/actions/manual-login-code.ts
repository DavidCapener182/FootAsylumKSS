'use server'

import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import type { UserRole } from '@/lib/auth'

const INVITABLE_ROLES: readonly UserRole[] = ['admin', 'ops', 'readonly']

export type ManualLoginCodeResult =
  | { success: false; message: string }
  | { success: true; email: string; code: string; mode: 'invite' | 'recovery'; message: string }

/** Creates a one-use auth code. This action never sends email. */
export async function prepareManualLoginCode(emailInput: string, role: UserRole = 'readonly'): Promise<ManualLoginCodeResult> {
  const { userId } = await requirePermission('adminUsers')
  const email = emailInput.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: 'Enter a valid email address.' }
  if (!INVITABLE_ROLES.includes(role)) return { success: false, message: 'This role requires separate store access setup.' }

  const admin = createAdminSupabaseClient()
  const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) return { success: false, message: 'Could not check existing accounts.' }
  const existingUser = users.users.find(user => user.email?.toLowerCase() === email)

  if (existingUser) {
    const { data: profile, error: profileError } = await admin.from('fa_profiles')
      .select('id, account_status').eq('id', existingUser.id).maybeSingle()
    if (profileError || !profile) return { success: false, message: 'This account needs administrator profile review first.' }
    if (profile.account_status !== 'active') return { success: false, message: 'Activate this account and confirm its access before preparing a login code.' }

    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email })
    if (error || !data?.properties?.email_otp) return { success: false, message: 'Could not create a login code.' }
    await logActivity('user', existingUser.id, 'Manual login code prepared', { email, type: 'recovery' })
    return { success: true, email, code: data.properties.email_otp, mode: 'recovery', message: 'Code prepared. No email was sent.' }
  }

  const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email })
  if (error || !data?.user?.id || !data.properties?.email_otp) return { success: false, message: 'Could not create an invitation code.' }

  const { data: profile, error: profileLookupError } = await admin.from('fa_profiles')
    .select('id, role, account_status').eq('id', data.user.id).maybeSingle()
  if (profileLookupError) return { success: false, message: 'Code created, but the account profile could not be checked. Do not send it.' }
  if (profile && (profile.role !== 'readonly' || profile.account_status !== 'pending')) {
    return { success: false, message: 'Code created, but the account profile needs review. Do not send it.' }
  }
  if (!profile) {
    const { error: insertError } = await admin.from('fa_profiles').insert({
      id: data.user.id,
      full_name: email.split('@')[0],
      role,
      account_status: 'invited',
      status_changed_at: new Date().toISOString(),
      status_changed_by_user_id: userId,
      status_change_reason: 'Manual invitation prepared by administrator',
    })
    if (insertError) return { success: false, message: 'Code created, but the account profile could not be provisioned. Do not send it.' }
  }
  await logActivity('user', data.user.id, 'Manual invitation code prepared', { email, role })
  return { success: true, email, code: data.properties.email_otp, mode: 'invite', message: 'Invitation prepared. The account remains inactive until approved. No email was sent.' }
}
