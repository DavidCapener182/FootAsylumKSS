import { getUserProfile } from '@/lib/auth'
import { SidebarClient } from './sidebar-client'

export async function Sidebar() {
  const profile = await getUserProfile()

  return <SidebarClient userRole={profile?.role || null} userProfile={profile} />
}
