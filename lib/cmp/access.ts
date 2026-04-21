import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const CMP_ADMIN_EMAIL = 'david.capener@kssnwltd.co.uk'

export class CmpAccessError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'CmpAccessError'
  }
}

export function isCmpAllowedEmail(email: string | null | undefined): boolean {
  return String(email || '').trim().toLowerCase() === CMP_ADMIN_EMAIL
}

export function assertCmpAllowedEmail(email: string | null | undefined) {
  if (!isCmpAllowedEmail(email)) {
    throw new CmpAccessError('Unauthorized - CMP access is restricted')
  }
}

export async function requireCmpAccess() {
  const session = await requireAuth()

  if (!isCmpAllowedEmail(session.user.email)) {
    redirect('/')
  }

  return session
}

export async function getCmpUserContext() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new CmpAccessError('Unauthorized')
  }

  assertCmpAllowedEmail(user.email)

  const { data: profile, error: profileError } = await supabase
    .from('fa_profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new CmpAccessError('CMP profile not available')
  }

  return {
    supabase,
    user,
    profile,
  }
}
