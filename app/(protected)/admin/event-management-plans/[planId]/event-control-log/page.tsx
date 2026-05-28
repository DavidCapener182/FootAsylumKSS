import { EmpEventControlLogClient } from '@/components/emp/emp-event-control-log-client'
import { EmpSetupRequired } from '@/components/emp/emp-setup-required'
import { requireEmpAccess } from '@/lib/emp/access'
import { EmpSetupRequiredError, getEmpEventControlLogData } from '@/lib/emp/data'

export const dynamic = 'force-dynamic'

export default async function EmpEventControlLogPage({
  params,
}: {
  params: { planId: string }
}) {
  await requireEmpAccess()

  try {
    const initialData = await getEmpEventControlLogData(params.planId)

    return <EmpEventControlLogClient initialData={initialData} />
  } catch (error) {
    if (error instanceof EmpSetupRequiredError) {
      return <EmpSetupRequired details={error.message} />
    }

    throw error
  }
}
