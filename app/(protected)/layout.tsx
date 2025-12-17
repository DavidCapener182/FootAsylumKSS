import { requireAuth, getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAuth()
  const supabase = createClient()
  
  // Ensure profile exists
  const { data: profile } = await supabase
    .from('fa_profiles')
    .select('id')
    .eq('id', session.user.id)
    .single()

  if (!profile && session.user) {
    // Create profile with default readonly role
    await supabase
      .from('fa_profiles')
      .insert({
        id: session.user.id,
        full_name: session.user.email?.split('@')[0] || null,
        role: 'readonly',
      })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F6F6F8]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="bg-white rounded-[20px] sm:rounded-[30px] shadow-soft p-4 sm:p-6 md:p-8 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

