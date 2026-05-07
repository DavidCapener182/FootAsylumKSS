import {
  EMP_ANNEX_DEFINITIONS,
  EMP_MASTER_TEMPLATE_FIELDS,
  EMP_MASTER_TEMPLATE_TITLE,
  type EmpAnnexKey,
  type EmpMasterTemplateField,
} from '@/lib/emp/master-template'

const clean = (value: unknown) => String(value || '').trim()

export const EMP_BUSINESS_TEMPLATE_TITLE = EMP_MASTER_TEMPLATE_TITLE
export const EMP_BUSINESS_TEMPLATE_EVENT_NAME = ''
export const EMP_BUSINESS_TEMPLATE_PLAN_STATUS = 'draft'
export const EMP_BUSINESS_TEMPLATE_DOCUMENT_STATUS = 'Draft'
export const EMP_BUSINESS_TEMPLATE_SELECTED_ANNEXES: EmpAnnexKey[] = []
export const EMP_BUSINESS_TEMPLATE_DESCRIPTION =
  'Reusable KSS business EMP template generated from the approved Radio One EMP framework with event-specific details left editable.'

export function buildEmpBusinessTemplateInitialValues(
  fields: Pick<EmpMasterTemplateField, 'key' | 'defaultValueText'>[] = EMP_MASTER_TEMPLATE_FIELDS
) {
  return Object.fromEntries(
    fields.map((field) => [
      field.key,
      field.key === 'plan_title'
        ? EMP_BUSINESS_TEMPLATE_TITLE
        : clean(field.defaultValueText),
    ])
  ) as Record<string, string>
}

export const EMP_BUSINESS_TEMPLATE_VALUES = buildEmpBusinessTemplateInitialValues()

export function getEmpBusinessTemplatePlanMetadata(values: Record<string, string> = EMP_BUSINESS_TEMPLATE_VALUES) {
  return {
    title: clean(values.plan_title) || EMP_BUSINESS_TEMPLATE_TITLE,
    eventName: EMP_BUSINESS_TEMPLATE_EVENT_NAME || null,
    status: EMP_BUSINESS_TEMPLATE_PLAN_STATUS,
    documentStatus: clean(values.document_status) || EMP_BUSINESS_TEMPLATE_DOCUMENT_STATUS,
    selectedAnnexes: EMP_BUSINESS_TEMPLATE_SELECTED_ANNEXES,
    includeKssProfileAppendix: false,
  }
}

export function isEmpBusinessTemplateSelectedAnnex(annexKey: string) {
  return EMP_ANNEX_DEFINITIONS.some((annex) => annex.key === annexKey)
}
