import { requireAuth, getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { SidebarProvider } from '@/components/layout/sidebar-provider'

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
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-[#F6F6F8]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden md:ml-64">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="bg-white rounded-[20px] md:rounded-[30px] shadow-soft p-3 sm:p-4 md:p-6 lg:p-8 min-h-full max-w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

