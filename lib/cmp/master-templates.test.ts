import { describe, expect, it } from 'vitest'
import {
  CMP_MASTER_TEMPLATES,
  getCmpMasterTemplateById,
  groupCmpMasterTemplatesByCategory,
} from '@/lib/cmp/master-templates'

describe('cmp master templates', () => {
  it('returns templates by id regardless of case or whitespace', () => {
    const template = getCmpMasterTemplateById('  INCIDENT-ACCIDENT-FORM ')

    expect(template?.title).toBe('Incident / Accident Form')
    expect(template?.filename).toBe('05_Incident_Accident_Form.pdf')
  })

  it('groups templates under stable categories', () => {
    const groups = groupCmpMasterTemplatesByCategory()
    const groupedIds = groups.flatMap((group) => group.templates).map((template) => template.id)

    expect(groups.map((group) => group.category)).toEqual(['Plans', 'Checklists', 'Logs', 'Briefings'])
    expect([...groupedIds].sort()).toEqual([...CMP_MASTER_TEMPLATES.map((template) => template.id)].sort())
  })

  it('keeps the original five approved PDFs unchanged', () => {
    expect(
      CMP_MASTER_TEMPLATES.slice(0, 5).map((template) => ({
        id: template.id,
        filename: template.filename,
      }))
    ).toEqual([
      { id: 'uniform-ppe-allocation-log', filename: '01_Uniform_PPE_Allocation_Log.pdf' },
      { id: 'radio-kit-sign-out-sheet', filename: '02_Radio_Kit_Sign_Out_Sheet.pdf' },
      { id: 'staff-sign-in-sign-out-sheet', filename: '03_Staff_Sign_In_Sheet.pdf' },
      { id: 'event-control-log', filename: '04_Event_Control_Log.pdf' },
      { id: 'incident-accident-form', filename: '05_Incident_Accident_Form.pdf' },
    ])
  })

  it('contains all fifteen crowd management documents', () => {
    expect(CMP_MASTER_TEMPLATES).toHaveLength(15)
  })
})
