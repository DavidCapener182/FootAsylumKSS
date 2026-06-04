import type { EmpAnnexKey } from '@/lib/emp/master-template'
import { EMP_BUSINESS_TEMPLATE_VALUES } from '@/lib/emp/business-template'

const lines = (...items: string[]) => items.join('\n')

export const EMP_PARKLIFE_EVENT_NAME = 'Parklife Festival 2026'
export const EMP_PARKLIFE_PLAN_TITLE =
  'KSS NW LTD Bar Security Operations Plan - Parklife Festival 2026'

export const EMP_PARKLIFE_SELECTED_ANNEXES: EmpAnnexKey[] = ['bar_operations']

// day|area|position|function|company|role|dayStaff|dayStart|dayEnd|dayHours|lateStaff|lateStart|lateEnd|lateHours
export const EMP_PARKLIFE_DEPLOYMENT_ROWS: string[] = [
  'Saturday 20 June|MANAGEMENT|MGMT|Management|KSS Security|MANAGER|1|10:00|23:30|13.5||||',
  'Sunday 21 June|MANAGEMENT|MGMT|Management|KSS Security|MANAGER|1|11:00|23:30|12.5||||',
  'Saturday 20 June|CONTROL|CONTROL|Control room logging|KSS Security|CONTROL ROOM LOGGER|1|11:30|23:00|11.5||||',
  'Sunday 21 June|CONTROL|CONTROL|Control room logging|KSS Security|CONTROL ROOM LOGGER|1|12:30|23:00|10.5||||',
  'Saturday 20 June|LOGISTICS|LOGISTICS|Onsite logistics|KSS Security|ONSITE LOGISTICS|1|11:30|23:00|11.5||||',
  'Sunday 21 June|LOGISTICS|LOGISTICS|Onsite logistics|KSS Security|ONSITE LOGISTICS|1|12:30|23:00|10.5||||',
  'Saturday 20 June|RESPONSE|RESPONSE|Response team|STRAZA|SUP|1|11:30|23:00|11.5||||',
  'Sunday 21 June|RESPONSE|RESPONSE|Response team|STRAZA|SUP|1|12:30|23:00|10.5||||',
  'Saturday 20 June|RESPONSE|RESPONSE|Response team|STRAZA|SIA|2|11:30|23:00|11.5||||',
  'Sunday 21 June|RESPONSE|RESPONSE|Response team|STRAZA|SIA|2|12:30|23:00|10.5||||',
  'Saturday 20 June|RESPONSE|RESPONSE|Response team|CJL|SUP|1|11:30|23:00|11.5||||',
  'Sunday 21 June|RESPONSE|RESPONSE|Response team|CJL|SUP|1|12:30|23:00|10.5||||',
  'Saturday 20 June|RESPONSE|RESPONSE|Response team|CJL|SIA|1|11:30|23:00|11.5||||',
  'Sunday 21 June|RESPONSE|RESPONSE|Response team|CJL|SIA|1|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Valley A|Bar security|STRAZA|SUP|1|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Valley A|Bar security|STRAZA|SUP|1|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Valley A|Bar security|STRAZA|SIA|2|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Valley A|Bar security|STRAZA|SIA|2|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Valley A|Bar security|STRAZA|ST|2|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Valley A|Bar security|STRAZA|ST|2|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Valley B|Bar security|STRAZA|SUP|1|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Valley B|Bar security|STRAZA|SUP|1|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Valley B|Bar security|STRAZA|SIA|2|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Valley B|Bar security|STRAZA|SIA|2|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Valley B|Bar security|STRAZA|ST|2|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Valley B|Bar security|STRAZA|ST|2|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|G2|Bar security|STRAZA|SUP|1|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|G2|Bar security|STRAZA|SUP|1|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|G2|Bar security|STRAZA|SIA|2|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|G2|Bar security|STRAZA|SIA|2|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|G2|Bar security|CJL|ST|2|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|G2|Bar security|CJL|ST|2|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Hangar Right|Bar security|CJL|SUP|1|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Hangar Right|Bar security|CJL|SUP|1|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Hangar Right|Bar security|CJL|SIA|2|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Hangar Right|Bar security|CJL|SIA|2|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Hangar Right|Bar security|CJL|ST|2|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Hangar Right|Bar security|CJL|ST|2|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Hangar Left|Bar security|CJL|SUP|1|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Hangar Left|Bar security|CJL|SUP|1|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Hangar Left|Bar security|CJL|SIA|2|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Hangar Left|Bar security|CJL|SIA|2|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Hangar Left|Bar security|CJL|ST|2|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Hangar Left|Bar security|CJL|ST|2|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Magic|Bar security|CJL|SUP|1|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Magic|Bar security|CJL|SUP|1|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Magic|Bar security|CJL|SIA|1|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Magic|Bar security|CJL|SIA|1|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Magic|Bar security|GUARDEX|SIA|1|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Magic|Bar security|GUARDEX|SIA|1|12:30|23:00|10.5||||',
  'Saturday 20 June|BARS|Magic|Bar security|GUARDEX|ST|2|11:30|23:00|11.5||||',
  'Sunday 21 June|BARS|Magic|Bar security|GUARDEX|ST|2|12:30|23:00|10.5||||',
  'Saturday 20 June|ACTIVATIONS|Budweiser Activation|Activation security|GUARDEX|SUP|1|11:30|23:00|11.5||||',
  'Sunday 21 June|ACTIVATIONS|Budweiser Activation|Activation security|GUARDEX|SUP|1|12:30|23:00|10.5||||',
  'Saturday 20 June|ACTIVATIONS|Budweiser Activation|Activation security|GUARDEX|SIA|2|11:30|23:00|11.5||||',
  'Sunday 21 June|ACTIVATIONS|Budweiser Activation|Activation security|GUARDEX|SIA|2|12:30|23:00|10.5||||',
  'Saturday 20 June|ACTIVATIONS|Smirnoff Activation|Activation security|GUARDEX|SUP|1|11:30|23:00|11.5||||',
  'Sunday 21 June|ACTIVATIONS|Smirnoff Activation|Activation security|GUARDEX|SUP|1|12:30|23:00|10.5||||',
  'Saturday 20 June|ACTIVATIONS|Smirnoff Activation|Activation security|GUARDEX|SIA|2|11:30|23:00|11.5||||',
  'Sunday 21 June|ACTIVATIONS|Smirnoff Activation|Activation security|GUARDEX|SIA|2|12:30|23:00|10.5||||',
  'Saturday 20 June|ACTIVATIONS|Smirnoff Activation|Activation security|GUARDEX|ST|2|11:30|23:00|11.5||||',
  'Sunday 21 June|ACTIVATIONS|Smirnoff Activation|Activation security|GUARDEX|ST|2|12:30|23:00|10.5||||',
  'Saturday 20 June|ACTIVATIONS|Beatbox Activation|Activation security|GUARDEX|SUP|1|11:30|23:00|12||||',
  'Sunday 21 June|ACTIVATIONS|Beatbox Activation|Activation security|GUARDEX|SUP|1|12:30|23:00|11||||',
  'Saturday 20 June|ACTIVATIONS|Beatbox Activation|Activation security|GUARDEX|SIA|2|11:30|23:00|12||||',
  'Sunday 21 June|ACTIVATIONS|Beatbox Activation|Activation security|GUARDEX|SIA|2|12:30|23:00|11||||',
  'Saturday 20 June|MERCH|Merch Stalls|Merch security|GUARDEX|SIA|2|11:30|23:00|11.5||||',
  'Sunday 21 June|MERCH|Merch Stalls|Merch security|GUARDEX|SIA|2|12:30|23:00|10.5||||',
]

