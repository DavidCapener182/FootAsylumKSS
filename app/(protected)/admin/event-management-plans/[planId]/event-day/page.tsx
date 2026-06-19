import { EmpEventDayAdminClient } from '@/components/emp/event-day/emp-event-day-admin-client'
import { EmpSetupRequired } from '@/components/emp/emp-setup-required'
import { requireEmpAccess } from '@/lib/emp/access'
import { EmpSetupRequiredError } from '@/lib/emp/data'
import { getEmpEventDayAdminData } from '@/lib/emp/event-day-data'

export const dynamic = 'force-dynamic'

export default async function EmpEventDayOperationsPage({
  params,
}: {
  params: { planId: string }
}) {
  await requireEmpAccess()

  try {
    const initialData = await getEmpEventDayAdminData(params.planId)
    return <EmpEventDayAdminClient initialData={initialData} />
  } catch (error) {
    if (error instanceof EmpSetupRequiredError) {
      return <EmpSetupRequired details={error.message} />
    }
    throw error
  }
}
