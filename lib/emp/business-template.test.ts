import { describe, expect, it } from 'vitest'
import {
  EMP_BUSINESS_TEMPLATE_SELECTED_ANNEXES,
  EMP_BUSINESS_TEMPLATE_TITLE,
  buildEmpBusinessTemplateInitialValues,
  getEmpBusinessTemplatePlanMetadata,
} from '@/lib/emp/business-template'
import { EMP_DEMO_EVENT_NAME, EMP_DEMO_PLAN_TITLE } from '@/lib/emp/demo-plan'
import { EMP_MASTER_TEMPLATE_FIELDS } from '@/lib/emp/master-template'

describe('EMP business template', () => {
  it('creates generic defaults without Radio One event details', () => {
    const values = buildEmpBusinessTemplateInitialValues()
    const combined = Object.values(values).join('\n')

    expect(values.plan_title).toBe(EMP_BUSINESS_TEMPLATE_TITLE)
    expect(combined).not.toContain('BBC Radio 1')
    expect(combined).not.toContain('Radio One')
    expect(combined).not.toContain(EMP_DEMO_EVENT_NAME)
    expect(combined).not.toContain(EMP_DEMO_PLAN_TITLE)
  })

  it('covers template fields and starts with no selected annexes', () => {
    const values = buildEmpBusinessTemplateInitialValues()
    const documentStatusField = EMP_MASTER_TEMPLATE_FIELDS.find((field) => field.key === 'document_status')

    expect(Object.keys(values).sort()).toEqual(EMP_MASTER_TEMPLATE_FIELDS.map((field) => field.key).sort())
    expect(EMP_BUSINESS_TEMPLATE_SELECTED_ANNEXES).toEqual([])
    expect(documentStatusField?.options).toContain('V1')
  })

  it('seeds the standard command and contact structure for new template EMPs', () => {
    const values = buildEmpBusinessTemplateInitialValues()

    expect(values.named_command_roles).toContain('Event Director Gold')
    expect(values.named_command_roles).toContain('Event Director Silver')
    expect(values.named_command_roles).toContain('Event Manager Bronze')
    expect(values.key_contacts_directory).toContain('Security Manager Bronze')
    expect(values.key_contacts_directory).toContain('KSS Event Control / Logger')
  })

  it('uses metadata for a new editable plan rather than a source/example plan', () => {
    const metadata = getEmpBusinessTemplatePlanMetadata()

    expect(metadata.title).toBe(EMP_BUSINESS_TEMPLATE_TITLE)
    expect(metadata.eventName).toBeNull()
    expect(metadata.status).toBe('draft')
    expect(metadata.documentStatus).toBe('Draft')
    expect(metadata.selectedAnnexes).toEqual([])
  })
})
