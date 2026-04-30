import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const EMP_ADMIN_EMAIL = 'david.capener@kssnwltd.co.uk'

export class EmpAccessError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'EmpAccessError'
  }
}

export function isEmpAllowedEmail(email: string | null | undefined): boolean {
  return String(email || '').trim().toLowerCase() === EMP_ADMIN_EMAIL
}

export function assertEmpAllowedEmail(email: string | null | undefined) {
  if (!isEmpAllowedEmail(email)) {
    throw new EmpAccessError('Unauthorized - EMP access is restricted')
  }
}

export async function requireEmpAccess() {
  const session = await requireAuth()

  if (!isEmpAllowedEmail(session.user.email)) {
    redirect('/')
  }

  return session
}

export async function getEmpUserContext() {
  const authSupabase = createClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) {
    throw new EmpAccessError('Unauthorized')
  }

  assertEmpAllowedEmail(user.email)

  const { data: profile, error: profileError } = await authSupabase
    .from('fa_profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new EmpAccessError('EMP profile not available')
  }

  const supabase = createAdminSupabaseClient()

  return {
    supabase,
    user,
    profile,
  }
}
