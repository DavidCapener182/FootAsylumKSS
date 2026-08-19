'use server'

import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { UserRole } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import {
  AUTH_BAN_DURATION_BY_STATUS,
  normalizeAccountChangeReason,
  type AccountStatus,
} from '@/lib/account-lifecycle'
import { logActivity } from '@/lib/activity-log'

type AssignableUserRole = Exclude<UserRole, 'pending'>

const ASSIGNABLE_USER_ROLES: readonly AssignableUserRole[] = [
  'admin',
  'ops',
  'readonly',
  'client',
]

export interface UserWithProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  account_status: AccountStatus
  status_changed_at: string
  status_changed_by_user_id: string | null
  status_change_reason: string | null
  created_at: string
  last_sign_in_at: string | null
}

type AuthLookupRecord = {
  email: string
  last_sign_in_at: string | null
}

function isHiddenTestUserEmail(email: string | null | undefined) {
  return email?.toLowerCase().endsWith('@footasylum.local') ?? false
}

async function getAuthLookupById(): Promise<Map<string, AuthLookupRecord>> {
  const adminClient = createAdminSupabaseClient()
  const lookup = new Map<string, AuthLookupRecord>()
  const perPage = 200

  for (let page = 1; page < 100; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.warn('Unable to list auth users for admin table enrichment:', error.message)
      break
    }

    const users = data?.users || []
    for (const authUser of users) {
      lookup.set(authUser.id, {
        email: authUser.email || 'Email not available',
        last_sign_in_at: authUser.last_sign_in_at || null,
      })
    }

    if (users.length < perPage) break
  }

  return lookup
}

/**
 * Get all users with their profiles
 * Only accessible by admin users
 */
export async function getAllUsers(): Promise<UserWithProfile[]> {
  const { supabase } = await requirePermission('adminUsers')

  const authLookupById = await getAuthLookupById()

  const { data: profiles, error: profilesError } = await supabase
    .from('fa_profiles')
    .select(`
      id,
      full_name,
      role,
      account_status,
      status_changed_at,
      status_changed_by_user_id,
      status_change_reason,
      created_at
    `)
    .order('created_at', { ascending: false })

  if (profilesError) {
    throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
  }

  return (profiles || [])
    .map((profile: any) => {
      const authUser = authLookupById.get(profile.id)
      return {
        id: profile.id,
        email: authUser?.email || 'Email not available',
        full_name: profile.full_name,
        role: profile.role,
        account_status: profile.account_status,
        status_changed_at: profile.status_changed_at,
        status_changed_by_user_id: profile.status_changed_by_user_id,
        status_change_reason: profile.status_change_reason,
        created_at: profile.created_at,
        last_sign_in_at: authUser?.last_sign_in_at || null,
      }
    })
    .filter((user) => !isHiddenTestUserEmail(user.email))
}

/**
 * Invite a user by email
 * Only accessible by admin users
 */
export async function inviteUserByEmail(
  email: string,
  role: UserRole = 'readonly'
): Promise<{ success: boolean; message?: string }> {
  const { userId: currentAdminId } = await requirePermission('adminUsers')

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return {
      success: false,
      message: 'Invalid email address',
    }
  }

  // Validate role
  if (!ASSIGNABLE_USER_ROLES.includes(role as AssignableUserRole)) {
    return {
      success: false,
      message: `Invalid role: ${role}`,
    }
  }

  try {
    // Use admin client for admin operations
    const adminClient = createAdminSupabaseClient()
    
    // Check if user already exists by listing users and filtering by email
    const { data: usersList, error: listError } = await adminClient.auth.admin.listUsers()
    if (listError) {
      return {
        success: false,
        message: `Failed to check existing users: ${listError.message}`,
      }
    }

    const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (existingUser) {
      // User already exists, check if they have a profile
      const { data: existingProfile, error: existingProfileError } = await adminClient
        .from('fa_profiles')
        .select('id, role, account_status')
        .eq('id', existingUser.id)
        .maybeSingle()

      if (existingProfileError) {
        return {
          success: false,
          message: `Failed to verify the existing account profile: ${existingProfileError.message}`,
        }
      }

      if (existingProfile) {
        return {
          success: false,
          message: `User with email ${email} already exists with role ${existingProfile.role} and status ${existingProfile.account_status}`
        }
      } else {
        // Complete a previously interrupted invitation using trusted admin input.
        const { error: profileError } = await adminClient
          .from('fa_profiles')
          .insert({
            id: existingUser.id,
            full_name: email.split('@')[0],
            role: role,
            account_status: 'invited',
            status_changed_at: new Date().toISOString(),
            status_changed_by_user_id: currentAdminId,
            status_change_reason: 'Account invitation profile provisioned by administrator',
          })

        if (profileError) {
          return {
            success: false,
            message: `Failed to provision the account profile: ${profileError.message}`,
          }
        }

        try {
          await logActivity('user', existingUser.id, 'Invited user account', {
            new: { role, account_status: 'invited' },
            invitation_repair: true,
          })
        } catch (auditError) {
          console.error('Invitation audit logging failed:', auditError)
          return {
            success: false,
            message: 'Invitation profile was created but its audit event failed. The account remains inactive; retry after checking the audit service.',
          }
        }

        return {
          success: true,
          message: `Invitation profile created for existing user ${email} with role: ${role}`
        }
      }
    }

    // Get the app URL for redirect (use environment variable or default to production URL)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://footasylum.kssnwltd.co.uk'
    const redirectTo = `${appUrl}/login/reset-password`

    // Invite new user using admin client
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: email.split('@')[0]
      },
      redirectTo: redirectTo
    })

    if (inviteError) {
      const message = inviteError.message || 'Unknown Supabase Auth error'
      const lowerMessage = message.toLowerCase()

      if (lowerMessage.includes('email address not authorized')) {
        return {
          success: false,
          message: `Supabase could not send the invite to ${email} using the built-in email sender. The branded Supabase invite template is saved, but the built-in sender may only deliver to addresses Supabase allows for this project.`,
        }
      }

      return {
        success: false,
        message: `Failed to invite user: ${message}`,
      }
    }

    if (!inviteData?.user?.id) {
      return {
        success: false,
        message: 'Invitation was sent, but Supabase did not return a user for profile setup.',
      }
    }

    // Provision authorization from trusted server-side input. Invitations are
    // deliberately non-active until an administrator approves or activates them.
    const { error: profileError } = await adminClient
      .from('fa_profiles')
      .insert({
        id: inviteData.user.id,
        full_name: email.split('@')[0],
        role: role,
        account_status: 'invited',
        status_changed_at: new Date().toISOString(),
        status_changed_by_user_id: currentAdminId,
        status_change_reason: 'Account invited by administrator',
      })

    if (profileError) {
      console.error('Invitation profile provisioning failed:', profileError)
      return {
        success: false,
        message: `Invitation was created, but the account profile could not be provisioned. Retry the invitation setup before the user signs in.`,
      }
    }

    try {
      await logActivity('user', inviteData.user.id, 'Invited user account', {
        new: { role, account_status: 'invited' },
      })
    } catch (auditError) {
      console.error('Invitation audit logging failed:', auditError)
      return {
        success: false,
        message: 'Invitation and inactive profile were created but the audit event failed. Retry after checking the audit service.',
      }
    }

    return {
      success: true,
      message: `Invitation sent to ${email}. Activate the account after its access has been approved.`
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to invite user',
    }
  }
}

