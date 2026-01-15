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
  
  // Ensure profile exists and check role
  const { data: profile } = await supabase
    .from('fa_profiles')
    .select('id, role')
    .eq('id', session.user.id)
    .single()

  // Block access for pending users
  if (profile && profile.role === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Pending Approval</h1>
          <p className="text-gray-600 mb-6">
            Your account has been created but is pending admin approval. 
            You will be able to access the system once an administrator approves your account.
          </p>
          <p className="text-sm text-gray-500">
            If you have any questions, please contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  if (!profile && session.user) {
    // Get intended role from user metadata (set during sign-up)
    // New users default to 'pending' unless they're Foot Asylum client or explicitly set
    const intendedRole = session.user.user_metadata?.intended_role
    const defaultRole = (intendedRole === 'client' || intendedRole === 'admin' || intendedRole === 'ops') 
      ? intendedRole 
      : 'pending' // New users need admin approval
    
    // Use full_name from metadata if available, otherwise derive from email
    const fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || null
    
    // Create profile with intended role or default to pending
    await supabase
      .from('fa_profiles')
      .insert({
        id: session.user.id,
        full_name: fullName,
        role: defaultRole,
      })
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-[#0e1925]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden md:ml-64 bg-[#0e1925]">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-0 bg-[#0e1925]">
            <div className="bg-white rounded-[20px] md:rounded-tl-[8px] md:rounded-tr-[0px] md:rounded-bl-[0px] md:rounded-br-[0px] shadow-soft p-3 sm:p-4 md:p-6 lg:p-8 min-h-full max-w-full main-content-wrapper">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

