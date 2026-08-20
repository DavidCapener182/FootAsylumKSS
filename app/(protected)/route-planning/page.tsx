import { requireRole } from '@/lib/auth'
import { RoutePlanningClient } from '@/components/route-planning/route-planning-client'
import { getRoutePlanningData } from '@/features/routes/query-service'

export default async function RoutePlanningPage() {
  await requireRole(['admin', 'ops'])
  return <RoutePlanningClient initialData={await getRoutePlanningData()} />
}
