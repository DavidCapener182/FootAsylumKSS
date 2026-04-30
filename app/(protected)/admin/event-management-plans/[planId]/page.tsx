import { requireEmpAccess } from '@/lib/emp/access'
import { EmpSetupRequiredError, getEmpPlanEditorData } from '@/lib/emp/data'
import { EmpSetupRequired } from '@/components/emp/emp-setup-required'
import { EmpPlanEditor } from '@/components/emp/emp-plan-editor'

export default async function CrowdManagementPlanEditorPage({
  params,
}: {
  params: { planId: string }
}) {
  await requireEmpAccess()
  try {
    const editorData = await getEmpPlanEditorData(params.planId)

    return <EmpPlanEditor initialData={editorData} />
  } catch (error) {
    if (error instanceof EmpSetupRequiredError) {
      return <EmpSetupRequired details={error.message} />
    }

    throw error
  }
}
