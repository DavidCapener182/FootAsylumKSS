import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  accountHasApplicationAccess,
  type AccountStatus,
} from '@/lib/account-lifecycle'
import { hasRequiredMfaForRole, roleRequiresMfa } from '@/lib/mfa/policy'

export type UserRole = 'admin' | 'ops' | 'readonly' | 'client' | 'pending'

export interface UserProfile {
  id: string
  full_name: string | null
  role: UserRole
  account_status: AccountStatus
  status_changed_at: string
  status_changed_by_user_id: string | null
  status_change_reason: string | null
  created_at: string
}

export async function getSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('fa_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !profile || !accountHasApplicationAccess(profile.account_status as AccountStatus)) {
    return null
  }

  return profile
}

export async function requireAuth() {
  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('fa_profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .maybeSingle()

  if (
    profileError
    || !profile
    || !accountHasApplicationAccess(profile.account_status as AccountStatus)
  ) {
    redirect('/login/account-setup')
  }

  if (
    roleRequiresMfa(profile.role)
    && !(await hasRequiredMfaForRole(supabase.auth, profile.role))
  ) {
    redirect('/login/mfa')
  }

  return session
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireAuth()
  const profile = await getUserProfile()
  
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect('/')
  }
  
  return { session, profile }
}
