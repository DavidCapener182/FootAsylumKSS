import { requireEmpAccess } from '@/lib/emp/access'
import { EmpSetupRequiredError, getEmpPlanEditorData } from '@/lib/emp/data'
import { EmpSetupRequired } from '@/components/emp/emp-setup-required'
import { EmpPlanEditor } from '@/components/emp/emp-plan-editor'
import { PlanLifecyclePanel } from '@/components/plans/plan-lifecycle-panel'
import { getPlanLifecycleData } from '@/features/plans/query-service'

export default async function CrowdManagementPlanEditorPage({
  params,
}: {
  params: { planId: string }
}) {
  await requireEmpAccess()
  try {
    const [editorData, lifecycleData] = await Promise.all([getEmpPlanEditorData(params.planId), getPlanLifecycleData('emp', params.planId)])
    const requiredFields = editorData.fields.filter((field) => field.isRequired)
    const completedRequired = requiredFields.filter((field) => editorData.values.some((value) => value.fieldId === field.id && Boolean(value.valueText?.trim()))).length

    return <><PlanLifecyclePanel planType="emp" initialData={lifecycleData} completedRequired={completedRequired} totalRequired={requiredFields.length} /><EmpPlanEditor initialData={editorData} /></>
  } catch (error) {
    if (error instanceof EmpSetupRequiredError) {
      return <EmpSetupRequired details={error.message} />
    }

    throw error
  }
}
