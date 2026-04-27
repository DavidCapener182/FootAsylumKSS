import type { CmpAnnexKey } from '@/lib/cmp/master-template'

export type CmpGuidedQuestionType = 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select'
export type CmpGuidedAnswerValue = string | boolean
export type CmpGuidedAnswers = Record<string, CmpGuidedAnswerValue>

export type CmpGuidedQuestion = {
  key: string
  label: string
  type: CmpGuidedQuestionType
  fieldKey?: string
  placeholder?: string
  help?: string
  options?: Array<{ value: string; label: string }>
}

export type CmpGuidedGroup = {
  key: string
  title: string
  description: string
  questions: CmpGuidedQuestion[]
}

const lines = (...items: Array<string | false | null | undefined>) => items.filter(Boolean).join('\n')
const clean = (value: unknown) => String(value || '').trim()
const answer = (answers: CmpGuidedAnswers, key: string, fallback = '') => clean(answers[key]) || fallback
const enabled = (answers: CmpGuidedAnswers, key: string) => answers[key] === true || answers[key] === 'true'

const riskLevelOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const yesNoOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

const challengePolicyOptions = [
  { value: 'Challenge 25', label: 'Challenge 25' },
  { value: 'Challenge 21', label: 'Challenge 21' },
  { value: 'No alcohol sales', label: 'No alcohol sales' },
  { value: 'Client / licence policy TBC', label: 'Client / licence policy TBC' },
]

const arrivalPatternOptions = [
  { value: 'steady', label: 'Steady arrivals' },
  { value: 'early_peak', label: 'Early/pre-opening peak' },
  { value: 'headline_peak', label: 'Peak before headline act' },
  { value: 'multi_wave', label: 'Multiple waves' },
]

const reentryPolicyOptions = [
  { value: 'No re-entry', label: 'No re-entry' },
  { value: 'Controlled re-entry', label: 'Controlled re-entry' },
  { value: 'Re-entry permitted', label: 'Re-entry permitted' },
  { value: 'TBC', label: 'TBC' },
]

const searchPostureOptions = [
  { value: 'standard', label: 'Standard event search' },
  { value: 'enhanced', label: 'Enhanced search posture' },
  { value: 'targeted', label: 'Targeted / intelligence-led search' },
  { value: 'none', label: 'No dedicated search' },
]

