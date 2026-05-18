import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export class CmpAccessError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'CmpAccessError'
  }
}

async function getCmpProfileForUser(userId: string) {
  const adminSupabase = createAdminSupabaseClient()
  const { data: profile, error: profileError } = await adminSupabase
    .from('fa_profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    throw new CmpAccessError('CMP profile not available')
  }

  return profile
}

async function getCmpAdminProfile() {
  const authSupabase = createClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) {
    throw new CmpAccessError('Unauthorized')
  }

  const profile = await getCmpProfileForUser(user.id)
  if (profile.role !== 'admin') {
    throw new CmpAccessError('Unauthorized - CMP access is restricted to administrators')
  }

  return { user, profile }
}

export async function isCurrentCmpAdmin() {
  try {
    await getCmpAdminProfile()
    return true
  } catch {
    return false
  }
}

export async function requireCmpAccess() {
  const session = await requireAuth()
  const profile = await getCmpProfileForUser(session.user.id)

  if (profile.role !== 'admin') {
    redirect('/')
  }
}

export async function getCmpUserContext() {
  const { user, profile } = await getCmpAdminProfile()
  const supabase = createAdminSupabaseClient()

  return {
    supabase,
    user,
    profile,
  }
}