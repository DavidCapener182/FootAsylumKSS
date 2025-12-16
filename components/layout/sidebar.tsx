import { SidebarClient } from './sidebar-client'
import { getUserProfile } from '@/lib/auth'

export async function Sidebar() {
  const profile = await getUserProfile()
  return <SidebarClient userRole={profile?.role} userProfile={profile} />
}
