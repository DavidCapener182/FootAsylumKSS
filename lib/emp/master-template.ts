import type { Json } from '@/types/db'

export type EmpFieldType = 'text' | 'textarea' | 'date' | 'number' | 'select'
export type EmpFieldEditMode = 'event_required' | 'event_optional' | 'generic_framework'

export type EmpDocumentKind =
  | 'previous_somp'
  | 'previous_emp'
  | 'risk_assessment'
  | 'event_management_plan'
  | 'site_map'
  | 'ingress_map'
  | 'egress_map'
  | 'emergency_map'
  | 'route_map'
  | 'licensing_schedule'
  | 'contact_sheet'
  | 'deployment_matrix'
  | 'kss_profile'
  | 'other'

export type EmpAnnexKey =
  | 'bar_operations'
  | 'search_screening'
  | 'front_of_stage_pit'
  | 'traffic_pedestrian_routes'
  | 'camping_security'
  | 'vip_backstage_security'
  | 'stewarding_deployment'
  | 'emergency_action_cards'

export interface EmpMasterTemplateSection {
  key: string
  title: string
  order: number
  description?: string
}

export interface EmpMasterTemplateField {
  key: string
  sectionKey: string
  label: string
  order: number
  type: EmpFieldType
  editMode?: EmpFieldEditMode
  annexKeys?: EmpAnnexKey[]
  description?: string
  placeholder?: string
  defaultValueText?: string
  defaultValueJson?: Json
  options?: string[]
  required?: boolean
}

const section = (
  key: string,
  title: string,
  order: number,
  description?: string
): EmpMasterTemplateSection => ({
  key,
  title,
  order,
  description,
})

const field = (
  sectionKey: string,
  key: string,
  label: string,
  order: number,
  type: EmpFieldType,
  options: Partial<Omit<EmpMasterTemplateField, 'sectionKey' | 'key' | 'label' | 'order' | 'type'>> = {}
): EmpMasterTemplateField => ({
  sectionKey,
  key,
  label,
  order,
  type,
  ...options,
})

const lines = (...items: string[]) => items.join('\n')

export const EMP_ANNEX_DEFINITIONS: Array<{ key: EmpAnnexKey; label: string; description: string }> = [
  {
    key: 'bar_operations',
    label: 'Bar Operations',
    description: 'Licensed bar controls, queue operations, refusals, and service area protection.',
  },
  {
    key: 'search_screening',
    label: 'Search and Screening',
    description: 'Search policy, prohibited items controls, and screening escalation arrangements.',
  },
  {
    key: 'front_of_stage_pit',
    label: 'High-Demand Bar Queue Area',
    description: 'Queue supervision, barrier management, welfare handover, and surge response controls.',
  },
  {
    key: 'traffic_pedestrian_routes',
    label: 'Service / Pedestrian Route Interface',
    description: 'Service route, delivery, stock movement, crossing point, and pedestrian interface controls.',
  },
  {
    key: 'camping_security',
    label: 'Overnight Bar Asset Protection',
    description: 'Overnight patrols, welfare-linked checks, and asset protection controls where allocated to KSS.',
  },
  {
    key: 'vip_backstage_security',
    label: 'Restricted Compound Security',
    description: 'Compound access control, accreditation, escort, and unauthorised access arrangements.',
  },
  {
    key: 'stewarding_deployment',
    label: 'Stewarding / Queue Marshal Deployment',
    description: 'Queue marshal matrix, shift structure, and zone-by-zone deployment detail.',
  },
  {
    key: 'emergency_action_cards',
    label: 'Emergency Action Cards',
    description: 'Action-card style summary for evacuation, lockdown, safeguarding, and CT incidents.',
  },
]

export const EMP_ANNEX_ROLE_FIELD_KEYS: Partial<Record<EmpAnnexKey, string>> = {
  bar_operations: 'bar_operations_roles',
  search_screening: 'search_screening_roles',
  front_of_stage_pit: 'front_of_stage_roles',
  traffic_pedestrian_routes: 'traffic_pedestrian_roles',
  camping_security: 'camping_security_roles',
  vip_backstage_security: 'vip_backstage_roles',
  stewarding_deployment: 'stewarding_roles',
}

export const EMP_DOCUMENT_KIND_OPTIONS: Array<{ value: EmpDocumentKind; label: string }> = [
  { value: 'previous_somp', label: 'Previous SOMP' },
  { value: 'previous_emp', label: 'Previous EMP' },
  { value: 'risk_assessment', label: 'Risk Assessment' },
  { value: 'event_management_plan', label: 'EMP / Event Management Plan' },
  { value: 'site_map', label: 'Site Map / Plan' },
  { value: 'ingress_map', label: 'Ingress Map / Queue Plan' },
  { value: 'egress_map', label: 'Egress Map / Dispersal Plan' },
  { value: 'emergency_map', label: 'Emergency / Evacuation Map' },
  { value: 'route_map', label: 'Route / Traffic Interface Map' },
  { value: 'licensing_schedule', label: 'Licensing Schedule' },
  { value: 'contact_sheet', label: 'Contact Sheet' },
  { value: 'deployment_matrix', label: 'Deployment Matrix' },
  { value: 'kss_profile', label: 'KSS Profile Appendix' },
  { value: 'other', label: 'Other Supporting Document' },
]

export const EMP_MASTER_TEMPLATE_TITLE = 'KSS NW LTD Bar Security Operations Plan'
export const EMP_MASTER_TEMPLATE_DESCRIPTION =
  'Admin-only KSS template for site-specific bar, licensed-area, bar compound, safeguarding, incident, welfare, and emergency interface operations.'

const EMP_GENERIC_FRAMEWORK_SECTION_KEYS = new Set([
  'strategic_objectives',
  'safeguarding_vulnerability',
  'incident_management',
  'counter_terrorism',
  'staff_welfare',
  'post_event_reporting',
])

