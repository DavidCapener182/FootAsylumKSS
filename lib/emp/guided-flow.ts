import type { EmpAnnexKey } from '@/lib/emp/master-template'

export type EmpGuidedQuestionType = 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select'
export type EmpGuidedAnswerValue = string | boolean
export type EmpGuidedAnswers = Record<string, EmpGuidedAnswerValue>

export type EmpGuidedQuestion = {
  key: string
  label: string
  type: EmpGuidedQuestionType
  fieldKey?: string
  placeholder?: string
  help?: string
  optionHelp?: Record<string, string>
  options?: Array<{ value: string; label: string }>
}

export type EmpGuidedGroup = {
  key: string
  title: string
  description: string
  questions: EmpGuidedQuestion[]
}

const lines = (...items: Array<string | false | null | undefined>) => items.filter(Boolean).join('\n')
const clean = (value: unknown) => String(value || '').trim()
const answer = (answers: EmpGuidedAnswers, key: string, fallback = '') => clean(answers[key]) || fallback
const enabled = (answers: EmpGuidedAnswers, key: string) => answers[key] === true || answers[key] === 'true'

const riskLevelOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]
const riskLevelHelp = {
  low: 'Low adds routine supervision and standard monitoring controls to the EMP.',
  medium: 'Medium adds active supervisor monitoring, trigger points, and planned escalation controls to the EMP.',
  high: 'High adds enhanced staffing, closer control-room attention, and specific contingency controls to the EMP.',
}

const yesNoOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]
const yesNoHelp = {
  yes: 'The EMP will describe a managed or barriered queue arrangement.',
  no: 'The EMP will describe stewarded/open queue management with proportionate monitoring.',
}

const challengePolicyOptions = [
  { value: 'Challenge 25', label: 'Challenge 25' },
  { value: 'Challenge 21', label: 'Challenge 21' },
  { value: 'No alcohol sales', label: 'No alcohol sales' },
  { value: 'Client / licence policy TBC', label: 'Client / licence policy TBC' },
]

const areaDemandPatternOptions = [
  { value: 'steady', label: 'Steady area use' },
  { value: 'early_peak', label: 'Early area build-up' },
  { value: 'headline_peak', label: 'Programme-driven area peak' },
  { value: 'multi_wave', label: 'Multiple area waves' },
]
const areaDemandPatternHelp = {
  steady: 'The EMP will plan for steady occupancy across static and dynamic gathering spaces.',
  early_peak: 'The EMP will plan for early build-up in holding areas, service points, queues, and welfare interfaces.',
  headline_peak: 'The EMP will plan for area demand around a headline act, key fixture, or main programme moment.',
  multi_wave: 'The EMP will plan for several distinct area-use waves across the day.',
}

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
  { value: 'bar_only', label: 'Bars only - right to search at bars' },
  { value: 'other_provider', label: 'Main search by another provider' },
  { value: 'none', label: 'No dedicated search' },
]
const searchPostureHelp = {
  standard: 'Use when KSS is responsible for the main event search operation.',
  enhanced: 'Use when KSS is responsible for main search with increased monitoring, secondary search, or closer control-room liaison.',
  targeted: 'Use when KSS is responsible for targeted or intelligence-led searching using live information.',
  bar_only: 'Use when another provider runs main search and bar SIA only retain the right to request or conduct further search at bars.',
  other_provider: 'Use when main search is by another provider and KSS only needs interface/escalation wording.',
  none: 'The EMP will keep search wording light while still covering admission concerns, prohibited-items awareness, and escalation.',
}

type GuidedAutoFillRule = {
  sourceKey: string
  targetKey: string
  values: Record<string, EmpGuidedAnswerValue>
}

