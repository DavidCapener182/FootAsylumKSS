import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminClient } from '@/components/admin/admin-client'

const ADMIN_EMAIL = 'david.capener@kssnwltd.co.uk'

export default async function AdminPage() {
  const session = await requireAuth()
  const supabase = createClient()

  // Check if user is the admin email
  if (session.user.email !== ADMIN_EMAIL) {
    redirect('/')
  }

  // Verify user has admin role in profile
  const { data: profile } = await supabase
    .from('fa_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  // If profile doesn't exist or role is not admin, ensure it's set to admin
  if (!profile || profile.role !== 'admin') {
    // Update or create profile with admin role
    const { data: existingProfile } = await supabase
      .from('fa_profiles')
      .select('id')
      .eq('id', session.user.id)
      .single()

    if (existingProfile) {
      await supabase
        .from('fa_profiles')
        .update({ role: 'admin' })
        .eq('id', session.user.id)
    } else {
      await supabase
        .from('fa_profiles')
        .insert({
          id: session.user.id,
          full_name: session.user.email?.split('@')[0] || null,
          role: 'admin',
        })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage user roles and permissions. Only accessible to administrators.
        </p>
      </div>

      <AdminClient />
    </div>
  )
}
