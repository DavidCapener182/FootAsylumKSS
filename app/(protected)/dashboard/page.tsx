import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { getDashboardData } from '@/features/dashboard/query-service'
import { requireRole } from '@/lib/auth'

export default async function DashboardPage() {
  const { profile } = await requireRole(['admin', 'ops', 'client', 'readonly'])
  const data = await getDashboardData(profile.id)

  return <DashboardClient initialData={data} profileName={profile.full_name} />
}
