export type EmpMasterTemplateCategory = 'Plans' | 'Checklists' | 'Logs' | 'Briefings'

export type EmpMasterTemplateOrientation = 'landscape' | 'portrait'

export type EmpMasterTemplateTone = 'neutral' | 'positive' | 'negative'

export type EmpMasterTemplateNoticeTone = 'info' | 'warning' | 'danger'

export type EmpMasterTemplateTitleTone = 'default' | 'warning' | 'danger'

export type EmpMasterTemplateIconKey =
  | 'shield'
  | 'radio'
  | 'users'
  | 'list'
  | 'alert'
  | 'map'
  | 'phone'
  | 'clock'
  | 'message'
  | 'clipboard'
  | 'user-minus'
  | 'eye'
  | 'document'
  | 'team'

export type EmpMasterTemplateNotice = {
  tone: EmpMasterTemplateNoticeTone
  title?: string
  body: string | string[]
}

type EmpMasterTemplateBase = {
  id: string
  documentCode: string
  order: number
  category: EmpMasterTemplateCategory
  icon: EmpMasterTemplateIconKey
  title: string
  description: string
  filename: string
  orientation: EmpMasterTemplateOrientation
  notice?: EmpMasterTemplateNotice
  titleTone?: EmpMasterTemplateTitleTone
}

export type EmpMasterTemplateField = {
  label: string
}

export type EmpMasterTemplateTableColumn = {
  key: string
  label: string
  width: string
  align?: 'left' | 'center'
  tone?: EmpMasterTemplateTone
}

export type EmpMasterTemplateTable = EmpMasterTemplateBase & {
  kind: 'table'
  infoFields: EmpMasterTemplateField[]
  columns: EmpMasterTemplateTableColumn[]
  emptyRows: number
  footerNote?: string
  footerRight?: string
  rowHeightClass?: string
}

export type EmpMasterTemplateIncidentForm = EmpMasterTemplateBase & {
  kind: 'incident_form'
  infoRows: Array<[string, string]>
  categories: string[]
}

export type EmpMasterTemplateNarrativeSection =
  | {
      type: 'textbox'
      title: string
      heightClass: string
      tone?: EmpMasterTemplateNoticeTone
    }
  | {
      type: 'key_lines'
      title: string
      fields: Array<{ label: string; tone?: 'default' | 'danger' | 'success' }>
    }
  | {
      type: 'numbered_lines'
      title: string
      count: number
    }

export type EmpMasterTemplateNarrativeForm = EmpMasterTemplateBase & {
  kind: 'narrative_form'
  headerFields: EmpMasterTemplateField[]
  sections: EmpMasterTemplateNarrativeSection[]
}

export type EmpMasterTemplateEmergencyActionPlan = EmpMasterTemplateBase & {
  kind: 'emergency_action_plan'
  infoRows: Array<[string, string]>
  escalationSteps: Array<{ label: string; body: string }>
  emergencyContactRows: number
}

export type EmpMasterTemplateSuspiciousItemReport = EmpMasterTemplateBase & {
  kind: 'suspicious_item_report'
  infoRows: Array<[string, string]>
  hotQuestions: string[]
}

export type EmpMasterTemplateDefinition =
  | EmpMasterTemplateTable
  | EmpMasterTemplateIncidentForm
  | EmpMasterTemplateNarrativeForm
  | EmpMasterTemplateEmergencyActionPlan
  | EmpMasterTemplateSuspiciousItemReport

export const EMP_MASTER_TEMPLATE_CATEGORIES: EmpMasterTemplateCategory[] = [
  'Plans',
  'Checklists',
  'Logs',
  'Briefings',
]

