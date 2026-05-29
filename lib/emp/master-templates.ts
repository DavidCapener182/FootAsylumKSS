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
  hiddenFromDocuments?: boolean
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

export type EmpMasterTemplateRadioOneDailyBriefBooklet = EmpMasterTemplateBase & {
  kind: 'radio_one_daily_brief_booklet'
}

export type EmpMasterTemplateDefinition =
  | EmpMasterTemplateTable
  | EmpMasterTemplateIncidentForm
  | EmpMasterTemplateNarrativeForm
  | EmpMasterTemplateEmergencyActionPlan
  | EmpMasterTemplateSuspiciousItemReport
  | EmpMasterTemplateRadioOneDailyBriefBooklet

export const EMP_MASTER_TEMPLATE_CATEGORIES: EmpMasterTemplateCategory[] = [
  'Plans',
  'Checklists',
  'Logs',
  'Briefings',
]

export const EMP_MASTER_TEMPLATES: EmpMasterTemplateDefinition[] = [
  {
    id: 'uniform-ppe-allocation-log',
    documentCode: 'EMP-MT-03',
    order: 3,
    category: 'Checklists',
    icon: 'shield',
    title: 'Uniform & PPE Allocation Log',
    description: 'Issue, return, and accountability sheet for hi-vis and supporting PPE.',
    filename: '03_Uniform_PPE_Allocation_Log.pdf',
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
    emptyRows: 12,
    footerNote:
      'Ensure all staff return hi-vis items at the end of their shift. Missing items should be recorded and escalated to the relevant provider.',
  },
  {
    id: 'radio-kit-sign-out-sheet',
    documentCode: 'EMP-MT-04',
    order: 4,
    category: 'Checklists',
    icon: 'radio',
    title: 'Radio & Kit Sign-out Sheet',
    description: 'Operational handover sheet for comms equipment, call signs, and additional issue kit.',
    filename: '04_Radio_Kit_Sign_Out_Sheet.pdf',
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
    emptyRows: 12,
    footerNote:
      'By signing out equipment, staff accept responsibility for safe return and immediate reporting of faults, swaps, or missing items.',
    footerRight: 'Page ___ of ___',
  },
  {
    id: 'staff-sign-in-sign-out-sheet',
    documentCode: 'EMP-MT-05',
    order: 5,
    category: 'Checklists',
    icon: 'users',
    title: 'Staff Sign-in / Sign-out Sheet',
    description: 'Attendance control sheet for deployed staff, agencies, SIA badge tracking, and final sign-off.',
    filename: '05_Staff_Sign_In_Sheet.pdf',
    orientation: 'landscape',
    kind: 'table',
    infoFields: [
      { label: 'Event Name / Code' },
      { label: 'Date' },
      { label: 'Location / Venue' },
      { label: 'Company' },
    ],
    columns: [
      { key: 'staff_name', label: 'Staff Name', width: '18%' },
      { key: 'sia_badge_number', label: 'SIA Badge Number', width: '14%' },
      { key: 'expiry_date', label: 'Expiry Date', width: '11%' },
      { key: 'shift_start', label: 'Shift Start', width: '8%', align: 'center' },
      { key: 'shift_end', label: 'Shift End', width: '8%', align: 'center' },
      { key: 'time_in', label: 'Time In', width: '7%', align: 'center', tone: 'positive' },
      { key: 'signature_in', label: 'Signature (In)', width: '14%', tone: 'positive' },
      { key: 'time_out', label: 'Time Out', width: '7%', align: 'center', tone: 'negative' },
      { key: 'signature_out', label: 'Signature (Out)', width: '13%', tone: 'negative' },
    ],
    emptyRows: 14,
  },
  {
    id: 'incident-accident-form',
    documentCode: 'EMP-MT-11',
    order: 11,
    category: 'Logs',
    icon: 'alert',
    title: 'Incident / Accident Form',
    description: 'Single-record form for incident facts, actions taken, witness detail, and supervisor review.',
    filename: '11_Incident_Accident_Form.pdf',
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
    documentCode: 'EMP-MT-01',
    order: 1,
    category: 'Plans',
    icon: 'map',
    title: 'Security Risk Assessment',
    description: 'Assessment register for hazards, controls, residual risk, and follow-up security actions.',
    filename: '01_Security_Risk_Assessment.pdf',
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
    documentCode: 'EMP-MT-02',
    order: 2,
    category: 'Plans',
    icon: 'alert',
    title: 'Emergency Action Plan (EAP) Cover',
    description: 'Quick-reference escalation sheet for Event Control, command decisions, and emergency contacts.',
    filename: '02_Emergency_Action_Plan.pdf',
    orientation: 'portrait',
    kind: 'emergency_action_plan',
    hiddenFromDocuments: true,
    titleTone: 'danger',
    notice: {
      tone: 'danger',
      body:
        'In the event of a major incident, Event Control maintains primacy until formal handover to emergency services.',
    },
    infoRows: [
      ['Event Name', 'Security Lead'],
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
          'Issue the standby code word to staff, hold non-essential movement, and stop music if directed by the Security Lead.',
      },
    ],
    emergencyContactRows: 6,
  },
  {
    id: 'deployment-matrix',
    documentCode: 'EMP-MT-06',
    order: 6,
    category: 'Checklists',
    icon: 'team',
    title: 'Deployment Matrix',
    description: 'Zone-by-zone staffing matrix covering posts, supervisors, and timings.',
    filename: '06_Deployment_Matrix.pdf',
    orientation: 'portrait',
    kind: 'table',
    infoFields: [
      { label: 'Event Name' },
      { label: 'Date' },
      { label: 'Prepared By' },
    ],
    columns: [
      { key: 'zone', label: 'Zone', width: '16%' },
      { key: 'position', label: 'Post / Position', width: '18%' },
      { key: 'assigned', label: 'Assigned Staff Names', width: '30%' },
      { key: 'supervisor', label: 'Supervisor', width: '16%' },
      { key: 'start', label: 'Start', width: '10%', align: 'center' },
      { key: 'end', label: 'End', width: '10%', align: 'center' },
    ],
    emptyRows: 23,
  },
  {
    id: 'supervisor-deployment',
    documentCode: 'EMP-MT-07',
    order: 7,
    category: 'Checklists',
    icon: 'team',
    title: 'Supervisor Deployment',
    description: 'Supervisor-specific deployment sheets showing each supervisor and their assigned staff.',
    filename: '07_Supervisor_Deployment.pdf',
    orientation: 'landscape',
    kind: 'table',
    infoFields: [
      { label: 'Event Name' },
      { label: 'Date' },
      { label: 'Supervisor / Zone' },
      { label: 'Prepared By' },
    ],
    columns: [
      { key: 'position', label: 'Post / Position', width: '30%' },
      { key: 'assigned', label: 'Assigned Staff Name', width: '44%' },
      { key: 'start', label: 'Start', width: '13%', align: 'center' },
      { key: 'end', label: 'End', width: '13%', align: 'center' },
    ],
    emptyRows: 15,
  },
  {
    id: 'shift-rota',
    documentCode: 'EMP-MT-08',
    order: 8,
    category: 'Checklists',
    icon: 'clock',
    title: 'Shift Rota',
    description: 'Shift, break, and relief tracker for supervisors managing live-event staffing.',
    filename: '08_Shift_Rota.pdf',
    orientation: 'landscape',
    kind: 'table',
    hiddenFromDocuments: true,
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
    documentCode: 'EMP-MT-09',
    order: 9,
    category: 'Checklists',
    icon: 'phone',
    title: 'Contact and Cascade List',
    description: 'Restricted contact register for command roles, radio details, and key escalation points.',
    filename: '09_Contact_Cascade_List.pdf',
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
    documentCode: 'EMP-MT-10',
    order: 10,
    category: 'Checklists',
    icon: 'clipboard',
    title: 'Equipment Check-in / Kit Return',
    description: 'End-of-shift asset return tracker for issued kit, condition, shortages, and damage notes.',
    filename: '10_Equipment_Check_In.pdf',
    orientation: 'landscape',
    kind: 'table',
    hiddenFromDocuments: true,
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
    id: 'event-control-log',
    documentCode: 'EMP-MT-17',
    order: 17,
    category: 'Logs',
    icon: 'list',
    title: 'Event Control Log',
    description: 'Live radio-message and decision log for incidents, operational updates, actions, and status tracking.',
    filename: '17_Event_Control_Log.pdf',
    orientation: 'landscape',
    kind: 'table',
    infoFields: [
      { label: 'Event Name' },
      { label: 'Date' },
      { label: 'Controller Name' },
      { label: 'Page Number' },
    ],
    columns: [
      { key: 'log', label: 'Log', width: '6%', align: 'center' },
      { key: 'time', label: 'Time', width: '6%', align: 'center' },
      { key: 'from', label: 'From', width: '9%' },
      { key: 'to', label: 'To', width: '9%' },
      { key: 'occurrence', label: 'Occurrence', width: '28%' },
      { key: 'type', label: 'Type', width: '10%', align: 'center' },
      { key: 'action', label: 'Action', width: '18%' },
      { key: 'priority', label: 'Priority', width: '7%', align: 'center' },
      { key: 'status', label: 'Status', width: '7%', align: 'center' },
    ],
    emptyRows: 16,
    rowHeightClass: 'h-[38px]',
    footerNote:
      'Entries are copied from the plan-linked Event Control Log. Keep radio messages factual, time-stamped, and updated when actions are closed.',
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
    hiddenFromDocuments: true,
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
    hiddenFromDocuments: true,
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
  {
    id: 'radio-one-daily-security-brief',
    documentCode: 'EMP-MT-16',
    order: 16,
    category: 'Briefings',
    icon: 'message',
    title: 'Radio One Event Week Security Brief',
    description:
      'A4 landscape duplex booklet with four A5 event-week bar-security pages for BBC Radio 1 Big Weekend Sunderland 2026.',
    filename: '16_Radio_One_Event_Week_Security_Brief_Booklet.pdf',
    orientation: 'portrait',
    kind: 'radio_one_daily_brief_booklet',
  },
]

export const EMP_VISIBLE_MASTER_TEMPLATES = EMP_MASTER_TEMPLATES.filter((template) => !template.hiddenFromDocuments)

export function getEmpMasterTemplateById(templateId: string | null | undefined) {
  const normalizedId = String(templateId || '').trim().toLowerCase()
  return EMP_MASTER_TEMPLATES.find((template) => template.id === normalizedId) ?? null
}

export function groupEmpMasterTemplatesByCategory(
  templates: EmpMasterTemplateDefinition[] = EMP_VISIBLE_MASTER_TEMPLATES
) {
  return EMP_MASTER_TEMPLATE_CATEGORIES.map((category) => ({
    category,
    templates: templates
      .filter((template) => template.category === category)
      .sort((first, second) => first.order - second.order),
  }))
}