/**
 * Update a user's role. For invited/pending accounts the database RPC treats
 * this as explicit approval and activates the account in the same transaction.
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  reason: string
): Promise<{ success: boolean; message?: string }> {
  const { supabase } = await requirePermission('adminUsers')
  const normalizedReason = normalizeAccountChangeReason(reason)

  if (!ASSIGNABLE_USER_ROLES.includes(newRole as AssignableUserRole)) {
    throw new Error(`Invalid role: ${newRole}`)
  }

  const { error } = await supabase.rpc('fa_admin_change_user_access', {
    p_target_user_id: userId,
    p_new_role: newRole,
    p_new_account_status: null,
    p_reason: normalizedReason,
  })

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`)
  }

  return { success: true, message: 'User role updated successfully' }
}

type LifecycleChangeRow = {
  account_status: AccountStatus
  previous_account_status: AccountStatus
}

async function changeAccountStatus(
  userId: string,
  accountStatus: AccountStatus,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const { supabase } = await requirePermission('adminUsers')
  const normalizedReason = normalizeAccountChangeReason(reason)
  const { data, error } = await supabase.rpc('fa_admin_change_user_access', {
    p_target_user_id: userId,
    p_new_role: null,
    p_new_account_status: accountStatus,
    p_reason: normalizedReason,
  })

  if (error) {
    throw new Error(`Failed to change account status: ${error.message}`)
  }

  const changedProfile = (Array.isArray(data) ? data[0] : data) as LifecycleChangeRow | null
  if (!changedProfile) {
    throw new Error('Account status change did not return an updated profile')
  }

  const requiresAuthUpdate =
    accountStatus !== 'active'
    || changedProfile.previous_account_status === 'suspended'
    || changedProfile.previous_account_status === 'deactivated'

  // Invited and pending accounts are deliberately not Auth-banned, so their
  // first activation needs only the atomic profile/RLS change.
  if (!requiresAuthUpdate) {
    return {
      success: true,
      message: `Account status changed to ${accountStatus}`,
    }
  }

  // Profile/RLS access is changed first through the authenticated RPC so the
  // audit trigger captures auth.uid(). Auth administration is server-only and
  // follows the database change. A ban failure therefore leaves non-active
  // accounts fail-closed at every application and RLS boundary.
  const adminClient = createAdminSupabaseClient()
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: AUTH_BAN_DURATION_BY_STATUS[accountStatus],
  })

  if (authError) {
    // Reactivation must not leave the profile active while Auth remains banned.
    // Restore the previous non-active status through the same audited RPC.
    if (
      accountStatus === 'active'
      && changedProfile.previous_account_status !== 'active'
    ) {
      const { error: rollbackError } = await supabase.rpc('fa_admin_change_user_access', {
        p_target_user_id: userId,
        p_new_role: null,
        p_new_account_status: changedProfile.previous_account_status,
        p_reason: `Automatic rollback after Auth reactivation failed: ${normalizedReason}`.slice(0, 500),
      })

      if (rollbackError) {
        throw new Error(
          `Auth update failed and account rollback also failed: ${authError.message}; ${rollbackError.message}`
        )
      }
    }

    throw new Error(
      `Application access changed, but Supabase Auth could not be updated: ${authError.message}`
    )
  }

  return {
    success: true,
    message: `Account status changed to ${accountStatus}`,
  }
}

export async function activateAccount(userId: string, reason: string) {
  return changeAccountStatus(userId, 'active', reason)
}

export async function suspendAccount(userId: string, reason: string) {
  return changeAccountStatus(userId, 'suspended', reason)
}

export async function reactivateAccount(userId: string, reason: string) {
  return changeAccountStatus(userId, 'active', reason)
}

export async function deactivateAccount(userId: string, reason: string) {
  return changeAccountStatus(userId, 'deactivated', reason)
}
