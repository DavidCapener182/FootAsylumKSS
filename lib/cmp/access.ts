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

async function getCmpAdminProfile() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new CmpAccessError('Unauthorized')
  }

  const { data: profile, error: profileError } = await supabase
    .from('fa_profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new CmpAccessError('CMP profile not available')
  }

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
  const supabase = createClient()

  const { data: profile, error: profileError } = await supabase
    .from('fa_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    redirect('/')
  }

  return session
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