const GUIDED_AUTOFILL_RULES: GuidedAutoFillRule[] = [
  {
    sourceKey: 'crowd_behaviour_level',
    targetKey: 'crowd_type',
    values: {
      low: 'Supervisors will use routine queue, circulation, and SIA monitoring to manage normal crowd movement and service demand.',
      medium: 'Supervisors will actively monitor queue frustration, SIA activity at service points, group behaviour, and late-event trigger points.',
      high: 'Supervisors will use enhanced monitoring of SIA teams and early escalation for crowd density, congestion, disorder, refusal conflict, welfare vulnerability, and rapid changes in peak-demand areas.',
    },
  },
  {
    sourceKey: 'main_arrival_mode',
    targetKey: 'travel_modes_notes',
    values: {
      mixed: 'Supervisors will plan for mixed arrivals across public transport, private vehicles, taxis, walking routes, and any coach or shuttle provision.',
      public_transport: 'Supervisors will monitor station, bus stop, taxi, onward pedestrian route, and public transport pinch-point interfaces.',
      private_car: 'Supervisors will monitor parking, taxi, pick-up/drop-off, and pedestrian separation interfaces linked to private vehicle demand.',
      walkup: 'Supervisors will monitor local walk-up routes, external pedestrian flow, and public information points around the venue.',
      coach_shuttle: 'Supervisors will monitor coach or shuttle loading areas, crossing points, phased dispersal, and pedestrian separation around transport interfaces.',
    },
  },
  {
    sourceKey: 'family_vulnerability_level',
    targetKey: 'family_presence_notes',
    values: {
      low: 'Supervisors will maintain routine monitoring for isolated, distressed, intoxicated, or vulnerable persons and escalate concerns through control.',
      medium: 'Supervisors will confirm welfare handover routes, lost-person process, safe-space location, and monitoring during ingress, peak periods, and egress.',
      high: 'Supervisors will confirm active welfare presence, safe-space capacity, lost-child/reunification process, safeguarding lead, and early escalation for vulnerable persons.',
    },
  },
  {
    sourceKey: 'alcohol_risk_level',
    targetKey: 'alcohol_profile_notes',
    values: {
      low: 'KSS supervisors will support bar staff with Challenge policy escalation, refusal support, and routine monitoring of KSS SIA teams and stewards.',
      medium: 'KSS supervisors will monitor KSS SIA teams and stewards on bar queues, pre-loading indicators, refusals, intoxication, and late-event behavioural change, with escalation through control.',
      high: 'KSS supervisors and the response team will support bar staff with refusals, intoxication monitoring, vulnerable person escalation, disorder trigger monitoring, and bar close-down controls.',
    },
  },
  {
    sourceKey: 'historic_issue_level',
    targetKey: 'historic_issues_notes',
    values: {
      none: 'Supervisors will keep historic issues and intelligence under review through client, venue, police, SAG, and previous-event learning updates.',
      low: 'Supervisors will brief low-level previous learning, including minor queues, isolated welfare demand, weather sensitivity, or small route issues.',
      medium: 'Supervisors will build known previous issues into briefing and supervision, including queue spillback, refusals, transport demand, welfare demand, or route obstruction.',
      high: 'The command lead will set named controls, agreed trigger points, command review, and clear escalation routes for significant historic issues or intelligence.',
    },
  },
  {
    sourceKey: 'mood_trigger_level',
    targetKey: 'mood_trigger_notes',
    values: {
      low: 'Supervisors will monitor routine mood triggers including short queue delays, lost persons, minor welfare demand, and local wayfinding issues.',
      medium: 'Supervisors will monitor delayed opening, peak bar demand, weather change, headline delay, refusal conflict, route obstruction, and transport disruption.',
      high: 'Supervisors will use pre-agreed thresholds for peak queue demand, disorder, refusal conflict, welfare spikes, weather escalation, route failure, or operational pause.',
    },
  },
  {
    sourceKey: 'arrival_pattern_type',
    targetKey: 'arrival_pattern_notes',
    values: {
      steady: 'Supervisors will monitor static and dynamic gathering spaces against normal footprint, dwell, service and welfare capacity.',
      early_peak: 'Supervisors will complete readiness checks for holding areas, queue footprints, service points, welfare interfaces and supervisor positions before public demand builds.',
      headline_peak: 'Supervisors will review staffing and queue positions before headline or key programme moments where area occupancy or bar demand may increase.',
      multi_wave: 'Supervisors will repeat area footprint, holding capacity and staffing reviews across each demand wave and operational phase.',
    },
  },
  {
    sourceKey: 'route_resilience_level',
    targetKey: 'route_resilience_notes',
    values: {
      low: 'Supervisors will confirm secondary routes are clear before peak demand and egress.',
      medium: 'Supervisors will use active route checks, steward support, lighting review, and control approval before secondary routes are used for queue relief, stock movement, or egress.',
      high: 'Supervisors will confirm route-loss contingencies, supervisor checks, lighting/weather controls, and trigger points for holding or re-routing movement.',
    },
  },
  {
    sourceKey: 'density_level',
    targetKey: 'density_assumption_notes',
    values: {
      low: 'Supervisors will manage routine circulation with standard queue and service-point monitoring.',
      medium: 'Supervisors will actively monitor dwell and queue demand around bars, toilets, welfare interfaces, service routes, and KSS-allocated areas.',
      high: 'The command lead and supervisors will use conservative capacity assumptions, enhanced monitoring, and escalation triggers around peak bar service, queues, restricted compounds, and constrained routes.',
    },
  },
  {
    sourceKey: 'weather_degradation_level',
    targetKey: 'weather_degradation_notes',
    values: {
      low: 'Supervisors will keep normal route checks in place and monitor for any change affecting queue capacity.',
      medium: 'Supervisors will check mud, standing water, lighting, barrier movement, and route obstruction where weather or route degradation may reduce usable space or flow.',
      high: 'Supervisors will confirm reduced queue footprints, shortened lanes, route-loss triggers, welfare checks, and control escalation for adverse weather or degraded routes.',
    },
  },
  {
    sourceKey: 'admission_search_posture',
    targetKey: 'search_policy',
    values: {
      standard: 'KSS search supervisors will manage the main event search operation, including lane checks, prohibited-items surrender, refusal escalation, and accessible-lane support.',
      enhanced: 'KSS search supervisors will manage the main event search operation with increased monitoring, clear prohibited-items handling, secondary-search escalation, and close liaison with control.',
      targeted: 'KSS search supervisors will manage targeted or intelligence-led search activity using supervisor direction, control updates, and escalation for finds, refusals, or suspicious behaviour.',
      bar_only: 'Main event search is not within the bar security scope. KSS supervisors and SIA teams may request or conduct further search at bars where there is reasonable concern, refusal conflict, prohibited item suspicion, intoxication risk, or direction from control.',
      other_provider: 'Main event search is delivered by another provider. KSS supervisors will maintain an interface with that provider and control, escalating prohibited-items concerns, refusals, or suspicious behaviour identified in bar areas.',
      none: 'No dedicated search operation is planned. KSS supervisors will still maintain prohibited-items awareness at bars and escalate concerns through control.',
    },
  },
  {
    sourceKey: 'admission_search_posture',
    targetKey: 'has_search_screening',
    values: {
      standard: true,
      enhanced: true,
      targeted: true,
      bar_only: false,
      other_provider: false,
      none: false,
    },
  },
  {
    sourceKey: 'queue_barriered',
    targetKey: 'queue_design',
    values: {
      yes: 'KSS supervisors will direct KSS SIA and stewards to manage barriered or clearly marked queue lanes with accessible provision, route protection, and controlled queue-tail monitoring.',
      no: 'KSS supervisors will direct KSS SIA and stewards to manage open or stewarded queue lines proportionate to demand, with escalation if queues obstruct routes or service points.',
    },
  },
  {
    sourceKey: 'overspill_risk_level',
    targetKey: 'overspill_controls',
    values: {
      low: 'Supervisors will monitor queue length and route obstruction through routine checks.',
      medium: 'KSS supervisors will monitor queue length, service-lane obstruction, welfare demand, refusal conflict, and trigger points for opening additional control measures.',
      high: 'KSS supervisors will use pre-agreed trigger points for queue holds, lane changes, reinforcement, route protection, and control escalation where overspill develops.',
    },
  },
  {
    sourceKey: 'circulation_risk_level',
    targetKey: 'circulation_controls',
    values: {
      low: 'Supervisors will maintain routine circulation checks around principal routes, accessible routes, emergency corridors, stock routes, and service crossings.',
      medium: 'Supervisors will actively monitor principal routes, accessible routes, emergency corridors, stock routes, service crossings, and dwell points around KSS areas.',
      high: 'Supervisors will use enhanced route monitoring, agreed trigger points, and control escalation to protect circulation, emergency routes, accessible routes, and service crossings.',
    },
  },
  {
    sourceKey: 'high_density_risk_level',
    targetKey: 'high_density_controls',
    values: {
      low: 'KSS supervisors will use routine observation of KSS SIA teams and stewards with normal escalation routes for standard service demand.',
      medium: 'KSS supervisors will monitor KSS SIA teams and stewards at high-demand bars, with escalation routes, response-team positioning, and welfare or medical interface where needed.',
      high: 'KSS supervisors will use enhanced observation of KSS SIA teams and stewards, holding inflow where needed, response-team positioning, escalation routes, and welfare or medical interface at high-demand bars.',
    },
  },
  {
    sourceKey: 'internal_queue_risk_level',
    targetKey: 'internal_queue_controls',
    values: {
      low: 'KSS supervisors will monitor internal queue tails and direct KSS SIA or stewards to keep principal circulation, service lanes, accessible routes, and emergency routes clear.',
      medium: 'KSS supervisors will direct KSS SIA and stewards to manage internal queue tails for bars, stores, welfare, toilets, concessions, or attractions to prevent obstruction.',
      high: 'KSS supervisors will apply early intervention, route protection, queue shortening or holding, and control escalation where internal queues threaten circulation or emergency access.',
    },
  },
  {
    sourceKey: 'reentry_policy',
    targetKey: 'transport_interface',
    values: {
      'No re-entry': 'Supervisors will support no re-entry controls by directing refused re-entry attempts to the relevant supervisor or control and preventing queue conflict at close-down.',
      'Controlled re-entry': 'Supervisors will support controlled re-entry through supervisor checks, wristband/accreditation confirmation where applicable, and escalation for disputes.',
      'Re-entry permitted': 'Supervisors will monitor re-entry flow, prevent queue conflict, and escalate capacity, welfare, or licensing concerns through control.',
      TBC: 'The command lead will confirm the re-entry position with the client or Event Control before issue and brief supervisors once confirmed.',
    },
  },
  {
    sourceKey: 'challenge_policy',
    targetKey: 'licensing_conditions',
    values: {
      'Challenge 25': 'KSS supervisors and SIA teams will support bar staff with Challenge 25 refusals, escalation, proxy-purchase awareness, and incident/refusal logging where required.',
      'Challenge 21': 'KSS supervisors and SIA teams will support bar staff with Challenge 21 refusals, escalation, proxy-purchase awareness, and incident/refusal logging where required.',
      'No alcohol sales': 'No alcohol sales are planned. Supervisors and SIA teams will still monitor prohibited alcohol, intoxication, welfare concerns, and venue-rule breaches where applicable.',
      'Client / licence policy TBC': 'The command lead will confirm the client or licence policy before issue and brief supervisors on refusal support, escalation, and logging requirements.',
    },
  },
  {
    sourceKey: 'incident_risk_level',
    targetKey: 'incident_triggers',
    values: {
      low: 'Supervisors will escalate minor disorder, welfare requests, lost persons, short queue delays, refusal support, and route obstruction through normal supervisor routes.',
      medium: 'Supervisors will escalate repeated refusals, queue spillback, assault or disorder, welfare spikes, suspicious items, weather change, route obstruction, and licence breaches through control.',
      high: 'Supervisors will use enhanced escalation for sustained disorder, repeated ejections, vulnerable person escalation, unsafe crowd density or congestion, route loss, suspicious items, medical major incident, or command request for operational pause.',
    },
  },
  {
    sourceKey: 'show_stop_level',
    targetKey: 'show_stop_triggers',
    values: {
      low: 'Supervisors will support an operational pause if directed for isolated life-safety concerns, route obstruction, or command instruction.',
      medium: 'Supervisors will escalate potential pause triggers including unsafe crowd density or congestion, severe weather, medical incident, fire alarm, route loss, disorder, or emergency service instruction.',
      high: 'The command lead will pre-brief Show Stop or operational pause triggers for unsafe crowd density or congestion, major incident, structural concern, suspicious item, severe weather, fire, or police/command instruction.',
    },
  },
  {
    sourceKey: 'ct_threat_level',
    targetKey: 'ct_threat_context',
    values: {
      low: 'Supervisors and SIA teams will remain alert to hostile reconnaissance, suspicious items, unusual behaviour, and suspicious vehicles.',
      medium: 'Supervisors and SIA teams will maintain visible vigilance, suspicious item reporting, escalation, and alignment with police, SAG, or venue instructions.',
      high: 'Supervisors and SIA teams will apply enhanced vigilance, clear search/escalation posture, hostile reconnaissance awareness, emergency route protection, and close control/police liaison.',
    },
  },
  {
    sourceKey: 'search_posture',
    targetKey: 'ct_threat_context',
    values: {
      standard: 'Supervisors and SIA teams will maintain standard CT vigilance, suspicious item reporting, and escalation through control.',
      enhanced: 'Supervisors and SIA teams will apply enhanced CT vigilance, increased search awareness, suspicious item escalation, and closer control or police liaison.',
      targeted: 'Supervisors and SIA teams will support targeted or intelligence-led CT/search posture using control updates, supervisor direction, and escalation for suspicious behaviour or items.',
      bar_only: 'KSS supervisors and SIA teams will maintain CT vigilance in bar areas and escalate suspicious behaviour, items, or search concerns to control and the main search provider where applicable.',
      other_provider: 'KSS supervisors and SIA teams will maintain CT vigilance in bar areas and escalate suspicious behaviour or items to control and the search provider responsible for main screening.',
      none: 'No dedicated CT-related search posture is planned. Supervisors will still brief SIA teams on suspicious activity, suspicious items, and immediate escalation through control.',
    },
  },
  {
    sourceKey: 'staff_welfare_level',
    targetKey: 'staff_welfare_arrangements',
    values: {
      low: 'Supervisors will maintain routine break, hydration, toilet, and sign-off arrangements, with supervisor welfare checks after incidents.',
      medium: 'Supervisors will manage break rotation, water, weather protection, rest location, late finish arrangements, and post-incident checks.',
      high: 'Supervisors will confirm dedicated rest location, relief cover, hydration/weather controls, fatigue monitoring, transport arrangements, and post-incident support.',
    },
  },
  {
    sourceKey: 'fallback_comms',
    targetKey: 'communications_plan',
    values: {
      mobile: 'Fallback communications will use mobile phone or WhatsApp contact routes if radio communication is unavailable or overloaded.',
      runner: 'Fallback communications will use runner or supervisor relay if radio contact is unavailable or a channel cannot be used.',
      control: 'Fallback communications will be coordinated through Event Control or KSS control if radio contact is degraded.',
      tbc: 'The command lead will confirm fallback communications before issue and brief supervisors on the agreed method.',
    },
  },
  {
    sourceKey: 'sitrep_interval',
    targetKey: 'sitrep_decision_logging',
    values: {
      '30 minutes': 'Supervisors will provide SITREPs every 30 minutes during peak periods and log material decisions, route changes, incident escalations, and emergency actions.',
      hourly: 'Supervisors will provide hourly SITREPs and log material decisions, route changes, incident escalations, and emergency actions.',
      'phase-based': 'Supervisors will provide SITREPs at key phase changes, including pre-opening, peak demand, final service, egress, and stand-down.',
      'incident-led': 'Supervisors will provide incident-led SITREPs when material issues, route changes, refusals, welfare concerns, or escalation triggers occur.',
    },
  },
]

