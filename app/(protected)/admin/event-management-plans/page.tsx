import { requireEmpAccess } from '@/lib/emp/access'
import { EmpSetupRequiredError, listEmpPlans } from '@/lib/emp/data'
import { EmpSetupRequired } from '@/components/emp/emp-setup-required'
import { EmpWorkspace } from '@/components/emp/emp-workspace'

export default async function CrowdManagementPlansPage() {
  await requireEmpAccess()
  try {
    const plans = await listEmpPlans()

    return <EmpWorkspace plans={plans} />
  } catch (error) {
    if (error instanceof EmpSetupRequiredError) {
      return <EmpSetupRequired details={error.message} />
    }

    throw error
  }
}