export const EMP_MASTER_TEMPLATE_SECTIONS: EmpMasterTemplateSection[] = [
  section(
    'document_control',
    'Document Control',
    0,
    'This section controls version status, issue dates, approval, and distribution so all stakeholders work from the current approved copy.'
  ),
  section(
    'purpose_scope',
    'Executive Summary',
    1,
    'This section states KSS responsibilities within the wider organiser event management framework and confirms the plan does not transfer full-site event ownership to KSS.'
  ),
  section(
    'event_overview',
    'Event Overview',
    2,
    'Record the core event identity, venue references, delivery structure, dates, and operational hours for the event.'
  ),
  section(
    'strategic_objectives',
    'Key Objectives and Licensing Aims',
    3,
    'The operational strategy is to protect life safety, support orderly movement, prevent crime and disorder, and support client and licensing objectives through a clear command structure.'
  ),
  section(
    'crowd_profile',
    'Operational Scope: KSS Zones',
    4,
    'Summarise the allocated bars, licensed service areas, bar compounds, stock interfaces, queue lanes, and other bar-related areas covered by this plan.'
  ),
  section(
    'site_design',
    'Site-Specific Operational Risks',
    5,
    'Identify site-specific risks affecting KSS areas, including bar queues, licensed service areas, bar compounds, stock interfaces, welfare demand, intoxication, terrain, weather, and pedestrian/service interface points.'
  ),
  section(
    'ramp_assessment',
    'Bar and Service-Area Queue Analysis',
    6,
    'Review routes, arrival patterns, movement, and profile factors around bars, service points, stock interfaces, and KSS-allocated areas.'
  ),
  section(
    'capacity_flow',
    'Queuing Systems for Bars and Service Areas',
    7,
    'Document queue layout, throughput, overspill controls, accessibility support, service-lane protection, and degraded-operation assumptions.'
  ),
  section(
    'command_control',
    'Command, Control and Coordination',
    8,
    'Set out the control structure, reporting lines, supervisor roles, and external interfaces required to manage the event consistently.'
  ),
  section(
    'deployment_strategy',
    'Deployment Summary and Staffing Model',
    9,
    'Describe how staffing is allocated by zone and time, together with mobile response, relief, and contingency cover.'
  ),
  section(
    'ingress_operations',
    'Bar Queue Management',
    10,
    'Define how bar queue lanes, access points, overspill, accessible support, and supervisor escalation will be managed during trading periods.'
  ),
  section(
    'circulation_internal',
    'Bar Operations',
    11,
    'Explain how bar-area queues, service points, back-of-house interfaces, and higher-demand areas are monitored and controlled during live operations.'
  ),
  section(
    'egress_dispersal',
    'Bar Close-Down, Dispersal and Egress Interface',
    12,
    'Describe bar close-down, queue clear-down, final service support, and KSS interface duties during dispersal and egress.'
  ),
  section(
    'safeguarding_vulnerability',
    'Safeguarding and Vulnerability',
    13,
    'Set out the arrangements for vulnerability recognition, disclosures, lost persons, welfare handover, confidentiality, and safeguarding escalation.'
  ),
  section(
    'licensing_rules',
    'Licensing Compliance and Challenge Policy',
    14,
    'Where relevant, record the licensable activities, challenge policy, operating conditions, prohibited items, and enforcement controls.'
  ),
  section(
    'incident_management',
    'Incident Response and Safeguarding',
    15,
    'This section defines the response framework for routine and serious incidents, prioritising life safety, scene control, communication, and escalation.'
  ),
  section(
    'risk_assessment',
    'Operational Risk Assessment',
    16,
    'Summarise the principal operational hazards, affected persons, controls, and residual risk positions based on the event scope, selected annexes, and the areas managed by KSS.'
  ),
  section(
    'emergency_procedures',
    'Emergency and Evacuation Interface Duties',
    17,
    'Record the arrangements for evacuation, partial evacuation, lockdown or invacuation, shelter, show stop, and emergency route protection.'
  ),
  section(
    'counter_terrorism',
    'Counter-Terrorism / ACT / SCaN',
    18,
    'Summarise hostile reconnaissance awareness, suspicious item response, Run Hide Tell messaging, and CT escalation through control.'
  ),
  section(
    'staff_welfare',
    'Staff Welfare',
    19,
    'Define the arrangements that support staff safety, hydration, breaks, fatigue management, first aid, and safe sign-off.'
  ),
  section(
    'accessibility',
    'Accessibility',
    20,
    'Set out how accessible entry, circulation, assistance, viewing, welfare, and emergency arrangements are supported operationally.'
  ),
  section(
    'communications',
    'Ejection, Refusal, and Confiscation Procedures',
    21,
    'Describe refusal, ejection, confiscation, escalation, logging, and handover arrangements for incidents arising in KSS-allocated bar areas.'
  ),
  section(
    'post_event_reporting',
    'Post-Event Reporting and Debrief',
    22,
    'Capture the reporting, debrief, lessons learned, and improvement actions required after the event.'
  ),
  section(
    'appendices',
    'Appendices and Contact Directory',
    23,
    'Appendices hold supporting operational material such as maps, contact sheets, deployment matrices, action cards, and optional provider credentials.'
  ),
]