function autoFillTextsForTarget(targetKey: string) {
  return GUIDED_AUTOFILL_RULES
    .filter((rule) => rule.targetKey === targetKey)
    .flatMap((rule) => Object.values(rule.values))
    .filter((value): value is string => typeof value === 'string')
    .map(clean)
}

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
    low: 'Alcohol-related risk is assessed as low, with limited alcohol demand expected and routine monitoring of SIA teams considered proportionate.',
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
    high: 'Crowd behaviour risk is assessed as high, with increased potential for unsafe crowd density or congestion, disorder, refusal conflict, welfare vulnerability, and rapid escalation in peak-demand areas.',
  }[normalized]
  return lines(
    crowdType || base,
    crowdType && base,
    notes && `Event-specific notes: ${notes}`
  )
}

export const EMP_GUIDED_GROUPS: EmpGuidedGroup[] = [
  {
    key: 'event_identity',
    title: 'Event Identity',
    description: 'Core details used on the cover, document control, and event overview.',
    questions: [
      { key: 'event_name', fieldKey: 'event_name', label: 'Event name', type: 'text', placeholder: 'Northgate Summer Live 2026', help: 'Used in the cover title and repeated throughout generated wording.' },
      { key: 'event_type', fieldKey: 'event_type', label: 'Event type', type: 'text', placeholder: 'Outdoor concert, food festival, Christmas market, sporting event' },
      { key: 'venue_name', fieldKey: 'venue_name', label: 'Venue / location', type: 'text', placeholder: 'City Park, Manchester Arena, Store car park, Town Square' },
      { key: 'venue_address', fieldKey: 'venue_address', label: 'Venue address', type: 'textarea', placeholder: 'City Park\nExample Road\nManchester\nM1 1AA' },
      { key: 'venue_reference', fieldKey: 'venue_reference', label: 'Venue reference / postcode / What3Words / SAG ref', type: 'text', placeholder: 'M1 1AA / ///safe.event.entry / SAG-2026-014' },
      { key: 'show_dates', fieldKey: 'show_dates', label: 'Show dates', type: 'text', placeholder: '19 July 2026 to 21 July 2026' },
      { key: 'build_dates', fieldKey: 'build_dates', label: 'Build dates', type: 'text', placeholder: '17 July 2026 to 18 July 2026, 08:00-20:00' },
      { key: 'break_dates', fieldKey: 'break_dates', label: 'Break / egress dates', type: 'text', placeholder: '22 July 2026, 08:00-18:00, plus public egress after close' },
      { key: 'organiser_name', fieldKey: 'organiser_name', label: 'Organiser', type: 'text', placeholder: 'Example Events Ltd' },
      { key: 'client_name', fieldKey: 'client_name', label: 'Client', type: 'text', placeholder: 'Venue, promoter, local authority, or brand client' },
      { key: 'principal_contractor', fieldKey: 'principal_contractor', label: 'Principal contractor / delivery lead', type: 'text', placeholder: 'Production company, event delivery lead, or site manager' },
      { key: 'document_version', fieldKey: 'document_version', label: 'Version', type: 'text', placeholder: 'V1.0' },
      { key: 'document_status', fieldKey: 'document_status', label: 'Status', type: 'text', placeholder: 'Draft / Final' },
      { key: 'author_name', fieldKey: 'author_name', label: 'Author', type: 'text', placeholder: 'KSS NW LTD / named author' },
      { key: 'approver_name', fieldKey: 'approver_name', label: 'Approver', type: 'text', placeholder: 'Operational lead or client approver, if known' },
      { key: 'issue_date', fieldKey: 'issue_date', label: 'Issue date', type: 'date' },
      { key: 'review_date', fieldKey: 'review_date', label: 'Review date', type: 'date' },
    ],
  },
  {
    key: 'applicability',
    title: 'Applicable Areas and Annexes',
    description: 'Choose what applies so irrelevant wording and annexes are omitted.',
    questions: [
      { key: 'has_bars', label: 'Bars or licensed trading applies', type: 'checkbox', help: 'Adds bar operations wording and the bar operations annex.' },
      { key: 'has_camping', label: 'Overnight bar asset protection applies', type: 'checkbox', help: 'Use where KSS protects bars, stock, compounds, or equipment outside public opening hours.' },
      { key: 'has_vip_backstage', label: 'Restricted compound / accreditation applies', type: 'checkbox', help: 'Use for VIP, backstage, staff compound, production, or accreditation-only areas.' },
      { key: 'has_front_of_stage', label: 'High-demand bar queue area applies', type: 'checkbox', help: 'Use for any bar or service point expected to create heavy queue demand.' },
      { key: 'has_traffic_routes', label: 'Service route or pedestrian interface applies', type: 'checkbox', help: 'Use where stock, vehicles, service routes, or pedestrian routes need active separation.' },
      { key: 'has_search_screening', label: 'Dedicated search or screening applies', type: 'checkbox', help: 'Use where KSS has a person, bag, vehicle, or prohibited-items screening role.' },
      { key: 'has_stewarding_deployment', label: 'Include stewarding / queue marshal deployment annex', type: 'checkbox', help: 'Use where the plan needs a detailed stewarding, queue marshal, or wayfinding matrix.' },
      { key: 'has_emergency_action_cards', label: 'Include emergency action cards annex', type: 'checkbox', help: 'Adds action-card style summaries for emergency, lockdown, safeguarding, and CT response.' },
      { key: 'applicable_areas', label: 'KSS areas / zones covered by this plan', type: 'textarea', placeholder: 'Main bar village\nNorth bar and queue lanes\nBar stock compound\nAccessible service lane\nKSS response team covering refusals', help: 'List only the areas KSS is responsible for. This becomes the scope of the plan.' },
      { key: 'related_documents', fieldKey: 'related_documents', label: 'Supporting documents that apply', type: 'textarea', placeholder: 'Event Management Plan\nSite plan\nLicensing schedule\nDeployment matrix\nEmergency plan\nRisk assessment' },
    ],
  },
  {
    key: 'crowd_profile',
    title: 'Operational Scope and Audience Context',
    description: 'Structured event and KSS-scope data that generates the operational narrative automatically.',
    questions: [
      { key: 'licensed_capacity_number', label: 'Licensed public capacity', type: 'number', placeholder: '25000', help: 'Enter the licensed or agreed public capacity, not the forecast attendance.' },
      { key: 'expected_attendance_number', label: 'Expected public attendance', type: 'number', placeholder: '18000' },
      { key: 'staff_and_contractor_number', label: 'Expected staff / contractor count', type: 'number', placeholder: '650' },
      { key: 'camper_count', label: 'Expected overnight bar asset count, if applicable', type: 'number', placeholder: '0', help: 'Only complete if overnight security, camping, or overnight asset protection is relevant.' },
      { key: 'audience_age_profile', fieldKey: 'audience_age_profile', label: 'Audience age profile', type: 'text', placeholder: 'Mostly 18-35, mixed groups, some families before 18:00' },
      { key: 'crowd_behaviour_level', label: 'Behaviour / queue demand level', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'crowd_type', label: 'Audience or bar behaviour notes', type: 'textarea', placeholder: 'Example: audience expected to be compliant, but bar queues may become frustrated during act changeovers.', help: 'Optional. Leave blank to use standard wording for the selected level.' },
      { key: 'main_arrival_mode', label: 'Main arrival mode', type: 'select', options: [
        { value: 'mixed', label: 'Mixed transport' },
        { value: 'public_transport', label: 'Mostly public transport' },
        { value: 'private_car', label: 'Mostly private car / parking' },
        { value: 'walkup', label: 'Mostly walk-up / local' },
        { value: 'coach_shuttle', label: 'Coach / shuttle heavy' },
      ], help: 'This shapes the arrival and transport-interface wording.' },
      { key: 'travel_modes_notes', label: 'Arrival and transport controls', type: 'textarea', placeholder: 'Example: Supervisors will monitor station, taxi, walk-up and pedestrian route interfaces during arrival and egress.' },
      { key: 'public_transport_percent', label: 'Public transport %', type: 'number', placeholder: '60' },
      { key: 'private_car_percent', label: 'Private car / taxi %', type: 'number', placeholder: '30' },
      { key: 'walkup_percent', label: 'Walk-up %', type: 'number', placeholder: '10' },
      { key: 'family_vulnerability_level', label: 'Family / vulnerability level', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'family_presence_notes', label: 'Family / vulnerable person notes, if unusual', type: 'textarea', placeholder: 'Example: family audience expected until early evening; safe space and lost child process required.' },
      { key: 'alcohol_risk_level', label: 'Alcohol and behaviour risk level', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'alcohol_profile_notes', label: 'Alcohol notes, if unusual', type: 'textarea', placeholder: 'Example: high bar demand from 17:00, Challenge 25 refusals likely after headline support act.' },
      { key: 'historic_issue_level', label: 'Historic issues / intelligence level', type: 'select', options: [
        { value: 'none', label: 'None known' },
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ] },
      { key: 'historic_issues_notes', label: 'Known historic issues / intelligence notes', type: 'textarea', placeholder: 'Example: previous event had bar queue spillback near Gate B after 20:00 and taxi rank congestion after close.' },
      { key: 'mood_trigger_level', label: 'Mood / trigger point level', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'mood_trigger_notes', label: 'Likely trigger notes, if specific', type: 'textarea', placeholder: 'Example: delayed opening, weather, headline delay, bar closure, refusal conflict, or transport disruption.' },
      { key: 'peak_periods', fieldKey: 'peak_periods', label: 'Expected KSS peak periods', type: 'textarea', placeholder: '12:00-14:00 - opening and first bar demand\n17:00-21:00 - bar service peak\n22:30-23:30 - close-down and egress interface' },
    ],
  },
  {
    key: 'site_design',
    title: 'KSS Zones and Risk Points',
    description: 'Bars, bar compounds, service routes, DIM-ALICED and RAMP inputs.',
    questions: [
      { key: 'entrances', label: 'KSS access points / screening locations', type: 'textarea', placeholder: 'North staff gate - contractor access\nMain bar entrance - queue supervision\nAccessible lane beside Gate A' },
      { key: 'exits', label: 'Close-down / handover routes', type: 'textarea', placeholder: 'Stock route to compound\nPublic clear-down route to south exit\nStaff sign-off route to control' },
      { key: 'key_zones', fieldKey: 'key_zones', label: 'Key zones and operational areas', type: 'textarea', placeholder: 'Main bar village\nEast bar\nBar stock compound\nKSS control point\nWelfare handover point' },
      { key: 'controlled_areas', fieldKey: 'controlled_areas', label: 'Allocated or restricted areas', type: 'textarea', placeholder: 'Bar back-of-house\nCash office route\nAccreditation-only compound\nStock delivery gate' },
      { key: 'emergency_exits_holding_areas', fieldKey: 'emergency_exits_holding_areas', label: 'Emergency exits, holding areas and RV points', type: 'textarea', placeholder: 'Emergency Exit E1 and E2\nHolding area beside welfare tent\nPrimary RV: north service gate' },
      { key: 'site_layout_summary', fieldKey: 'site_layout_summary', label: 'Site layout notes', type: 'textarea', placeholder: 'Example: bars sit on the west side of the arena with queue lanes running parallel to the main circulation route.' },
      { key: 'primary_routes', label: 'Primary service, queue, or pedestrian interface routes', type: 'textarea', placeholder: 'Main circulation route past Bar 2\nStock route from compound to Bar 1\nAccessible route through north lane' },
      { key: 'arrival_pattern_type', label: 'Area demand pattern', type: 'select', options: areaDemandPatternOptions, optionHelp: areaDemandPatternHelp },
      { key: 'arrival_peak_window', label: 'Main area-demand window', type: 'text', placeholder: '17:00 to 21:00' },
      { key: 'arrival_pattern_notes', label: 'Static / dynamic area controls', type: 'textarea', placeholder: 'Example: Supervisors will monitor bar footprints, queue tails, welfare handover space and service interfaces against planned holding capacity.' },
      { key: 'movement_pressure_points', label: 'Bar or service peak-demand areas', type: 'textarea', placeholder: 'Example: queue tail at Bar 2 can spill toward toilets; stock route crosses public flow near compound gate.' },
      { key: 'route_resilience_level', label: 'Secondary route resilience', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'route_resilience_notes', label: 'Secondary route notes, if specific', type: 'textarea', placeholder: 'Example: secondary route is narrow and unlit after dark; supervisor must confirm route is clear before egress.' },
    ],
  },
  {
    key: 'capacity_flow',
    title: 'Queue Capacity and Service Flow',
    description: 'Numbers and assumptions used for bar queues, service demand, and degraded conditions.',
    questions: [
      { key: 'gross_area', fieldKey: 'gross_area', label: 'Gross KSS-allocated area', type: 'text', placeholder: 'Approx. 900 m2 bar village / 120 m queue lane / area TBC from site plan' },
      { key: 'net_area', fieldKey: 'net_area', label: 'Net usable queue / service area', type: 'text', placeholder: 'Approx. 520 m2 usable queue space after barriers, stock route and structures' },
      { key: 'excluded_areas', fieldKey: 'excluded_areas', label: 'Excluded areas / deductions', type: 'textarea', placeholder: 'Bar structure footprint\nEmergency lane\nStock route\nAccessible route kept clear\nUnusable soft ground' },
      { key: 'density_level', label: 'Density assumption level', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'density_assumption_notes', label: 'Density notes, if specific', type: 'textarea', placeholder: 'Example: queue should be planned at reduced density due to family audience and grass surface.' },
      { key: 'zone_capacities', fieldKey: 'zone_capacities', label: 'Zone capacities', type: 'textarea', placeholder: 'North Bar queue - approx. 180 people before spillback trigger\nEast Bar lane - approx. 120 people\nAccessible service lane - kept clear, no holding' },
      { key: 'search_lane_count', label: 'Number of standard search lanes', type: 'number', placeholder: '6' },
      { key: 'accessible_lane_count', label: 'Number of accessible lanes', type: 'number', placeholder: '1' },
      { key: 'lane_throughput', label: 'Expected throughput per lane per hour', type: 'number', placeholder: '450' },
      { key: 'egress_route_count', label: 'Number of close-down / clear-down routes', type: 'number', placeholder: '3' },
      { key: 'emergency_route_count', label: 'Number of emergency clearance routes', type: 'number', placeholder: '4' },
      { key: 'weather_degradation_level', label: 'Weather / degraded-route risk', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'weather_degradation_notes', label: 'Weather or route degradation notes', type: 'textarea', placeholder: 'Example: grass queue lanes may be reduced after heavy rain; barriers may need shortening and route checks every 30 minutes.' },
    ],
  },
  {
    key: 'command_deployment',
    title: 'Command, Contacts and Deployment',
    description: 'Leadership, contacts, channels, staffing and escalation.',
    questions: [
      { key: 'control_location', label: 'Event Control / security control location', type: 'text', placeholder: 'Event Control cabin beside Gate A / KSS Control in site office' },
      { key: 'operational_lead', label: 'Operational lead', type: 'text', placeholder: 'Name - KSS Operational Lead' },
      { key: 'loggist', label: 'Controller / loggist', type: 'text', placeholder: 'Name - maintains KSS log and incident/refusal records' },
      { key: 'zone_supervisors', label: 'Zone supervisors', type: 'textarea', placeholder: 'North Bar Supervisor - Name - North bar and queue lane\nResponse Supervisor - Name - refusals, welfare and ejection support' },
      { key: 'providers', label: 'Provider interfaces', type: 'textarea', placeholder: 'Medical provider - Lead / contact\nWelfare lead - Name / contact\nTraffic manager - Name / radio channel\nPolice liaison - via Event Control' },
      { key: 'radio_channels_callsigns', fieldKey: 'radio_channels_callsigns', label: 'Radio channels and call signs', type: 'textarea', placeholder: 'Channel 1 - KSS command\nChannel 2 - KSS bar security teams\nCall sign KSS Lead - Name\nCall sign Bar 1 - KSS supervisor name' },
      { key: 'emergency_phrase', label: 'Emergency priority phrase', type: 'text', placeholder: 'Priority priority priority' },
      { key: 'staffing_by_zone_and_time', fieldKey: 'staffing_by_zone_and_time', label: 'Staffing by zone and time', type: 'textarea', placeholder: '10:00-14:00 - Main bar queue - Supervisor x1, SIA x4, stewards x2\n17:00-22:00 - Response - SIA x4 mobile refusal/ejection support' },
      { key: 'response_teams', fieldKey: 'response_teams', label: 'Response teams and mobile resources', type: 'textarea', placeholder: 'KSS Response Team - SIA x4 - Refusals, welfare support, queue congestion and ejections\nRelief Team - SIA x2 - breaks and contingency' },
      { key: 'reserve_staff_count', label: 'Reserve / contingency staff count', type: 'number', placeholder: '4' },
      { key: 'specialist_teams_and_assets', fieldKey: 'specialist_teams_and_assets', label: 'Specialist teams and assets', type: 'textarea', placeholder: 'Search team, dog team, CCTV support, response vehicle, welfare patrol, body-worn video, metal detection, if used.' },
      { key: 'service_delivery_scope', fieldKey: 'service_delivery_scope', label: 'KSS delivery scope', type: 'textarea', placeholder: 'KSS provides bar queue supervision, refusal/ejection support, bar compound access control, close-down support and incident escalation within allocated areas only.' },
      { key: 'build_break_operations', fieldKey: 'build_break_operations', label: 'Build and break arrangements', type: 'textarea', placeholder: 'Build: contractor access checks and compound patrols 08:00-20:00.\nBreak: stock route protection and site handover until KSS stand-down.' },
    ],
  },
  {
    key: 'operations',
    title: 'Bar Queues and Close-Down',
    description: 'Operational controls for opening, live service, refusals, and clear-down.',
    questions: [
      { key: 'public_ingress_time', fieldKey: 'public_ingress_time', label: 'KSS public-facing opening time', type: 'text', placeholder: 'Public opening 12:00; bars operational from 12:30; last orders 22:30' },
      { key: 'operational_hours', fieldKey: 'operational_hours', label: 'Operational hours by phase', type: 'textarea', placeholder: 'Build - 08:00-20:00\nPublic opening - 12:00-23:00\nPeak bar trading - 17:00-22:30\nClose-down and handover - 22:30-00:30' },
      { key: 'ingress_routes_holding_areas', fieldKey: 'ingress_routes_holding_areas', label: 'Queue areas and access points', type: 'textarea', placeholder: 'North Bar queue lane\nEast Bar feeder lane\nAccessible service route\nStock gate beside compound' },
      { key: 'admission_search_posture', label: 'Event search interface', type: 'select', options: searchPostureOptions, optionHelp: searchPostureHelp },
      { key: 'search_policy', fieldKey: 'search_policy', label: 'Search / screening controls', type: 'textarea', placeholder: 'Example: Search supervisors will apply standard event search controls with lane checks and escalation for finds or refusals.' },
      { key: 'queue_barriered', label: 'Barriered / managed queue lanes', type: 'select', options: yesNoOptions, optionHelp: yesNoHelp },
      { key: 'queue_design', fieldKey: 'queue_design', label: 'Queue design controls', type: 'textarea', placeholder: 'Example: KSS supervisors will direct KSS SIA and stewards to manage barriered feeder lanes, queue-tail monitoring, accessible provision and route protection.' },
      { key: 'overspill_risk_level', label: 'Overspill / surge risk', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'overspill_controls', fieldKey: 'overspill_controls', label: 'Overspill controls', type: 'textarea', placeholder: 'Example: KSS supervisors will hold queue entry, shorten lanes, request reinforcement, or escalate through control if spillback develops.' },
      { key: 'accessible_entry_arrangements', fieldKey: 'accessible_entry_arrangements', label: 'Accessible entry arrangements', type: 'textarea', placeholder: 'Accessible lane kept clear beside main queue; supervisor can pause feeder lane if route is blocked; welfare/medical escalation via control.' },
      { key: 'circulation_risk_level', label: 'Circulation risk level', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'circulation_controls', fieldKey: 'circulation_controls', label: 'Circulation controls', type: 'textarea', placeholder: 'Example: Supervisors will monitor principal routes, service crossings, accessible routes and emergency corridors around KSS areas.' },
      { key: 'high_density_risk_level', label: 'High-demand bar risk level', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'high_density_controls', fieldKey: 'high_density_controls', label: 'High-demand bar controls', type: 'textarea', placeholder: 'Example: KSS supervisors will monitor KSS SIA and stewards, position response teams, monitor queue congestion and escalate if bar demand affects public circulation.' },
      { key: 'internal_queue_risk_level', label: 'Internal queue risk level', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'internal_queue_controls', fieldKey: 'internal_queue_controls', label: 'Internal queue controls', type: 'textarea', placeholder: 'Example: KSS supervisors will direct KSS SIA and stewards to keep bar, welfare, toilet and stock queues clear of main routes, service lanes and emergency access.' },
      { key: 'transport_interface', fieldKey: 'transport_interface', label: 'Bar close-down / egress interface', type: 'textarea', placeholder: 'Close queue tail before egress peak; keep stock route clear; supervisors confirm bar clear and report to Event Control before stand-down.' },
      { key: 'dispersal_routes', fieldKey: 'dispersal_routes', label: 'Close-down / stock movement routes', type: 'textarea', placeholder: 'Public clear-down to south exit\nStock movement to compound via west service route\nStaff stand-down through KSS control' },
      { key: 'reentry_policy', fieldKey: 'reentry_policy', label: 'Re-entry policy', type: 'select', options: reentryPolicyOptions },
    ],
  },
  {
    key: 'safety_and_rules',
    title: 'Safeguarding, Licensing and Incident Controls',
    description: 'Safeguarding, welfare, venue rules, incidents and risk inputs.',
    questions: [
      { key: 'safeguarding_lead', label: 'Safeguarding lead / welfare lead', type: 'text', placeholder: 'Name / role / contact route via Event Control' },
      { key: 'safe_space_location', label: 'Safe-space / welfare location', type: 'text', placeholder: 'Welfare tent beside medical / venue safe room / control office' },
      { key: 'children_expected', label: 'Children or families expected', type: 'checkbox', help: 'Adds stronger wording for lost child, reunification, welfare, and quieter support arrangements.' },
      { key: 'ask_for_angela_process', fieldKey: 'ask_for_angela_process', label: 'Ask for Angela / disclosure route', type: 'textarea', placeholder: 'Staff receiving a disclosure move the person to a safe/private area, inform supervisor/control, and hand to welfare/safeguarding lead. Use event code phrase if confirmed.' },
      { key: 'dps_name', fieldKey: 'dps_name', label: 'DPS / licence holder', type: 'text', placeholder: 'Name of DPS, licence holder, or TBC' },
      { key: 'challenge_policy', fieldKey: 'challenge_policy', label: 'Challenge policy', type: 'select', options: challengePolicyOptions },
      { key: 'licensable_activities', fieldKey: 'licensable_activities', label: 'Licensable activities', type: 'textarea', placeholder: 'Sale of alcohol\nRegulated entertainment\nLate-night refreshment\nAny licence condition affecting bars or queues' },
      { key: 'licensing_conditions', fieldKey: 'licensing_conditions', label: 'Licence conditions', type: 'textarea', placeholder: 'Challenge policy, refusals logging, glass policy, last orders time, SIA support requirement, noise or dispersal conditions.' },
      { key: 'venue_rules', fieldKey: 'venue_rules', label: 'Venue rules / published conditions', type: 'textarea', placeholder: 'No glass, no drugs, no re-entry, accreditation required for compound, intoxication refusal policy, bag restrictions.' },
      { key: 'prohibited_items', fieldKey: 'prohibited_items', label: 'Prohibited items / search finds', type: 'textarea', placeholder: 'Glass, weapons, drugs, fireworks, professional cameras, alcohol, aerosols, drones, large bags, venue-specific items.' },
      { key: 'incident_risk_level', label: 'Incident trigger level', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'incident_triggers', label: 'Event-specific incident trigger notes', type: 'textarea', placeholder: 'Queue exceeds footprint, repeated refusals, assault, welfare spike, suspicious item, route obstruction, weather escalation, licence breach.' },
      { key: 'additional_operational_risks', fieldKey: 'additional_operational_risks', label: 'Additional risks and controls', type: 'textarea', placeholder: 'Activity - Who may be harmed - Controls\nStock route crossing - public and staff - hold stock movement during peak queue demand and deploy route marshal.' },
    ],
  },
  {
    key: 'emergency_ct_welfare',
    title: 'Emergency, CT, Welfare, Accessibility and Comms',
    description: 'Emergency details and reusable policy inserts for the issued plan.',
    questions: [
      { key: 'primary_rv_point', label: 'Primary RV point', type: 'text', placeholder: 'North service gate / Event Control / car park marshal point' },
      { key: 'secondary_rv_point', label: 'Secondary RV point', type: 'text', placeholder: 'South gate / medical compound / production office' },
      { key: 'casualty_collection_point', label: 'Casualty collection point', type: 'text', placeholder: 'Medical centre, welfare tent, or ambulance loading point' },
      { key: 'shelter_locations', label: 'Shelter locations', type: 'textarea', placeholder: 'Indoor concourse\nCovered market hall\nBack-of-house welfare room\nVehicle holding area for staff only' },
      { key: 'show_stop_level', label: 'Show Stop / pause trigger level', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'show_stop_triggers', fieldKey: 'show_stop_triggers', label: 'Show Stop / operational pause trigger notes', type: 'textarea', placeholder: 'Unsafe crowd density or congestion, severe weather, medical major incident, fire alarm, suspicious item, structural failure, police instruction.' },
      { key: 'ct_threat_level', label: 'CT event-specific threat context', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'ct_threat_context', label: 'CT notes, if specific', type: 'textarea', placeholder: 'Example: city-centre location, open public realm, hostile vehicle interface, search posture agreed with police/SAG.' },
      { key: 'search_posture', label: 'CT-related search posture', type: 'select', options: searchPostureOptions, optionHelp: searchPostureHelp },
      { key: 'staff_welfare_location', label: 'Staff welfare / rest location', type: 'text', placeholder: 'KSS welfare room in site office / staff tent behind compound' },
      { key: 'staff_welfare_level', label: 'Staff welfare demand', type: 'select', options: riskLevelOptions, optionHelp: riskLevelHelp },
      { key: 'staff_welfare_arrangements', fieldKey: 'staff_welfare_arrangements', label: 'Staff welfare notes', type: 'textarea', placeholder: 'Break rotation, drinking water, toilets, weather protection, late finish transport, post-incident welfare check.' },
      { key: 'accessible_entrance', label: 'Accessible entrance / route', type: 'text', placeholder: 'Accessible lane at Gate A / step-free route beside North Bar queue' },
      { key: 'accessible_facilities', label: 'Accessible toilets, viewing and assistance details', type: 'textarea', placeholder: 'Accessible toilets beside welfare, viewing platform route, companion support, hidden disability escalation via control.' },
      { key: 'radio_channel_count', label: 'Number of radio channels', type: 'number', placeholder: '3' },
      { key: 'fallback_comms', label: 'Fallback comms method', type: 'select', options: [
        { value: 'mobile', label: 'Mobile phone / WhatsApp' },
        { value: 'runner', label: 'Runner / supervisor relay' },
        { value: 'control', label: 'Control-managed fallback' },
        { value: 'tbc', label: 'TBC' },
      ], help: 'Used if radios fail, a channel is overloaded, or a supervisor cannot be reached.' },
      { key: 'communications_plan', fieldKey: 'communications_plan', label: 'Communications notes', type: 'textarea', placeholder: 'Channel allocation, call signs, emergency phrase, fallback phone group, who gives SITREPs, and who maintains the log.' },
      { key: 'sitrep_interval', label: 'SITREP interval', type: 'select', options: [
        { value: '30 minutes', label: 'Every 30 minutes' },
        { value: 'hourly', label: 'Hourly' },
        { value: 'phase-based', label: 'Phase-based' },
        { value: 'incident-led', label: 'Incident-led only' },
      ], help: 'This controls how often the generated EMP says supervisors should report status.' },
      { key: 'sitrep_decision_logging', fieldKey: 'sitrep_decision_logging', label: 'SITREP / decision logging notes', type: 'textarea', placeholder: 'Supervisor SITREP every 30 minutes during peak periods; all refusals, ejections, welfare handovers and route changes logged by control.' },
      { key: 'debrief_reporting', fieldKey: 'debrief_reporting', label: 'Debrief and reporting arrangements', type: 'textarea', placeholder: 'End-of-shift supervisor debrief, refusal/ejection log review, welfare handover notes, lessons learned for next operating day.' },
      { key: 'site_maps_and_route_diagrams', fieldKey: 'site_maps_and_route_diagrams', label: 'Appendix maps and route diagrams', type: 'textarea', placeholder: 'Site map\nBar queue plan\nEmergency route map\nDeployment matrix\nContact directory' },
      { key: 'appendix_notes', fieldKey: 'appendix_notes', label: 'Appendix notes', type: 'textarea', placeholder: 'Add notes for maps, deployment files, contact sheets, emergency cards, or client documents to include when exporting.' },
    ],
  },
]

