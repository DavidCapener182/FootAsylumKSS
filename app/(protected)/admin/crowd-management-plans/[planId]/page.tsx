import { requireCmpAccess } from '@/lib/cmp/access'
import { CmpSetupRequiredError, getCmpPlanEditorData } from '@/lib/cmp/data'
import { CmpSetupRequired } from '@/components/cmp/cmp-setup-required'
import { CmpPlanEditor } from '@/components/cmp/cmp-plan-editor'

export default async function CrowdManagementPlanEditorPage({
  params,
}: {
  params: { planId: string }
}) {
  await requireCmpAccess()
  try {
    const editorData = await getCmpPlanEditorData(params.planId)

    return <CmpPlanEditor initialData={editorData} />
  } catch (error) {
    if (error instanceof CmpSetupRequiredError) {
      return <CmpSetupRequired details={error.message} />
    }

    throw error
  }
}
