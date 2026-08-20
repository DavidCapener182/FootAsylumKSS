import { requireCmpAccess } from '@/lib/cmp/access'
import { CmpSetupRequiredError, getCmpPlanEditorData } from '@/lib/cmp/data'
import { CmpSetupRequired } from '@/components/cmp/cmp-setup-required'
import { CmpPlanEditor } from '@/components/cmp/cmp-plan-editor'
import { PlanLifecyclePanel } from '@/components/plans/plan-lifecycle-panel'
import { getPlanLifecycleData } from '@/features/plans/query-service'

export default async function CrowdManagementPlanEditorPage({
  params,
}: {
  params: { planId: string }
}) {
  await requireCmpAccess()
  try {
    const [editorData, lifecycleData] = await Promise.all([getCmpPlanEditorData(params.planId), getPlanLifecycleData('cmp', params.planId)])
    const requiredFields = editorData.fields.filter((field) => field.isRequired)
    const completedRequired = requiredFields.filter((field) => editorData.values.some((value) => value.fieldId === field.id && Boolean(value.valueText?.trim()))).length

    return <><PlanLifecyclePanel planType="cmp" initialData={lifecycleData} completedRequired={completedRequired} totalRequired={requiredFields.length} /><CmpPlanEditor initialData={editorData} /></>
  } catch (error) {
    if (error instanceof CmpSetupRequiredError) {
      return <CmpSetupRequired details={error.message} />
    }

    throw error
  }
}