const ANNEX_ANSWER_MAP: Array<[string, EmpAnnexKey]> = [
  ['has_bars', 'bar_operations'],
  ['has_search_screening', 'search_screening'],
  ['has_front_of_stage', 'front_of_stage_pit'],
  ['has_traffic_routes', 'traffic_pedestrian_routes'],
  ['has_camping', 'camping_security'],
  ['has_vip_backstage', 'vip_backstage_security'],
  ['has_stewarding_deployment', 'stewarding_deployment'],
  ['has_emergency_action_cards', 'emergency_action_cards'],
]

export function getGuidedSelectedAnnexes(answers: EmpGuidedAnswers): EmpAnnexKey[] {
  return ANNEX_ANSWER_MAP
    .filter(([answerKey]) => enabled(answers, answerKey))
    .map(([, annexKey]) => annexKey)
}

export function getGuidedAutoFillUpdates(
  changedKey: string,
  nextValue: EmpGuidedAnswerValue,
  currentAnswers: EmpGuidedAnswers,
  forceTargetKeys: string[] = []
): EmpGuidedAnswers {
  const updates: EmpGuidedAnswers = {}
  const normalizedNextValue = clean(nextValue)
  if (!normalizedNextValue) return updates
  const forceTargetKeySet = new Set(forceTargetKeys)

  GUIDED_AUTOFILL_RULES
    .filter((rule) => rule.sourceKey === changedKey)
    .forEach((rule) => {
      const nextRuleValue = rule.values[normalizedNextValue]
      if (typeof nextRuleValue === 'boolean') {
        updates[rule.targetKey] = nextRuleValue
        return
      }

      const nextText = clean(nextRuleValue)
      if (!nextText) return

      const currentTargetText = clean(currentAnswers[rule.targetKey])
      const previousAutoFillTexts = autoFillTextsForTarget(rule.targetKey)
      const canUpdate =
        forceTargetKeySet.has(rule.targetKey)
        || !currentTargetText
        || previousAutoFillTexts.includes(currentTargetText)
      if (canUpdate) {
        updates[rule.targetKey] = nextText
      }
    })

  return updates
}