export const EMP_MASTER_TEMPLATES: EmpMasterTemplateDefinition[] = [
  {
    id: 'uniform-ppe-allocation-log',
    documentCode: 'EMP-MT-01',
    order: 1,
    category: 'Checklists',
    icon: 'shield',
    title: 'Uniform & PPE Allocation Log',
    description: 'Issue, return, and accountability sheet for hi-vis and supporting PPE.',
    filename: '01_Uniform_PPE_Allocation_Log.pdf',
    orientation: 'landscape',
    kind: 'table',
    infoFields: [
      { label: 'Event Name / Code' },
      { label: 'Date' },
      { label: 'Sheet Managed By' },
    ],
    columns: [
      { key: 'staff_name', label: 'Staff Name', width: '14%' },
      { key: 'employer', label: 'Employer / Agency', width: '11%' },
      { key: 'hivis_type', label: 'Hi-Vis Type / Colour', width: '12%' },
      { key: 'size', label: 'Size', width: '6%', align: 'center' },
      { key: 'other_ppe', label: 'Other PPE', width: '10%' },
      { key: 'time_out', label: 'Time Out', width: '7%', align: 'center' },
      { key: 'signature_out', label: 'Staff Signature (Out)', width: '13%' },
      { key: 'time_in', label: 'Time In', width: '7%', align: 'center' },
      { key: 'initials_in', label: 'Supv Initials (In)', width: '10%', align: 'center' },
      { key: 'notes', label: 'Notes', width: '10%' },
    ],
    emptyRows: 15,
    footerNote:
      'Ensure all staff return hi-vis items at the end of their shift. Missing items should be recorded and escalated to the relevant provider.',
  },
  {
    id: 'radio-kit-sign-out-sheet',
    documentCode: 'EMP-MT-02',
    order: 2,
    category: 'Checklists',
    icon: 'radio',
    title: 'Radio & Kit Sign-out Sheet',
    description: 'Operational handover sheet for comms equipment, call signs, and additional issue kit.',
    filename: '02_Radio_Kit_Sign_Out_Sheet.pdf',
    orientation: 'landscape',
    kind: 'table',
    infoFields: [
      { label: 'Event Name / Code' },
      { label: 'Date' },
      { label: 'Comms Manager' },
    ],
    columns: [
      { key: 'staff_name', label: 'Staff Name', width: '13%' },
      { key: 'call_sign', label: 'Call Sign / Zone', width: '11%' },
      { key: 'radio_id', label: 'Radio ID #', width: '8%', align: 'center' },
      { key: 'earpiece', label: 'Earpiece?', width: '8%', align: 'center' },
      { key: 'extra_kit', label: 'Extra Kit (Pack / Keys)', width: '14%' },
      { key: 'time_out', label: 'Time Out', width: '7%', align: 'center' },
      { key: 'signature_out', label: 'Signature (Out)', width: '12%' },
      { key: 'time_in', label: 'Time In', width: '7%', align: 'center' },
      { key: 'supervisor', label: 'Supv Initials', width: '8%', align: 'center' },
      { key: 'faults', label: 'Faults / Missing', width: '12%' },
    ],
    emptyRows: 15,
    footerNote:
      'By signing out equipment, staff accept responsibility for safe return and immediate reporting of faults, swaps, or missing items.',
    footerRight: 'Page ___ of ___',
  },
  {
    id: 'staff-sign-in-sign-out-sheet',
    documentCode: 'EMP-MT-03',
    order: 3,
    category: 'Checklists',
    icon: 'users',
    title: 'Staff Sign-in / Sign-out Sheet',
    description: 'Attendance control sheet for deployed staff, agencies, SIA badge tracking, and final sign-off.',
    filename: '03_Staff_Sign_In_Sheet.pdf',
    orientation: 'landscape',
    kind: 'table',
    infoFields: [
      { label: 'Event Name / Code' },
      { label: 'Date' },
      { label: 'Location / Venue' },
    ],
    columns: [
      { key: 'staff_name', label: 'Staff Name', width: '14%' },
      { key: 'employer', label: 'Employer / Agency', width: '11%' },
      { key: 'role', label: 'SIA Badge Number', width: '11%' },
      { key: 'zone', label: 'Expiry Date', width: '11%' },
      { key: 'shift_start', label: 'Shift Start', width: '7%', align: 'center' },
      { key: 'shift_end', label: 'Shift End', width: '7%', align: 'center' },
      { key: 'time_in', label: 'Time In', width: '7%', align: 'center', tone: 'positive' },
      { key: 'signature_in', label: 'Signature (In)', width: '12%', tone: 'positive' },
      { key: 'time_out', label: 'Time Out', width: '7%', align: 'center', tone: 'negative' },
      { key: 'signature_out', label: 'Signature (Out)', width: '13%', tone: 'negative' },
    ],
    emptyRows: 14,
  },
  {
    id: 'event-control-log',
    documentCode: 'EMP-MT-04',
    order: 4,
    category: 'Logs',
    icon: 'list',
    title: 'Event Control Log',
    description: 'Decision log for incidents, operational updates, actions, and status tracking in control.',
    filename: '04_Event_Control_Log.pdf',
    orientation: 'landscape',
    kind: 'table',
    infoFields: [
      { label: 'Event Name' },
      { label: 'Date' },
      { label: 'Controller Name' },
      { label: 'Page Number' },
    ],
    columns: [
      { key: 'time', label: 'Time', width: '8%', align: 'center' },
      { key: 'source', label: 'Source / Call Sign', width: '14%' },
      { key: 'detail', label: 'Message / Incident Detail', width: '33%' },
      { key: 'action', label: 'Action Taken', width: '22%' },
      { key: 'owner', label: 'Owner', width: '11%' },
      { key: 'status', label: 'Status', width: '12%', align: 'center' },
    ],
    emptyRows: 16,
  },
  {
    id: 'incident-accident-form',
    documentCode: 'EMP-MT-05',
    order: 5,
    category: 'Logs',
    icon: 'alert',
    title: 'Incident / Accident Form',
    description: 'Single-record form for incident facts, actions taken, witness detail, and supervisor review.',
    filename: '05_Incident_Accident_Form.pdf',
    orientation: 'portrait',
    kind: 'incident_form',
    infoRows: [
      ['Event Name', 'Date of Incident'],
      ['Time of Incident', 'Exact Location / Zone'],
      ['Reported By (Staff)', 'Call Sign'],
    ],
    categories: [
      'Medical / Injury',
      'Public Disorder / Fight',
      'Ejection / Refusal',
      'Lost / Found Child or Vulnerable Person',
      'Breach of Perimeter',
      'Missing / Damaged Equipment',
      'Suspicious Item',
      'Slip, Trip, or Fall',
      'Other',
    ],
  },
  {
    id: 'security-risk-assessment',
    documentCode: 'EMP-MT-06',
    order: 6,
    category: 'Plans',
    icon: 'map',
    title: 'Security Risk Assessment',
    description: 'Assessment register for hazards, controls, residual risk, and follow-up security actions.',
    filename: '06_Security_Risk_Assessment.pdf',
    orientation: 'landscape',
    kind: 'table',
    infoFields: [
      { label: 'Event Name' },
      { label: 'Assessor Name' },
      { label: 'Date Assessed' },
      { label: 'Review Date' },
    ],
    columns: [
      { key: 'hazard', label: 'Hazard Identified', width: '16%' },
      { key: 'who', label: 'Who might be harmed?', width: '14%' },
      { key: 'controls', label: 'Existing Controls', width: '23%' },
      { key: 'risk', label: 'Risk Rating', width: '8%', align: 'center' },
      { key: 'action_required', label: 'Further Action Required', width: '22%' },
      { key: 'action_by', label: 'Action By', width: '8%' },
      { key: 'status', label: 'Status', width: '9%' },
    ],
    emptyRows: 12,
  },
  {
    id: 'emergency-action-plan-cover',
    documentCode: 'EMP-MT-07',
    order: 7,
    category: 'Plans',
    icon: 'alert',
    title: 'Emergency Action Plan (EAP) Cover',
    description: 'Quick-reference escalation sheet for Event Control, command decisions, and emergency contacts.',
    filename: '07_Emergency_Action_Plan.pdf',
    orientation: 'portrait',
    kind: 'emergency_action_plan',
    titleTone: 'danger',
    notice: {
      tone: 'danger',
      body:
        'In the event of a major incident, Event Control maintains primacy until formal handover to emergency services.',
    },
    infoRows: [
      ['Event Name', 'Silver Commander'],
      ['Emergency RV Point (RVP)', 'Evac Code Word'],
    ],
    escalationSteps: [
      {
        label: '1. Assess',
        body:
          'Gather METHANE information: major incident status, exact location, incident type, hazards, access, casualty numbers, and emergency services required.',
      },
      {
        label: '2. Escalate',
        body: 'Control Room notifies the Duty Manager immediately via the command channel.',
      },
      {
        label: '3. Dispatch',
        body: 'Deploy the response team and medics to assess, contain, and report back.',
      },
      {
        label: '4. Communicate',
        body:
          'Issue the standby code word to staff, hold non-essential movement, and stop music if directed by Silver Commander.',
      },
    ],
    emergencyContactRows: 6,
  },
  {
    id: 'deployment-matrix',
    documentCode: 'EMP-MT-08',
    order: 8,
    category: 'Checklists',
    icon: 'team',
    title: 'Deployment Matrix',
    description: 'Zone-by-zone staffing matrix covering posts, supervisors, timings, and brief notes.',
    filename: '08_Deployment_Matrix.pdf',
    orientation: 'landscape',
    kind: 'table',
    infoFields: [
      { label: 'Event Name' },
      { label: 'Date' },
      { label: 'Prepared By' },
    ],
    columns: [
      { key: 'zone', label: 'Zone', width: '10%' },
      { key: 'position', label: 'Post / Position', width: '15%' },
      { key: 'required', label: 'Req #', width: '7%', align: 'center' },
      { key: 'assigned', label: 'Assigned Staff Names', width: '22%' },
      { key: 'supervisor', label: 'Supervisor', width: '13%' },
      { key: 'start', label: 'Start', width: '8%', align: 'center' },
      { key: 'end', label: 'End', width: '8%', align: 'center' },
      { key: 'notes', label: 'Briefing / Specific Notes', width: '17%' },
    ],
    emptyRows: 15,
  },
  {
    id: 'shift-rota',
    documentCode: 'EMP-MT-09',
    order: 9,
    category: 'Checklists',
    icon: 'clock',
    title: 'Shift Rota',
    description: 'Shift, break, and relief tracker for supervisors managing live-event staffing.',
    filename: '09_Shift_Rota.pdf',
    orientation: 'landscape',
    kind: 'table',
    infoFields: [],
    columns: [
      { key: 'staff_name', label: 'Staff Name', width: '18%' },
      { key: 'zone', label: 'Zone', width: '12%' },
      { key: 'shift_start', label: 'Shift Start', width: '9%', align: 'center' },
      { key: 'shift_end', label: 'Shift End', width: '9%', align: 'center' },
      { key: 'break_1', label: 'Break 1', width: '9%', align: 'center' },
      { key: 'break_2', label: 'Break 2', width: '9%', align: 'center' },
      { key: 'relief', label: 'Relief Covered By', width: '16%' },
      { key: 'supervisor', label: 'Supervisor Checked', width: '18%' },
    ],
    emptyRows: 15,
  },
  {
    id: 'contact-and-cascade-list',
    documentCode: 'EMP-MT-10',
    order: 10,
    category: 'Checklists',
    icon: 'phone',
    title: 'Contact and Cascade List',
    description: 'Restricted contact register for command roles, radio details, and key escalation points.',
    filename: '10_Contact_Cascade_List.pdf',
    orientation: 'landscape',
    kind: 'table',
    titleTone: 'danger',
    notice: {
      tone: 'danger',
      title: 'Restricted Document',
      body: 'Do not distribute this contact list beyond Event Control, senior supervisors, or authorised command staff.',
    },
    infoFields: [],
    columns: [
      { key: 'role', label: 'Role', width: '24%' },
      { key: 'name', label: 'Name', width: '24%' },
      { key: 'mobile', label: 'Mobile Number', width: '20%' },
      { key: 'radio_channel', label: 'Radio Channel', width: '16%' },
      { key: 'call_sign', label: 'Call Sign', width: '16%' },
    ],
    emptyRows: 15,
  },
  {
    id: 'equipment-check-in-kit-return',
    documentCode: 'EMP-MT-11',
    order: 11,
    category: 'Checklists',
    icon: 'clipboard',
    title: 'Equipment Check-in / Kit Return',
    description: 'End-of-shift asset return tracker for issued kit, condition, shortages, and damage notes.',
    filename: '11_Equipment_Check_In.pdf',
    orientation: 'landscape',
    kind: 'table',
    infoFields: [],
    columns: [
      { key: 'asset_id', label: 'Asset ID', width: '8%' },
      { key: 'description', label: 'Description', width: '15%' },
      { key: 'qty_out', label: 'Qty Out', width: '6%', align: 'center' },
      { key: 'cond_out', label: 'Cond Out', width: '8%', align: 'center' },
      { key: 'issued_to', label: 'Issued To', width: '13%' },
      { key: 'time_out', label: 'Time Out', width: '7%', align: 'center' },
      { key: 'qty_in', label: 'Qty In', width: '6%', align: 'center' },
      { key: 'cond_in', label: 'Cond In', width: '8%', align: 'center' },
      { key: 'damage_note', label: 'Missing / Damage Note', width: '16%' },
      { key: 'checked_by', label: 'Checked By', width: '13%' },
    ],
    emptyRows: 15,
  },
  {
    id: 'refusal-of-entry-ejection-log',
    documentCode: 'EMP-MT-12',
    order: 12,
    category: 'Logs',
    icon: 'user-minus',
    title: 'Refusal of Entry / Ejection Log',
    description: 'Record of refusals, ejections, reasons, involved staff, and any police handover.',
    filename: '12_Refusal_Ejection_Log.pdf',
    orientation: 'landscape',
    kind: 'table',
    infoFields: [
      { label: 'Event Name' },
      { label: 'Gate / Zone' },
      { label: 'Supervisor' },
    ],
    columns: [
      { key: 'time', label: 'Time', width: '7%', align: 'center' },
      { key: 'type', label: 'Type', width: '10%' },
      { key: 'person', label: 'Description of Person(s) / Name', width: '21%' },
      { key: 'reason', label: 'Reason', width: '17%' },
      { key: 'staff', label: 'SIA Staff Involved', width: '14%' },
      { key: 'force', label: 'Force Used?', width: '8%', align: 'center' },
      { key: 'police', label: 'Police Handover?', width: '8%', align: 'center' },
      { key: 'supervisor_initial', label: 'Supervisor Initial', width: '15%' },
    ],
    emptyRows: 15,
  },
  {
    id: 'suspicious-item-concern-report',
    documentCode: 'EMP-MT-13',
    order: 13,
    category: 'Logs',
    icon: 'eye',
    title: 'Suspicious Item / Concern Report',
    description: 'Observation form for suspicious items or behaviour, HOT assessment, and escalation record.',
    filename: '13_Suspicious_Item_Report.pdf',
    orientation: 'portrait',
    kind: 'suspicious_item_report',
    titleTone: 'warning',
    infoRows: [
      ['Event', 'Date / Time'],
      ['Reported By', 'Exact Location'],
    ],
    hotQuestions: [
      'Is the item hidden deliberately?',
      'Is the item obviously suspicious?',
      'Is the item typical for this environment?',
    ],
  },
  {
    id: 'daily-security-brief',
    documentCode: 'EMP-MT-14',
    order: 14,
    category: 'Briefings',
    icon: 'message',
    title: 'Daily Security Brief',
    description: 'Shift-start briefing sheet covering operational focus, intelligence, and emergency reminders.',
    filename: '14_Daily_Security_Brief.pdf',
    orientation: 'portrait',
    kind: 'narrative_form',
    headerFields: [
      { label: 'Event Name & Date' },
      { label: 'Duty Security Manager' },
    ],
    sections: [
      {
        type: 'textbox',
        title: '1. Event Overview & Audience Profile',
        heightClass: 'h-[70px]',
      },
      {
        type: 'textbox',
        title: '2. Weather, Sunset, and Environment',
        heightClass: 'h-[54px]',
      },
      {
        type: 'textbox',
        title: '3. Site Updates, Hot Spots & Queue Pinch Points',
        heightClass: 'h-[98px]',
      },
      {
        type: 'textbox',
        title: '4. Intelligence & Specific Threat Warnings',
        heightClass: 'h-[70px]',
      },
      {
        type: 'key_lines',
        title: '5. Emergency Reminders',
        fields: [
          { label: 'Medical Location' },
          { label: 'Welfare / Lost Child' },
          { label: 'Evacuation Code Word', tone: 'danger' },
          { label: 'Stand-down Code Word', tone: 'success' },
        ],
      },
    ],
  },
  {
    id: 'duty-manager-debrief',
    documentCode: 'EMP-MT-15',
    order: 15,
    category: 'Briefings',
    icon: 'document',
    title: 'Duty Manager Debrief',
    description: 'Post-event debrief sheet for successes, issues, agency feedback, and next-event actions.',
    filename: '15_Duty_Manager_Debrief.pdf',
    orientation: 'portrait',
    kind: 'narrative_form',
    headerFields: [
      { label: 'Event Name & Date' },
      { label: 'Completed By' },
    ],
    sections: [
      {
        type: 'textbox',
        title: 'What went well? (Operational successes)',
        heightClass: 'h-[86px]',
      },
      {
        type: 'textbox',
        title: 'What failed / Near Misses? (Operational issues)',
        heightClass: 'h-[86px]',
        tone: 'danger',
      },
      {
        type: 'textbox',
        title: 'Staffing & Kit Issues (Shortages, damaged kit, welfare concerns)',
        heightClass: 'h-[62px]',
      },
      {
        type: 'textbox',
        title: 'Authority / Agency Feedback (Police, Council, Medics, Client)',
        heightClass: 'h-[62px]',
      },
      {
        type: 'numbered_lines',
        title: 'Top 3 Priority Actions for Next Event',
        count: 3,
      },
    ],
  },
]

export function getEmpMasterTemplateById(templateId: string | null | undefined) {
  const normalizedId = String(templateId || '').trim().toLowerCase()
  return EMP_MASTER_TEMPLATES.find((template) => template.id === normalizedId) ?? null
}

export function groupEmpMasterTemplatesByCategory() {
  return EMP_MASTER_TEMPLATE_CATEGORIES.map((category) => ({
    category,
    templates: EMP_MASTER_TEMPLATES.filter((template) => template.category === category),
  }))
}
