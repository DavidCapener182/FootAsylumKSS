import type { EmpAnnexKey } from '@/lib/emp/master-template'
import { EMP_BUSINESS_TEMPLATE_VALUES } from '@/lib/emp/business-template'

const lines = (...items: string[]) => items.join('\n')

export const EMP_PARKLIFE_EVENT_NAME = 'Parklife Festival 2026'
export const EMP_PARKLIFE_PLAN_TITLE =
  'KSS NW LTD Bar Security Operations Plan - Parklife Festival 2026'

export const EMP_PARKLIFE_SELECTED_ANNEXES: EmpAnnexKey[] = ['bar_operations']

export const EMP_PARKLIFE_PLAN_VALUES: Record<string, string> = {
  ...EMP_BUSINESS_TEMPLATE_VALUES,

  plan_title: EMP_PARKLIFE_PLAN_TITLE,
  document_version: 'V0.1',
  document_status: 'Draft',
  author_name: 'David Capener - KSS NW LTD',
  approver_name: 'Floyd Allen - KSS NW LTD',
  issue_date: '2026-06-01',
  review_date: '2026-06-15',
  distribution_list: lines(
    'Jack Longthorne - KSS Head of Security',
    'David Capener - KSS Operational Lead',
    'Laura Parker - KSS Operational Support',
    'KSS operational leadership and supervisors',
    'Parklife Event Control',
    'Bar operator / licence holder representative - TBC',
    'Event safeguarding, welfare and medical leads',
    'Client or organiser representative - TBC'
  ),

  purpose_scope_summary:
    'This Bar Security Operations Plan sets out the KSS NW LTD operational arrangements for Parklife Festival 2026 at Heaton Park, Manchester. KSS scope is limited to bar-security support, bar queue lanes, licensed service areas, bar compounds or stock interfaces where allocated, refusal support, incident reporting, welfare recognition, safeguarding escalation, emergency route preservation around KSS areas, and Event Control communication. KSS does not assume ownership of full-site crowd management, entrance search, traffic, stages, CCTV, medical, welfare, event control or general arena patrols unless specifically tasked by the client or Event Control.',
  related_documents: lines(
    'Parklife Festival 2026 event management plan - pending issue to KSS',
    'Parklife Festival 2026 crowd and security management plan - pending issue to KSS',
    'Parklife Festival 2026 site plan, bar plan and route map - pending issue to KSS',
    'Bar operator risk assessment and operating procedures - pending issue to KSS',
    'Premises licence, licensing conditions and alcohol management arrangements - pending issue to KSS',
    'KSS final deployment schedule and supervisor briefing pack - to be added later'
  ),
  operational_assumptions_dependencies: lines(
    'Deployment numbers, bar names, call signs, supervisor allocations and live operating hours remain subject to the final KSS deployment sheet.',
    'KSS operates under Parklife Event Control direction and within the wider organiser event management, crowd management, emergency, safeguarding and licensing arrangements.',
    'KSS scope is bar-only unless the client or Event Control formally tasks additional support.',
    'Bar footprints, queue lanes, bar compounds, stock routes, refusal points and welfare handover routes may be revised before or during the event.',
    'Emergency procedures, evacuation, invacuation, lockdown, Show Stop, public messaging and emergency-service interface are governed by the organiser command structure and Event Control.',
    'Weather, ground condition, peak bar demand, safeguarding demand, intelligence, route loss or staffing changes may alter KSS deployment, queue layouts, patrol focus or escalation priorities.',
    'If a named KSS lead is replaced operationally, Event Control will be notified and the live deployment sheet supersedes this document for that role or shift.'
  ),

  event_name: EMP_PARKLIFE_EVENT_NAME,
  event_type:
    'Two-day metropolitan music festival at Heaton Park, Manchester, with KSS bar-security support only. The event operates as a daily access festival with public gates open on Saturday 20 June and Sunday 21 June 2026.',
  venue_name: 'Heaton Park',
  venue_address: 'Heaton Park, Manchester, M25 0EG',
  venue_reference:
    'Heaton Park / Parklife event site. Public entry and exit gates are understood to include West Gate on Bury Old Road and East Gate on Sheepfoot Lane; VIP uses East Gate, subject to final site plan.',
  organiser_name: 'Parklife Festival / organiser TBC in client documents',
  client_name: 'Parklife Festival / bar operator TBC',
  principal_contractor: 'Lead event delivery partner TBC in client documents',
  key_delivery_partners: lines(
    'KSS NW LTD - bar-security support where allocated',
    'Parklife Event Control - command, control and event-wide direction',
    'Bar operator / licence holder - bar operations, Challenge policy, refusals and alcohol-management lead',
    'Medical and welfare providers - treatment, welfare and safeguarding handover routes',
    'Greater Manchester Police, local authority, licensing and SAG partners through Event Control where required'
  ),
  build_dates: 'TBC - to be confirmed from Parklife build schedule',
  show_dates: '20 June 2026 to 21 June 2026',
  break_dates: 'TBC - to be confirmed from Parklife break schedule',
  public_ingress_time:
    'Parklife gates are advertised as opening from 12:00 on Saturday 20 June and 13:00 on Sunday 21 June 2026, with last entry at 17:00 and event finish at 23:00 on both days.',
  operational_hours: lines(
    'KSS deployment operates to the final KSS staffing schedule and Event Control instructions.',
    'Public gates: Saturday 20 June from 12:00; Sunday 21 June from 13:00.',
    'Last entry: 17:00 on both days.',
    'Event finish: 23:00 on both days.',
    'Bar operating times, last orders and close-down timings are TBC from the bar operator and licence conditions.',
    'KSS stand-down is only after bar closure, queue clear-down, refusal/ejection handover, incident logging and Event Control or KSS lead confirmation.'
  ),

  client_objectives: lines(
    'Deliver safe, proportionate and professional KSS bar-security support across allocated Parklife bars and licensed service areas.',
    'Maintain clear bar queue lanes, protected emergency routes, protected accessible routes and controlled bar compound or stock interfaces where allocated.',
    'Support the bar operator with Challenge policy, refusals, proxy-purchase concerns, intoxication, disorder prevention and escalation.',
    'Identify welfare, safeguarding, harassment, spiking, medical and vulnerability indicators early and escalate through supervisor and Event Control routes.',
    'Record refusals, incidents, ejections, welfare referrals and material operational issues so Event Control receives the required information.'
  ),

  licensed_capacity:
    'Overall event capacity and licensed occupancy are controlled by the organiser, licence holder and local authority. KSS bar-area capacity assumptions will be based on the confirmed bar footprints, queue lanes and deployment schedule when issued.',
  expected_attendance:
    'Expected attendance is TBC in client documents. Planning should assume a high-attendance day festival audience, with peak bar demand during afternoon, evening and pre-close periods.',
  staff_and_contractor_count:
    'KSS staff numbers are TBC and will be added from the final deployment schedule. This draft assumes KSS bar supervisors, SIA officers, queue support and response cover will be confirmed by bar, time and shift.',
  audience_age_profile:
    'Parklife is advertised as a 17+ event, with 17-year-olds required to be accompanied by a responsible adult. The audience is expected to include young adults and mixed groups with significant alcohol-service demand.',
  attendance_profile:
    'The KSS operational profile is bar-focused. Key customer interfaces are bar fronts, queue tails, refusal points, bar compounds, stock or service routes, welfare handover points, accessible routes near bars and close-down dispersal from licensed service areas.',
  travel_modes:
    'Public travel, entry and exit routes are controlled by the wider Parklife travel and site management arrangements. KSS will preserve routes around allocated bars and report any local route obstruction, congestion, welfare need or access conflict to supervisors and Event Control.',
  family_presence:
    'The event is 17+. Under-18 attendees may be present and must be treated as children for safeguarding purposes. KSS staff will not allow refusal, ejection or removal to place a child, vulnerable person, intoxicated person or isolated attendee at additional risk.',
  alcohol_profile:
    'Alcohol demand is expected to be significant around allocated bars. Challenge policy, refusal support, proxy-purchase concerns, intoxication, disorder, welfare disclosure and drink-spiking concerns will be escalated early to supervisors, bar management and Event Control as required.',
  camping_profile:
    'No KSS camping-security scope is identified for this Parklife bar-only plan. Any overnight, campsite, perimeter, gate or wider patrol duty must be added only if formally allocated by the client or Event Control.',
  historic_issues:
    'Event-specific historic issues and intelligence are pending. The draft bar plan assumes likely peak times around afternoon arrival into the site, early evening bar demand, headline periods, final service, refusal clusters, welfare demand and post-close movement away from bars.',
  mood_and_trigger_points:
    'Likely triggers include prolonged bar queues, refusal of service, intoxication, suspected proxy purchase, inconsistent ID decisions, adverse weather, lost friends, medical or welfare concern, harassment or spiking disclosure, route obstruction near bars and unclear public messaging.',
  peak_periods: lines(
    'Saturday 20 June - public opening from 12:00, afternoon bar build-up, evening peak bar demand and 23:00 close.',
    'Sunday 21 June - public opening from 13:00, afternoon bar build-up, evening peak bar demand and 23:00 close.',
    'Both days - refusal clusters, welfare disclosures and route congestion are more likely during evening bar demand, headline periods and final service.',
    'Final deployment-specific peak times will be added from the KSS deployment sheet and bar operator schedule.'
  ),

  site_layout_summary:
    'Parklife Festival 2026 takes place at Heaton Park, Manchester. KSS site awareness will focus on allocated bars, bar fronts, queue lanes, bar compounds, stock/service interfaces, nearby accessible routes, welfare/medical handover routes, Event Control reporting routes and emergency access routes. Final bar names, grid references and routes are TBC pending the site plan and deployment schedule.',
  key_zones: lines(
    'Allocated bars and licensed service points - TBC',
    'Bar queue lanes and queue tails - TBC',
    'Bar compounds and back-of-house areas where allocated - TBC',
    'Stock and service routes serving allocated bars - TBC',
    'Refusal/ejection support points near allocated bars - TBC',
    'Welfare, medical and safeguarding handover routes - TBC',
    'Emergency and accessible routes near allocated bars - TBC',
    'Event Control and KSS supervisor reporting point - TBC'
  ),
  controlled_areas:
    'Controlled areas for KSS include allocated bar footprints, queue lanes, bar backs, stock routes, service gates, refusal points, welfare handover points and any barriered or restricted area assigned by the bar operator, client or Event Control. KSS does not control full-site areas outside its allocated bar-security scope unless redeployed by Event Control.',
  emergency_exits_holding_areas:
    'Emergency exits, holding areas and rendezvous points are controlled by the wider Parklife emergency plan. KSS will keep bar queues, barriers, refusal points and stock movement clear of emergency routes and report any local route compromise immediately to supervisors and Event Control.',
  dim_aliced_design:
    'Design considerations for KSS bar areas include bar frontage, queue footprint, barriers, entry/exit lanes, refusal point location, stock/service separation, accessible route protection, lighting, signage, welfare route access and emergency route clearance.',
  dim_aliced_information:
    'Information requirements include bar opening and close-down times, Challenge policy, refusal process, radio channels, call signs, grid references, welfare and medical routes, Event Control escalation, prohibited items, spiking response and any changes to queue or route layouts.',
  dim_aliced_management:
    'Management arrangements should define KSS lead, bar supervisors, bar operator contact, Event Control route, escalation thresholds, refusal logging, incident logging, staff welfare checks and decision logging for normal and degraded operations.',
  dim_aliced_activity:
    'Arrival considerations affecting KSS are limited to bar readiness before public demand builds, first-service checks, queue-lane readiness, supervisor positioning, accessible route protection, first-contact welfare recognition and live communication with bar management.',
  dim_aliced_location:
    'Last-mile factors for KSS are limited to how public routes, transport-led arrival, gates, East/West Gate flows, welfare routes and accessible movement may interact with allocated bar areas and queue tails.',
  dim_aliced_ingress:
    'Ingress to KSS areas includes customers joining bar queues, staff entering bar backs, stock movement into compounds and supervisor access to refusal or welfare points. KSS will protect the queue footprint and prevent queue tails from obstructing public, accessible or emergency routes.',
  dim_aliced_circulation:
    'Circulation risks include customer crossflow around bar fronts, queue tails, toilet routes, food traders, welfare routes, emergency routes and bar stock or service interfaces. Supervisors will preserve route width and report congestion early.',
  dim_aliced_egress:
    'Egress considerations include final service, queue closure, bar-front clear-down, refusal/ejection handover, stock or cash route protection, public movement away from bars, and stand-down only when the allocated area is clear and authorised.',
  dim_aliced_dynamics:
    'Dispersal considerations include alcohol, fatigue, group separation, weather, darkness, final service, lost friends, welfare need, accessible movement and movement away from bar areas after close. KSS will escalate welfare and safeguarding concerns during dispersal, not after the event.',

  ramp_routes:
    'Primary KSS route considerations are bar queue lanes, customer approach routes, accessible routes near bars, welfare and medical handover routes, stock routes, service crossings, refusal/ejection routes and emergency routes. No queue, barrier or security cordon may block an accessible or emergency route.',
  ramp_arrival:
    'KSS static and dynamic gathering spaces include bar footprints, bar fronts, queue tails, refusal points, bar compound entrances, stock/service interfaces, welfare handover points and nearby accessible-route interfaces. Each area requires a clear footprint, visible boundary, holding capacity, accessible route protection and supervisor review during peak times.',
  ramp_movement:
    'Movement demand will build around bar fronts, queue tails, toilets, food traders, welfare routes, service gates, final service and post-close dispersal. KSS will prevent queue spillback into main routes and support customers who need welfare, medical or accessibility assistance.',
  ramp_profile:
    'The profile includes young adults, 17-year-old attendees accompanied by responsible adults, intoxicated persons, customers refused service, groups separated from friends, disabled customers, people with hidden disabilities, LGBTQ+ customers, people experiencing harassment or spiking concerns, and staff working long shifts.',

  gross_area:
    'Full-site capacities and areas are controlled by the wider Parklife event plans. KSS operational area assessment will be based on the confirmed bar footprints, queue lanes, compounds and route interfaces when issued.',
  net_area:
    'Net KSS usable operating space excludes bar counters, back-of-house stock space, emergency routes, accessible routes, service lanes, structures, plant, vehicle routes and any area controlled by another contractor unless Event Control assigns support.',
  excluded_areas:
    'Excluded areas include public gates, full-site search lanes, stages, front-of-stage pits, traffic routes, CCTV, medical treatment areas, welfare facilities, full-site patrol zones, VIP/backstage routes and any area not allocated to KSS in the deployment schedule.',
  density_assumptions:
    'Bar and queue density assumptions will be based on the confirmed bar footprints and barrier layouts. KSS will intervene before local queues cause route encroachment, accessibility obstruction, emergency route compromise or conflict.',
  zone_capacities: lines(
    'Allocated bar queue capacities - TBC from bar plan.',
    'Bar compound capacities - TBC from bar operator.',
    'Emergency and accessible route widths - TBC from site plan.',
    'KSS staffing per bar - TBC from deployment schedule.'
  ),
  ingress_flow_assumptions:
    'KSS does not own public ingress. Bar queue flow assumptions will be confirmed once bar layouts, queue lanes and service rates are issued.',
  egress_flow_assumptions:
    'Bar close-down and egress assumptions will be confirmed by the bar operator, Event Control and final bar schedule. KSS will clear queue lanes, support refusals and protect routes until stand-down.',
  emergency_clearance_assumptions:
    'Emergency clearance around bars relies on immediate queue release, barrier adjustment where safe, clear radio reporting, public direction from Event Control and preservation of emergency routes.',
  degraded_route_weather_assumptions:
    'Wet ground, darkness, high demand, route obstruction or welfare incidents may reduce local throughput. KSS supervisors will request route support, barrier change, lighting, temporary holds or redeployment through Event Control.',

  command_structure:
    'KSS bar teams report through KSS supervisors to Jack Longthorne as KSS Head of Security, with David Capener as KSS Operational Lead and Laura Parker providing KSS Operational Support. Parklife Event Control remains the event command route. KSS does not establish a separate event command structure and will follow organiser command decisions.',
  named_command_roles: lines(
    'KSS Head of Security - Jack Longthorne',
    'KSS Operational Lead - David Capener',
    'KSS Operational Support - Laura Parker',
    'KSS Bar Supervisors - TBC by deployment schedule',
    'Bar Operator Lead - TBC',
    'Parklife Event Control - TBC',
    'Medical / Welfare / Safeguarding contacts - TBC through Event Control'
  ),
  radio_channels_callsigns:
    'Radio channels and call signs are TBC. Final call signs will be inserted from the Parklife radio plan and KSS deployment sheet. Until confirmed, staff should report by bar name, supervisor name, exact location and incident type.',
  reporting_lines:
    'KSS staff report to their bar supervisor. Bar supervisors escalate to Jack Longthorne as KSS Head of Security, David Capener as KSS Operational Lead and Laura Parker for operational support, with Parklife Event Control used for event command decisions and incident escalation. Immediate escalation is required for life safety, safeguarding, disorder, CT concerns, licence breaches, refusal conflict, asset loss, bar queue congestion, route obstruction, welfare concern or any issue affecting KSS operations.',
  external_interfaces: lines(
    'Parklife Event Control - command, emergency and operational decisions.',
    'Bar operator / licence holder - bar operations, Challenge policy and refusal records.',
    'Medical and welfare providers - treatment, welfare and vulnerability handover.',
    'Safeguarding lead - safeguarding concerns through Event Control.',
    'Police, local authority and licensing partners - through Event Control where required.'
  ),
  key_contacts_directory: lines(
    'KSS Head of Security - Jack Longthorne',
    'KSS Operational Lead - David Capener',
    'KSS Operational Support - Laura Parker',
    'KSS Bar Supervisors - TBC',
    'Parklife Event Control - TBC',
    'Bar Operator Lead - TBC',
    'Medical / Welfare Lead - TBC',
    'Safeguarding Lead - TBC'
  ),
  control_room_structure:
    'Parklife Event Control is the primary event decision-making point. KSS bar supervisors will provide factual SitReps, incident details, refusal issues, welfare concerns, route compromise and resource requests through the agreed radio or control route.',
  briefing_and_induction:
    'All KSS staff will receive a Parklife-specific briefing covering bar locations, bar operator contacts, Challenge policy, refusals, radio protocol, welfare and safeguarding indicators, Ask Angela, spiking awareness, route protection, emergency procedures, Show Stop messaging, incident logging and staff welfare.',
  monitoring_and_density_tools:
    'Live monitoring combines KSS supervisor observation, queue-tail checks, bar operator feedback, welfare/medical feedback, Event Control updates and structured patrol reporting by response staff where allocated.',

  service_delivery_scope:
    'KSS service delivery covers allocated Parklife bar-security support only, including bar fronts, queues, refusal support, compounds or stock interfaces where allocated, welfare recognition, incident reporting, route protection and Event Control escalation.',
  build_break_operations:
    'Build and break duties are not confirmed in this draft. If KSS is allocated build or break support, duties should be added by bar, compound, stock route and shift from the final deployment schedule.',
  specialist_teams_and_assets:
    'Specialist teams and assets are TBC. The final plan should identify any KSS response pair/team, supervisor float, welfare support route, body-worn video, counters, radios or specialist equipment allocated to bar operations.',
  staffing_by_zone_and_time:
    'TBC - final KSS Parklife bar deployment schedule to be added later.',
  response_teams:
    'TBC - any KSS response pair/team, relief staff or mobile support will be added from the final deployment schedule.',
  relief_and_contingency:
    'Relief and contingency arrangements are TBC. Supervisors must ensure fixed bar posts are not left uncovered and staff welfare breaks are logged against the live deployment.',
  escalation_staffing:
    'Escalation staffing may be required for bar queue congestion, refusal clusters, welfare issues, disorder, route compromise, adverse weather, asset concerns or emergency support. Additional deployment must be authorised through KSS command and Event Control.',
  dynamic_escalation_triggers: lines(
    'Queue tails obstruct a public route, accessible route, emergency route, service crossing or bar feeder lane.',
    'Refusal conflict, intoxication, disorder, safeguarding, welfare or medical demand exceeds local supervisor response.',
    'Bar staff request support for proxy purchase, suspected underage sale, intoxication or aggressive behaviour.',
    'Adverse weather, lighting issue, ground deterioration or route loss reduces safe movement capacity.',
    'Event Control reports intelligence, suspicious behaviour, hostile reconnaissance or a change in threat posture.'
  ),
  bar_operations_roles:
    'KSS bar roles include supporting bar queue order, protecting queue footprints, assisting the bar operator with refusals and Challenge policy escalation, monitoring intoxication and welfare indicators, preserving emergency and accessible routes, protecting stock or compound interfaces where allocated, and reporting incidents to Event Control.',
  search_screening_roles:
    'No planned KSS search or screening ownership is identified for Parklife in this bar-only draft. KSS may support bar-level prohibited item concerns only where directed by the bar operator, supervisor or Event Control.',
  front_of_stage_roles:
    'No planned KSS front-of-stage or stage-security role is identified for this Parklife bar-only draft.',
  traffic_pedestrian_roles:
    'No planned KSS traffic or full pedestrian route role is identified. KSS will only protect local routes around allocated bars and report wider route issues to Event Control.',
  camping_security_roles:
    'No planned KSS camping-security role is identified for this Parklife bar-only draft.',
  vip_backstage_roles:
    'No planned KSS VIP or backstage role is identified unless a bar, backstage bar or compound interface is specifically allocated in the final deployment schedule.',
  stewarding_roles:
    'No planned general stewarding role is identified. Any queue support or steward interface around allocated bars will be confirmed in the final deployment schedule.',

  ingress_routes_holding_areas:
    'KSS bar ingress is limited to customer approach to bar queues, entry into queue lanes, staff access to bar backs and stock movement into compounds. Public entry routes are controlled by the wider event plan.',
  search_policy:
    'Full-site search policy is controlled by the organiser. KSS bar staff may escalate prohibited item, intoxication, drugs, weapons, suspicious behaviour or refusal concerns to supervisors, bar management and Event Control.',
  queue_design:
    'Bar queue design is TBC. Queue lanes should preserve emergency routes, accessible routes, service routes and public circulation. Queue tails must be monitored and adjusted before they obstruct routes or create conflict.',
  overspill_controls:
    'Overspill controls include queue-tail monitoring, barrier adjustment, supervisor escalation, bar operator liaison, temporary service hold where required, additional staff request and Event Control notification if the planned footprint is exceeded.',
  accessible_entry_arrangements:
    'Accessible route arrangements around bars are TBC. KSS will keep accessible routes clear, support disabled customers respectfully, escalate hidden disability needs and avoid moving barriers in a way that removes accessible access.',
  ingress_operations:
    'Pre-opening checks include bar location confirmation, barrier check, queue-lane check, radio check, supervisor contact, welfare route awareness, refusal process confirmation and Event Control reporting route confirmation.',

  circulation_controls:
    'KSS protects circulation around allocated bars through fixed observation, supervisor checks, queue-tail monitoring, route preservation and early escalation if queues, refusals or welfare incidents affect public movement.',
  high_density_controls:
    'High-demand bar areas will be monitored by supervisors and queue staff where allocated. Triggers include prolonged queue dwell, queue-tail growth, blocked routes, visible customer distress, repeated refusals or bar operator request for support.',
  internal_queue_controls:
    'Bar queues should be aligned away from main public, emergency, accessible and service routes where practicable. Queue marshals or SIA staff will request reinforcement if queue tails threaten route access or conflict develops.',

  transport_interface:
    'Transport interfaces are controlled by the wider Parklife travel plan. KSS will report any local bar-area issue linked to public departure, taxi/private hire movement, public transport demand or route congestion through Event Control.',
  dispersal_routes:
    'Dispersal routes are controlled by the wider Parklife egress plan. KSS will keep bar close-down routes clear, support final customer movement away from bars and report any obstruction or welfare concern.',
  reentry_policy:
    'Re-entry policy is controlled by Parklife ticketing and event rules. KSS will not create informal exceptions and will escalate welfare or accessibility cases through supervisors and Event Control.',
  egress_operations:
    'Egress operations for KSS include bar wind-down, queue clear-down, final refusal/ejection support, route protection, bar compound handover, incident logging and stand-down only after supervisor and Event Control or KSS lead confirmation.',

  safeguarding_process:
    'KSS staff are responsible for vigilance, early identification, privacy, immediate risk control and escalation only. Safeguarding concerns go through supervisor and Event Control to the event safeguarding lead, welfare, medical, police or local authority as required. KSS staff will not conduct safeguarding investigations.',
  safe_spaces:
    'Safe space and welfare locations are TBC. Until confirmed, KSS staff should request welfare or medical support through Event Control and move the person away from public conflict only where safe.',
  lost_vulnerable_person_process:
    'Lost, vulnerable, intoxicated, distressed or isolated persons are escalated to supervisors and Event Control. KSS should keep the person safe, preserve privacy, avoid unmanaged ejection and record factual details for handover.',
  ask_for_angela_process:
    'Any Ask Angela request, spiking concern, harassment disclosure or personal-safety concern is treated as a welfare and safeguarding escalation. Staff preserve privacy, call a supervisor, involve welfare or medical where needed and avoid public challenge of the disclosure.',
  confidentiality_logging:
    'Safeguarding, welfare and refusal logs must be factual, time-stamped and shared only with those who need the information for immediate safety, welfare, legal or operational reasons.',

  licensable_activities:
    'Licensable activities include alcohol sales at Parklife bars and regulated entertainment under the event licence. KSS supports licensing objectives only within allocated bar-security duties.',
  dps_name: 'TBC - to be confirmed from licence holder / bar operator',
  challenge_policy: 'Challenge 25',
  licensing_conditions:
    'Relevant licensing conditions are TBC. KSS will support the bar operator with Challenge policy, refusal management, intoxication escalation, disorder prevention, public safety, protection of children from harm and incident reporting.',
  venue_rules:
    'Venue rules and conditions of entry are controlled by Parklife. KSS will support bar-area compliance only where it relates to refused service, intoxication, disorder, prohibited items, welfare or route protection.',
  prohibited_items:
    'Prohibited items are controlled by Parklife conditions of entry. KSS bar staff will escalate suspected weapons, drugs, spiking items, glass, pyrotechnics or suspicious items through supervisors and Event Control.',

  incident_management:
    'Incidents at Parklife bars are managed through a graded response prioritising life safety, KSS area stability, vulnerability, communication and escalation. Staff assess the immediate threat, contain where safe, notify the supervisor and Event Control, and hand over to police, medical, welfare, safeguarding or bar management as required.',
  risk_assessment_methodology:
    'This operational risk assessment is limited to the KSS Parklife bar-security delivery scope. It is not an assessment of the organiser, operator or other contractor regulatory conformity, and it does not replace their own risk assessments or legal/regulatory duties. It is derived from the KSS bar scope, supplied Parklife planning information when issued, selected bar operations annex, site profile and dynamic risk assessment.',
  risk_assessment_scope:
    'The KSS risk assessment covers allocated bar-security support, bar queues/refusals, bar compounds or stock interfaces where allocated, welfare recognition, safeguarding escalation, suspicious behaviour, route protection, emergency interface, close-down support and incident reporting.',
  risk_assessment_source_notes:
    'Source documents are pending. This draft has been prepared to understand how KSS bar operations can meet the relevant operational parts of the Parklife C&SMP, EMP, bar operator procedures and other planning documents once issued. Final hazards, controls, bar locations and deployment details must be reconciled before issue.',
  additional_operational_risks: lines(
    'Bar queue congestion - customers, KSS and bar staff - queue-tail monitoring, barrier adjustment, route protection, additional staff request and Event Control escalation.',
    'Refusal conflict or proxy purchase - customers, KSS and bar staff - Challenge policy support, calm escalation, supervisor attendance, refusal record and police/Event Control escalation if required.',
    'Welfare, spiking or safeguarding disclosure - customers and staff - privacy, supervisor escalation, welfare/medical handover, no unmanaged ejection and factual logging.'
  ),

  emergency_procedures:
    'Emergency procedures are directed by the wider Parklife EMP and Event Control. KSS duties are to protect life, stop bar activity where instructed, clear and hold local routes, support disabled and vulnerable persons, preserve emergency access, report conditions and await Event Control or emergency-service direction.',
  partial_evacuation_procedure:
    'For partial evacuation of a bar or bar compound, KSS stops entry, clears the immediate queue where safe, protects exit routes, supports vulnerable persons, reports exact location and follows Event Control direction.',
  full_evacuation_procedure:
    'For full evacuation, KSS follows Event Control instructions and directs customers to the appropriate routes. KSS does not self-deploy away from allocated bar areas unless instructed or required for immediate life safety.',
  lockdown_invacuation_procedure:
    'For lockdown or invacuation, KSS moves customers away from exposed areas where safe, stops bar service, secures immediate routes, follows Run Hide Tell principles and awaits Event Control or emergency-service instruction.',
  shelter_procedure:
    'Shelter arrangements are controlled by the wider event plan. KSS identifies local safe waiting options only under Event Control direction and reports weather, welfare or route concerns from allocated bars.',
  show_stop_triggers:
    'Show Stop or operational pause triggers include unsafe crowd density or congestion, major medical or safeguarding incident, fire or smoke, structural concern, severe weather, hostile threat, route loss, serious disorder or any incident where continued service/activity increases risk.',
  rendezvous_points:
    'Rendezvous points are TBC from Parklife emergency plans. KSS will use the designated RVPs only as instructed by Event Control.',
  command_escalation:
    'Emergency escalation goes from KSS staff to KSS supervisor, KSS operational lead and Parklife Event Control. If life safety is immediate and control contact fails, staff should contact emergency services and then update Event Control as soon as practicable.',
  emergency_search_zones:
    'Emergency search zones and sterile routes are TBC. KSS will report suspicious items, hostile reconnaissance and route compromise around allocated bars and preserve local sterile areas when directed.',

  ct_procedures:
    'KSS staff are briefed on ACT, SCaN, hostile reconnaissance, suspicious items, Run Hide Tell, emergency communication and immediate escalation through Event Control.',
  suspicious_item_protocol:
    'Do not touch or move suspicious items. Use HOT assessment where trained, clear the immediate area if safe, prevent further approach, inform Event Control with exact location and description, and await police or command direction.',
  hostile_recon_indicators:
    'Indicators include repeated filming of bar staff, routes or compounds, unusual interest in security positions, unattended items, testing access points, suspicious vehicle or package behaviour and attempts to obtain staff or radio information.',
  run_hide_tell_guidance:
    'Run if there is a safe route. Hide if escape is not safe. Tell police and Event Control when safe, giving exact location, description, direction of travel, casualties and immediate risk.',

  staff_welfare_arrangements:
    'KSS supervisors must monitor staff breaks, hydration, weather exposure, fatigue, abuse, assault, traumatic incident exposure and suitability to remain on post. Staff welfare issues are logged and escalated to the KSS operational lead.',
  accessibility_arrangements:
    'KSS staff will protect accessible routes around bars, communicate respectfully, recognise hidden disabilities, avoid blocking mobility routes with queues or barriers, and escalate accessibility issues to supervisors and Event Control.',
  accessibility_team_liaison:
    'Accessibility team liaison is TBC. Until confirmed, accessibility issues are reported through supervisors and Event Control with exact location and customer need.',

  communications_plan:
    'Operational communications use the Parklife radio plan when issued, Event Control logging, KSS supervisor SitReps, precise location reporting and agreed incident categories. Final channels and call signs are TBC.',
  sitrep_decision_logging:
    'Supervisors provide SitReps on bar queues, refusals, welfare, disorder, route obstruction, staffing, weather and any bar operator concern. Material decisions and Event Control instructions are logged.',
  refusal_false_id_protocol:
    'Refusals, suspected fake ID, proxy-purchase concerns and intoxication refusals are handled calmly with bar operator liaison, supervisor support and factual logging. Event Control must receive copies or live access to refusal JotForm submissions where used.',
  ejection_protocol:
    'Ejection is a last resort and must be coordinated through supervisor and Event Control routes. KSS may support safe removal, evidence preservation and immediate risk control, but welfare and safeguarding checks must be completed before removal continues.',
  confiscation_process:
    'Confiscation processes are controlled by Parklife conditions, police instruction and bar operator procedures. KSS must not retain items outside agreed process and must log any prohibited item or evidence handover.',
  ejection_safeguarding:
    'If a person is or may be a child, vulnerable adult, intoxicated, distressed, injured, mentally unwell, isolated, disabled, subject to harassment or otherwise temporarily vulnerable, ejection pauses immediately and Event Control, welfare or safeguarding is contacted before removal continues.',

  debrief_reporting:
    'KSS supervisors complete daily debriefs covering staffing, bar refusals, queue congestion, welfare referrals, safeguarding concerns, Ask Angela/spiking concerns, suspicious behaviour, route issues, incidents, close-down and recommendations.',
  close_down_operations:
    'Close-down includes queue closure, bar-front clear-down, refusal/ejection handover, stock or cash route protection where allocated, incident log check, staff welfare check and stand-down only after supervisor authorisation.',
  end_of_shift_reporting:
    'End-of-shift reporting includes attendance, incidents, refusals, welfare concerns, safeguarding referrals, route issues, equipment, radio issues, staff welfare and any unresolved action for the next shift.',
  asset_security_demobilisation:
    'KSS protects only allocated assets, compounds, equipment or stock interfaces. Asset handover, keys, radios, body-worn video, evidence and documents are returned or signed over according to KSS and client process.',
  health_safety_overview:
    'KSS staff follow dynamic risk assessment, safe manual-handling avoidance, route protection, weather precautions, PPE where required, incident reporting and supervisor escalation for unsafe conditions.',

  site_maps_and_route_diagrams:
    'Parklife 2026 site map, bar plan, route map, emergency route map and Event Control location plan are pending issue to KSS.',
  appendix_notes: lines(
    'Appendix A - KSS final deployment schedule - to be added later',
    'Appendix B - Parklife site map and bar plan - pending',
    'Appendix C - Bar operator procedures and Challenge policy - pending',
    'Appendix D - Event Control, radio and call sign plan - pending'
  ),
  version_history_summary:
    'V0.1 - Initial Parklife Festival 2026 KSS bar-security draft created with deployment details pending.',
  contact_directory: lines(
    'KSS Head of Security - Jack Longthorne',
    'KSS Operational Lead - David Capener',
    'KSS Operational Support - Laura Parker',
    'KSS Bar Supervisors - TBC',
    'Parklife Event Control - TBC',
    'Bar Operator Lead - TBC',
    'Medical / Welfare Lead - TBC',
    'Safeguarding Lead - TBC'
  ),
}
