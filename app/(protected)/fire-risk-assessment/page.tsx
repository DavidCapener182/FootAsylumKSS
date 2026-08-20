import { requireRole } from '@/lib/auth'
import { FRATrackerClient } from '@/components/fra/fra-tracker-client'
import { getFraTrackerRows } from '@/features/fra/query-service'

export default async function FireRiskAssessmentPage() {
  const { profile } = await requireRole(['admin', 'ops', 'client', 'readonly'])
  const stores = await getFraTrackerRows()
  return <FRATrackerClient stores={stores} userRole={profile.role} />
}
