import { EMP_ANNEX_DEFINITIONS } from '@/lib/emp/master-template'

const lines = (...items: string[]) => items.join('\n')

export const EMP_DEMO_EVENT_NAME = 'Northgate Summer Live 2026'
export const EMP_DEMO_PLAN_TITLE = `Event Management Plan - ${EMP_DEMO_EVENT_NAME}`
export const EMP_DEMO_SELECTED_ANNEXES = EMP_ANNEX_DEFINITIONS.map((annex) => annex.key)

export const EMP_DEMO_PLAN_VALUES: Record<string, string> = {
  plan_title: EMP_DEMO_PLAN_TITLE,
  document_version: 'V1.3',
  document_status: 'Final',
  author_name: 'David Capener - KSS NW LTD',
  approver_name: 'Operations Director - KSS NW LTD',
  issue_date: '2026-07-10',
  review_date: '2026-07-17',
  distribution_list: lines(
    'Event Control',
    'Client and organiser leadership',
    'KSS operational command team',
    'Medical and welfare providers',
    'Traffic management provider',
    'Local authority and emergency planning contacts'
  ),

  purpose_scope_summary:
    'This Event Management Plan defines the crowd safety, security, safeguarding, communications, emergency response, and post-event reporting arrangements for Northgate Summer Live 2026. The document applies to all public and controlled areas of the event site, including the arena, ingress and egress routes, staff campsite, bars, VIP compound, transport interfaces, and emergency rendezvous points. It is intended to be read alongside the Event Management Plan, operational risk assessment, licensing documentation, current site plans, and daily control briefings.',
  related_documents: lines(
    'Event Management Plan',
    'Operational Risk Assessment',
    'Medical Plan',
    'Traffic Management Plan',
    'Site maps and egress drawings',
    'Licensing schedule',
    'Stewarding and security deployment matrix',
    'Weather trigger matrix'
  ),

  event_name: EMP_DEMO_EVENT_NAME,
  event_type: 'Three-day outdoor live music festival with camping, licensed bars, concessions, VIP areas, and late evening headline performances.',
  venue_name: 'Northgate Park, Manchester',
  venue_address: 'Northgate Park, Victoria Avenue, Manchester, M1 4AB',
  venue_reference: 'M1 4AB / ///crowds.safe.route / SAG Ref NSL-2026-07',
  organiser_name: 'Northgate Events Ltd',
  client_name: 'Northgate Events Ltd',
  principal_contractor: 'Northgate Event Delivery Ltd',
  key_delivery_partners: lines(
    'KSS NW LTD - Security and event management',
    'Beacon Medical Services - Medical provider',
    'Open Arms Welfare CIC - Welfare and safeguarding support',
    'City Route Management - Traffic management provider',
    'StageLine Productions - Production and site operations',
    'Peppermint Event Bars - Bar operations'
  ),
  build_dates: '17 July 2026 to 18 July 2026',
  show_dates: '19 July 2026 to 21 July 2026',
  break_dates: '22 July 2026',
  public_ingress_time: '11:00 daily',
  operational_hours: lines(
    'Build and contractor activity: 07:00 to 22:00 during build and breakdown.',
    'Arena public opening: 11:00 to 23:00 on Friday and Saturday; 11:00 to 22:30 on Sunday.',
    'Bars and concessions: 11:00 to 22:30, subject to licence conditions.',
    'Campsite: controlled 24-hour operation from 08:00 on 18 July until 12:00 on 22 July.',
    'Final controlled egress and dispersal operations: until 00:30 daily.'
  ),

  client_objectives: lines(
    'Deliver a safe, welcoming, and well-managed public event that maintains confidence with the client, licence holder, and responsible authorities.',
    'Maintain safe ingress, circulation, egress, and staff campsite operations across all event phases.',
    'Prevent crowd pressure, crime, disorder, and avoidable disruption through proportionate deployment and early intervention.',
    'Protect children, vulnerable adults, staff, contractors, and performers through clear safeguarding and welfare pathways.',
    'Maintain effective command, control, communication, and incident logging throughout the live event period.'
  ),

  licensed_capacity: '18,000 public attendees in the arena, 4,500 persons in the staff campsite, and 22,500 maximum total site occupancy including staff and contractors.',
  expected_attendance: '16,500 public attendees per day, 3,800 campers, and up to 1,050 staff and contractors at peak.',
  staff_and_contractor_count: 'Peak on-site staffing of 1,050 across security, stewarding, production, medical, welfare, catering, traffic, bars, and contractors.',
  audience_age_profile: 'Predominantly 18-34, with daytime family attendance and under-18 admission only when accompanied by an adult.',
  attendance_profile:
    'The audience profile is primarily mainstream live-music festival attendees with a strong evening demand pattern around headline performances and licensed bar activity. Daytime attendance includes families and mixed-age groups, while the staff campsite introduces overnight welfare and vulnerability considerations. The venue is expected to attract a high proportion of attendees travelling by rail and shuttle bus, with moderate levels of alcohol consumption increasing into the evening.',
  travel_modes:
    'Expected arrival split is approximately 42% rail, 24% shuttle bus, 14% private hire or taxi, 12% private car and park-and-walk, 6% on foot from nearby accommodation, and 2% accessible transport or drop-off. The key transport interfaces are Manchester Victoria shuttle stop, Northgate temporary taxi rank, and the east car park pedestrian route.',
  family_presence:
    'Family attendance is expected between 11:00 and 18:00, mainly in the main arena, food court, and welfare zone. Lost child risk is moderate during ingress and peak movement periods. Vulnerability considerations include intoxication, heat exposure, fatigue in the staff campsite, and disclosures linked to harassment or welfare concerns.',
  alcohol_profile:
    'Alcohol sales are expected to create the highest behavioural pressure between 17:00 and 22:30. Intoxication risk is highest in bar queue areas, bar close and activation peak periods, and staff campsite returns after headline performances. Refusals and intervention logs are expected to increase after 20:00 and must be monitored by control and supervisors.',
  camping_profile:
    'The staff campsite opens one day prior to the live event and remains occupied overnight. Key risks include late-night noise complaints, intoxication, small fire incidents, lost property, welfare demand, and unauthorised access between camping and controlled restricted compound areas.',
  historic_issues:
    'Comparable events at the venue have identified slow-moving ingress during bag-search peaks, bar queue overspill adjacent to the main east route, pressure at the taxi rank after headline acts, and increased welfare demand due to dehydration and intoxication during hot weather. Previous briefings also noted unauthorised staff campsite crossover toward the VIP compound when perimeter observation was reduced.',
  mood_and_trigger_points:
    'Likely trigger points include delayed gate opening, headline delays or cancellations, prolonged bar queues, visible inconsistency in search procedures, sudden adverse weather, transport delays at the end of the show, or poorly communicated route changes. Crowd mood is expected to remain compliant where messaging is clear and staff intervention is early and consistent.',
  peak_periods: lines(
    '10:15 to 12:30 - first ingress wave and search lane pressure.',
    '16:30 to 18:30 - increased internal circulation to bars, food court, and welfare areas.',
    '20:15 to 22:45 - headline performance density and bar demand peak.',
    '22:30 to 00:30 - phased egress, taxi rank pressure, shuttle loading, and staff campsite return.'
  ),

  site_layout_summary:
    'The site is arranged as a fenced outdoor arena with a main bar operation, sponsor activation, food court, licensed bars, welfare and medical hub, accessible viewing platform, staff campsite to the north, Restricted compound compound to the west, and dedicated ingress and egress routes on the east and south boundaries. Controlled service access is separated from public routes by barrier lines and staffed crossing points.',
  key_zones: lines(
    'East ingress search and ticketing plaza',
    'Main arena and stage fan',
    'Second-stage field and food court',
    'West bar village and toilet banks',
    'Medical and welfare hub',
    'Accessible viewing and support zone',
    'North staff campsite and staff campsite hub',
    'Restricted compound compound',
    'South and east egress corridors',
    'Transport interface and taxi marshal zone'
  ),
  controlled_areas:
    'Controlled areas comprise the restricted compound, production lane, VIP entry, client accreditation zone, medical treatment facility, safeguarding interview room, cash handling point, plant and generator compound, and emergency vehicle lane. These areas are restricted to authorised badge holders or escort-controlled access.',
  emergency_exits_holding_areas:
    'Primary emergency exits are located at the south boulevard, east plaza, and north crossover to the outer park. Secondary exits exist at the west vehicle gate and staff campsite emergency release route. Holding areas are designated in the east overflow car park and north outer field. Rendezvous points are established at RV1 east service yard, RV2 north outer field, and RV3 south coach park.',
  dim_aliced_design:
    'The site design provides segregated ingress and egress, sufficient viewing depth in front of the main bar operation, step-free accessible routes, clearly defined sterile areas, and barrier-supported lane management at each public interface. Public information points and water distribution are positioned away from primary circulation routes to reduce dwell conflict.',
  dim_aliced_information:
    'Information is provided through pre-event customer messaging, social media updates, ingress signage, prohibited-items boards, queue marshals, stage-screen messaging, and direct radio-led briefings to staff. Emergency and welfare messaging routes are integrated through control and public address capability.',
  dim_aliced_management:
    'Management arrangements are based on a single control structure operating from Event Control, supported by zone supervisors, a dedicated loggist, mobile response, medical, welfare, and traffic interfaces. Deployment reviews take place pre-opening, mid-afternoon, pre-headline, and pre-egress, with escalation triggers logged by control.',
  dim_aliced_activity:
    'Headline sets, bar closures, staff campsite return, and end-of-night dispersal are the primary activity drivers for crowd density and movement. Ancillary activity including merch, food court demand, and sponsor engagement is concentrated in the central arena spine and requires active queue control.',
  dim_aliced_location:
    'The venue is city-adjacent with strong transport links but constrained by residential streets to the south and a public park boundary to the west. Exposure to wind and heavy rain may reduce route performance, particularly on grassed areas between the arena and staff campsite.',
  dim_aliced_ingress:
    'Ingress is through the east plaza with six standard search lanes, one dedicated accessible lane, and one contingency flex lane. The search plan includes bag checks, ticket validation, prohibited-items surrender, and rejection escalation. Queue capacity has been designed to retain the full expected first-wave load within the external holding area.',
  dim_aliced_circulation:
    'Internal circulation relies on a primary east-west boulevard, a northern staff campsite crossover, and a southern route to the shuttle and taxi interface. Crossflow risks exist around the west bar village and the second-stage food court and are managed through patrols, queue marshals, and barriered feeder lanes.',
  dim_aliced_egress:
    'Egress will operate through the south boulevard and east plaza under phased release conditions, supported by route stewards and transport marshals. Campsite return remains segregated from off-site dispersal where practicable. Any degraded route condition will trigger reduced flow assumptions and controlled holds.',
  dim_aliced_dynamics:
    'The principal dynamic risks are density build-up during headline performances, short-term surges at the barriered activation queue, queue spillback at the west bar village, staff campsite crossover conflict after show close, and concentrated demand at the taxi rank. Control measures focus on early observation, visible intervention, and route preservation.',

  ramp_routes:
    'Primary routes include the east ingress plaza, south boulevard egress route, north staff campsite crossover, west food and bar spine, and the step-free accessible route from the east entrance to the viewing platform and welfare hub. Secondary routes provide resilience through the outer park loop and service-road-supported pedestrian corridor.',
  ramp_arrival:
    'Arrival is expected to peak between 10:45 and 12:15, with rail and shuttle arrivals driving the first-wave demand. Early campers and day-ticket holders create a staggered arrival profile, but compressed demand is expected where weather, train delays, or artist announcements affect patron behaviour.',
  ramp_movement:
    'Movement pressure is forecast around the main bar operation, bar village, welfare hub, accessible platform, and staff campsite crossover. Counterflow is most likely between the main arena exit and the west service and bar zone after headline performances and therefore requires active steward intervention.',
  ramp_profile:
    'The route strategy is designed for a mixed audience including families, disabled patrons, intoxicated adults, late-night campers, and contractor traffic in controlled zones. Route decisions prioritise visibility, lighting, width resilience, and clear steward command points.',

  gross_area: 'Main arena gross audience area: 38,400 m2. Total public site footprint including staff campsite and plazas: 92,000 m2.',
  net_area: 'Net usable main arena viewing and circulation area: 26,900 m2 after deductions.',
  excluded_areas:
    'Deductions include stage and FOH compound, camera pit, sterile barrier lane, accessible platform footprint, welfare and medical compound, bar back-of-house, service crossings, plant areas, and unusable perimeter edges following the route-loss allowance.',
  density_assumptions:
    'Main stage fan has been assessed at a managed operational density up to 2 persons per m2 with intervention thresholds well below this in the barriered activation queue. General arena circulation areas are assessed at 1 person per m2 or lower. Queue and plaza calculations use conservative throughput assumptions to reflect search activity and variable luggage profile.',
  zone_capacities: lines(
    'Main stage fan - 8,400 persons',
    'Central arena circulation - 6,700 persons',
    'Second-stage field - 3,200 persons',
    'West bar village and food court - 2,100 persons',
    'Accessible viewing and support area - 180 persons including companions',
    'East ingress and holding plaza - 4,500 persons',
    'North staff campsite occupancy cap - 4,500 persons'
  ),
  ingress_flow_assumptions:
    'Six standard lanes at a managed search throughput of 420 persons per lane per hour plus one accessible lane and one contingency flex lane provide a planned ingress capacity above the expected peak arrival curve. The first-wave design assumes queue containment within the east plaza with overflow held in the external barriered approach if required.',
  egress_flow_assumptions:
    'Usable egress width is based on the combined south boulevard and east plaza release routes, subject to route stewarding and transport interface protection. Normal end-of-show dispersal assumes a phased release over 35 to 45 minutes with shuttle dispatch, taxi marshalling, and staff campsite return reducing uncontrolled dwell.',
  emergency_clearance_assumptions:
    'Emergency clearance assumes the south boulevard, east plaza, and north outer-park route remain available, with contingency for the west vehicle gate where conditions permit. Clearance modelling applies reduced performance to grass routes in wet weather and requires immediate route protection by supervisors and mobile response.',
  degraded_route_weather_assumptions:
    'Where heavy rain, mud, standing water, barrier damage, or an unavailable exit reduces route width, the event will apply reduced capacity assumptions, controlled holds, additional route marshals, and if required a phased release or partial movement restriction until safe circulation is restored.',

  command_structure:
    'Command follows a clear event control model with KSS providing the operational security lead, supervisor structure, loggist support, mobile response coordination, and direct liaison with client control, medical, welfare, traffic management, and emergency services. Zone supervisors report to the operational lead through Event Control and all material decisions are logged.',
  named_command_roles: lines(
    'Operational Lead - David Capener - Overall responsibility for event management and security delivery.',
    'Event Controller / Loggist - Lauren Finch - Maintains command log, incident record, and escalation tracking.',
    'Ingress Supervisor - Marcus Hale - East plaza search lanes, queuing, and admissions.',
    'Arena Supervisor - Sophie Grant - Main arena circulation, bar and activation liaison, and west bar village.',
    'Campsite Supervisor - Reece Bolton - Campsite control, staff campsite welfare, and overnight response.',
    'Egress and Transport Supervisor - Aisha Khan - South boulevard, taxi rank, shuttle and pedestrian dispersal routes.'
  ),
  radio_channels_callsigns: lines(
    'Channel 1 - Event Control and command.',
    'Channel 2 - Ingress and search.',
    'Channel 3 - Arena and high-demand activation response.',
    'Channel 4 - Campsite and welfare.',
    'Channel 5 - Traffic and dispersal interface.',
    'Emergency priority phrase - "Priority priority priority".',
    'Call signs allocated by zone and role, with all supervisors carrying fallback mobile numbers.'
  ),
  reporting_lines:
    'All staff report to their zone supervisor. Supervisors escalate to Event Control and the Operational Lead. Immediate escalation is required for life safety issues, crowd pressure, suspected crime, safeguarding, missing persons, CT concerns, route failure, or any incident that could affect the licence objectives or event continuity.',
  external_interfaces: lines(
    'Greater Manchester Police liaison point within Event Control during public hours.',
    'Beacon Medical Services lead seated in Event Control from gate opening to final dispersal.',
    'Open Arms Welfare supervisor linked to welfare hub and staff campsite safe space.',
    'Traffic management supervisor operating from the south coach park marshal point.',
    'Client Event Director and Production Manager seated in Event Control.',
    'Emergency services rendezvous coordinated through RV1 east service yard.'
  ),
  key_contacts_directory: lines(
    'Operational lead - David Capener - 07xxx xxx001 / Command Channel 1',
    'Event control / loggist - Lauren Finch - 07xxx xxx002 / Command Channel 1',
    'Client event director - Hannah Doyle - 07xxx xxx003',
    'Medical lead - Dr. Imran Shah - 07xxx xxx004',
    'Welfare lead - Beth Mercer - 07xxx xxx005',
    'Traffic lead - Peter Walsh - 07xxx xxx006'
  ),
  control_room_structure:
    'Event Control is the primary decision-making room and contains the client Event Director, KSS Operational Lead, Event Controller or Loggist, medical representative, production representative, and traffic liaison during peak phases. CCTV feeds, route status, incident logs, and weather updates are monitored within the room, with all material operational decisions logged before being briefed onto the sector channels.',
  briefing_and_induction:
    'Formal planning meetings are completed in the week prior to the event, followed by written deployment briefs, supervisor briefings, and role-specific staff briefings on each live day. Build and break staff complete site induction, access-control briefing, and emergency route integrity instruction before deployment. Pre-opening and pre-egress checks are signed off by supervisors and confirmed to Event Control.',
  monitoring_and_density_tools:
    'Live monitoring combines fixed supervisor observation, bar and activation queue reporting, CCTV review from Event Control, welfare and medical feedback, queue-marshals at ingress and bar zones, and structured patrol reporting from mobile response teams. The event does not rely on automated density systems for decision making, but any temporary people-counting or video analytics feed would be treated as supporting information only.',

  service_delivery_scope:
    'KSS is responsible for the east ingress search and admissions plaza, main arena circulation, west bar village security support, staff campsite security and welfare interface, Restricted compound access control, south and east dispersal routes, and mobile response capability. Ticket scanning, primary traffic management, client close protection, and medical treatment remain with the relevant specialist providers, but KSS maintains live operational interfaces with each function.',
  build_break_operations:
    'Build and break security covers contractor access checks, vehicle and bag search where directed, accreditation control, asset protection, emergency route preservation, and escalation for unauthorised access or unsafe contractor behaviour. Blue-light and plant routes remain sterile throughout build and breakdown activity, with supervisors carrying authority to stop conflicting pedestrian movement where required.',
  specialist_teams_and_assets:
    'Specialist assets include two mobile response teams, a high-density activation response team, staff campsite overnight patrols, taxi and transport marshals, supervisor-led queue intervention teams, and handheld counter devices for ingress monitoring. CCTV observation is fed to Event Control and welfare-linked patrols carry direct radio access to both control and the safeguarding lead.',
  staffing_by_zone_and_time:
    lines(
      '11:00 to 13:00 - East ingress plaza - 42 staff across search, admissions, queue marshals, and ticket resolution.',
      '16:00 to 19:00 - Main arena and west village - 34 staff across fixed observation, roaming response, and queue control.',
      '20:00 to 22:45 - Main stage fan and high-density zones - 49 staff including pit team, mobile response, and reinforced supervisors.',
      '22:30 to 00:30 - South boulevard and east plaza dispersal - 46 staff across route stewards, taxi marshals, shuttle loading, and staff campsite split.',
      '23:00 to 08:00 - Campsite and overnight welfare - 20 staff including staff campsite patrols, welfare support, and relief cover.'
    ),
  response_teams:
    lines(
      'Arena mobile response - 2 teams of 4 - Reinforce queues, respond to disorder, and protect high-pressure routes.',
      'Front-of-stage pit team - 1 team of 8 - Manage barrier line, extraction, and headline surge intervention.',
      'Campsite response - 1 team of 5 - Support overnight patrols, welfare incidents, and perimeter escalation.',
      'Control reserve unit - 1 team of 4 - Rapid redeployment for adverse weather, route loss, or critical incidents.'
    ),
  relief_and_contingency:
    'Relief staff are assigned by supervisor to maintain statutory breaks without leaving fixed posts uncovered. A reserve of 12 trained staff is held each day for sickness, queue pressure, adverse weather, and emergency redeployment. Overnight staff campsite cover includes a relief handover and fatigue check.',
  escalation_staffing:
    'Additional staff are deployed if queue hold time exceeds 20 minutes, bar queue spillback reaches the main west route, staff campsite noise or welfare incidents rise above forecast, or weather conditions reduce route performance. Further escalation is available through standby reserve and contractor support under Event Control direction.',
  bar_operations_roles:
    'West Village Bar Supervisor manages bar queue stewards, refusals support, service-lane protection, and escalation for intoxication or disorder. Two queue teams regulate feeder lanes, one roaming response pair supports refusals and conflict management, and stock-gate access is checked during live trading and close-down.',
  search_screening_roles:
    'Ingress Search Supervisor controls six standard lanes, the accessible lane, and the flex lane. Search operatives manage person and bag checks, a ticket-resolution steward liaises with admissions, and a secondary-search or prohibited-items escalation point is maintained adjacent to Event Control radio coverage.',
  front_of_stage_roles:
    'High-Density Activation Supervisor controls barrier-line staffing, extraction points, welfare handover, and communication with the client during activation peaks. Roaming high-demand supervisors report queue and behaviour changes back to Event Control.',
  traffic_pedestrian_roles:
    'Traffic and pedestrian route roles include south boulevard route stewards, taxi-rank marshals, shuttle loading staff, east plaza crossing-point stewards, and a supervisor embedded with the traffic management contractor to coordinate holds, crossings, and managed release to transport.',
  camping_security_roles:
    'Camping Security Supervisor manages overnight patrols, perimeter observation, welfare-linked patrol teams, staff campsite response, and staff campsite-hub access control. Quiet-hours interventions, fire-watch observations, and lost-person reunification in the staff campsite are coordinated from the staff campsite supervisor channel.',
  vip_backstage_roles:
    'Restricted Compound Security Supervisor manages accreditation checks at the west compound gate, client-route protection between compound and restricted compound access, escort arrangements for restricted areas, and rapid escalation for unauthorised access or challenge to sterile routes.',
  stewarding_roles:
    'Stewarding roles include directional staff on the arena spine, queue marshals at ingress and bar feeder lanes, emergency-exit stewards, staff campsite wayfinding stewards, and route-clearance stewards during final egress. Steward brief ownership sits with the relevant zone supervisor and all stewarding changes are logged through Event Control.',

  ingress_routes_holding_areas:
    'Public ingress is routed from the transport drop-off and rail approach into the east holding plaza, where the first-wave queue is contained inside barriered holding lanes before being fed into searchable lanes. The external approach route can be converted into an overflow holding area if admissions slow. The accessible route remains segregated from the main queue and feeds directly to the support and ticket-resolution point.',
  search_policy:
    'All attendees are subject to proportionate person and bag search as a condition of entry. Search teams are briefed on prohibited items, discretionary secondary search, refusal criteria, surrender procedures, and escalation to supervisors or police where prohibited articles, suspected supply, or hostile intent are identified. Back-of-house and VIP searches follow accreditation-specific checks.',
  queue_design:
    'The east ingress queue uses barriered serpentine lanes within the holding plaza, with clear directional signage, prohibited-items boards, queue marshals, and a separate accessible lane adjacent to the welfare and ticket resolution point. Emergency access is maintained at all times behind the lane structure.',
  overspill_controls:
    'If internal lane capacity is exceeded, patrons are held in the external approach lane under steward instruction. Control measures include slowing transport drop-off, opening the flex lane, deploying additional queue marshals, and pausing admission temporarily if safe lane operation cannot be maintained.',
  accessible_entry_arrangements:
    'Accessible guests enter through the dedicated step-free lane with queue support, companion assistance, seating provision where required, and direct access to the accessibility hub. Radio escalation is available for hidden disability needs, welfare support, and rapid route adjustment.',
  ingress_operations:
    'Gate readiness checks are completed 60 minutes before public opening, including barrier integrity, signage, search briefing, radio checks, welfare readiness, and surrender-bin positioning. Supervisors confirm lane status to Event Control before admissions commence and provide 15-minute SITREPs during the first ingress wave.',

  circulation_controls:
    'Principal pedestrian routes are protected by roaming patrols and fixed observation points at the west bar village, second-stage crossover, welfare junction, and accessible platform approach. Service crossings operate under marshal control and are suspended when public density makes them unsafe.',
  high_density_controls:
    'The west bar village is monitored from bar supervisor, activation supervisor, and roaming supervisor positions. Threshold triggers include visible stop-start movement, compression at the front barrier, or lateral pressure toward route edges. Control options include public messaging, area soft-holds, lateral redistribution, reinforcement, and client liaison through production.',
  internal_queue_controls:
    'Bar, merchandise, and welfare queues are barriered where necessary and aligned away from main routes. Queue marshals are tasked to prevent cross-route encroachment and to request reinforcement if queue tails threaten emergency access, accessible routes, or the arena spine.',

  transport_interface:
    'The transport interface combines shuttle bus loading, taxi marshalling, private hire pick-up, and the park-and-walk route. Traffic marshals and route stewards coordinate release from the south boulevard and east plaza to prevent uncontrolled crossing, pavement obstruction, or vehicle conflict.',
  dispersal_routes:
    'Primary dispersal is via the south boulevard to shuttle and taxi points and the east plaza to rail and city-centre walking routes. Campers use the north crossover return route. Secondary dispersal through the outer park is available if the east route is degraded or temporarily held.',
  reentry_policy:
    'Arena re-entry is not permitted once a wristband holder exits, save for exceptional welfare or accessibility cases authorised by a supervisor and logged in control. Campsite-to-arena movement is controlled through dedicated check points and time-based access management after 22:30.',
  egress_operations:
    'Egress is managed under a phased release model beginning with route clear-down, bar wind-down, and stage messaging prior to the final act close. Route stewards, taxi marshals, and shuttle coordinators remain in place until crowd levels return to manageable background levels and control formally signs off the dispersal phase.',

  safeguarding_process:
    'All safeguarding concerns are reported immediately to Event Control and handed to the designated safeguarding lead or welfare team as appropriate. Staff are briefed to intervene early where a child appears separated, an adult appears vulnerable, a disclosure is made, or behaviour suggests exploitation, harassment, or drink spiking. Where risk is immediate, life safety and preservation of the individual take priority over all other operational activity.',
  safe_spaces:
    'Primary safe space provision is located within the welfare hub adjacent to the medical facility, with a secondary quiet room in the staff campsite hub overnight. Both locations provide private seating, water, radio contact with control, and direct handover to the welfare or safeguarding lead.',
  lost_vulnerable_person_process:
    'A lost child or vulnerable person report is logged as a priority incident. Control circulates the description to supervisors, ingress, welfare, and medical as required, while the reporting party is retained at the agreed holding point where safe to do so. Reunification is completed only after identity confirmation and documented sign-off.',
  ask_for_angela_process:
    'Any attendee using the Ask for Angela phrase, or otherwise making a personal safety disclosure, is to be taken discreetly to the welfare or safe-space point with a radio notification to control. Staff must avoid challenging the disclosure in public and ensure any linked suspect is monitored without escalating the risk to the reporting person.',
  confidentiality_logging:
    'Safeguarding logs are factual, time-stamped, and restricted to those with a direct operational need to know. Personal data is shared only to support immediate safety, welfare, or statutory escalation. Handover decisions and receiving parties are recorded by the loggist.',

  licensable_activities:
    'Licensable activities include the sale of alcohol, regulated entertainment across both stages, late-night refreshment, and staff campsite welfare activity operating under the event licence and approved operating schedule.',
  dps_name: 'Jordan Ellis',
  challenge_policy: 'Challenge 25',
  licensing_conditions:
    'Key licence conditions include a 22:30 terminal hour for alcohol sales, no glass on site, under-18s accompanied by an adult, welfare and medical provision during all public hours, a documented search regime, protection of emergency routes, and compliance with the approved capacity and noise conditions.',
  venue_rules:
    'Venue rules prohibit aggressive behaviour, unauthorised access, climbing on structures, possession of prohibited items, drone use, and non-compliance with steward or security instructions. Accreditation checks apply to restricted compound and VIP routes. Persistent non-compliance results in refusal or ejection subject to supervisor review.',
  prohibited_items:
    'Prohibited items include glass, weapons, pyrotechnics, laser pens, illegal substances, nitrous oxide canisters, unauthorised drones, large flags or poles, camping chairs within the arena, and any article judged likely to cause injury or disorder.',

  incident_management:
    'Incidents are managed through a graded response that prioritises life safety, crowd stability, vulnerability, and effective communication. Staff assess the immediate threat, contain where safe, notify control, and await or deliver proportionate intervention. Disorder, assault, medical emergency, safeguarding, route obstruction, suspicious item, and crowd surge incidents each have defined escalation triggers, with structured handover to police, medical, welfare, or emergency services where required.',

  risk_assessment_methodology:
    'The operational risk assessment is derived from the event profile, route and capacity analysis, deployment model, emergency procedures, and the selected annexes that define the KSS scope. Each activity or position is reviewed against the likely hazard, the persons who may be harmed, the controls already built into this EMP, and the expected residual position once those controls are applied and supervised live by Event Control.',
  risk_assessment_scope:
    'The KSS risk assessment covers ingress and search, internal circulation, bar-village support, high-demand activation response, staff campsite operations, Restricted compound control, transport and dispersal interfaces, safeguarding and welfare support, emergency route protection, and the build and break interfaces that sit within the KSS delivery scope.',
  risk_assessment_source_notes:
    'The supporting operational risk assessment identifies crowd pressure at the west bar village, bag-search delay, bar queue spillback, staff campsite crossover, late-night taxi demand, degraded grass routes in wet weather, and safeguarding demand linked to intoxication and fatigue. These trigger points have been carried into the EMP controls, staffing peaks, route-protection measures, and emergency decision thresholds.',
  additional_operational_risks: lines(
    'Adverse weather and route degradation - Public routes, staff, contractors, and campers - Apply reduced flow assumptions, additional route marshals, ground-condition checks, and phased release or shelter where route performance falls.',
    'Queue overspill at the west bar village - Arena circulation routes, bar customers, and queue teams - Open feeder-lane extension, reinforce queue stewards, hold service if required, and preserve the main west route under supervisor direction.',
    'Late-night staff campsite welfare demand - Campers, welfare staff, and overnight patrols - Maintain overnight patrol schedule, quiet-hours intervention, welfare escalation, and direct reporting to the staff campsite supervisor and control.'
  ),

  emergency_procedures:
    'Emergency procedures cover full evacuation, partial evacuation, invacuation or lockdown, shelter during weather, show stop, route protection, and emergency service access. Event Control retains the decision log and coordinates messaging through production, PA, radio, and supervisors. Supervisors are responsible for immediate route action and staff accountability within their sectors.',
  partial_evacuation_procedure:
    'Part evacuation is available where a single zone, route, or compound becomes unsafe but the wider event can continue in a controlled state. Control identifies the affected area, stops movement into that zone, releases the required exit route, assigns supervisors to hold adjoining sectors, and redirects unaffected patrons away from the incident footprint until the area is confirmed safe or escalated to full evacuation.',
  full_evacuation_procedure:
    'Full evacuation is initiated where the incident, threat, or route loss affects the wider site and continued occupation cannot be justified. Production stops the performance where required, control issues the evacuation instruction, supervisors release pre-briefed routes, accessible and welfare teams support disabled and vulnerable attendees, and sector reports continue until the site is clear or transferred to emergency-service control.',
  lockdown_invacuation_procedure:
    'Invacuation or lockdown is used where an external or localised hostile threat makes open movement unsafe. Staff direct attendees into protected internal areas, close controlled access points, preserve cover from sight lines and vehicle approach where possible, restrict unnecessary movement, and maintain radio reporting to Event Control until the threat has been assessed or police direction is received.',
  shelter_procedure:
    'Shelter is used for severe weather, lightning risk, environmental hazard, or other conditions where mass external movement could create greater danger than temporary hold-in-place arrangements. Shelter locations are announced by control, route stewards regulate flow to avoid compression, welfare and accessibility support remain active, and supervisors keep emergency corridors and protected exits available throughout the shelter period.',
  show_stop_triggers:
    'Show stop triggers include crowd compression at the front barrier, major medical intervention requiring route sterilisation, fire or smoke affecting a public zone, severe weather requiring temporary hold or shelter, structural failure, route loss, disorder affecting life safety, or a CT-related concern requiring immediate operational pause.',
  rendezvous_points:
    'RV1 east service yard is the primary emergency services rendezvous. RV2 north outer field supports staff campsite incidents and overflow marshalling. RV3 south coach park supports transport-side incidents and secondary command regroup. Casualty collection is coordinated from the medical hub unless otherwise directed by medical command.',
  command_escalation:
    'Supervisors can recommend emergency action, but the Operational Lead or Event Director authorises event-wide evacuation, lockdown, or shelter unless immediate life safety requires protective action before formal confirmation. All emergency decisions are logged, time-stamped, and confirmed over the command channel.',
  emergency_search_zones:
    'Emergency search zones are pre-identified around the west bar village, west service lane, east ingress plaza, VIP or restricted compound, and staff campsite welfare hub. Sterile routes to RV1 and the south boulevard are protected immediately following any suspected device report or evacuation instruction, with supervisors assigned to maintain exclusion until police or emergency command authorises release.',

  ct_procedures:
    'All staff are briefed on hostile reconnaissance indicators, suspicious items, unattended vehicles, and behaviour inconsistent with normal event attendance. Any concern is escalated to control immediately, with isolation, cordon, and route protection measures introduced as directed. The event applies ACT and SCaN principles together with Run Hide Tell messaging where a marauding or weapons-related threat is suspected.',
  suspicious_item_protocol:
    'A suspicious item is not handled or moved by event staff unless a life-saving action makes movement unavoidable. The immediate area is cleared, access is controlled, and the item is reported to control with exact location, description, and any observed surrounding activity. Police advice is followed before reopening the area.',
  hostile_recon_indicators:
    'Indicators include repeated photography of control points, unusual questioning about searches, barriers, or emergency routes, attempts to test staff reactions, interest in restricted access points, unattended vehicle placement near crowded areas, and individuals remaining outside normal audience behaviour patterns without clear reason.',
  run_hide_tell_guidance:
    'Where a marauding or weapons-based threat is suspected, staff and attendees are directed to leave the area quickly if a clear escape route exists, hide and secure themselves if escape is unsafe, and tell police or Event Control as soon as safe communication is possible. KSS staff do not pursue attackers; their priority is immediate life safety, route direction, cover, and accurate information flow.',

  staff_welfare_arrangements:
    'Staff welfare is provided through scheduled breaks, meal and hydration points, access to sheltered rest space, overnight staff campsite welfare support, first-aid for staff, and a fatigue escalation route through supervisors and control. Sign-off arrangements include transport support for late-night staff where required.',

  accessibility_arrangements:
    'Accessible arrangements include a dedicated step-free entrance lane, accessible toilet provision, viewing platform with companion spaces, route assistance, radio-linked accessibility support, welfare priority access, and adapted emergency messaging. Route plans preserve the accessible corridor between the east gate, welfare hub, and viewing platform at all times.',
  accessibility_team_liaison:
    'The accessibility lead is represented in control during ingress and egress peaks and is available by radio at all times. Security supervisors notify the accessibility lead of route changes, incidents affecting disabled guests, welfare needs, and any adjustment required to maintain safe and dignified access.',

  communications_plan:
    'Operational communications are managed through five radio channels supported by mobile fallback contacts, Event Control logging, and structured SITREP updates. Supervisors report at agreed intervals and immediately on any material change. Public messaging is coordinated through stage screens, PA, queue marshals, and signage, with all critical updates routed through control.',
  sitrep_decision_logging:
    'SITREPs are required pre-opening, after first ingress wave, mid-afternoon, pre-headline, and during final dispersal, as well as after any significant incident. Decision logging records the issue, exact location, time, owner, action taken, result, and any onward escalation or review point.',
  refusal_false_id_protocol:
    'Refusals are handled at the point of service by the bar operator with KSS support where conflict, welfare, false ID, or repeated attempts are identified. Challenge 25 failures, suspected proxy sales, and false ID incidents are escalated to the bar supervisor, recorded by control where material, and managed in line with licence-holder direction.',
  ejection_protocol:
    'Ejection is supervisor-led and proportionate. Staff confirm the reason, assess welfare and medical risk, avoid unnecessary force, notify Event Control, and identify the safest exit route. Police or medical support is requested where behaviour, vulnerability, assault, drugs, or safeguarding indicators require specialist handover.',
  confiscation_process:
    'Confiscated items are recorded, labelled where practical, and transferred to the agreed surrender or police handover point. Illegal substances, weapons, suspected stolen property, and false documents are escalated immediately. Alcohol or prohibited low-risk items are disposed of or retained according to the event licence procedure.',
  ejection_safeguarding:
    'No vulnerable person is ejected into an unsafe environment. Intoxicated, distressed, young, isolated, injured, or at-risk persons are routed to welfare, medical, safeguarding, or police before removal from site. Control records the decision, receiving party, location, and final outcome.',

  debrief_reporting:
    'A hot debrief is completed at the end of each show day with security, stewarding, medical, welfare, traffic, and client leads. A formal post-event report is completed within five working days capturing attendance, staffing performance, safeguarding interventions, route and queue issues, incident trends, emergency activations, and recommendations for future events.',
  close_down_operations:
    'Close down is phased by zone, with bar wind-down, queue clear-down, refusal support, stock and asset checks, route protection, and staff redeployment agreed through Event Control. Bars may remain open or close at different times where licence conditions and crowd demand require a staggered approach.',
  end_of_shift_reporting:
    'Supervisors complete end-of-shift reports covering staffing levels, incidents, refusals, ejections, queue performance, safeguarding, welfare handovers, assets, near misses, and outstanding issues. The loggist reconciles supervisor reports against the control log before daily sign-off.',
  asset_security_demobilisation:
    'Asset protection continues through close-down and demobilisation, including stock gates, sponsor equipment, compound access, plant, radios, confiscation stores, and cash-handling interfaces where applicable. Handover to the client or site team is recorded before KSS stands down each area.',
  health_safety_overview:
    'KSS operations follow the event risk assessment, dynamic risk assessment, site induction, safe systems of work, incident escalation procedure, PPE requirements, and welfare arrangements. Supervisors maintain route safety, staff safety, manual handling awareness, radio discipline, and immediate reporting of hazards or near misses.',

  site_maps_and_route_diagrams: lines(
    'Ingress queue and lane layout plan',
    'Arena circulation and route-protection map',
    'Campsite route and welfare-hub plan',
    'Restricted compound controlled-area map',
    'Egress and transport-interface diagram',
    'Emergency route and rendezvous plan'
  ),
  appendix_notes: lines(
    'Appendix A - Bar Operations annex',
    'Appendix B - Search and Screening annex',
    'Appendix C - High-Density Sponsorship Activation annex',
    'Appendix D - Traffic and Pedestrian Route Management annex',
    'Appendix E - Camping Security annex',
    'Appendix F - Restricted Compound Security annex',
    'Appendix G - Stewarding Deployment matrix',
    'Appendix H - Emergency Action Cards',
    'Supporting attachments - Site maps, contact directory, weather trigger matrix, and licence summary'
  ),
  version_history_summary: lines(
    'V1.0 - Initial working draft for internal review.',
    'V1.1 - Updated deployment, licensing, and queue-management sections following client review.',
    'V1.2 - Added final contact directory, emergency interface duties, and close-down arrangements.',
    'V1.3 - Final issue for Event Control and operational supervisors.'
  ),
  contact_directory: lines(
    'KSS Operational Lead - David Capener - Command Channel 1 / 07xxx xxx001',
    'Event Control / Loggist - Lauren Finch - Command Channel 1 / 07xxx xxx002',
    'Bar Operator Lead - Jordan Ellis - Bar Channel / 07xxx xxx007',
    'Sponsor Activation Lead - Priya Shah - Client Channel / 07xxx xxx008',
    'Welfare Lead - Beth Mercer - Welfare Channel / 07xxx xxx005',
    'Medical Lead - Dr. Imran Shah - Medical Channel / 07xxx xxx004'
  ),
}