export const EMP_MASTER_TEMPLATE_FIELDS: EmpMasterTemplateField[] = [
  field('document_control', 'plan_title', 'Plan title', 0, 'text', {
    required: true,
    defaultValueText: EMP_MASTER_TEMPLATE_TITLE,
  }),
  field('document_control', 'document_version', 'Document version', 1, 'text', {
    defaultValueText: 'V1.0',
  }),
  field('document_control', 'document_status', 'Document status', 2, 'select', {
    defaultValueText: 'Draft',
    options: ['Draft', 'For Review', 'Final'],
  }),
  field('document_control', 'author_name', 'Author', 3, 'text', {
    defaultValueText: 'KSS NW LTD',
  }),
  field('document_control', 'approver_name', 'Approver', 4, 'text'),
  field('document_control', 'issue_date', 'Issue date', 5, 'date'),
  field('document_control', 'review_date', 'Review date', 6, 'date'),
  field('document_control', 'distribution_list', 'Distribution list', 7, 'textarea', {
    defaultValueText: lines(
      'Event Control',
      'Client / organiser',
      'Security leadership',
      'Medical and welfare leads',
      'Relevant delivery partners'
    ),
    placeholder: 'Event Control\nClient\nSecurity leadership\nMedical / welfare lead',
  }),

  field('purpose_scope', 'purpose_scope_summary', 'Purpose and scope summary', 0, 'textarea', {
    defaultValueText:
      'This Bar Security Operations Plan sets out KSS NW LTD site-specific operating arrangements for allocated bars, licensed service areas, bar compounds, queue lanes, asset protection where allocated, safeguarding, incident response, communications, emergency interface duties, and post-event reporting. KSS operates within the wider organiser Event Management Plan and does not assume full-site event ownership unless explicitly contracted to do so.',
  }),
  field('purpose_scope', 'related_documents', 'Related documents', 1, 'textarea', {
    defaultValueText:
      'BBC/FAB Event Management Plan\nKSS operational risk assessment\nEmergency procedures\nSite maps and allocated-area plans\nLicensing schedule\nDeployment matrix\nContact directory',
  }),

  field('event_overview', 'event_name', 'Event name', 0, 'text', { required: true }),
  field('event_overview', 'event_type', 'Event type', 1, 'text', {
    placeholder: 'Festival, concert, civic event, sports event, licensed event',
  }),
  field('event_overview', 'venue_name', 'Venue name', 2, 'text'),
  field('event_overview', 'venue_address', 'Venue address', 3, 'textarea'),
  field('event_overview', 'venue_reference', 'Venue reference', 4, 'text', {
    placeholder: 'Postcode, what3words, site identifier, SAG reference',
  }),
  field('event_overview', 'organiser_name', 'Organiser', 5, 'text'),
  field('event_overview', 'client_name', 'Client', 6, 'text'),
  field('event_overview', 'principal_contractor', 'Principal contractor / lead delivery partner', 7, 'text'),
  field('event_overview', 'key_delivery_partners', 'Key delivery partners', 8, 'textarea', {
    defaultValueText: lines(
      'Security provider',
      'Stewarding provider',
      'Medical provider',
      'Welfare provider',
      'Traffic management provider',
      'Production / venue operations'
    ),
  }),
  field('event_overview', 'build_dates', 'Build dates', 9, 'text'),
  field('event_overview', 'show_dates', 'Show dates', 10, 'text'),
  field('event_overview', 'break_dates', 'Break / egress dates', 11, 'text'),
  field('event_overview', 'public_ingress_time', 'Public ingress start', 12, 'text'),
  field('event_overview', 'operational_hours', 'Operational hours', 13, 'textarea', {
    defaultValueText:
      'Operational hours should be recorded by zone and phase, including build, public opening, live operating period, final service where relevant, egress, and breakdown activity.',
  }),

  field('strategic_objectives', 'client_objectives', 'Event-specific objectives or licensing alignment notes', 0, 'textarea', {
    defaultValueText:
      'Protect the public, staff, contractors, client assets, and licensed premises within KSS-allocated areas.\nSupport safe bar, bar compound, stock, and service-area operations where allocated to KSS.\nPrevent crime, disorder, underage sales, intoxication-related harm, and avoidable disruption.\nSupport safeguarding, welfare, medical, and emergency response interfaces.\nSupport the client, organiser, licence holder, and statutory licensing objectives for the event.',
  }),

  field('crowd_profile', 'licensed_capacity', 'Licensed capacity', 0, 'text'),
  field('crowd_profile', 'expected_attendance', 'Expected attendance', 1, 'text'),
  field('crowd_profile', 'staff_and_contractor_count', 'Staff and contractor count', 2, 'text'),
  field('crowd_profile', 'audience_age_profile', 'Audience age profile', 3, 'text'),
  field('crowd_profile', 'attendance_profile', 'Operational scope summary', 4, 'textarea', {
    defaultValueText:
      'The operational scope should identify allocated bars, licensed service areas, bar compounds, stock interfaces, queue lanes, service gates, asset-protection duties where allocated, and the client or organiser interfaces for each area.',
  }),
  field('crowd_profile', 'travel_modes', 'Travel modes and transport profile', 5, 'textarea', {
    defaultValueText:
      'The travel profile should identify the likely split between rail, bus, coach, taxi, private vehicle, on-foot arrival, and accessible transport, together with the principal arrival and dispersal interfaces.',
  }),
  field('crowd_profile', 'family_presence', 'Family / vulnerable person profile', 6, 'textarea', {
    defaultValueText:
      'Where children, families, school groups, or vulnerable adults are expected, deployment and welfare arrangements should reflect the likely need for assistance, reunification, safeguarding escalation, and quieter support spaces.',
  }),
  field('crowd_profile', 'alcohol_profile', 'Alcohol and behavioural profile', 7, 'textarea', {
    defaultValueText:
      'The alcohol profile should consider expected levels of intoxication, peak bar service periods, refusals, queue pressure, conflict potential, Challenge policy, and the effect of alcohol on compliance and welfare demand.',
  }),
  field('crowd_profile', 'camping_profile', 'Camping / overnight profile', 8, 'textarea', {
    defaultValueText:
      'Where bar compounds or overnight asset protection are allocated to KSS, the plan should address access control, patrols, welfare demand, unauthorised access, and response capability.',
  }),
  field('crowd_profile', 'historic_issues', 'Historic issues or intelligence', 9, 'textarea', {
    defaultValueText:
      'Historic issues, intelligence, and previous event learning should be reviewed for recurring congestion, disorder trends, safeguarding themes, transport pinch points, weather sensitivity, and venue-specific vulnerabilities.',
  }),
  field('crowd_profile', 'mood_and_trigger_points', 'Mood, trigger points, and likely crowd reactions', 10, 'textarea', {
    defaultValueText:
      'Likely trigger points include delayed opening, queue stagnation, show interruption, disappointing information, adverse weather, transport disruption, licensing intervention, or inconsistent security application.',
  }),
  field('crowd_profile', 'peak_periods', 'Expected peak periods', 11, 'textarea', {
    defaultValueText:
      'Peak periods typically include public opening, bar service peaks, act changeovers affecting bar demand, final service, stock or compound handover where allocated, and close-down.',
  }),

  field('site_design', 'site_layout_summary', 'Site layout summary', 0, 'textarea', {
    defaultValueText:
      'The site layout should support safe queueing, search where required, service access, welfare handover, stock or cash movements, emergency access, and clear separation between public, controlled, and back-of-house KSS areas.',
  }),
  field('site_design', 'key_zones', 'Key zones and operational areas', 1, 'textarea', {
    defaultValueText: lines(
      'Bars and licensed service areas',
      'Bar stores and stock interfaces',
      'Wholesale, stock, and cash-handling compounds',
      'Client staff areas where allocated to KSS',
      'Welfare, medical, and safeguarding handover points',
      'Emergency access and controlled service routes'
    ),
  }),
  field('site_design', 'controlled_areas', 'Controlled, restricted, or high-risk areas', 2, 'textarea', {
    defaultValueText:
      'Allocated areas should include bars, stock compounds, cash handling points, accreditation-only bar areas, service gates, plant routes, and any bar-related zone requiring active access control where allocated to KSS.',
  }),
  field('site_design', 'emergency_exits_holding_areas', 'Emergency exits, holding areas, and rendezvous points', 3, 'textarea', {
    defaultValueText:
      'Emergency exits, holding areas, rendezvous points, and emergency service access routes must be clearly identified, protected from obstruction, and briefed to supervisory staff.',
  }),
  field('site_design', 'dim_aliced_design', 'DIM-ALICED: Design', 4, 'textarea', {
    defaultValueText:
      'The design should provide sufficient space, barriers, lighting, signage, line management, and route resilience for the predicted audience profile and event activity.',
  }),
  field('site_design', 'dim_aliced_information', 'DIM-ALICED: Information', 5, 'textarea', {
    defaultValueText:
      'Information should cover wayfinding, queue messaging, prohibited items, accessible arrangements, operating hours, emergency messaging, and internal briefings so crowd expectations remain aligned with operations.',
  }),
  field('site_design', 'dim_aliced_management', 'DIM-ALICED: Management', 6, 'textarea', {
    defaultValueText:
      'Management arrangements should define command roles, supervision, deployment review points, contingency triggers, and decision logging for both normal and degraded operations.',
  }),
  field('site_design', 'dim_aliced_activity', 'DIM-ALICED: Activity', 7, 'textarea', {
    defaultValueText:
      'Activity analysis should consider headline acts, service demand, changeovers, ancillary entertainment, licensing activity, and any programmed moments likely to concentrate movement or attention.',
  }),
  field('site_design', 'dim_aliced_location', 'DIM-ALICED: Location', 8, 'textarea', {
    defaultValueText:
      'Location factors should assess transport links, surrounding land use, residential sensitivity, topography, lighting, weather exposure, and emergency service access constraints.',
  }),
  field('site_design', 'dim_aliced_ingress', 'DIM-ALICED: Ingress', 9, 'textarea', {
    defaultValueText:
      'Ingress analysis should review queue capacity, search throughput, ticketing interface, accessible entry, rejection management, and contingency arrangements for delayed opening or surges.',
  }),
  field('site_design', 'dim_aliced_circulation', 'DIM-ALICED: Circulation', 10, 'textarea', {
    defaultValueText:
      'Circulation analysis should consider internal route widths, crossflow conflicts, sightline stopping points, bar and toilet queues, and protection of emergency access routes.',
  }),
  field('site_design', 'dim_aliced_egress', 'DIM-ALICED: Egress', 11, 'textarea', {
    defaultValueText:
      'Egress analysis should cover phased release, route protection, transport coordination, re-entry controls, and the expected behaviour of patrons beyond the site boundary.',
  }),
  field('site_design', 'dim_aliced_dynamics', 'DIM-ALICED: Dynamics', 12, 'textarea', {
    defaultValueText:
      'Crowd dynamics should consider density build-up, stop-start movement, counterflow, pressure points, behavioural triggers, and how information or intervention may alter crowd response.',
  }),

  field('ramp_assessment', 'ramp_routes', 'RAMP: Routes', 0, 'textarea', {
    defaultValueText:
      'Routes analysis should identify primary and secondary pedestrian routes, step-free alternatives, crossings, lighting, steward intervention points, and any sections vulnerable to narrowing or obstruction.',
  }),
  field('ramp_assessment', 'ramp_arrival', 'RAMP: Arrival', 1, 'textarea', {
    defaultValueText:
      'Arrival analysis should consider arrival profiles over time, transport unloading patterns, pre-event dwell areas, queue formation, and the impact of delayed or compressed admissions.',
  }),
  field('ramp_assessment', 'ramp_movement', 'RAMP: Movement', 2, 'textarea', {
    defaultValueText:
      'Movement analysis should consider circulation between attractions, amenities, bars, toilets, welfare, exits, and any two-way flows or pinch points requiring active management.',
  }),
  field('ramp_assessment', 'ramp_profile', 'RAMP: Profile', 3, 'textarea', {
    defaultValueText:
      'Profile analysis should align route design to the expected audience, including age, familiarity, intoxication, camping, accessibility needs, and group behaviour.',
  }),

  field('capacity_flow', 'gross_area', 'Gross area', 0, 'text'),
  field('capacity_flow', 'net_area', 'Net area / usable viewing area', 1, 'text'),
  field('capacity_flow', 'excluded_areas', 'Excluded areas and deductions', 2, 'textarea', {
    defaultValueText:
      'Excluded areas should include structures, plant, camera platforms, front-of-house, sterile zones, emergency lanes, concession footprints, inaccessible land, and unusable edge conditions.',
  }),
  field('capacity_flow', 'density_assumptions', 'Density assumptions', 3, 'textarea', {
    defaultValueText:
      'Density assumptions should be proportionate to the event type, crowd behaviour, sightlines, and intended use of each zone, with reduced assumptions where vulnerability or restricted circulation exists.',
  }),
  field('capacity_flow', 'zone_capacities', 'Zone capacities', 4, 'textarea', {
    defaultValueText:
      'Zone capacities should be stated for each public area together with any operational triggers for local intervention, controlled holds, or reduced occupancy.',
  }),
  field('capacity_flow', 'ingress_flow_assumptions', 'Ingress flow assumptions', 5, 'textarea', {
    defaultValueText:
      'Ingress calculations should state usable entry width, search and ticketing assumptions, accessible lane provision, expected arrival curve, and contingency throughput under degraded conditions.',
  }),
  field('capacity_flow', 'egress_flow_assumptions', 'Egress flow assumptions', 6, 'textarea', {
    defaultValueText:
      'Egress calculations should state usable exit width, route protection measures, transport interface constraints, dispersal assumptions, and expected clearance times in normal conditions.',
  }),
  field('capacity_flow', 'emergency_clearance_assumptions', 'Emergency clearance assumptions', 7, 'textarea', {
    defaultValueText:
      'Emergency clearance assumptions should identify the routes relied upon, any reduced-width or route-loss scenarios, and the decision points for evacuation, partial evacuation, or shelter.',
  }),
  field('capacity_flow', 'degraded_route_weather_assumptions', 'Degraded route / weather assumptions', 8, 'textarea', {
    defaultValueText:
      'Degraded-route assumptions should address route loss, mud, standing water, high wind, poor lighting, barrier failure, vehicle incursion risk, or any factor that reduces usable space or flow rates.',
  }),

  field('command_control', 'command_structure', 'Command structure summary', 0, 'textarea', {
    defaultValueText:
      'Operations are to run through a clear command structure with an operational lead, control or loggist function, zone supervisors, mobile response capability, and direct interfaces with client control and partner agencies.',
  }),
  field('command_control', 'named_command_roles', 'Named command roles', 1, 'textarea', {
    defaultValueText: lines(
      'Operational lead - Name - Responsibility',
      'Event controller / loggist - Name - Responsibility',
      'Zone supervisors - Name - Area of responsibility'
    ),
    placeholder: 'Head of Security - Name - Responsibility\nEvent Controller / Loggist - Name - Responsibility',
  }),
  field('command_control', 'radio_channels_callsigns', 'Radio channels and call signs', 2, 'textarea', {
    defaultValueText:
      'Radio allocations should identify primary operational channels, supervisor channels, emergency priority wording, fallback phone contacts, and any sector-specific call signs.',
  }),
  field('command_control', 'reporting_lines', 'Reporting lines and escalation routes', 3, 'textarea', {
    defaultValueText:
      'Reporting lines should run from staff to zone supervisors to KSS control or the operational lead, with immediate escalation for life safety, safeguarding, counter-terrorism, disorder, licence breaches, refusal conflict, asset loss, significant queue pressure, or route obstruction.',
  }),
  field('command_control', 'external_interfaces', 'External interfaces', 4, 'textarea', {
    defaultValueText: lines(
      'Police interface',
      'Medical provider interface',
      'Welfare provider interface',
      'Traffic management interface',
      'Venue or client control interface',
      'Emergency services interface'
    ),
    placeholder: 'Police\nMedical\nWelfare\nTraffic management\nEmergency services\nClient control',
  }),
  field('command_control', 'key_contacts_directory', 'Key contacts directory', 5, 'textarea', {
    description: 'Useful for the live plan and appendices where named operational contacts need to be briefed or printed.',
    defaultValueText: lines(
      'Operational lead - Name - Contact',
      'Event control / loggist - Name - Contact',
      'Client representative - Name - Contact',
      'Medical lead - Name - Contact',
      'Welfare lead - Name - Contact',
      'Traffic lead - Name - Contact'
    ),
    placeholder: 'Operational lead - Name - Contact\nMedical lead - Name - Contact',
  }),
  field('command_control', 'control_room_structure', 'Control room structure and functions', 6, 'textarea', {
    defaultValueText:
      'Control arrangements should identify who sits in Event Control or the security control room, what functions are carried there, how logs, CCTV, and incident information are managed, and how live decisions are communicated to zone supervisors and partner agencies.',
  }),
  field('command_control', 'briefing_and_induction', 'Briefings, inductions, and pre-opening checks', 7, 'textarea', {
    defaultValueText:
      'Planning meetings, written briefings, role-specific deployment briefs, site inductions, and pre-opening or pre-egress checks should be completed and recorded before each operational phase. Any late changes must be re-briefed through supervisors and control.',
  }),
  field('command_control', 'monitoring_and_density_tools', 'Monitoring technology and live observation', 8, 'textarea', {
    defaultValueText:
      'Live monitoring should combine supervisor observation, CCTV where available, bar queue monitoring, refusal logs, welfare and medical feedback, stock or compound checks, and any counting system used to support situational awareness. Technology may inform decisions but should not replace live command judgement.',
  }),

  field('deployment_strategy', 'service_delivery_scope', 'Service directory and operational scope', 0, 'textarea', {
    defaultValueText:
      'The live plan should state which areas, lots, or functions fall within the KSS operating scope, what duties are included, what exclusions remain with the client or other contractors, and how interfaces are managed where responsibilities meet.',
  }),
  field('deployment_strategy', 'build_break_operations', 'Build and break operations', 1, 'textarea', {
    defaultValueText:
      'Build and break security should define contractor access, accreditation or pass checks, vehicle and bag search where required, asset protection, emergency route integrity, plant segregation, and escalation for unauthorised access or unsafe working conditions.',
  }),
  field('deployment_strategy', 'specialist_teams_and_assets', 'Specialist teams and assets', 2, 'textarea', {
    defaultValueText:
      'Specialist assets may include response teams, search teams, dog teams, CCTV or density monitoring support, pit crews, welfare-linked patrols, drone awareness, or vehicle search capability where required by the event risk profile.',
  }),
  field('deployment_strategy', 'staffing_by_zone_and_time', 'Staffing by zone and time', 3, 'textarea', {
    defaultValueText:
      'Deployment should be structured by zone, time, and activity, with staffing levels reflecting bar trading hours, queue pressure, bar compound protection where allocated, final service, handover, and close-down requirements.',
  }),
  field('deployment_strategy', 'response_teams', 'Response teams and mobile resources', 4, 'textarea', {
    defaultValueText:
      'Mobile response teams should be available to reinforce queues, respond to disorder, assist welfare or medical incidents, and protect routes or allocated areas as conditions change.',
  }),
  field('deployment_strategy', 'relief_and_contingency', 'Relief and contingency arrangements', 5, 'textarea', {
    defaultValueText:
      'Relief plans should provide breaks, cover for absent staff, and contingency reinforcement for queues, high-density zones, weather changes, or extended operations.',
  }),
  field('deployment_strategy', 'escalation_staffing', 'Escalation staffing triggers', 6, 'textarea', {
    defaultValueText:
      'Escalation triggers should identify when additional staff are deployed, redeployed, or requested, including thresholds linked to density, queue length, incident frequency, route loss, or adverse weather.',
  }),
  field('deployment_strategy', 'bar_operations_roles', 'Bar Operations roles and duties', 7, 'textarea', {
    annexKeys: ['bar_operations'],
    description: 'Shown only when the Bar Operations annex is selected.',
    defaultValueText:
      'Set out bar supervisors, bar queue teams, refusals support, stock or delivery gate controls, service area protection, and any roaming response linked to licensed activity.',
  }),
  field('deployment_strategy', 'search_screening_roles', 'Search and Screening roles and duties', 8, 'textarea', {
    annexKeys: ['search_screening'],
    description: 'Shown only when the Search and Screening annex is selected.',
    defaultValueText:
      'Set out lane supervisors, ticket-resolution interface, primary and secondary search teams, prohibited-items surrender points, and escalation roles for refusals, finds, or suspected supply.',
  }),
  field('deployment_strategy', 'front_of_stage_roles', 'High-demand area roles and duties', 9, 'textarea', {
    annexKeys: ['front_of_stage_pit'],
    description: 'Shown only when the High-Demand Bar Queue Area annex is selected.',
    defaultValueText:
      'Set out any high-demand queue-area supervisors, barrier teams, extraction points, welfare handover routes, and the reporting route to control during peak demand.',
  }),
  field('deployment_strategy', 'traffic_pedestrian_roles', 'Traffic / Pedestrian Route roles and duties', 10, 'textarea', {
    annexKeys: ['traffic_pedestrian_routes'],
    description: 'Shown only when the Traffic / Pedestrian Routes annex is selected.',
    defaultValueText:
      'Set out route stewards, crossing-point staff, transport-hub marshals, car-park interface staff, taxi and coach loading support, and the link with the traffic management contractor.',
  }),
  field('deployment_strategy', 'camping_security_roles', 'Overnight asset protection roles and duties', 11, 'textarea', {
    annexKeys: ['camping_security'],
    description: 'Shown only when the Overnight Bar Asset Protection annex is selected.',
    defaultValueText:
      'Set out overnight patrols, welfare-linked patrols, perimeter protection, and unauthorised access arrangements where overnight bar asset protection is allocated to KSS.',
  }),
  field('deployment_strategy', 'vip_backstage_roles', 'Restricted Compound Security roles and duties', 12, 'textarea', {
    annexKeys: ['vip_backstage_security'],
    description: 'Shown only when the Restricted Compound Security annex is selected.',
    defaultValueText:
      'Set out accreditation control, compound gate staff, client escorts, service-route protection, sterile-area checks, and response arrangements for unauthorised access.',
  }),
  field('deployment_strategy', 'stewarding_roles', 'Stewarding Deployment roles and duties', 13, 'textarea', {
    annexKeys: ['stewarding_deployment'],
    description: 'Shown only when the Stewarding Deployment annex is selected.',
    defaultValueText:
      'Set out zone stewards, directional staff, queue marshals, emergency exit staff, briefing ownership, and how stewarding is integrated with security and control.',
  }),

  field('ingress_operations', 'ingress_routes_holding_areas', 'Screening locations, holding areas, and access points', 0, 'textarea', {
    defaultValueText:
      'Queue planning should identify each KSS-allocated bar, compound, store, holding area, accessible route, and service access point that requires coordinated staffing.',
  }),
  field('ingress_operations', 'search_policy', 'Search policy', 1, 'textarea', {
    defaultValueText:
      'Ingress controls should apply a proportionate search regime, clear prohibited-items messaging, rejection and surrender arrangements, supervisor support, and escalation for refusals or suspected concealment.',
  }),
  field('ingress_operations', 'queue_design', 'Queue design and holding areas', 2, 'textarea', {
    defaultValueText:
      'Queue design should provide defined lanes, holding capacity, barrier integrity, steward observation, accessible provision, and clear public information before guests reach the search or ticket interface.',
  }),
  field('ingress_operations', 'overspill_controls', 'Overspill and surge controls', 3, 'textarea', {
    defaultValueText:
      'Overspill controls should identify trigger points for slowing admissions, opening additional lanes, re-routing queues, suspending admissions, or requesting reinforcement.',
  }),
  field('ingress_operations', 'accessible_entry_arrangements', 'Accessible entry arrangements', 4, 'textarea', {
    defaultValueText:
      'Accessible ingress arrangements should provide step-free access, queue assistance, companion support, communication adjustments, and a direct escalation route for accessibility-related issues.',
  }),
  field('ingress_operations', 'ingress_operations', 'Ingress operations summary', 5, 'textarea', {
    defaultValueText:
      'Pre-opening checks, staff briefing, signage, lane readiness, Challenge policy messaging, refusal routes, radio checks, and escalation procedures should all be completed before KSS-allocated bar areas open.',
  }),

  field('circulation_internal', 'circulation_controls', 'Circulation controls', 0, 'textarea', {
    defaultValueText:
      'Bar controls should keep service lanes, emergency access, stock routes where allocated, accessible routes, and public queue areas clear, with early intervention where dwell, conflict, counterflow, or queue spillback develops.',
  }),
  field('circulation_internal', 'high_density_controls', 'High-density / peak service controls', 1, 'textarea', {
    defaultValueText:
      'Where bars or stores may create high demand, the plan should define monitoring points, supervisory thresholds, relief routes, barrier management, refusal support, and coordinated escalation with control.',
  }),
  field('circulation_internal', 'internal_queue_controls', 'Internal queue and overspill arrangements', 2, 'textarea', {
    defaultValueText:
      'Internal queue arrangements should prevent bar, toilet, merch, or welfare queues from obstructing main routes, exits, accessible routes, or emergency access points.',
  }),

  field('egress_dispersal', 'transport_interface', 'Transport interface and public route management', 0, 'textarea', {
    defaultValueText:
      'Bar close-down and egress interface duties should identify public interface points, queue positions, stock routes where allocated, staff access, protection duties, and escalation links with the client, organiser, and Event Control.',
  }),
  field('egress_dispersal', 'dispersal_routes', 'Dispersal routes', 1, 'textarea', {
    defaultValueText:
      'Activation close-down routes, staff movements, stock removal routes, and public clear-down interfaces should be identified, observed where required, and reviewed against lighting, weather, and local constraints.',
  }),
  field('egress_dispersal', 'reentry_policy', 'Re-entry policy', 2, 'textarea', {
    defaultValueText:
      'Re-entry arrangements should state whether re-entry is permitted, how re-admission is controlled, and what happens when occupancy, safeguarding, or licensing conditions require restrictions.',
  }),
  field('egress_dispersal', 'egress_operations', 'Egress and dispersal summary', 3, 'textarea', {
    defaultValueText:
      'Activation close-down should consider final trading, stock protection, public clear-down, staff welfare, accessible departure needs, handover to client teams, and control sign-off.',
  }),

  field('safeguarding_vulnerability', 'safeguarding_process', 'Safeguarding process', 0, 'textarea', {
    defaultValueText:
      'All staff are expected to identify, report, and escalate safeguarding concerns without delay. Any concern involving a child, vulnerable adult, disclosure of harm, drink spiking, sexual harassment, or significant welfare vulnerability must be logged, reported to control, and handed to the designated safeguarding or welfare lead in line with event procedures.',
  }),
  field('safeguarding_vulnerability', 'safe_spaces', 'Safe space / welfare locations', 1, 'textarea', {
    defaultValueText:
      'Safe spaces or welfare points should be clearly defined, staffed or supported, and capable of receiving vulnerable persons, disclosures, and reunification cases in a controlled and confidential manner.',
  }),
  field('safeguarding_vulnerability', 'lost_vulnerable_person_process', 'Lost child / vulnerable person process', 2, 'textarea', {
    defaultValueText:
      'Any lost child or vulnerable person report should be treated as high priority, logged immediately, circulated through control, and managed using defined holding, welfare, and reunification arrangements.',
  }),
  field('safeguarding_vulnerability', 'ask_for_angela_process', 'Ask for Angela or disclosure route', 3, 'textarea', {
    defaultValueText:
      'Where an Ask for Angela or equivalent disclosure route is in use, staff must know the trigger phrase, immediate safeguarding response, private handover route, and logging requirements.',
  }),
  field('safeguarding_vulnerability', 'confidentiality_logging', 'Confidentiality and logging controls', 4, 'textarea', {
    defaultValueText:
      'Safeguarding records should be shared only with those who need to know, using factual notes, time and location records, and secure handover to the designated safeguarding or welfare lead.',
  }),

  field('licensing_rules', 'licensable_activities', 'Licensable activities', 0, 'textarea', {
    defaultValueText:
      'Where licensable activities apply, the plan should identify the sale or supply of alcohol, regulated entertainment, late-night refreshment, and any related queue, refusal, intoxication, or dispersal controls.',
  }),
  field('licensing_rules', 'dps_name', 'DPS / licence holder', 1, 'text'),
  field('licensing_rules', 'challenge_policy', 'Challenge policy', 2, 'select', {
    defaultValueText: 'Not applicable',
    options: ['Challenge 21', 'Challenge 25', 'Other', 'Not applicable'],
  }),
  field('licensing_rules', 'licensing_conditions', 'Relevant licensing conditions', 3, 'textarea', {
    defaultValueText:
      'Relevant licence conditions, operating schedule requirements, and site-specific restrictions should be built into briefing, deployment, queue management, bar controls, and incident escalation.',
  }),
  field('licensing_rules', 'venue_rules', 'Venue rules and enforcement notes', 4, 'textarea', {
    defaultValueText:
      'Venue rules should cover admission and refusal criteria, prohibited behaviour, accreditation or access restrictions, breach handling, and liaison with client or licence holders where enforcement is required.',
  }),
  field('licensing_rules', 'prohibited_items', 'Prohibited items', 5, 'textarea', {
    defaultValueText:
      'The prohibited-items list should be communicated in advance and at entry, with clear surrender, rejection, escalation, and evidence preservation arrangements where required.',
  }),

  field('incident_management', 'incident_management', 'Incident management framework', 0, 'textarea', {
    defaultValueText:
      'Incidents are to be managed using a graded response based on threat, crowd impact, and vulnerability. Staff will assess, contain, communicate, and escalate in line with control instructions, preserving life safety first, followed by scene stability, evidence retention where appropriate, and structured handover to control, police, medical, or welfare teams.',
  }),

  field('risk_assessment', 'risk_assessment_methodology', 'Risk assessment methodology', 0, 'textarea', {
    defaultValueText:
      'This section summarises the operational risk assessment by linking the event profile, route analysis, staffing model, selected annexes, and emergency arrangements to the hazards most likely to arise within the KSS scope. Each activity or position is considered against the likely hazard, who may be harmed, the controls set out elsewhere in this EMP, and the expected residual risk position once those controls are applied.',
  }),
  field('risk_assessment', 'risk_assessment_scope', 'Risk assessment scope and KSS responsibilities', 1, 'textarea', {
    defaultValueText:
      'The operational risk assessment should cover the allocated areas, roles, routes, and interfaces for which KSS is responsible, including bar queues, licensed service areas, bar compounds, stock interfaces, safeguarding, welfare interface, emergency route protection, asset protection where allocated, and service routes.',
  }),
  field('risk_assessment', 'risk_assessment_source_notes', 'Source RA notes, key hazards, and trigger points', 2, 'textarea', {
    defaultValueText:
      'Where an event-specific risk assessment has been uploaded, its hazards, controls, trigger points, and escalation conditions should be reviewed against the live deployment and reflected in the control table below. Particular attention should be given to crowd pressure, queue overspill, intoxication, vulnerable persons, adverse weather, vehicle or pedestrian interface, route loss, suspicious items, and emergency response thresholds.',
  }),
  field('risk_assessment', 'additional_operational_risks', 'Additional operational risks and controls', 3, 'textarea', {
    defaultValueText: lines(
      'Adverse weather or route degradation - Public routes, staff, and contractors - Apply reduced flow assumptions, additional route marshals, protected holdings, and dynamic review by control.',
      'Queue overspill or delayed admission - Waiting public and accessible guests - Reinforce queue lines, use holding areas, open contingency lanes, and issue public information updates.',
      'Late-night fatigue or welfare demand - Staff, campers, vulnerable attendees - Use relief planning, welfare escalation, hydration checks, and supervisor handover at phase changes.'
    ),
    placeholder:
      'Hazard / activity - Who or where is affected - Key controls, triggers, and escalation',
  }),

  field('emergency_procedures', 'emergency_procedures', 'Emergency procedures', 0, 'textarea', {
    defaultValueText:
      'Emergency response arrangements cover evacuation, partial evacuation, invacuation / lockdown, shelter, performance stop, route protection, and emergency service access. All emergency actions are to be directed through the command structure and communicated using the agreed event channels and fallback methods.',
  }),
  field('emergency_procedures', 'partial_evacuation_procedure', 'Part evacuation procedure', 1, 'textarea', {
    defaultValueText:
      'Part evacuation should identify the decision-maker, trigger thresholds, affected zones, protected routes, holding areas, and how unaffected areas continue to operate safely while the incident area is cleared or isolated.',
  }),
  field('emergency_procedures', 'full_evacuation_procedure', 'Full evacuation procedure', 2, 'textarea', {
    defaultValueText:
      'Full evacuation should define how the event is stopped, how all sectors are instructed, which routes are prioritised, how disabled attendees and vulnerable persons are supported, and how accountability is maintained until the site is confirmed clear or under emergency-service control.',
  }),
  field('emergency_procedures', 'lockdown_invacuation_procedure', 'Invacuation / lockdown procedure', 3, 'textarea', {
    defaultValueText:
      'Invacuation or lockdown should define when guests are moved away from an external or localised threat, how buildings or protected areas are secured, how internal movement is restricted, and how control maintains communication until the threat is assessed or resolved.',
  }),
  field('emergency_procedures', 'shelter_procedure', 'Shelter procedure', 4, 'textarea', {
    defaultValueText:
      'Shelter arrangements should define the trigger for weather or environmental shelter, the preferred shelter locations, how movement is controlled to avoid compression, and how welfare, accessibility, and route protection are maintained during the shelter phase.',
  }),
  field('emergency_procedures', 'show_stop_triggers', 'Show stop / operational pause triggers', 5, 'textarea', {
    defaultValueText:
      'Show stop or operational pause triggers should include crowd pressure, major medical response, severe weather, structural concern, route failure, fire, disorder, or any condition that materially undermines safe operation.',
  }),
  field('emergency_procedures', 'rendezvous_points', 'Rendezvous points and emergency holding areas', 6, 'textarea', {
    defaultValueText:
      'Rendezvous points, marshalling areas, casualty collection points, and protected emergency access routes should be confirmed in the event brief and reflected on current site maps.',
  }),
  field('emergency_procedures', 'command_escalation', 'Command escalation arrangements', 7, 'textarea', {
    defaultValueText:
      'Emergency escalation must define who can recommend, authorise, communicate, and log an evacuation, partial evacuation, shelter, or lockdown decision, and how that decision is relayed to all sectors.',
  }),
  field('emergency_procedures', 'emergency_search_zones', 'Emergency search zones and sterile areas', 8, 'textarea', {
    defaultValueText:
      'Emergency search zones, sterile areas, and route-protection priorities should be defined for use after evacuation, suspected device reports, route failure, or emergency service operations.',
  }),

  field('counter_terrorism', 'ct_procedures', 'Counter-terrorism procedures', 0, 'textarea', {
    defaultValueText:
      'Security teams are to maintain vigilance for hostile reconnaissance, suspicious items, suspicious vehicles, hostile intent, and unusual behavioural cues. Any counter-terrorism concern must be reported immediately to control, isolated where safe to do so, and escalated in line with ACT / SCaN and Run Hide Tell guidance.',
  }),
  field('counter_terrorism', 'suspicious_item_protocol', 'Suspicious item protocol', 1, 'textarea', {
    defaultValueText:
      'Staff discovering a suspicious item should avoid handling it, create distance, prevent further approach, inform control immediately, and await further instruction in accordance with event and police guidance.',
  }),
  field('counter_terrorism', 'hostile_recon_indicators', 'Hostile reconnaissance indicators', 2, 'textarea', {
    defaultValueText:
      'Hostile reconnaissance indicators include unusual questioning, repetitive photography of security measures, testing of responses, interest in route protection or vulnerable points, unattended vehicles, and behaviour inconsistent with normal event attendance.',
  }),
  field('counter_terrorism', 'run_hide_tell_guidance', 'Run Hide Tell / immediate protective actions', 3, 'textarea', {
    defaultValueText:
      'Where a marauding attack or immediate weapons threat is suspected, staff and attendees should be directed to Run if it is safe to escape, Hide if escape is not possible, and Tell the police or control when safe to do so. Event teams must not pursue attackers and should prioritise life safety, route protection, and rapid information flow to control and emergency services.',
  }),

  field('staff_welfare', 'staff_welfare_arrangements', 'Staff welfare arrangements', 0, 'textarea', {
    defaultValueText:
      'Staff welfare arrangements include scheduled breaks, hydration, access to rest areas, escalation of fatigue concerns, first-aid support for staff, and safe sign-off / transport home arrangements where required.',
  }),

  field('accessibility', 'accessibility_arrangements', 'Accessibility arrangements', 0, 'textarea', {
    defaultValueText:
      'The event is to provide reasonable adjustments for accessible ingress, circulation, queue assistance, viewing, communication, and emergency egress. Staff should respond to both visible and non-visible needs with discretion and, where required, coordinate with the event accessibility lead.',
  }),
  field('accessibility', 'accessibility_team_liaison', 'Accessibility team liaison', 1, 'textarea', {
    defaultValueText:
      'Security and crowd teams should liaise with the accessibility lead on entry assistance, viewing provision, welfare issues, route changes, and any incident that may disproportionately affect disabled attendees.',
  }),

  field('communications', 'communications_plan', 'Communications plan', 0, 'textarea', {
    defaultValueText:
      'Operational communications are to use the agreed radio channels, fallback phone contacts, control logging, and structured SITREP updates. Significant decisions, incidents, refusals, ejections, and safeguarding matters must be logged with time, location, action taken, and owner.',
  }),
  field('communications', 'sitrep_decision_logging', 'SITREP and decision logging requirements', 1, 'textarea', {
    defaultValueText:
      'SITREPs should record time, location, issue, action, owner, and outcome. Decision logs should capture material operational changes, emergency decisions, refusals, ejections, safeguarding actions, and agency notifications.',
  }),
  field('communications', 'refusal_false_id_protocol', 'Refusal and false ID protocol', 2, 'textarea', {
    defaultValueText:
      'Refusals must be handled calmly by the officer or supervisor nearest the point of service, recorded with time and location, and escalated where aggression, suspected false ID, proxy purchase, underage concern, or safeguarding vulnerability is identified. False ID must be managed in line with the event licence holder and police guidance.',
  }),
  field('communications', 'ejection_protocol', 'Ejection protocol', 3, 'textarea', {
    defaultValueText:
      'Ejection decisions are supervisor-led unless immediate life safety requires intervention. The process should consider proportionality, welfare, route safety, police notification where required, safe removal from the KSS area, and clear logging through Event Control.',
  }),
  field('communications', 'confiscation_process', 'Confiscation process', 4, 'textarea', {
    defaultValueText:
      'Confiscated or surrendered items must be handled consistently, logged where required, stored or disposed of in line with event procedure, and escalated immediately for weapons, drugs, suspicious items, false ID, or evidence linked to crime or safeguarding.',
  }),
  field('communications', 'ejection_safeguarding', 'Safeguarding within ejections', 5, 'textarea', {
    defaultValueText:
      'Any ejection or refusal involving a child, vulnerable adult, intoxicated person, disclosure, harassment concern, drink spiking allegation, or isolated attendee must include welfare assessment and handover to the event safeguarding or welfare lead before final removal where appropriate.',
  }),

  field('post_event_reporting', 'debrief_reporting', 'Post-event reporting and debrief', 0, 'textarea', {
    defaultValueText:
      'Post-event reporting must capture key incidents, staffing issues, safeguarding interventions, operational lessons, route and queue performance, and recommendations for future delivery. A structured debrief should be completed with relevant stakeholders at the earliest practical opportunity.',
  }),
  field('post_event_reporting', 'close_down_operations', 'Close-down operations', 1, 'textarea', {
    defaultValueText:
      'Close-down operations should confirm final service, phased bar closure, public clear-down, staff release, stock and cash protection where allocated, compound lock-down where allocated, client handover, and control sign-off for each KSS area.',
  }),
  field('post_event_reporting', 'end_of_shift_reporting', 'End-of-shift and end-of-event reporting', 2, 'textarea', {
    defaultValueText:
      'Supervisors must complete end-of-shift reports covering staffing, incidents, refusals, ejections, safeguarding, welfare, prohibited items, queue performance, asset protection, and unresolved actions before handover or sign-off.',
  }),
  field('post_event_reporting', 'asset_security_demobilisation', 'Asset security and demobilisation', 3, 'textarea', {
    defaultValueText:
      'Demobilisation should protect stock, cash, equipment, radios, keys, passes, documents, and temporary infrastructure until formal handover. Any loss, damage, or unauthorised access concern must be logged and escalated.',
  }),
  field('post_event_reporting', 'health_safety_overview', 'Health and safety overview', 4, 'textarea', {
    defaultValueText:
      'KSS staff must maintain a safe working culture through dynamic risk assessment, weather awareness, manual handling controls, safe access routes, lighting checks, PPE where required, welfare breaks, incident reporting, and escalation of unsafe conditions to Event Control.',
  }),

  field('appendices', 'site_maps_and_route_diagrams', 'Site maps, route diagrams, and plans', 0, 'textarea', {
    defaultValueText: lines(
      'Ingress and egress plans',
      'Queue lane layout',
      'Public route diagrams',
      'Emergency route and rendezvous plan',
      'Controlled-area map'
    ),
    placeholder: 'Ingress plan\nRoute diagrams\nEmergency route map\nControlled-area map',
  }),
  field('appendices', 'appendix_notes', 'Appendix notes and supporting attachments', 1, 'textarea', {
    defaultValueText: lines(
      'Site maps and egress plans',
      'Deployment matrix',
      'Contact directory',
      'Search policy',
      'Emergency action cards',
      'Weather trigger matrix'
    ),
    placeholder: 'Maps\nDeployment matrix\nContact directory\nSearch policy\nEmergency action cards\nWeather trigger matrix',
  }),
  field('appendices', 'version_history_summary', 'Version history summary', 2, 'textarea', {
    defaultValueText:
      'Version history should record version number, issue date, author, material changes, approval status, and distribution control for the current EMP.',
  }),
  field('appendices', 'contact_directory', 'Contact directory', 3, 'textarea', {
    defaultValueText:
      'Contact directory should include KSS operational lead, deputy, control/loggist, zone supervisors, client representative, organiser control, medical lead, welfare/safeguarding lead, licensing contact, police or emergency interface, and traffic or venue interface where applicable.',
  }),
]

