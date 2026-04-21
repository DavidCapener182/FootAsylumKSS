import type { Json } from '@/types/db'

export type CmpFieldType = 'text' | 'textarea' | 'date' | 'number' | 'select'

export type CmpDocumentKind =
  | 'previous_somp'
  | 'previous_cmp'
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

export type CmpAnnexKey =
  | 'bar_operations'
  | 'search_screening'
  | 'front_of_stage_pit'
  | 'traffic_pedestrian_routes'
  | 'camping_security'
  | 'vip_backstage_security'
  | 'stewarding_deployment'
  | 'emergency_action_cards'

export interface CmpMasterTemplateSection {
  key: string
  title: string
  order: number
  description?: string
}

export interface CmpMasterTemplateField {
  key: string
  sectionKey: string
  label: string
  order: number
  type: CmpFieldType
  annexKeys?: CmpAnnexKey[]
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
): CmpMasterTemplateSection => ({
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
  type: CmpFieldType,
  options: Partial<Omit<CmpMasterTemplateField, 'sectionKey' | 'key' | 'label' | 'order' | 'type'>> = {}
): CmpMasterTemplateField => ({
  sectionKey,
  key,
  label,
  order,
  type,
  ...options,
})

const lines = (...items: string[]) => items.join('\n')

export const CMP_ANNEX_DEFINITIONS: Array<{ key: CmpAnnexKey; label: string; description: string }> = [
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
    label: 'Front of Stage / Pit',
    description: 'Front-of-stage staffing, barrier management, and surge response controls.',
  },
  {
    key: 'traffic_pedestrian_routes',
    label: 'Traffic / Pedestrian Routes',
    description: 'Traffic interface, road crossing points, and pedestrian route management.',
  },
  {
    key: 'camping_security',
    label: 'Camping Security',
    description: 'Camping, overnight welfare, campsite circulation, and asset protection controls.',
  },
  {
    key: 'vip_backstage_security',
    label: 'VIP / Backstage Security',
    description: 'Backstage access control, accreditation, and VIP movement arrangements.',
  },
  {
    key: 'stewarding_deployment',
    label: 'Stewarding Deployment',
    description: 'Stewarding matrix, shift structure, and zone-by-zone deployment detail.',
  },
  {
    key: 'emergency_action_cards',
    label: 'Emergency Action Cards',
    description: 'Action-card style summary for evacuation, lockdown, safeguarding, and CT incidents.',
  },
]

export const CMP_ANNEX_ROLE_FIELD_KEYS: Partial<Record<CmpAnnexKey, string>> = {
  bar_operations: 'bar_operations_roles',
  search_screening: 'search_screening_roles',
  front_of_stage_pit: 'front_of_stage_roles',
  traffic_pedestrian_routes: 'traffic_pedestrian_roles',
  camping_security: 'camping_security_roles',
  vip_backstage_security: 'vip_backstage_roles',
  stewarding_deployment: 'stewarding_roles',
}

