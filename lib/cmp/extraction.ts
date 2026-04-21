import type { CmpDocumentKind } from '@/lib/cmp/master-template'

export interface CmpSourceDocumentForExtraction {
  id: string
  document_kind: CmpDocumentKind | string
  file_name: string
  extracted_text: string | null
}

export interface CmpFieldCandidate {
  valueText: string
  sourceDocumentId: string
  sourceExcerpt: string
}

const OPERATIONS_DOCUMENT_KINDS = new Set([
  'previous_somp',
  'previous_cmp',
  'event_management_plan',
  'licensing_schedule',
  'deployment_matrix',
  'other',
])

const RISK_DOCUMENT_KINDS = new Set(['risk_assessment'])
const PROFILE_DOCUMENT_KINDS = new Set(['kss_profile'])

const HEADING_BOUNDARY = /\n\s*(?:\d+(?:\.\d+)?\s+[A-Z][^\n]{2,}|[A-Z][A-Z][A-Z\s/&-]{4,}|Appendix[^\n]*)/i

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\u0000/g, '')
    .trim()
}

function cleanCapture(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/^[\s:.-]+/, '')
    .replace(/\n{3,}/g, '\n\n')
}

function truncateExcerpt(value: string, max = 600) {
  const trimmed = cleanCapture(value)
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trim()}...`
}

function buildExcerpt(text: string, matchIndex: number, spanLength = 260) {
  const start = Math.max(0, matchIndex - 80)
  const end = Math.min(text.length, matchIndex + spanLength)
  return truncateExcerpt(text.slice(start, end))
}

function firstScalarMatch(
  documents: CmpSourceDocumentForExtraction[],
  patterns: RegExp[]
): CmpFieldCandidate | null {
  for (const document of documents) {
    const text = normalizeText(document.extracted_text)
    if (!text) continue

    for (const pattern of patterns) {
      const match = pattern.exec(text)
      if (!match) continue

      const value = cleanCapture(match[1] || match[0])
      if (!value) continue

      return {
        valueText: value,
        sourceDocumentId: document.id,
        sourceExcerpt: buildExcerpt(text, match.index),
      }
    }
  }

  return null
}

function firstSectionMatch(
  documents: CmpSourceDocumentForExtraction[],
  headings: Array<string | RegExp>
): CmpFieldCandidate | null {
  for (const document of documents) {
    const text = normalizeText(document.extracted_text)
    if (!text) continue

    for (const heading of headings) {
      const pattern =
        heading instanceof RegExp
          ? heading
          : new RegExp(`(^|\\n)\\s*(?:\\d+(?:\\.\\d+)?\\s+)?${heading}\\s*[:\\n]`, 'im')
      const match = pattern.exec(text)
      if (!match) continue

      const startIndex = match.index + match[0].length
      const remaining = text.slice(startIndex)
      const boundaryMatch = HEADING_BOUNDARY.exec(remaining)
      const rawSection = boundaryMatch ? remaining.slice(0, boundaryMatch.index) : remaining.slice(0, 2200)
      const value = cleanCapture(rawSection)
      if (!value || value.length < 20) continue

      return {
        valueText: value,
        sourceDocumentId: document.id,
        sourceExcerpt: truncateExcerpt(value),
      }
    }
  }

  return null
}

function derivePlanTitle(eventName: string | undefined | null) {
  const cleaned = cleanCapture(eventName)
  if (!cleaned) return null
  return `${cleaned} - Crowd Management and Security Operations Plan`
}

function groupDocuments(documents: CmpSourceDocumentForExtraction[]) {
  const operations = documents.filter((document) => OPERATIONS_DOCUMENT_KINDS.has(String(document.document_kind)))
  const risk = documents.filter((document) => RISK_DOCUMENT_KINDS.has(String(document.document_kind)))
  const profile = documents.filter((document) => PROFILE_DOCUMENT_KINDS.has(String(document.document_kind)))

  return {
    all: documents,
    operations,
    risk,
    profile,
  }
}

function withFallback(
  primary: CmpFieldCandidate | null,
  fallback: CmpFieldCandidate | null
): CmpFieldCandidate | null {
  return primary || fallback
}

export function deriveCmpFieldCandidates(documents: CmpSourceDocumentForExtraction[]) {
  const grouped = groupDocuments(documents)
  const candidates: Record<string, CmpFieldCandidate> = {}

  const eventName = withFallback(
    firstScalarMatch(grouped.operations, [
      /Festival Name:\s*([^\n]+)/i,
      /Event Name:\s*([^\n]+)/i,
      /The event is\s+([^\n.]+)/i,
    ]),
    firstScalarMatch(grouped.all, [/Festival Name:\s*([^\n]+)/i, /Event Name:\s*([^\n]+)/i])
  )

  if (eventName) {
    candidates.event_name = eventName
    const derivedTitle = derivePlanTitle(eventName.valueText)
    if (derivedTitle) {
      candidates.plan_title = {
        valueText: derivedTitle,
        sourceDocumentId: eventName.sourceDocumentId,
        sourceExcerpt: eventName.sourceExcerpt,
      }
    }
  }

  const scalarMappings: Record<string, CmpFieldCandidate | null> = {
    document_version: firstScalarMatch(grouped.all, [/Version(?: Control)?:\s*([Vv][^\n]+)/i]),
    document_status: firstScalarMatch(grouped.all, [/Version(?: Control)?:\s*[Vv][^\n]*\(([^)]+)\)/i]),
    issue_date: firstScalarMatch(grouped.all, [/Release Date:\s*([^\n]+)/i]),
    author_name: firstScalarMatch(grouped.all, [/Prepared By\s+([^\n]+)/i]),
    approver_name: firstScalarMatch(grouped.all, [/Approved By\s+([^\n]+)/i]),
    event_type: firstScalarMatch(grouped.operations, [/event profile\s+([^\n]+)/i]),
    venue_name: firstScalarMatch(grouped.operations, [/Venue:\s*([^\n]+)/i, /Location:\s*([^\n]+)/i]),
    venue_address: firstScalarMatch(grouped.all, [/situated in\s+([^\n]+)/i]),
    organiser_name: firstScalarMatch(grouped.all, [/organiser[:\s]+([^\n]+)/i]),
    client_name: firstScalarMatch(grouped.operations, [/Client:\s*([^\n]+)/i]),
    principal_contractor: firstScalarMatch(grouped.operations, [/Site operator:\s*([^\n]+)/i, /working alongside\s+([^\n]+)/i]),
    build_dates: firstScalarMatch(grouped.operations, [/Build:\s*([^\n]+)/i, /Build Period\s+([^\n]+)/i]),
    show_dates: firstScalarMatch(grouped.operations, [/Show Days:\s*([^\n]+)/i, /Main Arena Opens\s*([^\n]+)/i]),
    break_dates: firstScalarMatch(grouped.operations, [/Break:\s*([^\n]+)/i, /Breakdown Concludes\s*([^\n]+)/i]),
    public_ingress_time: firstScalarMatch(grouped.operations, [/Public Ingress Begins\s*([^\n]+)/i, /Gates Open\s*([^\n]+)/i]),
    operational_hours: firstScalarMatch(grouped.operations, [/Operational Hours(?: \(Bars\))?:\s*([^\n]+)/i, /Licensable Hours \(Bar Zones\):\s*([^\n]+)/i]),
    licensed_capacity: firstScalarMatch(grouped.operations, [/Licensed Capacity:\s*([^\n]+)/i]),
    expected_attendance: firstScalarMatch(grouped.operations, [/Expected Attendance:\s*([^\n]+)/i, /Public attendees:\s*([^\n]+)/i]),
    staff_and_contractor_count: firstScalarMatch(grouped.operations, [/Staff & contractors:\s*([^\n]+)/i, /staff and guests\)\s*([^\n]+)/i]),
    audience_age_profile: firstScalarMatch(grouped.operations, [/Audience Demographic:\s*([^\n]+)/i]),
    dps_name: firstScalarMatch(grouped.operations, [/DPS:\s*([^\n]+)/i]),
    challenge_policy: firstScalarMatch(grouped.operations, [/Challenge Policy:\s*([^\n]+)/i]),
  }

  Object.entries(scalarMappings).forEach(([key, candidate]) => {
    if (candidate) {
      candidates[key] = candidate
    }
  })

  const sectionMappings: Record<string, CmpFieldCandidate | null> = {
    key_delivery_partners: firstSectionMatch(grouped.operations, ['Our collaboration', 'Our Partners']),
    attendance_profile: firstSectionMatch(grouped.operations, ['Event Profile', '2.6 Crowd Characteristics', 'PROFILE']),
    travel_modes: firstSectionMatch(grouped.all, ['ROUTES', 'transport links', 'Distance to and from nearest Transport links']),
    family_presence: firstSectionMatch(grouped.all, ['Demographics']),
    alcohol_profile: firstSectionMatch(grouped.operations, ['2.6 Crowd Characteristics', 'Audience Demographic']),
    camping_profile: firstSectionMatch(grouped.operations, ['2.5 Site Layout', '2.6 Crowd Characteristics']),
    historic_issues: firstSectionMatch(grouped.all, ['Introduction', 'Historically there have been no crowd related issues']),
    mood_and_trigger_points: firstSectionMatch(grouped.operations, ['Site-Specific Crowd Risks and Behavioural Observations', '2.6 Crowd Characteristics']),
    peak_periods: firstSectionMatch(grouped.operations, ['2.6 Crowd Characteristics', 'Time Matrix']),
    site_layout_summary: firstSectionMatch(grouped.operations, ['2.5 Site Layout', 'Site Overview and Bar Map', 'Event Information']),
    key_zones: firstSectionMatch(grouped.operations, ['Security Coverage', 'Operational Scope: Zones Covered by KSS', 'Functional Overview']),
    controlled_areas: firstSectionMatch(grouped.operations, ['Operational Scope', '4.3 Zones & Responsibilities']),
    emergency_exits_holding_areas: firstSectionMatch(grouped.all, ['Egress', 'Emergency and Evacuation Procedures']),
    dim_aliced_design: firstSectionMatch(grouped.all, [/DIM[\s_-]*ALICED[\s\S]*?Design/i, /Design\s*\n/i]),
    dim_aliced_information: firstSectionMatch(grouped.all, ['Information']),
    dim_aliced_management: firstSectionMatch(grouped.all, ['Management']),
    dim_aliced_activity: firstSectionMatch(grouped.all, ['Activity']),
    dim_aliced_location: firstSectionMatch(grouped.all, ['Location']),
    dim_aliced_ingress: firstSectionMatch(grouped.all, ['Ingress']),
    dim_aliced_circulation: firstSectionMatch(grouped.all, ['Circulation']),
    dim_aliced_egress: firstSectionMatch(grouped.all, ['Egress']),
    dim_aliced_dynamics: firstSectionMatch(grouped.all, ['Dynamics']),
    ramp_routes: firstSectionMatch(grouped.all, ['ROUTES']),
    ramp_arrival: firstSectionMatch(grouped.all, ['ARRIVAL']),
    ramp_movement: firstSectionMatch(grouped.all, ['MOVEMENT']),
    ramp_profile: firstSectionMatch(grouped.all, ['PROFILE']),
    excluded_areas: firstSectionMatch(grouped.all, ['Design']),
    density_assumptions: firstSectionMatch(grouped.all, ['Design']),
    zone_capacities: firstSectionMatch(grouped.all, ['Design', '2.3 Attendance Profile']),
    ingress_flow_assumptions: firstSectionMatch(grouped.all, ['Ingress']),
    egress_flow_assumptions: firstSectionMatch(grouped.all, ['Egress']),
    emergency_clearance_assumptions: firstSectionMatch(grouped.all, ['Egress']),
    degraded_route_weather_assumptions: withFallback(
      firstSectionMatch(grouped.risk, ['Weather-related risks']),
      firstSectionMatch(grouped.all, ['RECOMMENDATIONS'])
    ),
    command_structure: firstSectionMatch(grouped.operations, ['Command and Control', '4.0 Command and Control Structure']),
    named_command_roles: firstSectionMatch(grouped.operations, ['4.2 KSS NW LTD Command Team', '4.0 Command and Control']),
    radio_channels_callsigns: firstSectionMatch(grouped.operations, ['Communications and Radio Protocols', '4.4 Integration with Event Control']),
    reporting_lines: firstSectionMatch(grouped.operations, ['4.5 Key Protocols', '4.3 Zones & Responsibilities']),
    external_interfaces: firstSectionMatch(grouped.operations, ['Integration with Event Control', 'working alongside']),
    key_contacts_directory: firstSectionMatch(grouped.all, ['Key Contacts', 'Contact Directory']),
    control_room_structure: firstSectionMatch(grouped.operations, ['Control Room', 'Security Control Room Structure']),
    briefing_and_induction: firstSectionMatch(grouped.operations, ['Briefings', 'Site Inductions', 'Pre-Event Checks']),
    monitoring_and_density_tools: firstSectionMatch(grouped.all, ['Crowd Density Technology', 'Odin Risk Solutions', 'Audience Density Monitoring']),
    service_delivery_scope: firstSectionMatch(grouped.operations, ['Service Directory', 'Security Coverage', 'Operational Scope']),
    build_break_operations: firstSectionMatch(grouped.operations, ['Build and Break', 'Build & Break']),
    specialist_teams_and_assets: firstSectionMatch(grouped.operations, ['Security Coverage', 'Companies Engaged']),
    staffing_by_zone_and_time: firstSectionMatch(grouped.operations, ['Deployment Summary', 'Deployment Structure and Roster', 'Deployment']),
    response_teams: firstSectionMatch(grouped.operations, ['Rapid Incident Response', 'Mobile response']),
    relief_and_contingency: firstSectionMatch(grouped.operations, ['Deployment of Security and Stewarding staff', 'relief arrangements']),
    escalation_staffing: firstSectionMatch(grouped.risk, ['Late deployment due to poor scheduling']),
    ingress_routes_holding_areas: firstSectionMatch(grouped.all, ['Ingress Routes', 'Download Arrival Plan', 'Holding Pens', 'Routes into West Entrance', 'Routes into East Entrance']),
    search_policy: firstSectionMatch(grouped.operations, ['Prohibited Items', 'search']),
    queue_design: firstSectionMatch(grouped.operations, ['Queuing Systems', 'Disney-Style Queue Management System']),
    overspill_controls: firstSectionMatch(grouped.operations, ['Queue Management for High-Demand Bars', 'Queuing Systems']),
    accessible_entry_arrangements: firstSectionMatch(grouped.operations, ['Accessibility and Inclusive Access', 'Accessibility']),
    ingress_operations: firstSectionMatch(grouped.all, ['Ingress']),
    circulation_controls: firstSectionMatch(grouped.operations, ['2.6 Crowd Characteristics', 'Site-Specific Crowd Risks and Behavioural Observations']),
    high_density_controls: firstSectionMatch(grouped.operations, ['ACT Changeover Risks', 'high-density']),
    internal_queue_controls: firstSectionMatch(grouped.operations, ['Queuing Systems']),
    transport_interface: firstSectionMatch(grouped.all, ['ROUTES', 'transport links']),
    dispersal_routes: firstSectionMatch(grouped.operations, ['Post-Event Close Down', 'Egress']),
    safeguarding_process: firstSectionMatch(grouped.operations, ['Incident Response & Safeguarding', 'Safeguarding']),
    safe_spaces: firstSectionMatch(grouped.operations, ['Safeguarding', 'Medical and Welfare Team Coordination']),
    lost_vulnerable_person_process: firstSectionMatch(grouped.risk, ['Lost children or vulnerable persons']),
    ask_for_angela_process: firstSectionMatch(grouped.operations, ['Ask for Angela']),
    confidentiality_logging: firstSectionMatch(grouped.operations, ['Event Loggist', 'log']),
    licensable_activities: firstSectionMatch(grouped.operations, ['2.4 Venue & Licensing']),
    licensing_conditions: firstSectionMatch(grouped.operations, ['3.2 Licensing Objectives', 'Key Objectives & Licensing']),
    venue_rules: firstSectionMatch(grouped.operations, ['Licensing Compliance', 'Ejection, Refusal, and Confiscation Procedures']),
    prohibited_items: firstSectionMatch(grouped.operations, ['Prohibited Items']),
    incident_management: firstSectionMatch(grouped.operations, ['Incident Response', 'Operational Delivery Objectives']),
    risk_assessment_methodology: withFallback(
      firstSectionMatch(grouped.risk, ['Risk Assessment Methodology', 'Risk Matrix', 'Methodology']),
      firstSectionMatch(grouped.operations, ['Operational Risk Assessment'])
    ),
    risk_assessment_scope: withFallback(
      firstSectionMatch(grouped.risk, ['Scope of Assessment', 'Activities Covered', 'Description of activities']),
      firstSectionMatch(grouped.operations, ['Operational Scope', 'Security Coverage'])
    ),
    risk_assessment_source_notes: withFallback(
      firstSectionMatch(grouped.risk, ['Operational Risk Assessment', 'Hazards and Controls', 'Hazards']),
      firstSectionMatch(grouped.operations, ['Site-Specific Crowd Risks and Behavioural Observations'])
    ),
    additional_operational_risks: firstSectionMatch(grouped.risk, ['Additional Controls', 'Control Measures', 'Further action required']),
    emergency_procedures: firstSectionMatch(grouped.operations, ['Emergency and Evacuation Procedures']),
    partial_evacuation_procedure: firstSectionMatch(grouped.operations, ['Part Evacuation', 'Partial Evacuation']),
    full_evacuation_procedure: firstSectionMatch(grouped.operations, ['Full Evacuation']),
    lockdown_invacuation_procedure: firstSectionMatch(grouped.operations, ['Invacuation', 'Lockdown']),
    shelter_procedure: firstSectionMatch(grouped.operations, ['Shelter']),
    show_stop_triggers: firstSectionMatch(grouped.operations, ['Emergency and Evacuation Procedures']),
    rendezvous_points: firstSectionMatch(grouped.operations, ['Emergency and Evacuation Procedures']),
    command_escalation: firstSectionMatch(grouped.operations, ['4.5 Key Protocols', 'Poor command escalation']),
    emergency_search_zones: firstSectionMatch(grouped.operations, ['Emergency Search Zones']),
    ct_procedures: firstSectionMatch(grouped.operations, ['Counter-Terrorism', 'ACT/SCAN Awareness']),
    suspicious_item_protocol: firstSectionMatch(grouped.risk, ['Improvised Explosive Device', 'Failure to report contraband or suspicious item']),
    hostile_recon_indicators: firstSectionMatch(grouped.risk, ['Suspicious Behaviour / Hostile Reconnaissance']),
    run_hide_tell_guidance: firstSectionMatch(grouped.operations, ['Run Hide Tell', 'ACT/SCAN Awareness', 'Counter-Terrorism']),
    staff_welfare_arrangements: firstSectionMatch(grouped.operations, ['Staff Welfare', 'Welfare and Wellbeing']),
    accessibility_arrangements: firstSectionMatch(grouped.operations, ['Accessibility']),
    accessibility_team_liaison: firstSectionMatch(grouped.operations, ['Medical and Welfare Team Coordination', 'Accessibility']),
    communications_plan: firstSectionMatch(grouped.operations, ['Communications and Radio Protocols', 'communications']),
    sitrep_decision_logging: firstSectionMatch(grouped.operations, ['Event Loggist', 'Records all incidents, decisions']),
    debrief_reporting: firstSectionMatch(grouped.operations, ['Post-Event Close Down and Reporting', 'Post-Event Close Down and Debrief Procedures']),
    site_maps_and_route_diagrams: firstSectionMatch(grouped.all, ['Site Map', 'Route Diagrams', 'Ingress Routes', 'Egress']),
    appendix_notes: firstSectionMatch(grouped.operations, ['Appendices', 'Appendices Overview & Supporting Documents']),
  }

  Object.entries(sectionMappings).forEach(([key, candidate]) => {
    if (candidate) {
      candidates[key] = candidate
    }
  })

  const profileAppendix = firstSectionMatch(grouped.profile, ['About Us', 'Our Services', 'Compliance and Standards'])
  if (profileAppendix) {
    candidates.appendix_notes = candidates.appendix_notes || profileAppendix
  }

  return candidates
}