export function getEmpSectionByKey(sectionKey: string) {
  return EMP_MASTER_TEMPLATE_SECTIONS.find((sectionItem) => sectionItem.key === sectionKey) || null
}

export function getEmpFieldByKey(fieldKey: string) {
  return EMP_MASTER_TEMPLATE_FIELDS.find((fieldItem) => fieldItem.key === fieldKey) || null
}

export function getEmpFieldEditMode(fieldKey: string): EmpFieldEditMode {
  const field = getEmpFieldByKey(fieldKey)
  if (!field) return 'event_optional'
  if (field.editMode) return field.editMode
  if (field.required) return 'event_required'
  if (EMP_GENERIC_FRAMEWORK_SECTION_KEYS.has(field.sectionKey)) return 'generic_framework'
  return 'event_optional'
}

export function isEmpFieldVisible(fieldKey: string, selectedAnnexes: string[]) {
  const field = getEmpFieldByKey(fieldKey)
  if (!field?.annexKeys?.length) return true
  return field.annexKeys.some((annexKey) => selectedAnnexes.includes(annexKey))
}

export function isEmpFieldVisibleInEditor(
  fieldKey: string,
  selectedAnnexes: string[],
  showGenericFramework = false
) {
  if (!isEmpFieldVisible(fieldKey, selectedAnnexes)) return false
  const editMode = getEmpFieldEditMode(fieldKey)
  return showGenericFramework || editMode !== 'generic_framework'
}
