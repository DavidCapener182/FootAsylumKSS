import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'admin' | 'ops' | 'readonly'

export interface UserProfile {
  id: string
  full_name: string | null
  role: UserRole
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
    .single()

  if (error || !profile) return null

  return profile
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
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


