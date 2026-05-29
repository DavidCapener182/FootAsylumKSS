import { EmpMasterTemplatesClient } from '@/components/emp/emp-master-templates-client'
import { requireEmpAccess } from '@/lib/emp/access'
import { EmpSetupRequired } from '@/components/emp/emp-setup-required'
import { EmpSetupRequiredError, getEmpMasterTemplatePlanPrefill } from '@/lib/emp/data'
import {
  EMP_IRELAND_JOBS_TITLE,
  EMP_IRELAND_SIGN_IN_PRESET_ID,
  EMP_IRELAND_SIGN_IN_TEMPLATE_ID,
  buildIrelandSignInPrefillData,
  isIrelandSignInPreset,
} from '@/lib/emp/ireland-jobs'

export default async function CrowdManagementMasterTemplatesPage({
  searchParams,
}: {
  searchParams?: { planId?: string; preset?: string }
}) {
  await requireEmpAccess()

  const planId = String(searchParams?.planId || '').trim()
  const preset = String(searchParams?.preset || '').trim()

  try {
    if (isIrelandSignInPreset(preset)) {
      return (
        <EmpMasterTemplatesClient
          initialPresetId={EMP_IRELAND_SIGN_IN_PRESET_ID}
          initialPresetTitle={EMP_IRELAND_JOBS_TITLE}
          initialPresetPrefill={buildIrelandSignInPrefillData()}
          allowedTemplateIds={[EMP_IRELAND_SIGN_IN_TEMPLATE_ID]}
        />
      )
    }

    const initialPlanPrefill = planId ? await getEmpMasterTemplatePlanPrefill(planId) : null

    return <EmpMasterTemplatesClient initialPlanPrefill={initialPlanPrefill} />
  } catch (error) {
    if (error instanceof EmpSetupRequiredError) {
      return <EmpSetupRequired details={error.message} />
    }

    throw error
  }
}
