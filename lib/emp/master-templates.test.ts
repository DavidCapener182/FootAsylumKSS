import { describe, expect, it } from 'vitest'
import {
  EMP_MASTER_TEMPLATES,
  EMP_VISIBLE_MASTER_TEMPLATES,
  getEmpMasterTemplateById,
  groupEmpMasterTemplatesByCategory,
} from '@/lib/emp/master-templates'

describe('emp master templates', () => {
  it('returns templates by id regardless of case or whitespace', () => {
    const template = getEmpMasterTemplateById('  INCIDENT-ACCIDENT-FORM ')

    expect(template?.title).toBe('Incident / Accident Form')
    expect(template?.filename).toBe('11_Incident_Accident_Form.pdf')
  })

  it('groups templates under stable categories', () => {
    const groups = groupEmpMasterTemplatesByCategory()
    const groupedIds = groups.flatMap((group) => group.templates).map((template) => template.id)

    expect(groups.map((group) => group.category)).toEqual(['Plans', 'Checklists', 'Logs', 'Briefings'])
    expect([...groupedIds].sort()).toEqual([...EMP_VISIBLE_MASTER_TEMPLATES.map((template) => template.id)].sort())
  })

  it('numbers active documents sequentially in displayed category order', () => {
    const displayedTemplates = groupEmpMasterTemplatesByCategory().flatMap((group) => group.templates)

    expect(
      displayedTemplates.map((template) => ({
        id: template.id,
        documentCode: template.documentCode,
        filename: template.filename,
      }))
    ).toEqual([
      { id: 'security-risk-assessment', documentCode: 'EMP-MT-01', filename: '01_Security_Risk_Assessment.pdf' },
      { id: 'emergency-action-plan-cover', documentCode: 'EMP-MT-02', filename: '02_Emergency_Action_Plan.pdf' },
      { id: 'uniform-ppe-allocation-log', documentCode: 'EMP-MT-03', filename: '03_Uniform_PPE_Allocation_Log.pdf' },
      { id: 'radio-kit-sign-out-sheet', documentCode: 'EMP-MT-04', filename: '04_Radio_Kit_Sign_Out_Sheet.pdf' },
      { id: 'staff-sign-in-sign-out-sheet', documentCode: 'EMP-MT-05', filename: '05_Staff_Sign_In_Sheet.pdf' },
      { id: 'deployment-matrix', documentCode: 'EMP-MT-06', filename: '06_Deployment_Matrix.pdf' },
      { id: 'supervisor-deployment', documentCode: 'EMP-MT-07', filename: '07_Supervisor_Deployment.pdf' },
      { id: 'shift-rota', documentCode: 'EMP-MT-08', filename: '08_Shift_Rota.pdf' },
      { id: 'contact-and-cascade-list', documentCode: 'EMP-MT-09', filename: '09_Contact_Cascade_List.pdf' },
      { id: 'equipment-check-in-kit-return', documentCode: 'EMP-MT-10', filename: '10_Equipment_Check_In.pdf' },
      { id: 'incident-accident-form', documentCode: 'EMP-MT-11', filename: '11_Incident_Accident_Form.pdf' },
      { id: 'refusal-of-entry-ejection-log', documentCode: 'EMP-MT-12', filename: '12_Refusal_Ejection_Log.pdf' },
      { id: 'suspicious-item-concern-report', documentCode: 'EMP-MT-13', filename: '13_Suspicious_Item_Report.pdf' },
      { id: 'duty-manager-debrief', documentCode: 'EMP-MT-15', filename: '15_Duty_Manager_Debrief.pdf' },
      { id: 'radio-one-daily-security-brief', documentCode: 'EMP-MT-16', filename: '16_Radio_One_Event_Week_Security_Brief_Booklet.pdf' },
    ])
  })

  it('contains all sixteen event management documents', () => {
    expect(EMP_MASTER_TEMPLATES).toHaveLength(16)
    expect(EMP_MASTER_TEMPLATES.map((template) => template.id)).not.toContain('event-control-log')
  })

  it('hides the standard daily security brief from document lists but keeps direct lookup', () => {
    const displayedTemplates = groupEmpMasterTemplatesByCategory().flatMap((group) => group.templates)
    const hiddenTemplate = getEmpMasterTemplateById('daily-security-brief')

    expect(hiddenTemplate?.title).toBe('Daily Security Brief')
    expect(hiddenTemplate?.hiddenFromDocuments).toBe(true)
    expect(displayedTemplates.map((template) => template.id)).not.toContain('daily-security-brief')
    expect(EMP_VISIBLE_MASTER_TEMPLATES.map((template) => template.id)).not.toContain('daily-security-brief')
  })

  it('adds a dedicated Radio One event week security briefing booklet', () => {
    const template = getEmpMasterTemplateById('radio-one-daily-security-brief')

    expect(template?.kind).toBe('radio_one_daily_brief_booklet')
    expect(template?.category).toBe('Briefings')
    expect(template?.filename).toBe('16_Radio_One_Event_Week_Security_Brief_Booklet.pdf')
  })

  it('keeps employer agency off the staff sign-in sheet', () => {
    const template = getEmpMasterTemplateById('staff-sign-in-sign-out-sheet')

    expect(template?.kind).toBe('table')
    if (template?.kind !== 'table') return

    expect(template.infoFields.map((field) => field.label)).toContain('Company')
    expect(template.columns.map((column) => column.label)).not.toContain('Employer / Agency')
    expect(template.columns.map((column) => column.key)).toEqual([
      'staff_name',
      'sia_badge_number',
      'expiry_date',
      'shift_start',
      'shift_end',
      'time_in',
      'signature_in',
      'time_out',
      'signature_out',
    ])
  })

  it('keeps staff and company names off the blank PPE and radio sheets', () => {
    const uniformTemplate = getEmpMasterTemplateById('uniform-ppe-allocation-log')
    const radioTemplate = getEmpMasterTemplateById('radio-kit-sign-out-sheet')

    expect(uniformTemplate?.kind).toBe('table')
    expect(radioTemplate?.kind).toBe('table')
    if (uniformTemplate?.kind !== 'table' || radioTemplate?.kind !== 'table') return

    expect(uniformTemplate.infoFields.map((field) => field.label)).not.toContain('Company')
    expect(radioTemplate.infoFields.map((field) => field.label)).not.toContain('Company')
    expect(uniformTemplate.emptyRows).toBe(12)
    expect(radioTemplate.emptyRows).toBe(12)
  })

  it('adds supervisor deployment after the main deployment matrix', () => {
    const templateIds = EMP_MASTER_TEMPLATES.map((template) => template.id)
    const deploymentIndex = templateIds.indexOf('deployment-matrix')
    const supervisorIndex = templateIds.indexOf('supervisor-deployment')
    const template = getEmpMasterTemplateById('supervisor-deployment')

    expect(supervisorIndex).toBe(deploymentIndex + 1)
    expect(template?.kind).toBe('table')
    if (template?.kind !== 'table') return

    expect(template.documentCode).toBe('EMP-MT-07')
    expect(getEmpMasterTemplateById('deployment-matrix')?.kind).toBe('table')
    const deploymentTemplate = getEmpMasterTemplateById('deployment-matrix')
    if (deploymentTemplate?.kind !== 'table') return

    expect(deploymentTemplate.columns.map((column) => column.key)).not.toContain('notes')
    expect(deploymentTemplate.columns.map((column) => column.key)).not.toContain('required')
    expect(deploymentTemplate.orientation).toBe('portrait')
    expect(deploymentTemplate.emptyRows).toBe(23)
    expect(template.columns.map((column) => column.key)).not.toContain('notes')
    expect(template.infoFields.map((field) => field.label)).toEqual([
      'Event Name',
      'Date',
      'Supervisor / Zone',
      'Prepared By',
    ])
  })
})
