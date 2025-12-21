import { getUserProfile } from '@/lib/auth'
import { SidebarClient } from './sidebar-client'
import { SidebarProvider } from './sidebar-provider'

export async function Sidebar() {
  const profile = await getUserProfile()

  return (
    <SidebarProvider>
      <SidebarClient userRole={profile?.role || null} userProfile={profile} />
    </SidebarProvider>
  )
}
