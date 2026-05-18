import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export class EmpAccessError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'EmpAccessError'
  }
}

async function getEmpProfileForUser(userId: string) {
  const adminSupabase = createAdminSupabaseClient()
  const { data: profile, error: profileError } = await adminSupabase
    .from('fa_profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    throw new EmpAccessError('EMP profile not available')
  }

  return profile
}

async function getEmpAdminProfile() {
  const authSupabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await authSupabase.auth.getUser()

  if (userError || !user) {
    throw new EmpAccessError('Unauthorized')
  }

  const profile = await getEmpProfileForUser(user.id)
  if (profile.role !== 'admin') {
    throw new EmpAccessError('Unauthorized - EMP access is restricted to administrators')
  }

  return { user, profile }
}

export async function isCurrentEmpAdmin() {
  try {
    await getEmpAdminProfile()
    return true
  } catch {
    return false
  }
}

export async function requireEmpAccess() {
  const session = await requireAuth()
  const profile = await getEmpProfileForUser(session.user.id)

  if (profile.role !== 'admin') {
    redirect('/')
  }
}

export async function getEmpUserContext() {
  const { user, profile } = await getEmpAdminProfile()
  const supabase = createAdminSupabaseClient()

  return {
    supabase,
    user,
    profile,
  }
}
