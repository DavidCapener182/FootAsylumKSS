import { requireCmpAccess } from '@/lib/cmp/access'
import { CmpSetupRequiredError, listCmpPlans } from '@/lib/cmp/data'
import { CmpSetupRequired } from '@/components/cmp/cmp-setup-required'
import { CmpWorkspace } from '@/components/cmp/cmp-workspace'

export default async function CrowdManagementPlansPage() {
  await requireCmpAccess()
  try {
    const plans = await listCmpPlans()

    return <CmpWorkspace plans={plans} />
  } catch (error) {
    if (error instanceof CmpSetupRequiredError) {
      return <CmpSetupRequired details={error.message} />
    }

    throw error
  }
}
