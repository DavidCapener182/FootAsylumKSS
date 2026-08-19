import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { SidebarProvider } from '@/components/layout/sidebar-provider'
import { Toaster } from '@/components/ui/toaster'
import { ReleaseNotesModal } from '@/components/ReleaseNotesModal'
import { accountHasApplicationAccess, type AccountStatus } from '@/lib/account-lifecycle'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAuth()
  const supabase = createClient()
  
  // Ensure profile exists and check role
  const { data: profile, error: profileError } = await supabase
    .from('fa_profiles')
    .select('id, role, account_status')
    .eq('id', session.user.id)
    .maybeSingle()

  // Profiles and roles are provisioned only by a trusted administrator. An
  // authenticated Auth user without a profile must never inherit app access.
  if (
    profileError
    || !profile
    || !accountHasApplicationAccess(profile.account_status as AccountStatus)
    || profile.role === 'pending'
  ) {
    if (profileError) {
      console.error('Unable to verify the authenticated user profile:', profileError)
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Account Access Unavailable</h1>
          <p className="mb-6 text-gray-600">
            Your account is not currently active. Ask your system administrator to complete your
            invitation, approval, or reactivation before trying again.
          </p>
          <p className="text-sm text-gray-500">
            No operational data is available until your account has active status.
          </p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-[100dvh] bg-[#071321] md:h-[100dvh] md:min-h-0 md:overflow-hidden">
        <Sidebar />
        <div className="flex min-h-[100dvh] w-full min-w-0 flex-1 flex-col overflow-x-hidden bg-[#0e1925] md:ml-64 md:min-h-0 md:overflow-hidden">
          <Header />
          <main className="box-border w-full min-w-0 max-w-full flex-1 overflow-x-hidden bg-[#edf2f7] px-3.5 pb-[calc(12rem+env(safe-area-inset-bottom))] pt-[calc(var(--mobile-header-height,0px)+1rem)] sm:px-4 sm:pt-[calc(var(--mobile-header-height,0px)+1rem)] md:min-h-0 md:overflow-y-auto md:bg-[#0e1925] md:p-0 md:[-webkit-overflow-scrolling:touch]">
            <div className="max-w-full overflow-x-hidden bg-transparent p-0 md:min-h-full main-content-wrapper">
              {children}
            </div>
          </main>
        </div>
      </div>
      <MobileTabBar userRole={profile?.role || null} />
      <ReleaseNotesModal />
      <Toaster />
    </SidebarProvider>
  )
}
