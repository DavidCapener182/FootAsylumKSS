import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { accountHasApplicationAccess, type AccountStatus } from '@/lib/account-lifecycle'

// Return the trusted administrator-provisioned profile for the current user.
// This endpoint deliberately never creates a profile from user-controlled Auth metadata.
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('fa_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error loading profile:', error)
    return NextResponse.json({ error: 'Unable to verify account profile' }, { status: 500 })
  }

  if (!profile) {
    return NextResponse.json(
      { error: 'Account profile has not been provisioned by an administrator' },
      { status: 403 }
    )
  }

  if (!accountHasApplicationAccess(profile.account_status as AccountStatus)) {
    return NextResponse.json(
      { error: 'Account is not active', account_status: profile.account_status },
      { status: 403 }
    )
  }

  return NextResponse.json({ message: 'Profile verified', profile })
}
