import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Create or update user profile on first login
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('fa_profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existingProfile) {
    return NextResponse.json({ message: 'Profile already exists' })
  }

  // Create profile with default pending role (needs admin approval)
  // Check if user metadata has intended_role
  const intendedRole = user.user_metadata?.intended_role
  const defaultRole = (intendedRole === 'client' || intendedRole === 'admin' || intendedRole === 'ops')
    ? intendedRole
    : 'pending'
  
  const { data: profile, error } = await supabase
    .from('fa_profiles')
    .insert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
      role: defaultRole,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }

  return NextResponse.json({ profile })
}