export const EMP_PARKLIFE_PLAN_VALUES: Record<string, string> = {
  ...EMP_BUSINESS_TEMPLATE_VALUES,

  plan_title: EMP_PARKLIFE_PLAN_TITLE,
  document_version: 'V1',
  document_status: 'V1',
  author_name: 'David Capener - KSS NW LTD',
  approver_name: 'Floyd Allen - KSS NW LTD',
  issue_date: '2026-06-03',
  review_date: '2026-06-15',
  distribution_list: lines(
    'Jack Longthorne - KSS Head of Security',
    'David Capener - KSS Operational Lead',
    'Laura Parker - KSS Operational Support',
    'KSS operational leadership and supervisors',
    'Parklife Event Control',
    'Parklife Manchester Ltd / Engine No.4 event operations',
    'Showsec Head of Security and Crowd Management / Event Control',
    'Warehouse Project / licence holder representative',
    'Event safeguarding, welfare and medical leads',
    'Client or organiser representative'
  ),

  purpose_scope_summary:
    'This Bar Security Operations Plan sets out the KSS NW LTD operational arrangements for Parklife Festival 2026 at Heaton Park, Manchester. The Parklife CMP identifies KSS Ltd as the provider for Bars/VIP Activations. KSS scope is limited to allocated bar-security support, bar queue lanes, licensed service areas, bar compounds or stock interfaces where allocated, refusal support, incident reporting, welfare recognition, safeguarding escalation, emergency route preservation around KSS areas, and Event Control communication. KSS does not assume ownership of full-site crowd management, entrance search, traffic, stages, CCTV, medical, welfare, Event Control, venue egress, emergency planning or general arena patrols unless specifically tasked by the client or Event Control.',
  related_documents: lines(
    'Parklife Festival 2026 ESMP v2.1 - Number 8 Safety Ltd / Parklife Manchester Ltd',
    'Parklife 2026 CMP v1 - Showsec crowd management, event security and stewarding plan',
    'PL26 Site Plan V10.6 WIDE - full site plan, Rev 10.6, April 2026',
    'PL26 Site Plan V10.6 Arena - arena site plan, Rev 10.6, April 2026',
    'Warehouse Project bar operator risk assessment and operating procedures - to be used for Challenge 25, refusals, proxy purchase, incident reporting, bar breach and bar close-down processes when issued',
    'Premises Licence 135804 - Manchester City Council; DPS Jon Drape; Challenge 25 at bars',
    'Alcohol Management Plan - to be held as an annex to the Crowd Management Plan; Medical Operations Plan PL26-MOP-001, Welfare Plan and Accessibility Plan referenced in ESMP',
    'MASTER Parklife Manchester - EXT Security - 2026 V2 deployment schedule'
  ),
  operational_assumptions_dependencies: lines(
    'Deployment numbers, areas, supplier allocations and live operating hours are based on MASTER Parklife Manchester - EXT Security - 2026 V2 and remain subject to live deployment-sheet updates.',
    'KSS Bars/VIP Activations operate under Parklife Event Control direction and within the wider organiser event management, crowd management, emergency, safeguarding and licensing arrangements.',
    'KSS scope is bar-only unless the client or Event Control formally tasks additional support.',
    'PL26 Site Plan V10.6 shows the current arena layout, including West Gate, East Gate, Bridge Gate, Boneyard, Site/Ops, central VIP, medical/welfare, The Valley, Magic Sky, Matinee, Panorama and several numbered bar locations; KSS/external security post allocation is set out in the deployment schedule.',
    'Emergency procedures, evacuation, invacuation, lockdown, Show Stop, public messaging, emergency-service interface and traffic-light alert states are governed by the organiser command structure, ELT and Event Control.',
    'Weather, ground condition, peak bar demand, safeguarding demand, intelligence, route loss, intoxication levels, queue movement or staffing changes may alter KSS deployment, queue layouts, patrol focus or escalation priorities.',
    'If a named KSS lead is replaced operationally, Event Control will be notified and the live deployment sheet supersedes this document for that role or shift.'
  ),

  event_name: EMP_PARKLIFE_EVENT_NAME,
  event_type:
    'Non-camping, two-day outdoor music festival at Heaton Park, Manchester, with multiple stages, entertainment spaces, volume bars and sponsor bars. KSS scope is Bars/VIP Activations support only. The event operates as a daily access festival with public gates open on Saturday 20 June and Sunday 21 June 2026.',
  venue_name: 'Heaton Park',
  venue_address: 'Heaton Park, Middleton Road, Manchester, M25 2SW',
  venue_reference:
    'Heaton Park / Parklife event site. Public entry gates are East Gate via Sheepfoot Lane park gates 7a/7b, West Gate off Bury Old Road park gate 11, and Bridge Gate off Sheepfoot Lane gate 6 for access customers, guest list and media. Production access is Gate 9 off Bury Old Road. Event Control is identified at ///tiny.keeps.funds / WG10 The Avenue; medical/welfare is identified at ///eggs.cure.posed and FCP2.',
  organiser_name: 'Parklife Manchester Ltd',
  client_name: 'Parklife Manchester Ltd / Engine No.4 event operations; Warehouse Project bar operation',
  principal_contractor: 'Engine No.4 Ltd - production company and principal site controller',
  key_delivery_partners: lines(
    'KSS NW LTD - Bars/VIP Activations security support where allocated',
    'Parklife Manchester Ltd - event organiser and premises licence holder interface',
    'Engine No.4 Ltd - production management and principal site controller',
    'Warehouse Project - bar operation, Challenge 25/refusal process, proxy-purchase escalation, bar breach process and close-down procedures',
    'Number 8 Safety Ltd - Event Safety Advisor and health/safety management',
    'Showsec International Ltd - Head of Security and Crowd Management, Event Control security interface and several event security areas',
    'Medical Solutions Ltd - medical provision; WELSafe - welfare provision; The Loop - drug checking and harm reduction',
    'Tracsis - transport management plan; Greater Manchester Police, Manchester City Council, NWAS, GMFRS and SAG partners through Event Control where required'
  ),
  build_dates: 'Combined Parklife build and break window runs from 2 June 2026 to 4 July 2026. KSS build duties are not identified unless separately allocated.',
  show_dates: '20 June 2026 to 21 June 2026',
  break_dates: 'Break and demobilisation fall within the 2 June 2026 to 4 July 2026 site window. KSS break duties are not identified unless separately allocated.',
  public_ingress_time:
    'Parklife gates are advertised as opening from 12:00 on Saturday 20 June and 13:00 on Sunday 21 June 2026, with last entry advertised at 17:00 and actual admission closure at Event Control or organiser discretion. Event finish is 23:00 on both days.',
  operational_hours: lines(
    'KSS deployment operates to MASTER Parklife Manchester - EXT Security - 2026 V2 and Event Control instructions.',
    'Scheduled management cover starts at 10:00 on Saturday and 11:00 on Sunday.',
    'Scheduled control, logistics, response, bar, activation and merch cover starts at 11:30 on Saturday and 12:30 on Sunday, with most listed posts ending at 23:00.',
    'Public gates: Saturday 20 June from 12:00; Sunday 21 June from 13:00.',
    'Last entry advertised: 17:00 on both days, with actual admission closure at Event Control or organiser discretion.',
    'Event finish: 23:00 on both days.',
    'Bar operating times, last orders and close-down timings will be inserted from the Warehouse Project bar operator schedule and licence conditions when supplied.',
    'KSS stand-down is only after bar closure, queue clear-down, refusal/ejection handover, incident logging and Event Control or KSS lead confirmation.'
  ),

  client_objectives: lines(
    'Deliver safe, proportionate and professional KSS bar-security support across allocated Parklife bars and licensed service areas.',
    'Maintain clear bar queue lanes, protected emergency routes, protected accessible routes and controlled bar compound or stock interfaces where allocated.',
    'Support Warehouse Project with Challenge policy, refusals, proxy-purchase concerns, intoxication, disorder prevention and escalation.',
    'Identify welfare, safeguarding, harassment, spiking, medical and vulnerability indicators early and escalate through supervisor and Event Control routes.',
    'Record refusals, incidents, ejections, welfare referrals and material operational issues so Event Control receives the required information.'
  ),

  licensed_capacity:
    'The ESMP lists Parklife 2026 as a Category C event with licensed capacity of 60,000. The CMP states the Heaton Park festival-format maximum capacity is 79,999. Capacity control remains with the organiser, licence holder, local authority and Event Control; KSS bar-area capacity assumptions will be based on confirmed bar footprints, queue lanes and the KSS deployment schedule.',
  expected_attendance:
    'Expected attendance is 45,000 plus guests on Saturday 20 June and 45,000 plus guests on Sunday 21 June 2026. KSS planning should assume peak bar demand during afternoon, evening and pre-close periods.',
  staff_and_contractor_count:
    'The ESMP references approximately 4,000 staff and contractors across build, live operation and break. The supplied MASTER Parklife Manchester - EXT Security - 2026 V2 deployment lists 51 scheduled KSS/external security source post rows on Saturday 20 June and 51 on Sunday 21 June across management, control room logging, onsite logistics, response, bars, activations and merch. Deployment totals remain controlled by the live deployment sheet if updated.',
  audience_age_profile:
    'Parklife is a 17+ event. No under-17s are permitted. 17-year-olds must be accompanied by a responsible guardian aged 18 or over at a maximum ratio of four 17-year-olds per responsible adult. The assessed audience range is 17-40 with a core 17-25 profile and significant alcohol-service demand.',
  attendance_profile:
    'The KSS operational profile is bar-focused. Key customer interfaces are bar fronts, queue tails, refusal points, bar compounds, stock or service routes, welfare handover points, accessible routes near bars and close-down dispersal from licensed service areas.',
  travel_modes:
    'Public travel, entry and exit routes are controlled by the wider Parklife travel and site management arrangements. The event promotes public transport, has a dedicated shuttle bus from Manchester city centre, uses Heaton Park tram access toward West Gate, and routes shuttle, car park and walking traffic toward East Gate. KSS will preserve routes around allocated bars and report any local route obstruction, congestion, welfare need or access conflict to supervisors and Event Control.',
  family_presence:
    'The event has no general family profile and is 17+ only. Under-18 attendees may still be present as 17-year-olds and must be treated as children for safeguarding purposes. KSS staff will not allow refusal, ejection or removal to place a child, vulnerable person, intoxicated person or isolated attendee at additional risk.',
  alcohol_profile:
    'Alcohol is identified as the highest-volume intoxicant and a defining safety variable, with late afternoon and evening peaks in medical, welfare and security demand. Challenge 25 applies at all bars. Refusal support, proxy-purchase concerns, intoxication, disorder, welfare disclosure and drink-spiking concerns will be escalated early to supervisors, bar management and Event Control as required.',
  camping_profile:
    'Parklife 2026 is non-camping. No KSS camping-security scope is identified for this Parklife bar-only plan. Any overnight, perimeter, gate or wider patrol duty must be added only if formally allocated by the client or Event Control.',
  historic_issues:
    'Parklife 2026 is the 16th year of Parklife and the 13th year at Heaton Park. Supplied planning documents identify the audience as predominantly peaceful and compliant, but with high intoxication likelihood, medium-high illicit drug risk, opportunist criminality risk, welfare demand and late-day medical/security peaks. KSS bar planning should expect refusal clusters, welfare demand, route obstruction and close-down issues around headline and final-service periods.',
  mood_and_trigger_points:
    'Likely triggers include prolonged bar queues, refusal of service, intoxication, suspected proxy purchase, inconsistent ID decisions, adverse weather or ground deterioration, lost friends, medical or welfare concern, harassment or spiking disclosure, opportunist theft reports, route obstruction near bars and unclear public messaging.',
  peak_periods: lines(
    'Saturday 20 June - public opening from 12:00, afternoon bar build-up, evening peak bar demand and 23:00 close.',
    'Sunday 21 June - public opening from 13:00, afternoon bar build-up, evening peak bar demand and 23:00 close.',
    'Both days - refusal clusters, welfare disclosures and route congestion are more likely during evening bar demand, headline periods and final service.',
    'The deployment schedule covers management from 10:00 Saturday / 11:00 Sunday, and control/logistics/response, most bar posts, activations and merch from 11:30 Saturday / 12:30 Sunday through 23:00.'
  ),

  site_layout_summary:
    'Parklife Festival 2026 takes place at Heaton Park, Manchester. PL26 Site Plan V10.6 shows West Gate on the Bury Old Road side, East Gate and Bridge Gate on the Sheepfoot Lane side, the Boneyard/Site & Ops area to the south-west, central VIP and Matinee, Magic Sky to the west, Panorama to the south, The Valley to the north-west, and medical/welfare between West Gate and the arena bar area. KSS site awareness will focus on allocated bars, bar fronts, queue lanes, bar compounds, stock/service interfaces, nearby accessible routes, welfare/medical handover routes, Event Control reporting routes and emergency access routes. The supplied deployment identifies MGMT, CONTROL, LOGISTICS, RESPONSE, Valley A, Valley B, G2, Hangar Right, Hangar Left, Magic, Budweiser Activation, Smirnoff Activation, Beatbox Activation and Merch Stalls as KSS/external security deployment points.',
  key_zones: lines(
    'KSS operational area in CMP: Bars/VIP Activations',
    'Scheduled KSS/external security deployment points include MGMT, CONTROL, LOGISTICS, RESPONSE, Valley A, Valley B, G2, Hangar Right, Hangar Left, Magic, Budweiser Activation, Smirnoff Activation, Beatbox Activation and Merch Stalls.',
    'Central VIP area between Magic Sky and Matinee, including VIP gate, VIP toilets, sponsor areas, VIP viewing of The Valley and VIP bars',
    'Bar queue lanes, queue tails, compounds and back-of-house areas where allocated',
    'Stock/service routes and production interfaces serving allocated bars',
    'Refusal/ejection support points near allocated bars and route to event ejection procedure',
    'Medical and welfare area between West Gate and Bar 7 / FCP2; safeguarding handover through Event Control',
    'East Gate, West Gate and Bridge Gate public route interfaces where bar queues or close-down movement could affect public circulation',
    'Event Control at ///tiny.keeps.funds / WG10 The Avenue and KSS supervisor reporting route'
  ),
  controlled_areas:
    'Controlled areas for KSS include allocated bar footprints, queue lanes, bar backs, stock routes, service gates, refusal points, welfare handover points and any barriered or restricted area assigned by Warehouse Project, the client or Event Control. KSS does not control full-site areas outside its allocated bar-security scope unless redeployed by Event Control.',
  emergency_exits_holding_areas:
    'Emergency exits, holding areas and rendezvous points are controlled by the wider Parklife emergency plan. The CMP identifies the Production Boneyard through Gate 9 off Bury Old Road as an emergency-vehicle rendezvous/holding location, with Event Control at FCP1 and the medical area at FCP2. KSS will keep bar queues, barriers, refusal points and stock movement clear of emergency routes and report any local route compromise immediately to supervisors and Event Control.',
  dim_aliced_design:
    'Design considerations for KSS bar areas include bar frontage, queue footprint, barriers, entry/exit lanes, refusal point location, stock/service separation, accessible route protection, lighting, signage, welfare route access and emergency route clearance.',
  dim_aliced_information:
    'Information requirements include bar opening and close-down times, Challenge 25, refusal process, radio channels, call signs, grid references, welfare and medical routes, Event Control escalation, prohibited items, spiking response, gate/route status and any changes to queue or route layouts.',
  dim_aliced_management:
    'Management arrangements should define KSS lead, bar supervisors, Warehouse Project contact, Event Control route, escalation thresholds, refusal logging, incident logging, staff welfare checks and decision logging for normal and degraded operations.',
  dim_aliced_activity:
    'Arrival considerations affecting KSS are limited to bar readiness before public demand builds, first-service checks, queue-lane readiness, supervisor positioning, accessible route protection, first-contact welfare recognition and live communication with bar management.',
  dim_aliced_location:
    'Last-mile factors for KSS are limited to how public routes, transport-led arrival, East/West/Bridge Gate flows, welfare routes, accessible movement and VIP area movement may interact with allocated bar areas and queue tails.',
  dim_aliced_ingress:
    'Ingress to KSS areas includes customers joining bar queues, staff entering bar backs, stock movement into compounds and supervisor access to refusal or welfare points. KSS will protect the queue footprint and prevent queue tails from obstructing public, accessible or emergency routes.',
  dim_aliced_circulation:
    'Circulation risks include customer crossflow around bar fronts, queue tails, toilet routes, food traders, welfare routes, emergency routes and bar stock or service interfaces. Supervisors will preserve route width and report congestion early.',
  dim_aliced_egress:
    'Egress considerations include final service, queue closure, bar-front clear-down, refusal/ejection handover, stock or cash route protection, public movement away from bars, and stand-down only when the allocated area is clear and authorised.',
  dim_aliced_dynamics:
    'Dispersal considerations include alcohol, fatigue, group separation, weather, darkness, final service, lost friends, welfare need, accessible movement and movement away from bar areas after close. KSS will escalate welfare and safeguarding concerns during dispersal, not after the event.',

  ramp_routes:
    'Primary KSS route considerations are bar queue lanes, customer approach routes, accessible routes near bars, welfare and medical handover routes to the FCP2 medical/welfare area, stock routes, service crossings, refusal/ejection routes, East/West/Bridge Gate route interfaces and emergency routes. No queue, barrier or security cordon may block an accessible or emergency route.',
  ramp_arrival:
    'KSS static and dynamic gathering spaces include bar footprints, bar fronts, queue tails, refusal points, bar compound entrances, stock/service interfaces, welfare handover points and nearby accessible-route interfaces. Each area requires a clear footprint, visible boundary, holding capacity, accessible route protection and supervisor review during peak times.',
  ramp_movement:
    'Movement demand will build around bar fronts, queue tails, toilets, food traders, welfare routes, VIP entrance, service gates, final service and post-close dispersal. KSS will prevent queue spillback into main routes and support customers who need welfare, medical or accessibility assistance.',
  ramp_profile:
    'The profile includes young adults with a core 17-25 audience, 17-year-old attendees accompanied by responsible adults, intoxicated persons, customers refused service, groups separated from friends, disabled customers, people with hidden disabilities, LGBTQ+ customers, people experiencing harassment or spiking concerns, opportunist theft victims, and staff working long shifts.',

  gross_area:
    'Full-site capacities and areas are controlled by the wider Parklife event plans. KSS operational area assessment will be based on the confirmed Bars/VIP Activations deployment, bar footprints, queue lanes, compounds and route interfaces.',
  net_area:
    'Net KSS usable operating space excludes bar counters, back-of-house stock space, emergency routes, accessible routes, service lanes, structures, plant, vehicle routes and any area controlled by another contractor unless Event Control assigns support.',
  excluded_areas:
    'Excluded areas include public gates, full-site search lanes, stages, front-of-stage pits, traffic routes, CCTV, medical treatment areas, welfare facilities, full-site patrol zones, VIP/backstage routes and any area not allocated to KSS in the deployment schedule.',
  density_assumptions:
    'Bar and queue density assumptions will be based on the confirmed bar footprints and barrier layouts. KSS will intervene before local queues cause route encroachment, accessibility obstruction, emergency route compromise, customer distress or conflict.',
  zone_capacities: lines(
    'Allocated bar queue capacities - TBC from final bar plan and KSS deployment schedule.',
    'Bar compound capacities - TBC from Warehouse Project.',
    'Public gate context: East Gate and West Gate can each operate up to 28 lanes; Bridge Gate up to 4 lanes.',
    'Egress context: initial West/East gate width is 26.8m, with contingency gates 8, 7c and 6 available by Event Control decision.',
    'KSS/external security staffing is detailed in MASTER Parklife Manchester - EXT Security - 2026 V2: 51 scheduled source post rows on Saturday and 51 on Sunday.'
  ),
  ingress_flow_assumptions:
    'KSS does not own public ingress. East Gate serves shuttle bus users, car park users and walking routes; West Gate serves Heaton Park tram arrivals and walking footfall; Bridge Gate serves access customers, guest list and media. Bar queue flow assumptions will be confirmed once bar layouts, queue lanes and service rates are issued.',
  egress_flow_assumptions:
    'Bar close-down and egress assumptions will be confirmed by Warehouse Project, Event Control and the final bar schedule. Public egress is primarily through East and West routes, with transport movement toward Bowker Vale Metrolink, Heaton Park tram routes and shuttle bus operations. KSS will clear queue lanes, support refusals and protect routes until stand-down.',
  emergency_clearance_assumptions:
    'Emergency clearance around bars relies on immediate queue release, barrier adjustment where safe, clear radio reporting, public direction from Event Control and preservation of emergency routes.',
  degraded_route_weather_assumptions:
    'Wet ground, darkness, high demand, route obstruction or welfare incidents may reduce local throughput. KSS supervisors will request route support, barrier change, lighting, temporary holds or redeployment through Event Control.',

  command_structure:
    'KSS bar teams report through KSS supervisors to Jack Longthorne as KSS Head of Security, with David Capener as KSS Operational Lead and Laura Parker providing KSS Operational Support. Parklife Event Control is the event command route. The supplied plans identify Jon Drape as Festival Director / DPS, Will McHugh as Event Director, Meg Ah-Tow as Operations Manager, Tom Bailey as Head of Security and Crowd Management, Wes Pierce as Event Safety Advisor, and Charlie Mussett as Event Control Manager. KSS does not establish a separate event command structure and will follow organiser command decisions.',
  named_command_roles: lines(
    'KSS Head of Security - Jack Longthorne',
    'KSS Operational Lead - David Capener',
    'KSS Operational Support - Laura Parker',
    'KSS Bar Supervisors - TBC by deployment schedule',
    'Festival Director / Venue DPS - Jon Drape, Parklife Manchester Ltd / Engine No.4',
    'Event Director - Will McHugh, Engine No.4',
    'Operations Manager - Meg Ah-Tow, Engine No.4',
    'Event Control Manager - Charlie Mussett',
    'Head of Security and Crowd Management - Tom Bailey, Showsec International Ltd',
    'Assistant Head of Security and Crowd Management - Craig Bennett, Showsec International Ltd',
    'Event Safety Advisor - Wes Pierce, Number 8 Safety Ltd',
    'Site Manager - Jim Gee, Engine No.4',
    'Bar Operator Lead - Dan Pirie, Warehouse Project',
    'Medical / Welfare / Safeguarding contacts - through Event Control'
  ),
  radio_channels_callsigns:
    'Radio channel numbers will be confirmed on the day. KSS call signs will come from Showsec Event Control. The CMP channel titles include Gates/External/Crowd Management Teams, Internal and External Response/Ejection Centre, Arena/Bars/VIP, Management and Egress, Security Conversation 1 and Security Conversation 2. Until confirmed, staff should report by bar name, supervisor name, exact location and incident type.',
  reporting_lines:
    'KSS staff report to their bar supervisor. Bar supervisors escalate to Jack Longthorne as KSS Head of Security, David Capener as KSS Operational Lead and Laura Parker for operational support, with Parklife Event Control used for event command decisions and incident escalation. Bar-area breaches, life safety, safeguarding, disorder, CT concerns, licence breaches, refusal conflict, asset loss, bar queue congestion, route obstruction, welfare concern or any issue affecting KSS operations require immediate escalation.',
  external_interfaces: lines(
    'Parklife Event Control - command, emergency and operational decisions.',
    'Parklife Manchester Ltd / Engine No.4 - event operations, licensing interface and organiser decisions.',
    'Showsec Head of Security and Crowd Management / Event Control - event security coordination outside the KSS bar command chain.',
    'Warehouse Project - bar operations, Challenge 25, refusal records, proxy-purchase concerns, incident reporting, bar breach process and bar close-down procedures.',
    'Medical Solutions Ltd and WELSafe - treatment, welfare and vulnerability handover.',
    'Safeguarding lead - safeguarding concerns through Event Control.',
    'Police, local authority and licensing partners - through Event Control where required.'
  ),
  key_contacts_directory: lines(
    'KSS Head of Security - Jack Longthorne',
    'KSS Operational Lead - David Capener',
    'KSS Operational Support - Laura Parker',
    'KSS Bar Supervisors - TBC',
    'Festival Director / Venue DPS - Jon Drape',
    'Event Director - Will McHugh',
    'Operations Manager - Meg Ah-Tow',
    'Event Control Manager - Charlie Mussett',
    'Head of Security and Crowd Management - Tom Bailey',
    'Assistant Head of Security and Crowd Management - Craig Bennett',
    'Event Safety Advisor - Wes Pierce',
    'Bar Operator Lead - Dan Pirie, Warehouse Project',
    'Medical / Welfare / Safeguarding contacts - through Event Control'
  ),
  control_room_structure:
    'Parklife Event Control is the primary event decision-making point and is identified at ///tiny.keeps.funds / WG10 The Avenue. It may include event management, radio control, production, police, fire, medical, health and safety, other security companies and traffic management. KSS bar supervisors will provide factual SitReps, incident details, refusal issues, welfare concerns, route compromise and resource requests through the agreed radio or control route.',
  briefing_and_induction:
    'All KSS staff will receive a Parklife-specific briefing covering bar locations, Warehouse Project contacts, Challenge 25, refusals, radio protocol, welfare and safeguarding indicators, personal-safety disclosures, spiking awareness, FCP2 medical/welfare route, Event Control location, route protection, emergency procedures, traffic-light alert states, lockdown/Run Hide Tell, bar breach actions, Show Stop messaging, incident logging and staff welfare.',
  monitoring_and_density_tools:
    'Live monitoring combines KSS supervisor observation, queue-tail checks, Warehouse Project feedback, welfare/medical feedback, Event Control updates and structured patrol reporting by response staff where allocated.',

  service_delivery_scope:
    'KSS service delivery covers the Parklife Bars/VIP Activations allocation only, including allocated bar fronts, queues, refusal support, compounds or stock interfaces where allocated, welfare recognition, incident reporting, route protection and Event Control escalation.',
  build_break_operations:
    'The supplied CMP lists build and break general security under other providers. KSS build and break duties are not identified in this draft. If KSS is allocated build or break support, duties should be added by bar, compound, stock route and shift from the final deployment schedule.',
  specialist_teams_and_assets:
    'Specialist support includes scheduled response teams, management, control room logging, onsite logistics, bar-security posts, activations and merch security. The deployment includes STRAZA, CJL and GUARDEX support alongside KSS Security rows.',
  staffing_by_zone_and_time: lines(...EMP_PARKLIFE_DEPLOYMENT_ROWS),
  response_teams:
    'KSS response teams are scheduled on both show days from 11:30 to 23:00 on Saturday and 12:30 to 23:00 on Sunday. The deployment includes STRAZA response SUP x1 and SIA x2, plus CJL response SUP x1 and SIA x1. Response teams support refusals, disorder, welfare concerns, bar breaches, queue congestion, route obstruction, supervisor requests and Event Control tasking.',
  relief_and_contingency:
    'Relief and contingency arrangements will use scheduled response teams and the percentage-over-specification contingency allowance. Supervisors must ensure fixed bar posts are not left uncovered and staff welfare breaks are logged against the live deployment.',
  escalation_staffing:
    'Escalation staffing may be required for bar queue congestion, refusal clusters, welfare issues, disorder, route compromise, adverse weather, asset concerns, bar-area breach, emergency support or Event Control-declared alert-state change. Additional deployment must be authorised through KSS command and Event Control.',
  dynamic_escalation_triggers: lines(
    'Queue tails obstruct a public route, accessible route, emergency route, service crossing or bar feeder lane.',
    'Refusal conflict, intoxication, disorder, safeguarding, welfare or medical demand exceeds local supervisor response.',
    'Bar staff request support for proxy purchase, suspected underage sale, intoxication or aggressive behaviour.',
    'A bar or concession area is breached, stock/cash/security is threatened, or customers attempt to access drinks without purchase.',
    'Medical or welfare call patterns indicate a spike near an allocated bar or route interface.',
    'Adverse weather, lighting issue, ground deterioration or route loss reduces safe movement capacity.',
    'Event Control reports intelligence, suspicious behaviour, hostile reconnaissance, police instruction or a change in threat posture.'
  ),
  bar_operations_roles:
    'KSS bar roles include supporting bar queue order, protecting queue footprints, assisting Warehouse Project with refusals, Challenge 25 escalation, proxy-purchase concerns, intoxication and disorder prevention, monitoring welfare indicators, preserving emergency and accessible routes, protecting stock or compound interfaces where allocated, and reporting incidents to Event Control. If a bar is breached, KSS escalates by radio, helps prevent wider access where safe, moves staff to a place of safety if required, provides SitReps, prevents further queuing near the area, preserves evidence and awaits Event Control/ELT direction before any reopen. Refusals and relevant bar incidents are logged via JotForm and Event Control.',
  search_screening_roles:
    'No planned KSS search or screening ownership is identified for Parklife in this bar-only draft. Public search, DDD, amnesty bins and gate entry processes are controlled by the wider security operation. KSS may support bar-level prohibited item concerns only where directed by the bar operator, supervisor or Event Control.',
  front_of_stage_roles:
    'No planned KSS front-of-stage or stage-security role is identified for this Parklife bar-only draft.',
  traffic_pedestrian_roles:
    'No planned KSS traffic or full pedestrian route role is identified. KSS will only protect local routes around allocated bars and report wider route issues to Event Control.',
  camping_security_roles:
    'No planned KSS camping-security role is identified for this Parklife bar-only draft.',
  vip_backstage_roles:
    'No planned KSS VIP/backstage ownership is identified beyond the Bars/VIP Activations allocation. KSS may support VIP bars, VIP gate bar interfaces or backstage bar/compound interfaces only where specifically allocated in the final deployment schedule.',
  stewarding_roles:
    'No planned general stewarding role is identified. Any queue support or steward interface around allocated bars will be confirmed in the final deployment schedule.',

  ingress_routes_holding_areas:
    'KSS bar ingress is limited to customer approach to bar queues, entry into queue lanes, staff access to bar backs and stock movement into compounds. Public entry routes are controlled by the wider event plan through East Gate, West Gate and Bridge Gate.',
  search_policy:
    'Full-site search policy is controlled by the organiser. KSS bar staff may escalate prohibited item, intoxication, drugs, weapons, suspicious behaviour or refusal concerns to supervisors, bar management and Event Control.',
  queue_design:
    'KSS bar queue design is set out in this EMP. Queue lanes should preserve emergency routes, accessible routes, service routes and public circulation. Queue tails must be monitored and adjusted before they obstruct routes, create conflict, compromise medical/welfare access or affect East/West/Bridge Gate route interfaces. Final deployment-specific bar allocations and any local queue adjustments will be controlled by the deployment schedule.',
  overspill_controls:
    'Overspill controls include queue-tail monitoring, barrier adjustment, supervisor escalation, bar operator liaison, temporary service hold where required, additional staff request and Event Control notification if the planned footprint is exceeded.',
  accessible_entry_arrangements:
    'Accessible route arrangements around bars are drawn from the wider accessibility plan and final bar layouts. KSS will keep accessible routes clear, support disabled customers respectfully, escalate hidden disability needs and avoid moving barriers in a way that removes accessible access.',
  ingress_operations:
    'Pre-opening checks include bar location confirmation, barrier check, queue-lane check, radio check, supervisor contact, welfare route awareness, refusal process confirmation and Event Control reporting route confirmation.',

  circulation_controls:
    'KSS protects circulation around allocated bars through fixed observation, supervisor checks, queue-tail monitoring, route preservation and early escalation if queues, refusals or welfare incidents affect public movement.',
  high_density_controls:
    'High-demand bar areas will be monitored by supervisors and queue staff where allocated. Triggers include prolonged queue dwell, queue-tail growth, blocked routes, visible customer distress, repeated refusals, intoxication clusters, welfare presentations or bar operator request for support.',
  internal_queue_controls:
    'Bar queues should be aligned away from main public, emergency, accessible and service routes where practicable. Queue marshals or SIA staff will request reinforcement if queue tails threaten route access or conflict develops.',

  transport_interface:
    'Transport interfaces are controlled by the wider Parklife travel plan. KSS will report any local bar-area issue linked to public departure, shuttle buses, Heaton Park/Bowker Vale Metrolink movement, taxi/private hire movement, public transport demand or route congestion through Event Control.',
  dispersal_routes:
    'Dispersal routes are controlled by the wider Parklife egress plan. East and West routes are the primary public egress routes, with contingency gates used only by Event Control decision. KSS will keep bar close-down routes clear, support final customer movement away from bars and report any obstruction or welfare concern.',
  reentry_policy:
    'Re-entry policy is controlled by Parklife ticketing and event rules. KSS will not create informal exceptions and will escalate welfare or accessibility cases through supervisors and Event Control.',
  egress_operations:
    'Egress operations for KSS include bar wind-down, queue clear-down, final refusal/ejection support, route protection, bar compound handover, incident logging and stand-down only after supervisor and Event Control or KSS lead confirmation.',

  safeguarding_process:
    'KSS staff are responsible for vigilance, early identification, privacy, immediate risk control and escalation only. Safeguarding concerns go through supervisor and Event Control to the event safeguarding lead, welfare, medical, police or local authority as required. KSS staff will not conduct safeguarding investigations.',
  safe_spaces:
    'Medical and welfare provision is centred between West Gate and the arena bar area, with the main medical area at FCP2 / ///lifts.either.rails and the medical/welfare W3W reference ///eggs.cure.posed. KSS staff should request welfare or medical support through Event Control and move the person away from public conflict only where safe.',
  lost_vulnerable_person_process:
    'Lost, vulnerable, intoxicated, distressed or isolated persons are escalated to supervisors and Event Control. Found persons should be escorted to welfare using same-sex escorting and a minimum of two staff where possible. KSS should keep the person safe, preserve privacy, avoid unmanaged ejection and record factual details for handover.',
  ask_for_angela_process:
    'Any Ask Angela or equivalent personal-safety request, spiking concern, harassment disclosure, sexual-assault report or other personal-safety concern is treated as a welfare and safeguarding escalation. Staff preserve privacy, call a supervisor, involve welfare or medical where needed, report to Event Control and avoid probing beyond the person\'s natural disclosure.',
  confidentiality_logging:
    'Safeguarding, welfare and refusal logs must be factual, time-stamped and shared only with those who need the information for immediate safety, welfare, legal or operational reasons.',

  licensable_activities:
    'Licensable activities include alcohol sales at Parklife bars and regulated entertainment under the event licence. KSS supports licensing objectives only within allocated bar-security duties.',
  dps_name: 'Jon Drape / Jonathan Drape - Parklife Manchester Ltd',
  challenge_policy: 'Challenge 25',
  licensing_conditions:
    'Premises Licence 135804 is issued by Manchester City Council and displayed at the Box Office. Relevant licensable activities include alcohol sales and regulated entertainment. KSS will support Warehouse Project with Challenge 25, refusal management, proxy-purchase concerns, intoxication escalation, disorder prevention, public safety, protection of children from harm and incident reporting. Alcohol-management detail will sit as an annex to the Crowd Management Plan.',
  venue_rules:
    'Venue rules and conditions of entry are controlled by Parklife. KSS will support bar-area compliance only where it relates to refused service, intoxication, disorder, prohibited items, welfare or route protection.',
  prohibited_items:
    'Prohibited items are controlled by Parklife conditions of entry and published event rules. Gate operations include searches, drug detection dogs and amnesty bins. KSS bar staff will escalate suspected weapons, drugs, spiking items, glass, pyrotechnics or suspicious items through supervisors and Event Control.',

  incident_management:
    'Incidents at Parklife bars are managed through a graded response prioritising life safety, KSS area stability, vulnerability, communication and escalation. Staff assess the immediate threat, contain where safe, notify the supervisor and Event Control, preserve evidence where safe, and hand over to police, medical, welfare, safeguarding or bar management as required. Ejection is a last resort and follows the event ejection/welfare-check process.',
  risk_assessment_methodology:
    'This operational risk assessment is limited to the KSS Parklife bar-security delivery scope. It is not an assessment of the organiser, operator or other contractor regulatory conformity, and it does not replace their own risk assessments or legal/regulatory duties. It is derived from the KSS Bars/VIP Activations scope, Parklife ESMP v2.1, Parklife CMP v1, PL26 Site Plan V10.6, selected bar operations annex, site profile and dynamic risk assessment.',
  risk_assessment_scope:
    'The KSS risk assessment covers allocated bar-security support, bar queues/refusals, bar compounds or stock interfaces where allocated, welfare recognition, safeguarding escalation, suspicious behaviour, route protection, emergency interface, close-down support and incident reporting.',
  risk_assessment_source_notes:
    'Source documents reviewed for this draft are Parklife Festival 2026 ESMP v2.1, Parklife 2026 CMP v1, PL26 Site Plan V10.6 WIDE, PL26 Site Plan V10.6 Arena and MASTER Parklife Manchester - EXT Security - 2026 V2. No additional final hazards have been identified to KSS at this stage. Bar locations, Warehouse Project procedures and alcohol-management CMP annex detail will be reconciled before issue when supplied.',
  additional_operational_risks: lines(
    'Bar queue congestion - customers, KSS and bar staff - queue-tail monitoring, barrier adjustment, route protection, additional staff request and Event Control escalation.',
    'Refusal conflict or proxy purchase - customers, KSS and bar staff - Challenge policy support, calm escalation, supervisor attendance, refusal record and police/Event Control escalation if required.',
    'Welfare, spiking or safeguarding disclosure - customers and staff - privacy, supervisor escalation, welfare/medical handover, no unmanaged ejection and factual logging.',
    'Bar or concession breach - customers, KSS and bar staff - radio escalation, staff safety, wider-access prevention where safe, SitReps, queue closure, evidence preservation and Event Control/ELT decision before reopen.',
    'Late-day intoxication and drug-related vulnerability - customers and staff - early welfare/medical referral, refusal support, no unmanaged ejection, Event Control logging and safeguarding escalation where required.'
  ),

  emergency_procedures:
    'Emergency procedures are directed by the wider Parklife ESMP/CMP, ELT and Event Control. Parklife uses traffic-light alert states: Green normal operation, Amber problem/standby, and Red very serious incident/evacuation. KSS duties are to protect life, stop bar activity where instructed, clear and hold local routes, support disabled and vulnerable persons, preserve emergency access, report conditions and await Event Control or emergency-service direction.',
  partial_evacuation_procedure:
    'For partial evacuation of a bar or bar compound, KSS stops entry, clears the immediate queue where safe, protects exit routes, supports vulnerable persons, reports exact location and follows Event Control direction.',
  full_evacuation_procedure:
    'For full evacuation, KSS follows Event Control instructions, clears bar fronts and queue lanes, supports route protection and directs customers to the appropriate routes. KSS does not self-deploy away from allocated bar areas unless instructed or required for immediate life safety.',
  lockdown_invacuation_procedure:
    'For lockdown or invacuation, KSS follows the Event Control lockdown announcement, observes radio silence unless priority, moves customers away from exposed areas where safe, stops bar service if instructed, secures immediate routes, follows Run Hide Tell principles and awaits Event Control or emergency-service instruction. Bar/concession staff should remain in situ unless told otherwise or immediate safety requires movement.',
  shelter_procedure:
    'Shelter arrangements are controlled by the wider event plan. KSS identifies local safe waiting options only under Event Control direction and reports weather, welfare or route concerns from allocated bars.',
  show_stop_triggers:
    'Show Stop or operational pause triggers include unsafe crowd density or congestion, major medical or safeguarding incident, fire or smoke, structural concern, severe weather, hostile threat, route loss, serious disorder, bar/concession breach, or any incident where continued service/activity increases risk.',
  rendezvous_points:
    'The CMP identifies the Production Boneyard through Gate 9 off Bury Old Road as the emergency-vehicle rendezvous/holding location. Staff RVPs are controlled by the wider lockdown and emergency plan; KSS will use designated RVPs only as instructed by Event Control.',
  command_escalation:
    'Emergency escalation goes from KSS staff to KSS supervisor, KSS operational lead and Parklife Event Control. If life safety is immediate and control contact fails, staff should contact emergency services and then update Event Control as soon as practicable.',
  emergency_search_zones:
    'Emergency search zones and sterile routes are controlled by the wider Parklife emergency and security plans. KSS will report suspicious items, hostile reconnaissance and route compromise around allocated bars and preserve local sterile areas when directed.',

  ct_procedures:
    'KSS staff are briefed on ACT, SCaN, hostile reconnaissance, suspicious items, Run Hide Tell, emergency communication and immediate escalation through Event Control.',
  suspicious_item_protocol:
    'Do not touch or move suspicious items. Use HOT assessment where trained, clear the immediate area if safe, prevent further approach, inform Event Control with exact location and description, and await police or command direction.',
  hostile_recon_indicators:
    'Indicators include repeated filming of bar staff, routes, compounds, gates or control points; unusual interest in security positions; unattended items; testing access points; suspicious vehicle or package behaviour; and attempts to obtain staff or radio information.',
  run_hide_tell_guidance:
    'Run if there is a safe route. Hide if escape is not safe. Tell police and Event Control when safe, giving exact location, description, direction of travel, casualties and immediate risk.',

  staff_welfare_arrangements:
    'KSS supervisors must monitor staff breaks, hydration, weather exposure, fatigue, abuse, assault, traumatic incident exposure and suitability to remain on post. Staff welfare issues are logged and escalated to the KSS operational lead.',
  accessibility_arrangements:
    'KSS staff will protect accessible routes around bars, communicate respectfully, recognise hidden disabilities, avoid blocking mobility routes with queues or barriers, and escalate accessibility issues to supervisors and Event Control.',
  accessibility_team_liaison:
    'Accessibility team liaison is through the wider Parklife accessibility arrangements and Event Control until a named contact is confirmed to KSS. Accessibility issues are reported through supervisors and Event Control with exact location and customer need.',

  communications_plan:
    'Operational communications use the Parklife radio plan, Event Control logging, KSS supervisor SitReps, precise location reporting and agreed incident categories. CMP channel titles include Arena/Bars/VIP, Gates/External/Crowd Management, Internal and External Response/Ejection Centre, Management and Egress, and Security Conversation channels. Channel numbers will be confirmed on the day and KSS call signs will come from Showsec Event Control.',
  sitrep_decision_logging:
    'Supervisors provide SitReps on bar queues, refusals, welfare, disorder, route obstruction, staffing, weather and any Warehouse Project concern. Material decisions and Event Control instructions are logged.',
  refusal_false_id_protocol:
    'Refusals, suspected fake ID, proxy-purchase concerns and intoxication refusals are handled calmly with Warehouse Project liaison, supervisor support and factual logging. Refusals are logged via JotForm and Event Control. Highly intoxicated persons must receive a welfare check before refusal/ejection is allowed to create risk.',
  ejection_protocol:
    'Ejection is a last resort and must be coordinated through supervisor and Event Control routes. KSS may support safe removal, evidence preservation and immediate risk control, but welfare and safeguarding checks must be completed before removal continues. If the person is under 18 or welfare concerns are identified, they are referred to the client/Event Control for further instruction.',
  confiscation_process:
    'Confiscation processes are controlled by Parklife conditions, police instruction and bar operator procedures. KSS must not retain items outside agreed process and must log any prohibited item or evidence handover.',
  ejection_safeguarding:
    'If a person is or may be under 18, a vulnerable adult, intoxicated, distressed, injured, mentally unwell, isolated, disabled, subject to harassment, suspected of having been spiked or otherwise temporarily vulnerable, ejection pauses immediately and Event Control, welfare, medical or safeguarding is contacted before removal continues.',

  debrief_reporting:
    'KSS supervisors complete daily debriefs covering staffing, bar refusals, queue congestion, welfare referrals, safeguarding concerns, personal-safety/spiking concerns, suspicious behaviour, route issues, incidents, close-down and recommendations.',
  close_down_operations:
    'Close-down includes queue closure, bar-front clear-down, refusal/ejection handover, stock or cash route protection where allocated, incident log check, staff welfare check and stand-down only after supervisor authorisation.',
  end_of_shift_reporting:
    'End-of-shift reporting includes attendance, incidents, refusals, welfare concerns, safeguarding referrals, route issues, equipment, radio issues, staff welfare and any unresolved action for the next shift.',
  asset_security_demobilisation:
    'KSS protects only allocated assets, compounds, equipment or stock interfaces. Asset handover, keys, radios, body-worn video, evidence and documents are returned or signed over according to KSS and client process.',
  health_safety_overview:
    'KSS staff follow dynamic risk assessment, safe manual-handling avoidance, route protection, weather precautions, PPE where required, incident reporting and supervisor escalation for unsafe conditions.',

  site_maps_and_route_diagrams:
    'Reviewed maps: PL26 Site Plan V10.6 WIDE and PL26 Site Plan V10.6 Arena, Rev 10.6, April 2026. These show the full Heaton Park footprint, public park gates, East Gate, West Gate, Bridge Gate, Boneyard, Site/Ops, Event Control, medical/welfare, VIP, stages and mapped bar labels. The deployment schedule identifies MGMT, CONTROL, LOGISTICS, RESPONSE, Valley A, Valley B, G2, Hangar Right, Hangar Left, Magic, Budweiser Activation, Smirnoff Activation, Beatbox Activation and Merch Stalls.',
  appendix_notes: lines(
    'Appendix A - MASTER Parklife Manchester - EXT Security - 2026 V2 deployment schedule',
    'Appendix B - PL26 Site Plan V10.6 WIDE and PL26 Site Plan V10.6 Arena',
    'Appendix C - Warehouse Project bar operator procedures, Challenge 25, refusal/JotForm, proxy-purchase, bar breach and close-down process - to be added when supplied',
    'Appendix D - Alcohol Management Plan annex from the Crowd Management Plan - to be reconciled when supplied',
    'Appendix E - Showsec Event Control radio channel numbers and KSS call sign plan - to be confirmed on the day',
    'Appendix F - Parklife ESMP v2.1 and Parklife CMP v1 source extracts relevant to KSS Bars/VIP Activations'
  ),
  version_history_summary:
    'V0.1 - Initial Parklife Festival 2026 KSS bar-security draft created with deployment details pending.\nV0.2 - Updated from Parklife ESMP v2.1, Parklife CMP v1 and PL26 Site Plan V10.6 source documents.\nV0.3 - Updated Warehouse Project bar operator detail, Dan Pirie as Bar Operator Lead, response-team wording, contingency wording, JotForm/Event Control refusal logging, Showsec Event Control call-sign source and appendix placeholders.\nV0.4 - Added MASTER Parklife Manchester - EXT Security - 2026 V2 deployment schedule into the detailed EMP deployment table format.\nV1 - Issued Parklife bar-security plan version set to V1 status.',
  contact_directory: lines(
    'KSS Head of Security - Jack Longthorne',
    'KSS Operational Lead - David Capener',
    'KSS Operational Support - Laura Parker',
    'KSS Bar Supervisors - TBC',
    'Festival Director / Venue DPS - Jon Drape',
    'Event Director - Will McHugh',
    'Operations Manager - Meg Ah-Tow',
    'Event Control Manager - Charlie Mussett',
    'Head of Security and Crowd Management - Tom Bailey',
    'Assistant Head of Security and Crowd Management - Craig Bennett',
    'Event Safety Advisor - Wes Pierce',
    'Bar Operator Lead - Dan Pirie, Warehouse Project',
    'Medical / Welfare / Safeguarding contacts - through Event Control'
  ),
}