export function getGuidedAutoFillTargetKeys(sourceKey: string) {
  return Array.from(
    new Set(
      GUIDED_AUTOFILL_RULES
        .filter((rule) => rule.sourceKey === sourceKey)
        .map((rule) => rule.targetKey)
    )
  )
}

export function buildInitialGuidedAnswers(
  fieldValues: Record<string, string>,
  selectedAnnexes: string[] = []
): EmpGuidedAnswers {
  const answers: EmpGuidedAnswers = {}

  EMP_GUIDED_GROUPS.forEach((group) => {
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

export function generateEmpFieldValuesFromGuidedAnswers(
  answers: EmpGuidedAnswers,
  currentValues: Record<string, string> = {}
) {
  const eventName = answer(answers, 'event_name', 'the event')
  const venue = answer(answers, 'venue_name', 'the venue')
  const showDates = answer(answers, 'show_dates')
  const applicableAreas = answer(answers, 'applicable_areas', 'the KSS-allocated areas identified for the event')
  const expectedAttendance = answer(answers, 'expected_attendance_number')
  const licensedCapacity = answer(answers, 'licensed_capacity_number')
  const staffCount = answer(answers, 'staff_and_contractor_number')
  const camperCount = answer(answers, 'camper_count')
  const standardLanes = answer(answers, 'search_lane_count')
  const accessibleLanes = answer(answers, 'accessible_lane_count')
  const laneThroughput = answer(answers, 'lane_throughput')
  const primaryRoutes = answer(answers, 'primary_routes')
  const areaDemandPatternType = answer(answers, 'arrival_pattern_type', 'steady')
  const areaDemandWindow = answer(answers, 'arrival_peak_window')
  const movementDemandAreas = answer(answers, 'movement_pressure_points')
  const routeResilienceLevel = levelLabel(answer(answers, 'route_resilience_level'))
  const routeResilienceNotes = answer(answers, 'route_resilience_notes')
  const selectedAnnexes = getGuidedSelectedAnnexes(answers)
  const values: Record<string, string> = { ...currentValues }

  const directQuestionValues = EMP_GUIDED_GROUPS
    .flatMap((group) => group.questions)
    .filter((question) => question.fieldKey && question.type !== 'checkbox')

  directQuestionValues.forEach((question) => {
    values[question.fieldKey as string] = answer(answers, question.key, currentValues[question.fieldKey as string] || '')
  })

  values.plan_title = eventName === 'the event'
    ? 'KSS NW LTD Bar Security Operations Plan'
    : `KSS NW LTD Bar Security Operations Plan - ${eventName}`
  values.event_name = eventName === 'the event' ? '' : eventName
  values.document_version = answer(answers, 'document_version', currentValues.document_version || 'V1.0')
  values.document_status = answer(answers, 'document_status', currentValues.document_status || 'Draft')

  values.purpose_scope_summary = `This Bar Security Operations Plan defines KSS NW LTD site-specific security operations for ${eventName}, covering ${applicableAreas}. It applies to KSS-allocated bars, licensed service areas, bar compounds, queue lanes, asset protection where allocated, safeguarding, incident response, communications, emergency interface duties, and post-event reporting. KSS operates within the wider organiser Event Management Plan and does not assume full-site event ownership unless explicitly contracted to do so.`

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
    enabled(answers, 'has_camping') && camperCount && `Overnight bar asset-protection demand is expected to include ${numberLabel(camperCount, 'person', 'people')}, creating access control, patrol, welfare, and late-night vulnerability considerations.`,
    enabled(answers, 'children_expected') && 'Children, families, or vulnerable persons are expected and safeguarding arrangements must reflect reunification, welfare escalation, and quieter support spaces.'
  )
  values.travel_modes = lines(
    answer(answers, 'travel_modes_notes'),
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
      high: 'Control should pre-brief trigger thresholds for bar queue congestion, disorder, refusal conflict, major delays, welfare spikes, weather change, asset-protection concerns, or service-route failure.',
    }[levelLabel(answer(answers, 'mood_trigger_level'))],
    answer(answers, 'mood_trigger_notes') && `Event-specific notes: ${answer(answers, 'mood_trigger_notes')}`
  )
  values.camping_profile = enabled(answers, 'has_camping')
    ? `Overnight bar asset protection applies to ${eventName}${camperCount ? ` with approximately ${numberLabel(camperCount, 'person', 'people')}` : ''}. The plan should address overnight patrols, access control, welfare demand, unauthorised access, and perimeter vulnerability where allocated to KSS.`
    : ''

  values.site_layout_summary = answer(
    answers,
    'site_layout_summary',
    `${eventName} at ${venue} will be managed through the identified KSS-allocated bars, bar compounds, service routes, welfare handover points, medical interface points, and emergency access routes.`
  )
  values.dim_aliced_design = `The design for ${eventName} should provide sufficient space, barriers, lighting, signage, queueing, service-lane protection, and emergency access for KSS-allocated bars, bar compounds, and selected operating areas.`
  values.dim_aliced_information = `Information should cover wayfinding, opening times, prohibited items, accessible arrangements, welfare points, emergency messaging, and briefing updates so attendees and staff understand how ${eventName} will operate.`
  values.dim_aliced_management = `Management arrangements should define command roles, supervisor ownership, deployment review points, contingency triggers, and decision logging for normal and degraded operations at ${venue}.`
  values.dim_aliced_activity = `Arrival analysis should consider the expected arrival profile, pre-opening dwell, first-contact points, queue readiness, accessible arrival support, and any programme moments likely to concentrate demand before entry or service.`
  values.dim_aliced_location = `Last-mile factors for ${venue} should consider transport links, local pedestrian routes, pick-up/drop-off points, access constraints, lighting, weather exposure, wayfinding, local residents, emergency service access, and any site-specific restrictions.`
  values.dim_aliced_ingress = `${primaryRoutes || 'KSS access points and queue routes'} should be reviewed against bar demand, holding capacity, accessible support, refusal management, and contingency arrangements.`
  values.dim_aliced_circulation = `${movementDemandAreas || 'Bar and service peak-demand areas'} should be monitored to prevent queue spillback, route obstruction, counterflow, and loss of emergency access.`
  values.dim_aliced_egress = `${answer(answers, 'dispersal_routes', 'Close-down and stock movement routes')} should support final service, stock or cash protection, staff clear-down, client handover, and route protection.`
  values.dim_aliced_dynamics = `Dispersal should consider close-down, final service, campsite or transport return, route resilience, public information, staff handover, and welfare or accessibility support around KSS areas during ${eventName}.`

  values.ramp_routes = `${primaryRoutes || 'Primary and secondary routes'} should be assessed for width, lighting, steward positions, accessible alternatives, crossings, and resilience if a route is lost or degraded. Route resilience is assessed as ${routeResilienceLevel}.${routeResilienceNotes ? ` ${routeResilienceNotes}` : ''}`
  values.ramp_arrival = `${
    answer(answers, 'arrival_pattern_notes') || {
      steady: 'Static and dynamic gathering spaces are expected to operate with steady occupancy and should be monitored against footprint, dwell, service, welfare and route-protection capacity.',
      early_peak: 'Static and dynamic gathering spaces should be ready before opening, with holding space, queue footprints, service points, welfare interfaces and supervisor positions confirmed before demand builds.',
      headline_peak: 'Static and dynamic gathering spaces should be reviewed before headline or key programme moments, with flexible staffing, live area reporting and route protection in place.',
      multi_wave: 'Static and dynamic gathering spaces should be reviewed across each demand wave, with repeated checks of holding capacity, service points, welfare interfaces and routes.',
    }[areaDemandPatternType] || 'Static and dynamic gathering spaces should be profiled by footprint, holding capacity, dwell, service demand, accessible provision, welfare and medical interfaces, and route protection.'
  }${areaDemandWindow ? ` Main peak window for area occupancy and demand: ${areaDemandWindow}.` : ''}`
  values.ramp_movement = `${movementDemandAreas || 'Movement demand should be identified around bars, stores, welfare handover points, toilets, service routes, and route intersections.'}`
  values.ramp_profile = `The route strategy should reflect ${answer(answers, 'audience_age_profile', 'the expected audience')}, alcohol profile, familiarity with the venue, accessibility needs, group behaviour, and any overnight bar asset demand where allocated.`

  values.density_assumptions = lines(
    `Density assumptions are set at a ${levelLabel(answer(answers, 'density_level'))} operating level for planning purposes.`,
    {
      low: 'The plan assumes routine circulation with limited dwell outside normal queues and service points.',
      medium: 'The plan assumes moderate dwell and queue demand around bars, toilets, welfare interfaces, service routes, and KSS-allocated areas.',
      high: 'The plan assumes elevated density risk around peak bar service, queues, restricted bar compounds, and constrained routes.',
    }[levelLabel(answer(answers, 'density_level'))],
    answer(answers, 'density_assumption_notes') && `Event-specific notes: ${answer(answers, 'density_assumption_notes')}`
  )
  values.ingress_flow_assumptions = standardLanes || accessibleLanes || laneThroughput
    ? `Ingress calculations assume ${standardLanes || 'the confirmed number of'} standard search lanes${accessibleLanes ? `, ${accessibleLanes} accessible lane(s)` : ''}${laneThroughput ? `, and a managed throughput of approximately ${numberLabel(laneThroughput, 'person')} per lane per hour` : ''}. The final operating model must be checked against the expected arrival curve, ticketing interface, accessible provision, and degraded conditions.`
    : currentValues.ingress_flow_assumptions || ''
  values.egress_flow_assumptions = answer(answers, 'egress_route_count')
    ? `Close-down assumptions are based on ${numberLabel(answer(answers, 'egress_route_count'), 'clear-down route')} supported by route stewarding, stock or cash protection, accessible departure support, and client handover.`
    : `Close-down assumptions should be based on available stock movement routes, public clear-down, accessible departure needs, client handover, and expected sign-off time for ${eventName}.`
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
    answer(answers, 'operational_lead') && `Operational Lead - ${answer(answers, 'operational_lead')} - Overall responsibility for event management and security delivery.`,
    answer(answers, 'loggist') && `Event Controller / Loggist - ${answer(answers, 'loggist')} - Maintains the command log, incident record, and escalation tracking.`,
    answer(answers, 'zone_supervisors')
  )
  values.external_interfaces = answer(answers, 'providers', currentValues.external_interfaces || '')
  values.key_contacts_directory = lines(
    answer(answers, 'operational_lead') && `Operational lead - ${answer(answers, 'operational_lead')} - Contact to be confirmed`,
    answer(answers, 'loggist') && `Event control / loggist - ${answer(answers, 'loggist')} - Contact to be confirmed`,
    answer(answers, 'providers')
  )
  values.reporting_lines = `Staff report to their zone supervisor, supervisors escalate to ${answer(answers, 'control_location', 'Event Control')}, and material issues are escalated to ${answer(answers, 'operational_lead', 'the Operational Lead')}. Immediate escalation is required for life safety, safeguarding, disorder, CT concerns, licence breaches, refusal conflict, asset loss, bar queue congestion, or any issue affecting KSS operations.`
  values.control_room_structure = `${answer(answers, 'control_location', 'Event Control')} should hold command, logging, provider liaison, live bar status, incident tracking, refusal tracking, safeguarding handovers, and decision recording functions for ${eventName}.`
  values.briefing_and_induction = `Planning meetings, written briefs, role-specific deployment briefs, inductions, pre-opening checks, final service checks, overnight handover checks, and close-down checks should be completed for ${eventName}. Late changes must be re-briefed through supervisors and control.`
  values.monitoring_and_density_tools = `Live monitoring should combine supervisor observation, route patrols, bar queue reports, refusal logs, welfare and medical feedback, stock or compound checks, control logging, and any available CCTV or counting tools. Technology supports but does not replace live command judgement.`
  values.relief_and_contingency = answer(answers, 'reserve_staff_count')
    ? `Relief and contingency arrangements include break cover, supervisor-managed redeployment, and a reserve of ${numberLabel(answer(answers, 'reserve_staff_count'), 'staff member', 'staff')} for sickness, bar queue congestion, weather changes, compound issues, or incident reinforcement.`
    : currentValues.relief_and_contingency || ''
  values.escalation_staffing = `Additional staff should be deployed if bar queue times, route obstruction, safeguarding demand, weather degradation, asset-protection concerns, or incident frequency exceed the thresholds agreed by ${answer(answers, 'control_location', 'Event Control')}.`

  values.ingress_operations = `Opening checks, lane readiness, signage, radio checks, welfare readiness, accessible support, refusal routes, and escalation arrangements should be confirmed before KSS-allocated bar areas open for ${eventName}.`
  values.search_policy = answer(answers, 'search_policy') || {
    standard: 'Search and admission controls use a standard event search posture with lane checks, prohibited-items surrender, refusal escalation, and accessible-lane support.',
    enhanced: 'Search and admission controls use an enhanced posture with increased supervisor monitoring, clear prohibited-items handling, secondary-search escalation, and closer liaison with control.',
    targeted: 'Search and admission controls use targeted or intelligence-led checks supported by supervisor direction, control updates, and escalation for finds, refusals, or suspicious behaviour.',
    bar_only: 'Main event search is outside the bar security scope. KSS supervisors and SIA teams retain the right to request or conduct further search at bars where there is reasonable concern, prohibited item suspicion, refusal conflict, intoxication risk, or direction from control.',
    other_provider: 'Main event search is delivered by another provider. KSS supervisors maintain an interface with that provider and Event Control for prohibited-items concerns, refusals, suspicious behaviour, or bar-area search requests.',
    none: 'No dedicated search operation is planned; KSS supervisors still maintain prohibited-items awareness at bars and escalate concerns through control.',
  }[answer(answers, 'admission_search_posture', 'standard')] || ''
  values.queue_design = answer(answers, 'queue_design') || lines(
    answer(answers, 'queue_barriered') === 'yes'
      ? 'Queue design uses barriered or clearly managed lanes with supervisor oversight, accessible provision, and route protection.'
      : 'Queue design uses stewarded queue lines and monitoring proportionate to expected arrival demand.',
    standardLanes && `${standardLanes} standard search lane(s) are planned.`,
    accessibleLanes && `${accessibleLanes} accessible lane(s) are planned.`
  )
  values.overspill_controls = answer(answers, 'overspill_controls') || `Overspill and surge risk is assessed as ${levelLabel(answer(answers, 'overspill_risk_level'))}. Supervisors should monitor bar queue length, service-lane obstruction, neighbouring land use, welfare demand, refusal conflict, and escalation thresholds through Event Control.`
  values.circulation_controls = answer(answers, 'circulation_controls') || `Circulation risk is assessed as ${levelLabel(answer(answers, 'circulation_risk_level'))}. Controls should protect principal pedestrian routes, accessible routes, emergency corridors, stock routes, service crossings, and known dwell points around KSS areas.`
  values.high_density_controls = answer(answers, 'high_density_controls') || `High-demand bar risk is assessed as ${levelLabel(answer(answers, 'high_density_risk_level'))}. Controls should include observation, supervisor escalation, holding inflow where needed, response-team positioning, and medical or welfare interface.`
  values.internal_queue_controls = answer(answers, 'internal_queue_controls') || `Internal queue risk is assessed as ${levelLabel(answer(answers, 'internal_queue_risk_level'))}. Queues for bars, stores, welfare, toilets, concessions, or attractions must be kept off principal circulation, service lanes, and emergency routes.`
  values.egress_operations = `Close-down for ${eventName} should operate through a managed clear-down model with route checks, public messaging where required, stock or cash protection, accessible support, client handover, and control sign-off once KSS areas are secure.`

  values.safeguarding_process = `All safeguarding concerns at ${eventName} are reported to ${answer(answers, 'control_location', 'Event Control')} and handed to ${answer(answers, 'safeguarding_lead', 'the safeguarding or welfare lead')} as appropriate. Staff must intervene early for separated children, vulnerable adults, disclosures, harassment, drink spiking, intoxication, or welfare vulnerability.`
  values.safe_spaces = `${answer(answers, 'safe_space_location', 'Safe-space and welfare locations')} should be clearly briefed, staffed or supported, and capable of receiving vulnerable persons, disclosures, and reunification cases confidentially.`
  values.lost_vulnerable_person_process = `Lost child or vulnerable person reports are priority incidents. Control circulates descriptions to relevant supervisors, welfare, ingress, medical and response teams, retains the reporting party where safe, and records reunification or handover.`
  values.confidentiality_logging = 'Safeguarding logs must be factual, time-stamped, restricted to those with a direct operational need, and securely handed to the designated safeguarding or welfare lead.'

  values.incident_management = `Incidents at ${eventName} are managed through a graded response prioritising life safety, KSS area stability, vulnerability, communication, and escalation. Incident trigger level is assessed as ${levelLabel(answer(answers, 'incident_risk_level'))}. Event-specific triggers include ${answer(answers, 'incident_triggers', 'disorder, medical or welfare incidents, safeguarding reports, route obstruction, suspicious items, bar queue congestion, refusals, intoxication, asset concerns, and conditions that may affect licence objectives or event continuity')}.`
  values.risk_assessment_methodology = `The operational risk assessment links the event profile, KSS area analysis, staffing model, selected annexes, emergency interface arrangements, and KSS delivery scope to the hazards most likely to arise at ${eventName}.`
  values.risk_assessment_scope = `The KSS risk assessment covers ${applicableAreas}, including the selected annex functions where applicable.`
  values.risk_assessment_source_notes = `Event-specific risk review should consider ${answer(answers, 'incident_triggers', 'bar queue congestion, queue overspill, intoxication, vulnerable persons, adverse weather, vehicle or pedestrian interface, route obstruction, suspicious items, refusal conflict, asset protection, and emergency response thresholds')}.`

  values.emergency_procedures = `Emergency response arrangements for ${eventName} define KSS interface duties for evacuation, partial evacuation, invacuation / lockdown, shelter, operational pause, route protection, and emergency service access, directed through ${answer(answers, 'control_location', 'Event Control')} unless immediate life safety requires action.`
  values.partial_evacuation_procedure = `Part evacuation applies where a single zone, route, or compound becomes unsafe but wider operations can continue. Control identifies the affected area, stops movement into that zone, protects routes, and holds adjoining sectors as required.`
  values.full_evacuation_procedure = `Full evacuation is initiated where the incident, threat, or route loss affects the wider site and continued occupation cannot be justified. Supervisors release pre-briefed routes and support disabled or vulnerable attendees.`
  values.lockdown_invacuation_procedure = `Invacuation or lockdown is used where external or localised threat makes open movement unsafe. Staff direct attendees into protected areas, close access points, restrict movement, and report to control until police or emergency direction is received.`
  values.shelter_procedure = `${answer(answers, 'shelter_locations', 'Shelter locations')} should be used where weather or environmental hazards make continued operation or external movement unsafe. Staff regulate movement around KSS areas to prevent compression and maintain welfare, accessibility, and emergency corridors.`
  values.rendezvous_points = lines(
    answer(answers, 'primary_rv_point') && `Primary RV point: ${answer(answers, 'primary_rv_point')}`,
    answer(answers, 'secondary_rv_point') && `Secondary RV point: ${answer(answers, 'secondary_rv_point')}`,
    answer(answers, 'casualty_collection_point') && `Casualty collection point: ${answer(answers, 'casualty_collection_point')}`
  )
  values.command_escalation = `Supervisors can recommend emergency action, but event-wide evacuation, lockdown, or shelter is authorised through ${answer(answers, 'control_location', 'Event Control')} unless immediate life safety requires protective action before formal confirmation.`
  values.emergency_search_zones = `Emergency search zones and sterile routes should reflect the site map, RV points, emergency service access route, bars, bar compounds, KSS-allocated areas, and any suspected device or route-loss scenario.`

  values.ct_procedures = `Staff are briefed on hostile reconnaissance, suspicious items, suspicious vehicles, unusual behaviour, and event-specific CT context. CT context is assessed as ${levelLabel(answer(answers, 'ct_threat_level'))}. ${answer(answers, 'ct_threat_context', 'Any concern must be reported immediately to control and escalated in line with ACT / SCaN and Run Hide Tell guidance.')}`
  values.suspicious_item_protocol = 'A suspicious item must not be handled. Staff clear the immediate area, prevent further approach, inform control with exact location and description, and await police or command direction.'
  values.hostile_recon_indicators = 'Indicators include unusual questioning, repetitive photography of security measures, testing staff reactions, interest in restricted points or routes, unattended vehicles, and behaviour inconsistent with normal attendance.'
  values.run_hide_tell_guidance = 'Where a marauding or weapons threat is suspected, staff and attendees should Run if safe, Hide if escape is not possible, and Tell police or control when safe. Staff do not pursue attackers.'
  values.accessibility_arrangements = `Accessible arrangements for ${eventName} include ${answer(answers, 'accessible_entrance', 'accessible entry')}, ${answer(answers, 'accessible_facilities', 'accessible toilets, viewing, route assistance, welfare priority access, and emergency support')}.`
  values.accessibility_team_liaison = 'Security teams should liaise with the accessibility lead on bar queue assistance, route changes, welfare needs, and incidents affecting disabled guests.'
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
    ? 'High-demand bar queue roles should cover queue supervision, barrier monitoring, extraction points, welfare handover, client liaison, surge observation, and operational-pause escalation.'
    : ''
  values.traffic_pedestrian_roles = enabled(answers, 'has_traffic_routes')
    ? 'Service route and pedestrian interface roles should cover crossing points, stock routes, delivery interfaces, staff access routes, route protection, and liaison with the traffic management provider where applicable.'
    : ''
  values.camping_security_roles = enabled(answers, 'has_camping')
    ? 'Overnight bar asset-protection roles should cover patrols, perimeter observation, access control, welfare-linked patrols, and unauthorised access escalation where allocated to KSS.'
    : ''
  values.vip_backstage_roles = enabled(answers, 'has_vip_backstage')
    ? 'Restricted compound roles should cover accreditation checks, controlled-area access, client or production route protection, escort arrangements, sterile-area checks, and unauthorised access escalation.'
    : ''
  values.stewarding_roles = enabled(answers, 'has_stewarding_deployment')
    ? 'Stewarding and queue marshal deployment should cover directional staff, bar queue marshals, emergency-route cover, route-clearance stewards, briefing ownership, relief, contingency, and redeployment through control.'
    : ''

  return { values, selectedAnnexes }
}