function numberLabel(value: string, singular: string, plural = `${singular}s`) {
  const cleaned = clean(value)
  if (!cleaned) return ''
  const numeric = Number(cleaned.replace(/,/g, ''))
  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString()} ${numeric === 1 ? singular : plural}`
  }
  return `${cleaned} ${plural}`
}

function listText(value: string, fallback: string) {
  const cleaned = clean(value)
  return cleaned || fallback
}

function levelLabel(value: string, fallback = 'medium') {
  const normalized = clean(value || fallback).toLowerCase()
  if (normalized === 'high') return 'high'
  if (normalized === 'low') return 'low'
  return 'medium'
}

function alcoholProfileText(level: string, hasBars: boolean, notes: string) {
  const normalized = levelLabel(level)
  const base = {
    low: 'Alcohol-related risk is assessed as low, with limited alcohol demand expected and routine supervisor monitoring considered proportionate.',
    medium: 'Alcohol-related risk is assessed as medium, with bar demand, pre-loading, intoxication, refusals, and late-event behavioural change requiring active supervision.',
    high: 'Alcohol-related risk is assessed as high, requiring close monitoring of bars, queues, refusal support, vulnerable persons, disorder triggers, and late-event dispersal.',
  }[normalized]
  return lines(
    base,
    hasBars && 'Licensed trading areas require clear refusal support, Challenge policy alignment, service-lane protection, and escalation from bar operators to supervisors.',
    notes && `Event-specific notes: ${notes}`
  )
}

function familyProfileText(level: string, childrenExpected: boolean, notes: string) {
  const normalized = levelLabel(level)
  const base = {
    low: 'Family and vulnerability demand is expected to be low, but staff must still identify isolated, distressed, intoxicated, or vulnerable persons early.',
    medium: 'Family and vulnerability demand is expected to be medium, requiring visible welfare routes, lost-person escalation, and supervisor awareness during ingress, peak periods, and egress.',
    high: 'Family and vulnerability demand is expected to be high, requiring active welfare presence, clear safe-space arrangements, lost-child/reunification controls, and early safeguarding escalation.',
  }[normalized]
  return lines(
    base,
    childrenExpected && 'Children or families are expected, so lost-child, reunification, and quieter support arrangements must be briefed before opening.',
    notes && `Event-specific notes: ${notes}`
  )
}

function crowdBehaviourText(level: string, crowdType: string, notes: string) {
  const normalized = levelLabel(level)
  const base = {
    low: 'Crowd behaviour risk is assessed as low, with routine queuing, circulation, and supervisor monitoring expected to manage normal crowd movement.',
    medium: 'Crowd behaviour risk is assessed as medium, with potential for queue frustration, density around attractions, group behaviour, and late-event trigger points requiring active management.',
    high: 'Crowd behaviour risk is assessed as high, with increased potential for crowd pressure, disorder, refusal conflict, welfare vulnerability, and rapid escalation at pinch points.',
  }[normalized]
  return lines(
    crowdType || base,
    crowdType && base,
    notes && `Event-specific notes: ${notes}`
  )
}

export const CMP_GUIDED_GROUPS: CmpGuidedGroup[] = [
  {
    key: 'event_identity',
    title: 'Event Identity',
    description: 'Core details used on the cover, document control, and event overview.',
    questions: [
      { key: 'event_name', fieldKey: 'event_name', label: 'Event name', type: 'text', placeholder: 'Northgate Summer Live 2026' },
      { key: 'event_type', fieldKey: 'event_type', label: 'Event type', type: 'text', placeholder: 'Outdoor concert, festival, retail activation' },
      { key: 'venue_name', fieldKey: 'venue_name', label: 'Venue / location', type: 'text' },
      { key: 'venue_address', fieldKey: 'venue_address', label: 'Venue address', type: 'textarea' },
      { key: 'venue_reference', fieldKey: 'venue_reference', label: 'Venue reference / postcode / What3Words / SAG ref', type: 'text' },
      { key: 'show_dates', fieldKey: 'show_dates', label: 'Show dates', type: 'text', placeholder: '19 July 2026 to 21 July 2026' },
      { key: 'build_dates', fieldKey: 'build_dates', label: 'Build dates', type: 'text' },
      { key: 'break_dates', fieldKey: 'break_dates', label: 'Break / egress dates', type: 'text' },
      { key: 'organiser_name', fieldKey: 'organiser_name', label: 'Organiser', type: 'text' },
      { key: 'client_name', fieldKey: 'client_name', label: 'Client', type: 'text' },
      { key: 'principal_contractor', fieldKey: 'principal_contractor', label: 'Principal contractor / delivery lead', type: 'text' },
      { key: 'document_version', fieldKey: 'document_version', label: 'Version', type: 'text', placeholder: 'V1.0' },
      { key: 'document_status', fieldKey: 'document_status', label: 'Status', type: 'text', placeholder: 'Draft / Final' },
      { key: 'author_name', fieldKey: 'author_name', label: 'Author', type: 'text' },
      { key: 'approver_name', fieldKey: 'approver_name', label: 'Approver', type: 'text' },
      { key: 'issue_date', fieldKey: 'issue_date', label: 'Issue date', type: 'date' },
      { key: 'review_date', fieldKey: 'review_date', label: 'Review date', type: 'date' },
    ],
  },
  {
    key: 'applicability',
    title: 'Applicable Areas and Annexes',
    description: 'Choose what applies so irrelevant wording and annexes are omitted.',
    questions: [
      { key: 'has_arena', label: 'Arena / main public area applies', type: 'checkbox' },
      { key: 'has_bars', label: 'Bars or licensed trading applies', type: 'checkbox' },
      { key: 'has_camping', label: 'Camping / overnight occupation applies', type: 'checkbox' },
      { key: 'has_vip_backstage', label: 'VIP / backstage / restricted compound applies', type: 'checkbox' },
      { key: 'has_front_of_stage', label: 'Front of stage / pit applies', type: 'checkbox' },
      { key: 'has_traffic_routes', label: 'Traffic or pedestrian route interface applies', type: 'checkbox' },
      { key: 'has_search_screening', label: 'Dedicated search and screening operation applies', type: 'checkbox' },
      { key: 'has_stewarding_deployment', label: 'Include stewarding deployment annex', type: 'checkbox' },
      { key: 'has_emergency_action_cards', label: 'Include emergency action cards annex', type: 'checkbox' },
      { key: 'applicable_areas', label: 'Areas / zones covered by this plan', type: 'textarea', placeholder: 'Arena\nIngress routes\nEgress routes\nWelfare hub' },
      { key: 'related_documents', fieldKey: 'related_documents', label: 'Supporting documents that apply', type: 'textarea' },
    ],
  },
  {
    key: 'crowd_profile',
    title: 'Crowd Profile',
    description: 'Structured crowd data that generates the profile narrative automatically.',
    questions: [
      { key: 'licensed_capacity_number', label: 'Licensed public capacity', type: 'number' },
      { key: 'expected_attendance_number', label: 'Expected public attendance', type: 'number' },
      { key: 'staff_and_contractor_number', label: 'Expected staff / contractor count', type: 'number' },
      { key: 'camper_count', label: 'Expected camper count, if camping applies', type: 'number' },
      { key: 'audience_age_profile', fieldKey: 'audience_age_profile', label: 'Audience age profile', type: 'text' },
      { key: 'crowd_behaviour_level', label: 'Crowd behaviour risk level', type: 'select', options: riskLevelOptions },
      { key: 'crowd_type', label: 'Crowd type / behaviour notes, if unusual', type: 'textarea', help: 'Optional. Leave blank to use standard wording for the selected level.' },
      { key: 'main_arrival_mode', label: 'Main arrival mode', type: 'select', options: [
        { value: 'mixed', label: 'Mixed transport' },
        { value: 'public_transport', label: 'Mostly public transport' },
        { value: 'private_car', label: 'Mostly private car / parking' },
        { value: 'walkup', label: 'Mostly walk-up / local' },
        { value: 'coach_shuttle', label: 'Coach / shuttle heavy' },
      ] },
      { key: 'public_transport_percent', label: 'Public transport %', type: 'number' },
      { key: 'private_car_percent', label: 'Private car / taxi %', type: 'number' },
      { key: 'walkup_percent', label: 'Walk-up %', type: 'number' },
      { key: 'family_vulnerability_level', label: 'Family / vulnerability level', type: 'select', options: riskLevelOptions },
      { key: 'family_presence_notes', label: 'Family / vulnerable person notes, if unusual', type: 'textarea' },
      { key: 'alcohol_risk_level', label: 'Alcohol and behaviour risk level', type: 'select', options: riskLevelOptions },
      { key: 'alcohol_profile_notes', label: 'Alcohol notes, if unusual', type: 'textarea' },
      { key: 'historic_issue_level', label: 'Historic issues / intelligence level', type: 'select', options: [
        { value: 'none', label: 'None known' },
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ] },
      { key: 'historic_issues_notes', label: 'Known historic issues / intelligence notes', type: 'textarea' },
      { key: 'mood_trigger_level', label: 'Mood / trigger point level', type: 'select', options: riskLevelOptions },
      { key: 'mood_trigger_notes', label: 'Likely trigger notes, if specific', type: 'textarea' },
      { key: 'peak_periods', fieldKey: 'peak_periods', label: 'Expected peak periods', type: 'textarea', placeholder: '10:00 to 12:00 - ingress peak' },
    ],
  },
  {
    key: 'site_design',
    title: 'Site Design and RAMP',
    description: 'Routes, zones, DIM-ALICED and RAMP inputs.',
    questions: [
      { key: 'entrances', label: 'Public entrances / ingress locations', type: 'textarea' },
      { key: 'exits', label: 'Public exits / egress locations', type: 'textarea' },
      { key: 'key_zones', fieldKey: 'key_zones', label: 'Key zones and operational areas', type: 'textarea' },
      { key: 'controlled_areas', fieldKey: 'controlled_areas', label: 'Controlled or restricted areas', type: 'textarea' },
      { key: 'emergency_exits_holding_areas', fieldKey: 'emergency_exits_holding_areas', label: 'Emergency exits, holding areas and RV points', type: 'textarea' },
      { key: 'site_layout_summary', fieldKey: 'site_layout_summary', label: 'Site layout notes', type: 'textarea' },
      { key: 'primary_routes', label: 'Primary pedestrian routes', type: 'textarea' },
      { key: 'arrival_pattern_type', label: 'Arrival pattern', type: 'select', options: arrivalPatternOptions },
      { key: 'arrival_peak_window', label: 'Main arrival peak window', type: 'text', placeholder: '10:00 to 12:00' },
      { key: 'movement_pressure_points', label: 'Movement pressure points / pinch points', type: 'textarea' },
      { key: 'route_resilience_level', label: 'Secondary route resilience', type: 'select', options: riskLevelOptions },
      { key: 'route_resilience_notes', label: 'Secondary route notes, if specific', type: 'textarea' },
    ],
  },
  {
    key: 'capacity_flow',
    title: 'Capacity and Flow',
    description: 'Numbers and assumptions used for capacity, ingress, egress and degraded conditions.',
    questions: [
      { key: 'gross_area', fieldKey: 'gross_area', label: 'Gross public area', type: 'text' },
      { key: 'net_area', fieldKey: 'net_area', label: 'Net usable area', type: 'text' },
      { key: 'excluded_areas', fieldKey: 'excluded_areas', label: 'Excluded areas / deductions', type: 'textarea' },
      { key: 'density_level', label: 'Density assumption level', type: 'select', options: riskLevelOptions },
      { key: 'density_assumption_notes', label: 'Density notes, if specific', type: 'textarea' },
      { key: 'zone_capacities', fieldKey: 'zone_capacities', label: 'Zone capacities', type: 'textarea' },
      { key: 'search_lane_count', label: 'Number of standard search lanes', type: 'number' },
      { key: 'accessible_lane_count', label: 'Number of accessible lanes', type: 'number' },
      { key: 'lane_throughput', label: 'Expected throughput per lane per hour', type: 'number' },
      { key: 'egress_route_count', label: 'Number of main egress routes', type: 'number' },
      { key: 'emergency_route_count', label: 'Number of emergency clearance routes', type: 'number' },
      { key: 'weather_degradation_level', label: 'Weather / degraded-route risk', type: 'select', options: riskLevelOptions },
      { key: 'weather_degradation_notes', label: 'Weather or route degradation notes', type: 'textarea' },
    ],
  },
  {
    key: 'command_deployment',
    title: 'Command, Contacts and Deployment',
    description: 'Leadership, contacts, channels, staffing and escalation.',
    questions: [
      { key: 'control_location', label: 'Event Control / security control location', type: 'text' },
      { key: 'operational_lead', label: 'Operational lead', type: 'text' },
      { key: 'loggist', label: 'Controller / loggist', type: 'text' },
      { key: 'zone_supervisors', label: 'Zone supervisors', type: 'textarea', placeholder: 'Ingress Supervisor - Name - Area' },
      { key: 'providers', label: 'Provider interfaces', type: 'textarea', placeholder: 'Medical provider - Lead / contact' },
      { key: 'radio_channels_callsigns', fieldKey: 'radio_channels_callsigns', label: 'Radio channels and call signs', type: 'textarea' },
      { key: 'emergency_phrase', label: 'Emergency priority phrase', type: 'text', placeholder: 'Priority priority priority' },
      { key: 'staffing_by_zone_and_time', fieldKey: 'staffing_by_zone_and_time', label: 'Staffing by zone and time', type: 'textarea' },
      { key: 'response_teams', fieldKey: 'response_teams', label: 'Response teams and mobile resources', type: 'textarea' },
      { key: 'reserve_staff_count', label: 'Reserve / contingency staff count', type: 'number' },
      { key: 'specialist_teams_and_assets', fieldKey: 'specialist_teams_and_assets', label: 'Specialist teams and assets', type: 'textarea' },
      { key: 'service_delivery_scope', fieldKey: 'service_delivery_scope', label: 'KSS delivery scope', type: 'textarea' },
      { key: 'build_break_operations', fieldKey: 'build_break_operations', label: 'Build and break arrangements', type: 'textarea' },
    ],
  },
  {
    key: 'operations',
    title: 'Ingress, Circulation and Egress',
    description: 'Operational controls for opening, live movement and dispersal.',
    questions: [
      { key: 'public_ingress_time', fieldKey: 'public_ingress_time', label: 'Public ingress start time', type: 'text' },
      { key: 'operational_hours', fieldKey: 'operational_hours', label: 'Operational hours by phase', type: 'textarea' },
      { key: 'ingress_routes_holding_areas', fieldKey: 'ingress_routes_holding_areas', label: 'Ingress routes and holding areas', type: 'textarea' },
      { key: 'admission_search_posture', label: 'Search policy / admission controls', type: 'select', options: searchPostureOptions },
      { key: 'queue_barriered', label: 'Barriered / managed queue lanes', type: 'select', options: yesNoOptions },
      { key: 'overspill_risk_level', label: 'Overspill / surge risk', type: 'select', options: riskLevelOptions },
      { key: 'accessible_entry_arrangements', fieldKey: 'accessible_entry_arrangements', label: 'Accessible entry arrangements', type: 'textarea' },
      { key: 'circulation_risk_level', label: 'Circulation risk level', type: 'select', options: riskLevelOptions },
      { key: 'high_density_risk_level', label: 'High-density / front-of-stage risk level', type: 'select', options: riskLevelOptions },
      { key: 'internal_queue_risk_level', label: 'Internal queue risk level', type: 'select', options: riskLevelOptions },
      { key: 'transport_interface', fieldKey: 'transport_interface', label: 'Transport interface', type: 'textarea' },
      { key: 'dispersal_routes', fieldKey: 'dispersal_routes', label: 'Dispersal routes', type: 'textarea' },
      { key: 'reentry_policy', fieldKey: 'reentry_policy', label: 'Re-entry policy', type: 'select', options: reentryPolicyOptions },
    ],
  },
  {
    key: 'safety_and_rules',
    title: 'Safeguarding, Licensing and Incident Controls',
    description: 'Safeguarding, welfare, venue rules, incidents and risk inputs.',
    questions: [
      { key: 'safeguarding_lead', label: 'Safeguarding lead / welfare lead', type: 'text' },
      { key: 'safe_space_location', label: 'Safe-space / welfare location', type: 'text' },
      { key: 'children_expected', label: 'Children or families expected', type: 'checkbox' },
      { key: 'ask_for_angela_process', fieldKey: 'ask_for_angela_process', label: 'Ask for Angela / disclosure route', type: 'textarea' },
      { key: 'dps_name', fieldKey: 'dps_name', label: 'DPS / licence holder', type: 'text' },
      { key: 'challenge_policy', fieldKey: 'challenge_policy', label: 'Challenge policy', type: 'select', options: challengePolicyOptions },
      { key: 'licensable_activities', fieldKey: 'licensable_activities', label: 'Licensable activities', type: 'textarea' },
      { key: 'licensing_conditions', fieldKey: 'licensing_conditions', label: 'Licence conditions', type: 'textarea' },
      { key: 'venue_rules', fieldKey: 'venue_rules', label: 'Venue rules / published conditions', type: 'textarea' },
      { key: 'prohibited_items', fieldKey: 'prohibited_items', label: 'Prohibited items / search finds', type: 'textarea' },
      { key: 'incident_risk_level', label: 'Incident trigger level', type: 'select', options: riskLevelOptions },
      { key: 'incident_triggers', label: 'Event-specific incident trigger notes', type: 'textarea' },
      { key: 'additional_operational_risks', fieldKey: 'additional_operational_risks', label: 'Additional risks and controls', type: 'textarea' },
    ],
  },
  {
    key: 'emergency_ct_welfare',
    title: 'Emergency, CT, Welfare, Accessibility and Comms',
    description: 'Emergency details and reusable policy inserts for the issued plan.',
    questions: [
      { key: 'primary_rv_point', label: 'Primary RV point', type: 'text' },
      { key: 'secondary_rv_point', label: 'Secondary RV point', type: 'text' },
      { key: 'casualty_collection_point', label: 'Casualty collection point', type: 'text' },
      { key: 'shelter_locations', label: 'Shelter locations', type: 'textarea' },
      { key: 'show_stop_level', label: 'Show stop / pause trigger level', type: 'select', options: riskLevelOptions },
      { key: 'show_stop_triggers', fieldKey: 'show_stop_triggers', label: 'Show stop / operational pause trigger notes', type: 'textarea' },
      { key: 'ct_threat_level', label: 'CT event-specific threat context', type: 'select', options: riskLevelOptions },
      { key: 'ct_threat_context', label: 'CT notes, if specific', type: 'textarea' },
      { key: 'search_posture', label: 'CT-related search posture', type: 'select', options: searchPostureOptions },
      { key: 'staff_welfare_location', label: 'Staff welfare / rest location', type: 'text' },
      { key: 'staff_welfare_level', label: 'Staff welfare demand', type: 'select', options: riskLevelOptions },
      { key: 'staff_welfare_arrangements', fieldKey: 'staff_welfare_arrangements', label: 'Staff welfare notes', type: 'textarea' },
      { key: 'accessible_entrance', label: 'Accessible entrance / route', type: 'text' },
      { key: 'accessible_facilities', label: 'Accessible toilets, viewing and assistance details', type: 'textarea' },
      { key: 'radio_channel_count', label: 'Number of radio channels', type: 'number' },
      { key: 'fallback_comms', label: 'Fallback comms method', type: 'select', options: [
        { value: 'mobile', label: 'Mobile phone / WhatsApp' },
        { value: 'runner', label: 'Runner / supervisor relay' },
        { value: 'control', label: 'Control-managed fallback' },
        { value: 'tbc', label: 'TBC' },
      ] },
      { key: 'communications_plan', fieldKey: 'communications_plan', label: 'Communications notes', type: 'textarea' },
      { key: 'sitrep_interval', label: 'SITREP interval', type: 'select', options: [
        { value: '30 minutes', label: 'Every 30 minutes' },
        { value: 'hourly', label: 'Hourly' },
        { value: 'phase-based', label: 'Phase-based' },
        { value: 'incident-led', label: 'Incident-led only' },
      ] },
      { key: 'sitrep_decision_logging', fieldKey: 'sitrep_decision_logging', label: 'SITREP / decision logging notes', type: 'textarea' },
      { key: 'debrief_reporting', fieldKey: 'debrief_reporting', label: 'Debrief and reporting arrangements', type: 'textarea' },
      { key: 'site_maps_and_route_diagrams', fieldKey: 'site_maps_and_route_diagrams', label: 'Appendix maps and route diagrams', type: 'textarea' },
      { key: 'appendix_notes', fieldKey: 'appendix_notes', label: 'Appendix notes', type: 'textarea' },
    ],
  },
]

const ANNEX_ANSWER_MAP: Array<[string, CmpAnnexKey]> = [
  ['has_bars', 'bar_operations'],
  ['has_search_screening', 'search_screening'],
  ['has_front_of_stage', 'front_of_stage_pit'],
  ['has_traffic_routes', 'traffic_pedestrian_routes'],
  ['has_camping', 'camping_security'],
  ['has_vip_backstage', 'vip_backstage_security'],
  ['has_stewarding_deployment', 'stewarding_deployment'],
  ['has_emergency_action_cards', 'emergency_action_cards'],
]

export function getGuidedSelectedAnnexes(answers: CmpGuidedAnswers): CmpAnnexKey[] {
  return ANNEX_ANSWER_MAP
    .filter(([answerKey]) => enabled(answers, answerKey))
    .map(([, annexKey]) => annexKey)
}

export function buildInitialGuidedAnswers(
  fieldValues: Record<string, string>,
  selectedAnnexes: string[] = []
): CmpGuidedAnswers {
  const answers: CmpGuidedAnswers = {}

  CMP_GUIDED_GROUPS.forEach((group) => {
    group.questions.forEach((question) => {
      if (question.type === 'checkbox') {
        answers[question.key] = false
        return
      }
      answers[question.key] = clean(fieldValues[question.fieldKey || question.key])
    })
  })

  ANNEX_ANSWER_MAP.forEach(([answerKey, annexKey]) => {
    answers[answerKey] = selectedAnnexes.includes(annexKey)
  })

  return answers
}

export function generateCmpFieldValuesFromGuidedAnswers(
  answers: CmpGuidedAnswers,
  currentValues: Record<string, string> = {}
) {
  const eventName = answer(answers, 'event_name', 'the event')
  const venue = answer(answers, 'venue_name', 'the venue')
  const showDates = answer(answers, 'show_dates')
  const applicableAreas = answer(answers, 'applicable_areas', 'the public and controlled areas identified for the event')
  const expectedAttendance = answer(answers, 'expected_attendance_number')
  const licensedCapacity = answer(answers, 'licensed_capacity_number')
  const staffCount = answer(answers, 'staff_and_contractor_number')
  const camperCount = answer(answers, 'camper_count')
  const standardLanes = answer(answers, 'search_lane_count')
  const accessibleLanes = answer(answers, 'accessible_lane_count')
  const laneThroughput = answer(answers, 'lane_throughput')
  const primaryRoutes = answer(answers, 'primary_routes')
  const arrivalPatternType = answer(answers, 'arrival_pattern_type', 'steady')
  const arrivalPeakWindow = answer(answers, 'arrival_peak_window')
  const movementPressurePoints = answer(answers, 'movement_pressure_points')
  const routeResilienceLevel = levelLabel(answer(answers, 'route_resilience_level'))
  const routeResilienceNotes = answer(answers, 'route_resilience_notes')
  const selectedAnnexes = getGuidedSelectedAnnexes(answers)
  const values: Record<string, string> = { ...currentValues }

  const directQuestionValues = CMP_GUIDED_GROUPS
    .flatMap((group) => group.questions)
    .filter((question) => question.fieldKey && question.type !== 'checkbox')

  directQuestionValues.forEach((question) => {
    values[question.fieldKey as string] = answer(answers, question.key, currentValues[question.fieldKey as string] || '')
  })

  values.plan_title = eventName === 'the event'
    ? 'Crowd Management and Security Operations Plan'
    : `Crowd Management and Security Operations Plan - ${eventName}`
  values.event_name = eventName === 'the event' ? '' : eventName
  values.document_version = answer(answers, 'document_version', currentValues.document_version || 'V1.0')
  values.document_status = answer(answers, 'document_status', currentValues.document_status || 'Draft')

  values.purpose_scope_summary = `This Crowd Management and Security Operations Plan defines the crowd safety, security, safeguarding, communications, emergency response, and post-event reporting arrangements for ${eventName}. The document applies to ${applicableAreas}. It should be read alongside the Event Management Plan, risk assessments, emergency procedures, licensing documents, current site plans, and live control briefings.`

  values.licensed_capacity = licensedCapacity
    ? `${numberLabel(licensedCapacity, 'public attendee')} licensed capacity${enabled(answers, 'has_camping') && camperCount ? `, with ${numberLabel(camperCount, 'camper')} where camping applies` : ''}.`
    : currentValues.licensed_capacity || ''
  values.expected_attendance = expectedAttendance
    ? `${numberLabel(expectedAttendance, 'public attendee')} expected${staffCount ? `, with up to ${numberLabel(staffCount, 'staff member', 'staff and contractors')} at peak` : ''}${enabled(answers, 'has_camping') && camperCount ? ` and ${numberLabel(camperCount, 'camper')} expected overnight` : ''}.`
    : currentValues.expected_attendance || ''
  values.staff_and_contractor_count = staffCount
    ? `Peak on-site staffing and contractor presence is expected to be ${numberLabel(staffCount, 'person', 'people')}.`
    : currentValues.staff_and_contractor_count || ''
  values.attendance_profile = lines(
    crowdBehaviourText(
      answer(answers, 'crowd_behaviour_level'),
      answer(answers, 'crowd_type'),
      ''
    ) || `${eventName} is expected to attract an audience profile consistent with the event type and programme.`,
    expectedAttendance && `Expected attendance is ${numberLabel(expectedAttendance, 'public attendee')}.`,
    staffCount && `The operational plan assumes up to ${numberLabel(staffCount, 'staff member', 'staff and contractors')} at peak.`,
    enabled(answers, 'has_camping') && camperCount && `Camping demand is expected to include ${numberLabel(camperCount, 'camper')}, creating overnight welfare, noise, patrol, and late-night vulnerability considerations.`,
    enabled(answers, 'children_expected') && 'Children, families, or vulnerable persons are expected and safeguarding arrangements must reflect reunification, welfare escalation, and quieter support spaces.'
  )
  values.travel_modes = lines(
    {
      mixed: 'Travel demand is expected to be mixed across public transport, private car, taxi, walking routes, and any managed coach or shuttle provision.',
      public_transport: 'Travel demand is expected to be led by public transport, requiring close attention to station, stop, taxi, and onward pedestrian route interfaces.',
      private_car: 'Travel demand is expected to be led by private car, parking, taxi, and pick-up/drop-off movement, requiring clear pedestrian separation and dispersal controls.',
      walkup: 'Travel demand is expected to include a high local walk-up element, requiring external pedestrian route monitoring and clear public information.',
      coach_shuttle: 'Travel demand is expected to include significant coach or shuttle use, requiring protected loading areas, crossing control, and phased dispersal coordination.',
    }[answer(answers, 'main_arrival_mode', 'mixed')] || '',
    answer(answers, 'public_transport_percent') && `Estimated public transport share: ${answer(answers, 'public_transport_percent')}%.`,
    answer(answers, 'private_car_percent') && `Estimated private car / taxi share: ${answer(answers, 'private_car_percent')}%.`,
    answer(answers, 'walkup_percent') && `Estimated walk-up share: ${answer(answers, 'walkup_percent')}%.`
  )
  values.family_presence = familyProfileText(
    answer(answers, 'family_vulnerability_level'),
    enabled(answers, 'children_expected'),
    answer(answers, 'family_presence_notes')
  )
  values.alcohol_profile = alcoholProfileText(
    answer(answers, 'alcohol_risk_level'),
    enabled(answers, 'has_bars'),
    answer(answers, 'alcohol_profile_notes')
  )
  values.historic_issues = lines(
    answer(answers, 'historic_issue_level') === 'none'
      ? 'No material historic issues or intelligence have been identified at the time of issue.'
      : `Historic issues / intelligence level is assessed as ${levelLabel(answer(answers, 'historic_issue_level'))}.`,
    answer(answers, 'historic_issues_notes') && `Known points: ${answer(answers, 'historic_issues_notes')}`
  )
  values.mood_and_trigger_points = lines(
    `Mood and trigger-point risk is assessed as ${levelLabel(answer(answers, 'mood_trigger_level'))}.`,
    {
      low: 'Routine monitoring is expected to be sufficient for normal queue frustration, lost persons, and minor welfare demand.',
      medium: 'Supervisors should watch for delayed gates, headline delays, queues, weather changes, refusals, and transport delay points.',
      high: 'Control should pre-brief trigger thresholds for crowd pressure, disorder, refusal conflict, major delays, welfare spikes, weather change, or transport failure.',
    }[levelLabel(answer(answers, 'mood_trigger_level'))],
    answer(answers, 'mood_trigger_notes') && `Event-specific notes: ${answer(answers, 'mood_trigger_notes')}`
  )
  values.camping_profile = enabled(answers, 'has_camping')
    ? `Camping applies to ${eventName}${camperCount ? ` with approximately ${numberLabel(camperCount, 'camper')}` : ''}. The plan should address overnight patrols, campsite access, welfare demand, quiet-hours interventions, fire-watch observations, lost-person reunification, and perimeter vulnerability.`
    : ''

  values.site_layout_summary = answer(
    answers,
    'site_layout_summary',
    `${eventName} at ${venue} will be managed through the identified public areas, controlled areas, ingress routes, egress routes, welfare points, medical provision, and emergency access routes.`
  )
  values.dim_aliced_design = `The design for ${eventName} should provide sufficient space, barriers, lighting, signage, queueing, route separation, and emergency access for the expected audience and selected operating areas.`
  values.dim_aliced_information = `Information should cover wayfinding, opening times, prohibited items, accessible arrangements, welfare points, emergency messaging, and briefing updates so attendees and staff understand how ${eventName} will operate.`
  values.dim_aliced_management = `Management arrangements should define command roles, supervisor ownership, deployment review points, contingency triggers, and decision logging for normal and degraded operations at ${venue}.`
  values.dim_aliced_activity = `Activity analysis should consider the event programme, audience dwell points, service demand, licensing activity, queues, changeovers, and any programmed moments likely to concentrate crowd movement or attention.`
  values.dim_aliced_location = `Location factors for ${venue} should consider surrounding land use, transport links, access constraints, weather exposure, lighting, local residents, emergency service access, and any site-specific restrictions.`
  values.dim_aliced_ingress = `${primaryRoutes || 'Ingress routes'} should be reviewed against arrival demand, holding capacity, search throughput, accessible entry, ticket resolution, rejection management, and contingency arrangements.`
  values.dim_aliced_circulation = `${movementPressurePoints || 'Internal circulation routes and pressure points'} should be monitored to prevent queue spillback, route obstruction, counterflow, and loss of emergency access.`
  values.dim_aliced_egress = `${answer(answers, 'dispersal_routes', 'Egress and dispersal routes')} should support phased release, transport coordination, route protection, accessible departure, and safe off-site dispersal.`
  values.dim_aliced_dynamics = `Crowd dynamics should consider density build-up, stop-start movement, counterflow, behavioural triggers, information needs, and how staff intervention may alter crowd response during ${eventName}.`

  values.ramp_routes = `${primaryRoutes || 'Primary and secondary routes'} should be assessed for width, lighting, steward positions, accessible alternatives, crossings, and resilience if a route is lost or degraded. Route resilience is assessed as ${routeResilienceLevel}.${routeResilienceNotes ? ` ${routeResilienceNotes}` : ''}`
  values.ramp_arrival = `${
    {
      steady: 'Arrival demand is expected to be steady and should be monitored against normal entry throughput.',
      early_peak: 'Arrival demand is expected to peak before opening or early in the admission period, requiring gate readiness and queue holding before doors.',
      headline_peak: 'Arrival demand is expected to peak before headline or key programme moments, requiring flexible staffing and live queue reporting.',
      multi_wave: 'Arrival demand is expected in multiple waves, requiring repeated readiness checks and staffing review across phases.',
    }[arrivalPatternType] || 'Arrival demand should be profiled by time, transport mode, ticketing demand, and pre-opening dwell.'
  }${arrivalPeakWindow ? ` Main arrival peak: ${arrivalPeakWindow}.` : ''}`
  values.ramp_movement = `${movementPressurePoints || 'Movement pressure points should be identified around stages, bars, welfare, toilets, concessions, transport links, and route intersections.'}`
  values.ramp_profile = `The route strategy should reflect ${answer(answers, 'audience_age_profile', 'the expected audience')}, alcohol profile, familiarity with the venue, accessibility needs, group behaviour, and any camping or overnight demand.`

  values.density_assumptions = lines(
    `Density assumptions are set at a ${levelLabel(answer(answers, 'density_level'))} operating level for planning purposes.`,
    {
      low: 'The plan assumes routine circulation with limited dwell pressure outside normal queues and service points.',
      medium: 'The plan assumes moderate dwell and queue pressure around attractions, bars, toilets, welfare, ingress, and egress routes.',
      high: 'The plan assumes elevated density risk around peak programme moments, pinch points, queues, front-of-stage areas, and constrained routes.',
    }[levelLabel(answer(answers, 'density_level'))],
    answer(answers, 'density_assumption_notes') && `Event-specific notes: ${answer(answers, 'density_assumption_notes')}`
  )
  values.ingress_flow_assumptions = standardLanes || accessibleLanes || laneThroughput
    ? `Ingress calculations assume ${standardLanes || 'the confirmed number of'} standard search lanes${accessibleLanes ? `, ${accessibleLanes} accessible lane(s)` : ''}${laneThroughput ? `, and a managed throughput of approximately ${numberLabel(laneThroughput, 'person')} per lane per hour` : ''}. The final operating model must be checked against the expected arrival curve, ticketing interface, accessible provision, and degraded conditions.`
    : currentValues.ingress_flow_assumptions || ''
  values.egress_flow_assumptions = answer(answers, 'egress_route_count')
    ? `Egress assumptions are based on ${numberLabel(answer(answers, 'egress_route_count'), 'main egress route')} supported by route stewarding, transport interface controls, accessible departure support, and phased clearance.`
    : `Egress assumptions should be based on the available dispersal routes, route stewarding, transport interface constraints, accessible departure needs, and expected clearance time for ${eventName}.`
  values.emergency_clearance_assumptions = answer(answers, 'emergency_route_count')
    ? `Emergency clearance assumptions identify ${numberLabel(answer(answers, 'emergency_route_count'), 'emergency clearance route')} and require route-loss, emergency service access, evacuation, lockdown, and shelter decisions to be briefed.`
    : `Emergency clearance assumptions should identify the routes relied upon, route-loss scenarios, emergency service access, and decisions for evacuation, partial evacuation, lockdown, or shelter.`
  values.degraded_route_weather_assumptions = lines(
    `Weather / degraded-route risk is assessed as ${levelLabel(answer(answers, 'weather_degradation_level'))}.`,
    'Degraded-route assumptions should address adverse weather, mud, standing water, lighting loss, barrier failure, route obstruction, or any condition reducing usable route width or flow.',
    answer(answers, 'weather_degradation_notes') && `Event-specific notes: ${answer(answers, 'weather_degradation_notes')}`
  )

  values.command_structure = `Command for ${eventName} will operate through ${answer(answers, 'control_location', 'Event Control')}, led by ${answer(answers, 'operational_lead', 'the Operational Lead')}, with supervisors, response teams, and provider interfaces reporting through the agreed control structure.`
  values.named_command_roles = lines(
    answer(answers, 'operational_lead') && `Operational Lead - ${answer(answers, 'operational_lead')} - Overall responsibility for crowd management and security delivery.`,
    answer(answers, 'loggist') && `Event Controller / Loggist - ${answer(answers, 'loggist')} - Maintains the command log, incident record, and escalation tracking.`,
    answer(answers, 'zone_supervisors')
  )
  values.external_interfaces = answer(answers, 'providers', currentValues.external_interfaces || '')
  values.key_contacts_directory = lines(
    answer(answers, 'operational_lead') && `Operational lead - ${answer(answers, 'operational_lead')} - Contact to be confirmed`,
    answer(answers, 'loggist') && `Event control / loggist - ${answer(answers, 'loggist')} - Contact to be confirmed`,
    answer(answers, 'providers')
  )
  values.reporting_lines = `Staff report to their zone supervisor, supervisors escalate to ${answer(answers, 'control_location', 'Event Control')}, and material issues are escalated to ${answer(answers, 'operational_lead', 'the Operational Lead')}. Immediate escalation is required for life safety, safeguarding, disorder, CT concerns, route failure, crowd pressure, or any issue affecting event continuity.`
  values.control_room_structure = `${answer(answers, 'control_location', 'Event Control')} should hold command, logging, provider liaison, live route status, incident tracking, and decision recording functions for ${eventName}.`
  values.briefing_and_induction = `Planning meetings, written briefs, role-specific deployment briefs, inductions, pre-opening checks, and pre-egress checks should be completed for ${eventName}. Late changes must be re-briefed through supervisors and control.`
  values.monitoring_and_density_tools = `Live monitoring should combine supervisor observation, route patrols, queue reports, welfare and medical feedback, control logging, and any available CCTV or counting tools. Technology supports but does not replace live command judgement.`
  values.relief_and_contingency = answer(answers, 'reserve_staff_count')
    ? `Relief and contingency arrangements include break cover, supervisor-managed redeployment, and a reserve of ${numberLabel(answer(answers, 'reserve_staff_count'), 'staff member', 'staff')} for sickness, queue pressure, weather changes, route loss, or incident reinforcement.`
    : currentValues.relief_and_contingency || ''
  values.escalation_staffing = `Additional staff should be deployed if queue times, density, route obstruction, safeguarding demand, weather degradation, or incident frequency exceed the thresholds agreed by ${answer(answers, 'control_location', 'Event Control')}.`

  values.ingress_operations = `Gate readiness checks, lane readiness, search briefing, signage, radio checks, welfare readiness, accessible entry checks, and surrender arrangements should be confirmed before public admission begins for ${eventName}.`
  values.search_policy = {
    standard: 'Search and admission controls use a standard event search posture with supervisor-led lane checks, prohibited-items surrender, refusal escalation, and accessible-lane support.',
    enhanced: 'Search and admission controls use an enhanced posture with increased supervisor monitoring, clear prohibited-items handling, secondary-search escalation, and closer liaison with control.',
    targeted: 'Search and admission controls use targeted or intelligence-led checks supported by supervisor direction, control updates, and escalation for finds, refusals, or suspicious behaviour.',
    none: 'No dedicated search operation is planned; admission controls still require ticketing, prohibited-items awareness where applicable, and supervisor escalation for concerns.',
  }[answer(answers, 'admission_search_posture', 'standard')] || ''
  values.queue_design = lines(
    answer(answers, 'queue_barriered') === 'yes'
      ? 'Queue design uses barriered or clearly managed lanes with supervisor oversight, accessible provision, and route protection.'
      : 'Queue design uses stewarded queue lines and supervisor monitoring proportionate to expected arrival demand.',
    standardLanes && `${standardLanes} standard search lane(s) are planned.`,
    accessibleLanes && `${accessibleLanes} accessible lane(s) are planned.`
  )
  values.overspill_controls = `Overspill and surge risk is assessed as ${levelLabel(answer(answers, 'overspill_risk_level'))}. Supervisors should monitor queue length, route obstruction, neighbouring land use, welfare demand, and escalation thresholds through Event Control.`
  values.circulation_controls = `Circulation risk is assessed as ${levelLabel(answer(answers, 'circulation_risk_level'))}. Controls should protect principal pedestrian routes, accessible routes, emergency corridors, service crossings, and known dwell points.`
  values.high_density_controls = `High-density / front-of-stage risk is assessed as ${levelLabel(answer(answers, 'high_density_risk_level'))}. Controls should include observation, supervisor escalation, holding inflow where needed, response-team positioning, and medical or welfare interface.`
  values.internal_queue_controls = `Internal queue risk is assessed as ${levelLabel(answer(answers, 'internal_queue_risk_level'))}. Queues for bars, toilets, concessions, welfare, transport, or attractions must be kept off principal circulation and emergency routes.`
  values.egress_operations = `Egress for ${eventName} should operate through a managed release model with route clear-down, public messaging, transport coordination, accessible support, and control sign-off once crowd levels return to a manageable background state.`

  values.safeguarding_process = `All safeguarding concerns at ${eventName} are reported to ${answer(answers, 'control_location', 'Event Control')} and handed to ${answer(answers, 'safeguarding_lead', 'the safeguarding or welfare lead')} as appropriate. Staff must intervene early for separated children, vulnerable adults, disclosures, harassment, drink spiking, intoxication, or welfare vulnerability.`
  values.safe_spaces = `${answer(answers, 'safe_space_location', 'Safe-space and welfare locations')} should be clearly briefed, staffed or supported, and capable of receiving vulnerable persons, disclosures, and reunification cases confidentially.`
  values.lost_vulnerable_person_process = `Lost child or vulnerable person reports are priority incidents. Control circulates descriptions to relevant supervisors, welfare, ingress, medical and response teams, retains the reporting party where safe, and records reunification or handover.`
  values.confidentiality_logging = 'Safeguarding logs must be factual, time-stamped, restricted to those with a direct operational need, and securely handed to the designated safeguarding or welfare lead.'

  values.incident_management = `Incidents at ${eventName} are managed through a graded response prioritising life safety, crowd stability, vulnerability, communication, and escalation. Incident trigger level is assessed as ${levelLabel(answer(answers, 'incident_risk_level'))}. Event-specific triggers include ${answer(answers, 'incident_triggers', 'disorder, medical or welfare incidents, safeguarding reports, route obstruction, suspicious items, crowd pressure, and conditions that may affect licence objectives or event continuity')}.`
  values.risk_assessment_methodology = `The operational risk assessment links the event profile, route analysis, staffing model, selected annexes, emergency arrangements, and KSS delivery scope to the hazards most likely to arise at ${eventName}.`
  values.risk_assessment_scope = `The KSS risk assessment covers ${applicableAreas}, including the selected annex functions where applicable.`
  values.risk_assessment_source_notes = `Event-specific risk review should consider ${answer(answers, 'incident_triggers', 'crowd pressure, queue overspill, intoxication, vulnerable persons, adverse weather, vehicle or pedestrian interface, route loss, suspicious items, and emergency response thresholds')}.`

  values.emergency_procedures = `Emergency response arrangements for ${eventName} cover full evacuation, partial evacuation, invacuation / lockdown, shelter, show stop, route protection, and emergency service access, directed through ${answer(answers, 'control_location', 'Event Control')}.`
  values.partial_evacuation_procedure = `Part evacuation applies where a single zone, route, or compound becomes unsafe but wider operations can continue. Control identifies the affected area, stops movement into that zone, protects routes, and holds adjoining sectors as required.`
  values.full_evacuation_procedure = `Full evacuation is initiated where the incident, threat, or route loss affects the wider site and continued occupation cannot be justified. Supervisors release pre-briefed routes and support disabled or vulnerable attendees.`
  values.lockdown_invacuation_procedure = `Invacuation or lockdown is used where external or localised threat makes open movement unsafe. Staff direct attendees into protected areas, close access points, restrict movement, and report to control until police or emergency direction is received.`
  values.shelter_procedure = `${answer(answers, 'shelter_locations', 'Shelter locations')} should be used where weather or environmental hazards make mass external movement unsafe. Staff regulate movement to prevent compression and maintain welfare, accessibility, and emergency corridors.`
  values.rendezvous_points = lines(
    answer(answers, 'primary_rv_point') && `Primary RV point: ${answer(answers, 'primary_rv_point')}`,
    answer(answers, 'secondary_rv_point') && `Secondary RV point: ${answer(answers, 'secondary_rv_point')}`,
    answer(answers, 'casualty_collection_point') && `Casualty collection point: ${answer(answers, 'casualty_collection_point')}`
  )
  values.command_escalation = `Supervisors can recommend emergency action, but event-wide evacuation, lockdown, or shelter is authorised through ${answer(answers, 'control_location', 'Event Control')} unless immediate life safety requires protective action before formal confirmation.`
  values.emergency_search_zones = `Emergency search zones and sterile routes should reflect the site map, RV points, emergency service access route, crowded spaces, controlled areas, and any suspected device or route-loss scenario.`

  values.ct_procedures = `Staff are briefed on hostile reconnaissance, suspicious items, suspicious vehicles, unusual behaviour, and event-specific CT context. CT context is assessed as ${levelLabel(answer(answers, 'ct_threat_level'))}. ${answer(answers, 'ct_threat_context', 'Any concern must be reported immediately to control and escalated in line with ACT / SCaN and Run Hide Tell guidance.')}`
  values.suspicious_item_protocol = 'A suspicious item must not be handled. Staff clear the immediate area, prevent further approach, inform control with exact location and description, and await police or command direction.'
  values.hostile_recon_indicators = 'Indicators include unusual questioning, repetitive photography of security measures, testing staff reactions, interest in restricted points or routes, unattended vehicles, and behaviour inconsistent with normal attendance.'
  values.run_hide_tell_guidance = 'Where a marauding or weapons threat is suspected, staff and attendees should Run if safe, Hide if escape is not possible, and Tell police or control when safe. Staff do not pursue attackers.'
  values.accessibility_arrangements = `Accessible arrangements for ${eventName} include ${answer(answers, 'accessible_entrance', 'accessible entry')}, ${answer(answers, 'accessible_facilities', 'accessible toilets, viewing, route assistance, welfare priority access, and emergency support')}.`
  values.accessibility_team_liaison = 'Security and crowd teams should liaise with the accessibility lead on entry assistance, viewing provision, route changes, welfare needs, and incidents affecting disabled guests.'
  values.staff_welfare_arrangements = lines(
    answer(answers, 'staff_welfare_arrangements'),
    `Staff welfare demand is assessed as ${levelLabel(answer(answers, 'staff_welfare_level'))}. Breaks, hydration, weather exposure, rest locations, late finishes, transport, and welfare checks must be managed by supervisors.`
  )
  values.communications_plan = lines(
    answer(answers, 'communications_plan'),
    answer(answers, 'radio_channel_count') && `${numberLabel(answer(answers, 'radio_channel_count'), 'radio channel')} will be used or confirmed for the operation.`,
    `Fallback communications: ${answer(answers, 'fallback_comms', 'mobile')}.`
  )
  values.sitrep_decision_logging = lines(
    answer(answers, 'sitrep_decision_logging'),
    `SITREP rhythm: ${answer(answers, 'sitrep_interval', 'phase-based')}. Material decisions, route changes, incident escalations, and emergency actions must be time-stamped in the control log.`
  )

  values.bar_operations_roles = enabled(answers, 'has_bars')
    ? `Bar security roles should cover licensed-area queue management, refusals support, intoxication escalation, service-lane protection, stock or cash route protection, and disorder response around bar activity at ${eventName}.`
    : ''
  values.search_screening_roles = enabled(answers, 'has_search_screening')
    ? `Search and screening roles should cover lane supervision, person and bag search, accessible lane support, ticket-resolution interface, prohibited-items surrender, secondary search, and escalation for refusals or finds.`
    : ''
  values.front_of_stage_roles = enabled(answers, 'has_front_of_stage')
    ? 'Front-of-stage roles should cover pit supervision, barrier monitoring, extraction points, stage-left and stage-right response, production liaison, surge observation, and show-stop escalation.'
    : ''
  values.traffic_pedestrian_roles = enabled(answers, 'has_traffic_routes')
    ? 'Traffic and pedestrian route roles should cover crossing points, taxi or shuttle interfaces, coach or rail links, managed release, route protection, and liaison with the traffic management provider.'
    : ''
  values.camping_security_roles = enabled(answers, 'has_camping')
    ? 'Camping security roles should cover overnight patrols, perimeter observation, campsite access control, welfare-linked patrols, quiet-hours interventions, fire-watch observations, and lost-person reunification.'
    : ''
  values.vip_backstage_roles = enabled(answers, 'has_vip_backstage')
    ? 'VIP and backstage roles should cover accreditation checks, restricted-area control, artist or production route protection, escort arrangements, sterile-area checks, and unauthorised access escalation.'
    : ''
  values.stewarding_roles = enabled(answers, 'has_stewarding_deployment')
    ? 'Stewarding deployment should cover directional staff, queue marshals, emergency-exit cover, route-clearance stewards, briefing ownership, relief, contingency, and redeployment through control.'
    : ''

  return { values, selectedAnnexes }
}