export const CMP_DOCUMENT_KIND_OPTIONS: Array<{ value: CmpDocumentKind; label: string }> = [
  { value: 'previous_somp', label: 'Previous SOMP' },
  { value: 'previous_cmp', label: 'Previous CMP' },
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

export const CMP_MASTER_TEMPLATE_TITLE = 'Crowd Management and Security Operations Plan'
export const CMP_MASTER_TEMPLATE_DESCRIPTION =
  'Admin-only KSS event planning template combining crowd analysis, operational security controls, safeguarding, emergency response, and modular annexes.'

export const CMP_MASTER_TEMPLATE_SECTIONS: CmpMasterTemplateSection[] = [
  section(
    'document_control',
    'Document Control',
    0,
    'This section controls version status, issue dates, approval, and distribution so all stakeholders work from the current approved copy.'
  ),
  section(
    'purpose_scope',
    'Purpose and Scope',
    1,
    'This master plan defines the crowd management and security operating framework and should be read alongside the Event Management Plan, risk assessments, emergency procedures, licensing documents, and current site plans.'
  ),
  section(
    'event_overview',
    'Event Overview',
    2,
    'Record the core event identity, venue references, delivery structure, dates, and operational hours for the event.'
  ),
  section(
    'strategic_objectives',
    'Strategic Objectives',
    3,
    'The operational strategy is to protect life safety, support orderly movement, prevent crime and disorder, and support client and licensing objectives through a clear command structure.'
  ),
  section(
    'crowd_profile',
    'Event and Crowd Profile',
    4,
    'Summarise who is expected to attend, how they are likely to behave, and what factors may influence mood, vulnerability, queue pressure, density, and dispersal.'
  ),
  section(
    'site_design',
    'Site and Crowd Design Analysis',
    5,
    'This section applies DIM-ALICED principles to the event layout, routes, information, management arrangements, and likely crowd behaviour.'
  ),
  section(
    'ramp_assessment',
    'RAMP Assessment',
    6,
    'Use RAMP to review pedestrian routes, arrival patterns, movement pressures, and the audience profile against the site and surrounding environment.'
  ),
  section(
    'capacity_flow',
    'Capacity and Flow Calculations',
    7,
    'Document the assumptions, capacities, and normal and emergency flow calculations used to justify safe occupancy and movement.'
  ),
  section(
    'command_control',
    'Command, Control and Coordination',
    8,
    'Set out the control structure, reporting lines, supervisor roles, and external interfaces required to manage the event consistently.'
  ),
  section(
    'deployment_strategy',
    'Deployment Strategy',
    9,
    'Describe how staffing is allocated by zone and time, together with mobile response, relief, and contingency cover.'
  ),
  section(
    'ingress_operations',
    'Ingress Operations',
    10,
    'Define how the event will open safely, manage queues, apply search and admission controls, and respond to overspill or surge conditions.'
  ),
  section(
    'circulation_internal',
    'Circulation and Internal Crowd Management',
    11,
    'Explain how internal routes, crossings, queues, and higher-density areas are monitored and controlled during live operations.'
  ),
  section(
    'egress_dispersal',
    'Egress and Dispersal',
    12,
    'Describe how patrons are released, routed, and supported through transport and off-site interfaces at the end of the event.'
  ),
  section(
    'safeguarding_vulnerability',
    'Safeguarding and Vulnerability',
    13,
    'Set out the arrangements for vulnerability recognition, disclosures, lost persons, welfare handover, confidentiality, and safeguarding escalation.'
  ),
  section(
    'licensing_rules',
    'Licensing and Venue Rules',
    14,
    'Where relevant, record the licensable activities, challenge policy, operating conditions, prohibited items, and enforcement controls.'
  ),
  section(
    'incident_management',
    'Incident Management',
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
    'Emergency Procedures',
    17,
    'Record the arrangements for evacuation, partial evacuation, lockdown or invacuation, shelter, show stop, and emergency route protection.'
  ),
  section(
    'counter_terrorism',
    'Counter-Terrorism and Protect Duty',
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
    'Communications',
    21,
    'Describe radio use, fallback communications, SITREPs, decision logging, and the flow of operational information.'
  ),
  section(
    'post_event_reporting',
    'Post-Event Reporting and Debrief',
    22,
    'Capture the reporting, debrief, lessons learned, and improvement actions required after the event.'
  ),
  section(
    'appendices',
    'Appendices',
    23,
    'Appendices hold supporting operational material such as maps, contact sheets, deployment matrices, action cards, and optional provider credentials.'
  ),
]

export const CMP_MASTER_TEMPLATE_FIELDS: CmpMasterTemplateField[] = [
  field('document_control', 'plan_title', 'Plan title', 0, 'text', {
    required: true,
    defaultValueText: CMP_MASTER_TEMPLATE_TITLE,
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
      'This Crowd Management and Security Operations Plan sets out the arrangements for crowd safety, security deployment, safeguarding, communications, emergency response, and post-event reporting for the event. It should be read alongside the Event Management Plan, risk assessments, emergency procedures, licensing documentation, and current site plans.',
  }),
  field('purpose_scope', 'related_documents', 'Related documents', 1, 'textarea', {
    defaultValueText:
      'Event Management Plan\nOperational risk assessment\nEmergency procedures\nSite maps and egress plans\nLicensing schedule\nDeployment matrix',
  }),

  field('event_overview', 'event_name', 'Event name', 0, 'text', { required: true }),
  field('event_overview', 'event_type', 'Event type', 1, 'text', {
    placeholder: 'Festival, concert, civic event, sports event, outdoor activation',
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
      'Protect the public, staff, contractors, and performers.\nMaintain safe ingress, circulation, and egress.\nPrevent crime, disorder, and unsafe crowd pressure.\nSupport safeguarding, medical, and emergency response functions.\nSupport the client, organiser, and licensing objectives for the event.',
  }),

  field('crowd_profile', 'licensed_capacity', 'Licensed capacity', 0, 'text'),
  field('crowd_profile', 'expected_attendance', 'Expected attendance', 1, 'text'),
  field('crowd_profile', 'staff_and_contractor_count', 'Staff and contractor count', 2, 'text'),
  field('crowd_profile', 'audience_age_profile', 'Audience age profile', 3, 'text'),
  field('crowd_profile', 'attendance_profile', 'Crowd profile summary', 4, 'textarea', {
    defaultValueText:
      'The crowd profile should summarise expected demographics, familiarity with the venue, likely behavioural traits, alcohol influence, dwell patterns, and any conditions likely to affect density, compliance, or vulnerability.',
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
      'The alcohol profile should consider expected levels of intoxication, peak service periods, refusals, queue pressure, conflict potential, and the effect of alcohol on mood, compliance, and egress behaviour.',
  }),
  field('crowd_profile', 'camping_profile', 'Camping / overnight profile', 8, 'textarea', {
    defaultValueText:
      'Where camping or overnight occupation applies, the plan should address late-night movement, campsite vulnerability, welfare demand, fire risks, noise, and overnight response capability.',
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
      'Peak periods typically include pre-opening build-up, first ingress wave, headline acts, bar close where relevant, end-of-show release, and transport-led dispersal pressure.',
  }),

  field('site_design', 'site_layout_summary', 'Site layout summary', 0, 'textarea', {
    defaultValueText:
      'The site layout should support safe arrival, queueing, search, circulation, service access, welfare provision, viewing, and emergency egress, with clear separation between public, controlled, and back-of-house areas.',
  }),
  field('site_design', 'key_zones', 'Key zones and operational areas', 1, 'textarea', {
    defaultValueText: lines(
      'Ingress and search lanes',
      'Arena or viewing areas',
      'Bars, concessions, and welfare points',
      'Medical and accessible areas',
      'Backstage, VIP, and service compounds',
      'Egress routes and transport interfaces'
    ),
  }),
  field('site_design', 'controlled_areas', 'Controlled, restricted, or high-risk areas', 2, 'textarea', {
    defaultValueText:
      'Controlled areas should include backstage, production, plant routes, medical facilities, welfare spaces, cash handling points, accreditation-only areas, and any zone requiring active access control.',
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
      'Reporting lines should run from staff to zone supervisors to control or operational lead, with immediate escalation for life safety, safeguarding, counter-terrorism, disorder, significant crowd pressure, or route failure.',
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
      'Live monitoring should combine supervisor observation, CCTV where available, stage or pit observation, queue monitoring, welfare and medical feedback, and any density technology or counting system used to support situational awareness. Technology may inform decisions but should not replace live command judgement.',
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
      'Deployment should be structured by zone, time, and activity, with staffing levels reflecting ingress peaks, internal circulation pressure, headline moments, bar close where relevant, and egress requirements.',
  }),
  field('deployment_strategy', 'response_teams', 'Response teams and mobile resources', 4, 'textarea', {
    defaultValueText:
      'Mobile response teams should be available to reinforce queues, respond to disorder, assist welfare or medical incidents, and protect routes or controlled areas as conditions change.',
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
  field('deployment_strategy', 'front_of_stage_roles', 'Front of Stage / Pit roles and duties', 9, 'textarea', {
    annexKeys: ['front_of_stage_pit'],
    description: 'Shown only when the Front of Stage / Pit annex is selected.',
    defaultValueText:
      'Set out pit supervisors, barrier teams, extraction staff, stage-left or stage-right responders, and the reporting route to control during headline and high-density periods.',
  }),
  field('deployment_strategy', 'traffic_pedestrian_roles', 'Traffic / Pedestrian Route roles and duties', 10, 'textarea', {
    annexKeys: ['traffic_pedestrian_routes'],
    description: 'Shown only when the Traffic / Pedestrian Routes annex is selected.',
    defaultValueText:
      'Set out route stewards, crossing-point staff, transport-hub marshals, car-park interface staff, taxi and coach loading support, and the link with the traffic management contractor.',
  }),
  field('deployment_strategy', 'camping_security_roles', 'Camping Security roles and duties', 11, 'textarea', {
    annexKeys: ['camping_security'],
    description: 'Shown only when the Camping Security annex is selected.',
    defaultValueText:
      'Set out campsite supervisors, overnight patrols, welfare-linked patrols, campsite response teams, perimeter protection, and any quiet-hours or fire-watch arrangements.',
  }),
  field('deployment_strategy', 'vip_backstage_roles', 'VIP / Backstage Security roles and duties', 12, 'textarea', {
    annexKeys: ['vip_backstage_security'],
    description: 'Shown only when the VIP / Backstage Security annex is selected.',
    defaultValueText:
      'Set out accreditation control, backstage gate staff, VIP hosts or escorts, artist-route protection, sterile-area checks, and response arrangements for unauthorised access.',
  }),
  field('deployment_strategy', 'stewarding_roles', 'Stewarding Deployment roles and duties', 13, 'textarea', {
    annexKeys: ['stewarding_deployment'],
    description: 'Shown only when the Stewarding Deployment annex is selected.',
    defaultValueText:
      'Set out zone stewards, directional staff, queue marshals, emergency exit staff, briefing ownership, and how stewarding is integrated with security and control.',
  }),

  field('ingress_operations', 'ingress_routes_holding_areas', 'Ingress routes, holding areas, and gate plans', 0, 'textarea', {
    defaultValueText:
      'Ingress planning should identify each public approach route, gate function, holding pen or queue containment area, searchable lane arrangement, accessible route, and any transport or highway crossing point that requires coordinated staffing.',
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
      'Pre-opening checks, staff briefing, signage, lane readiness, search posture, public messaging, and rejection procedures should all be completed before public admission begins.',
  }),

  field('circulation_internal', 'circulation_controls', 'Circulation controls', 0, 'textarea', {
    defaultValueText:
      'Internal circulation controls should keep principal pedestrian routes clear, protect emergency access lanes, manage service crossings, and intervene early where dwell, counterflow, or queue spillback develops.',
  }),
  field('circulation_internal', 'high_density_controls', 'High-density / front-of-stage controls', 1, 'textarea', {
    defaultValueText:
      'Where front-of-stage or other high-density areas apply, the plan should define monitoring points, supervisory thresholds, relief routes, pit or barrier management, and coordinated escalation with control.',
  }),
  field('circulation_internal', 'internal_queue_controls', 'Internal queue and overspill arrangements', 2, 'textarea', {
    defaultValueText:
      'Internal queue arrangements should prevent bar, toilet, merch, or welfare queues from obstructing main routes, exits, accessible routes, or emergency access points.',
  }),

  field('egress_dispersal', 'transport_interface', 'Transport interface and public route management', 0, 'textarea', {
    defaultValueText:
      'Egress planning should coordinate with transport, taxi, coach, parking, and highway interfaces so pedestrians can disperse safely without uncontrolled crossing or route conflict.',
  }),
  field('egress_dispersal', 'dispersal_routes', 'Dispersal routes', 1, 'textarea', {
    defaultValueText:
      'Primary and secondary dispersal routes should be identified, signed where applicable, observed by staff at pinch points, and reviewed against post-event lighting, weather, and local constraints.',
  }),
  field('egress_dispersal', 'reentry_policy', 'Re-entry policy', 2, 'textarea', {
    defaultValueText:
      'Re-entry arrangements should state whether re-entry is permitted, how re-admission is controlled, and what happens when occupancy, safeguarding, or licensing conditions require restrictions.',
  }),
  field('egress_dispersal', 'egress_operations', 'Egress and dispersal summary', 3, 'textarea', {
    defaultValueText:
      'Egress operations should consider phased release, transport timing, post-show trading closure, managed holds, accessible departure needs, and the likely impact of crowd mood at the end of the event.',
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
      'This section summarises the operational risk assessment by linking the event profile, route analysis, staffing model, selected annexes, and emergency arrangements to the hazards most likely to arise within the KSS scope. Each activity or position is considered against the likely hazard, who may be harmed, the controls set out elsewhere in this CMP, and the expected residual risk position once those controls are applied.',
  }),
  field('risk_assessment', 'risk_assessment_scope', 'Risk assessment scope and KSS responsibilities', 1, 'textarea', {
    defaultValueText:
      'The operational risk assessment should cover the public and controlled areas, roles, routes, and interfaces for which KSS is responsible, including ingress, queue management, circulation, egress, safeguarding, welfare interface, emergency route protection, and any annex-driven functions such as bars, front-of-stage, traffic routes, camping, or backstage control.',
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

  field('post_event_reporting', 'debrief_reporting', 'Post-event reporting and debrief', 0, 'textarea', {
    defaultValueText:
      'Post-event reporting must capture key incidents, staffing issues, safeguarding interventions, operational lessons, route and queue performance, and recommendations for future delivery. A structured debrief should be completed with relevant stakeholders at the earliest practical opportunity.',
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
]

export function getCmpSectionByKey(sectionKey: string) {
  return CMP_MASTER_TEMPLATE_SECTIONS.find((sectionItem) => sectionItem.key === sectionKey) || null
}

export function getCmpFieldByKey(fieldKey: string) {
  return CMP_MASTER_TEMPLATE_FIELDS.find((fieldItem) => fieldItem.key === fieldKey) || null
}

export function isCmpFieldVisible(fieldKey: string, selectedAnnexes: string[]) {
  const field = getCmpFieldByKey(fieldKey)
  if (!field?.annexKeys?.length) return true
  return field.annexKeys.some((annexKey) => selectedAnnexes.includes(annexKey))
}
