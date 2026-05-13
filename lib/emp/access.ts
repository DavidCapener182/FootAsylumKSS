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

async function getEmpAdminProfile() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new EmpAccessError('Unauthorized')
  }

  const { data: profile, error: profileError } = await supabase
    .from('fa_profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new EmpAccessError('EMP profile not available')
  }

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

export async function getEmpUserContext() {
  const { user, profile } = await getEmpAdminProfile()
  const supabase = createAdminSupabaseClient()

  return {
    supabase,
    user,
    profile,
  }
}
