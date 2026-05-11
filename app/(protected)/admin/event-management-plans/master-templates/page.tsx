import { EmpMasterTemplatesClient } from '@/components/emp/emp-master-templates-client'
import { requireEmpAccess } from '@/lib/emp/access'
import { EmpSetupRequired } from '@/components/emp/emp-setup-required'
import { EmpSetupRequiredError, getEmpMasterTemplatePlanPrefill } from '@/lib/emp/data'

export default async function CrowdManagementMasterTemplatesPage({
  searchParams,
}: {
  searchParams?: { planId?: string }
}) {
  await requireEmpAccess()

  const planId = String(searchParams?.planId || '').trim()

  try {
    const initialPlanPrefill = planId ? await getEmpMasterTemplatePlanPrefill(planId) : null

    return <EmpMasterTemplatesClient initialPlanPrefill={initialPlanPrefill} />
  } catch (error) {
    if (error instanceof EmpSetupRequiredError) {
      return <EmpSetupRequired details={error.message} />
    }

    throw error
  }
}
