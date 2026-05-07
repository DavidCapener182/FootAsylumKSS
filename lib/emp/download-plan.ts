import type { EmpAnnexKey } from '@/lib/emp/master-template'

const lines = (...items: string[]) => items.join('\n')

export const EMP_DOWNLOAD_EVENT_NAME = 'Download Festival 2026'
export const EMP_DOWNLOAD_PLAN_TITLE =
  'KSS NW LTD Event Management Plan - Download Festival 2026'

export const EMP_DOWNLOAD_SELECTED_ANNEXES: EmpAnnexKey[] = [
  'bar_operations',
  'search_screening',
  'front_of_stage_pit',
  'traffic_pedestrian_routes',
  'camping_security',
  'stewarding_deployment',
  'emergency_action_cards',
]

export const EMP_DOWNLOAD_PLAN_VALUES: Record<string, string> = {
  plan_title: EMP_DOWNLOAD_PLAN_TITLE,
  document_version: 'V1.0',
  document_status: 'Draft',
  author_name: 'David Capener - KSS NW LTD',
  approver_name: 'Floyd Allen - KSS NW LTD',
  issue_date: '2026-05-07',
  review_date: '2026-05-28',
  distribution_list: lines(
    'KSS operational leadership and supervisors',
    'Download Festival Event Control',
    'Live Nation (Music) UK Ltd / Far and Beyond Events Ltd',
    'Festival Safeguarding Coordinators',
    'Welfare, medical, accessibility, bar and sponsor activation leads',
    'Security Director, deputies, and relevant contractor control teams'
  ),

  purpose_scope_summary:
    'This Event Management Plan sets out the KSS NW LTD operational arrangements for Download Festival 2026 at Donington Park. KSS scope covers allocated bar-security support, the Co-Op shop and other sponsor activation security support, Paddock duties, Accessible Campsite A4, Accessible Campsite D, accessibility campsite search support, queue management, incident response, welfare escalation, safeguarding reporting, and emergency interface duties. It is a KSS operational delivery plan and must be read alongside the Download Festival Crowd and Security Management Plan, the Safeguarding and Welfare Plan, the FAB Safeguarding Policy, licensing documentation, site plans, deployment schedules, and live Event Control instructions.',
  related_documents: lines(
    'Appendix 3 - DLF26 - Crowd and Security Management Plan - v3.0',
    'Appendix 4 - DLF26 - Safeguarding and Welfare Plan - v1.2',
    'Appendix 4a - DLF26 - Safeguarding Policy - v2.1',
    'Download Festival Operational Management Plan and site plans',
    'KSS deployment schedule and supervisor briefing pack',
    'Download prohibited items and search policy',
    'Accessibility campsite and accessible routes information',
    'Bar operator and sponsor activation local operating procedures'
  ),

  event_name: EMP_DOWNLOAD_EVENT_NAME,
  event_type:
    'Five-day rock and metal festival with camping, arena entertainment, bars, sponsor activations, accessible campsites, VIP/RIP areas, funfair, food and non-food traders, and public egress on 15 June 2026.',
  venue_name: 'Donington Park',
  venue_address: 'Donington Park, Castle Donington, Derby, DE74 2RP',
  venue_reference: 'Donington Park / Event Control Centre at Pit Lane Suites - Garage 39',
  organiser_name: 'Live Nation (Music) UK Ltd',
  client_name: 'Live Nation (Music) UK Ltd / Far and Beyond Events Ltd',
  principal_contractor: 'Far and Beyond Events Ltd',
  key_delivery_partners: lines(
    'KSS NW LTD - allocated security delivery for bars, sponsor activations, Paddock and accessibility campsite areas',
    'Showsec International Ltd - Crowd and Security Management Plan author and arena/crowd security provider',
    'Events Wellbeing - welfare team and welfare facility provider',
    'Download Festival Safeguarding Coordinators - Leigh Harvey, Sandie Dunn and Lauren Stewart across event shifts',
    'Medical provider - main medical facility, arena medical facility and stage first aid posts',
    'Leicestershire Police, Local Authority, SAG partners and appointed specialist welfare agencies'
  ),
  build_dates: '21 May 2026 to 9 June 2026',
  show_dates: '10 June 2026 to 15 June 2026',
  break_dates: '15 June 2026 to 24 June 2026',
  public_ingress_time: 'Public ingress begins Wednesday 10 June 2026, with arena opening Friday 12 June 2026.',
  operational_hours: lines(
    'KSS deployment operates to the agreed staffing schedule and Event Control instructions.',
    'Event Control operates 24/7 from Wednesday 10 June 2026 at 06:00 until Monday 15 June 2026 at 17:00, subject to extension if required.',
    'Daily coordination meetings are scheduled at 10:00 and 20:00.',
    'Accessibility campsites operate 24 hours while occupied.',
    'Bars and sponsor activations operate in accordance with the licence, bar operator schedule, arena opening hours and client instruction.',
    'Campsites are scheduled to close by midday on Monday 15 June 2026.'
  ),

  client_objectives: lines(
    'Deliver safe, proportionate and professional KSS security support across bars, sponsor activations, Paddock and accessibility campsite areas.',
    'Protect children, vulnerable adults, temporarily vulnerable persons, disabled guests, staff and contractors through early identification, discreet support and immediate safeguarding escalation.',
    'Maintain clear queues, safe service areas, protected accessibility routes, emergency access and controlled stock/service interfaces.',
    'Support Challenge 21, refusals, search, ejection and eviction processes without allowing operational enforcement to override safeguarding.',
    'Record and escalate incidents through Event Control so welfare, medical, safeguarding, police or Local Authority partners can take lead decisions where required.'
  ),

  licensed_capacity:
    'Venue capacity is listed as 120,000 plus including staff and performers. Expected attendance is 95,000 public, comprising approximately 70,000 campers and guest tickets plus 25,000 day tickets, with approximately 5,000 staff.',
  expected_attendance:
    '95,000 public attendees across the event, including a large camping population, day ticket holders, guest/RIP attendance, accessibility campsite guests and a substantial workforce.',
  staff_and_contractor_count:
    'Approximately 5,000 staff, contractors and performers are expected across the wider event. KSS staffing is deployed by agreed schedule across bars, sponsor activations, Paddock, Accessible Campsite A4 and Accessible Campsite D.',
  audience_age_profile:
    'Mixed-age rock and metal festival audience. Under-16s must be accompanied by an adult ticket holder aged 18 or over, and under-13s must remain supervised by an adult at all times. For safeguarding purposes, anyone aged 17 or under is treated as a child.',
  attendance_profile:
    'The event profile includes high-energy music fans, a large overnight camping population, accessibility campsite guests, day ticket holders, staff, contractors, artists and sponsor-activation customers. Demand will vary between campsite ingress, arena opening, headline periods, bar peaks, sponsor activation peaks, late-night campsite return and Monday campsite clearance.',
  travel_modes:
    'Arrival modes include camping arrivals, day-ticket parking, accessible drop-off and parking, transport hub, PUDO, coach and shuttle movements, campervans and staff/production access. KSS must preserve accessible movement routes and follow Event Control instructions for any transport or shared-space deployment.',
  family_presence:
    'Children and young people may be present, including family groups, Mini Moshers, children of staff, teenagers and young adults. Safeguarding controls must treat under-18s as children and must not allow refusal, ejection or eviction to place a child or vulnerable person at additional risk.',
  alcohol_profile:
    'Alcohol demand will be significant around arena bars, campsite bars, sponsor activation adjacency and post-headline periods. Challenge 21 applies at all bars. Refusals, intoxication, suspected proxy purchasing, welfare disclosure, drink spiking concerns and vulnerable-person indicators must be escalated early.',
  camping_profile:
    'The camping profile is substantial, with approximately 70,000 campers and guest tickets. KSS scope includes Accessible Campsite A4 and Accessible Campsite D, plus Paddock and accessibility campsite search support. Overnight welfare, quiet support, access control, route preservation, safe ejection/eviction pause and lost/found person response are critical.',
  historic_issues:
    'Planning assumptions from the supplied Crowd and Security Management Plan highlight high-capacity ingress, search pressure, camping load, arena access, accessible routes, bar and sponsor activation demand, egress route management, lost persons, welfare demand, intoxication, refusal conflict and safeguarding-led eviction controls.',
  mood_and_trigger_points:
    'Trigger points include delayed ingress, inconsistent search decisions, queue compression at bars or activations, frustration after refusal of service, intoxication, harassment disclosures, loss of contact between groups, adverse weather, inaccessible route obstruction, campsite eviction requests, and post-headline egress or campsite return.',
  peak_periods: lines(
    'Wednesday 10 June and Thursday 11 June - campsite arrival, accessibility campsite entry and search support.',
    'Friday 12 June to Sunday 14 June - arena opening, bar and sponsor activation peaks, headline periods and nightly egress.',
    'Late evening and overnight - campsite return, welfare demand, intoxication and safeguarding escalation.',
    'Monday 15 June - campsite clearance, lost property/person reports, staff fatigue and final demobilisation.'
  ),

  site_layout_summary:
    'Download Festival 2026 occupies Donington Park with campsites, District X/Campsite Village, arena fields, bars, sponsor activations, Paddock, accessible campsites, medical and welfare provision, emergency routes, gates, car parks, transport hub and production/back-of-house areas. KSS allocated areas include Paddock, Accessible Campsite A4 and Accessible Campsite D, with bar and sponsor activation security support delivered where scheduled.',
  key_zones: lines(
    'KSS bars and licensed service areas',
    'Co-Op shop requiring ingress, egress, queue, perimeter, asset and welfare support',
    'Other sponsor activation areas requiring queue, asset and welfare support',
    'Paddock',
    'Accessible Campsite A4',
    'Accessible Campsite D',
    'Accessibility campsite search points and unload/drop-and-go interfaces',
    'Accessible routes between campsites, arena, AVPs, welfare, medical and toilets',
    'District X/Campsite Village welfare, safeguarding and medical interfaces',
    'Event Control Centre - Pit Lane Suites, Garage 39',
    'Arena egress and accessible/guest egress interfaces where tasked'
  ),
  controlled_areas:
    'Controlled areas include KSS bar footprints, queue lanes, bar back-of-house and stock routes, sponsor activation footprints, activation back-of-house, Paddock, accessibility campsite entrances, accessible campsite search points, welfare/safeguarding spaces, medical interfaces, service routes and any restricted compound or route temporarily assigned by Event Control.',
  emergency_exits_holding_areas:
    'Emergency exits, holding areas and RVPs are controlled by the wider Download EMP and Event Control. KSS must protect routes in its zones, keep bar queues and sponsor activation queues clear of emergency routes, maintain accessible exit width, and report route compromise immediately. Offsite RVP1 is MOTO Donington Park and the onsite RVP is in the Donington Park Paddock at Event Control.',
  dim_aliced_design:
    'KSS queue designs must segregate customer queues from service routes, accessible routes and emergency access. Accessibility campsite search must allow dignity, privacy, space for mobility aids, companions and additional time without reducing proportionality or route safety.',
  dim_aliced_information:
    'Information is provided through Event Control, radio briefings, help maps, Festival App, signage, help hubs, bar/sponsor activation supervisors and public-facing welfare messaging. Staff must know how to direct customers to welfare, medical, safeguarding, accessibility support and Help Hubs.',
  dim_aliced_management:
    'KSS management works under Event Control, the Security Director/deputies, KSS supervisors and area leads. Safeguarding decisions sit with the appointed Safeguarding Coordinators and welfare professionals; KSS staff identify, protect, report, preserve privacy and escalate.',
  dim_aliced_activity:
    'Key activities affecting KSS are alcohol service, Challenge 21 refusals, sponsor activation participation, queueing, campsite access, accessibility campsite search, Paddock movement, welfare support, ejection/eviction requests, lost/found person reports, and egress or campsite clearance.',
  dim_aliced_location:
    'Donington Park is a large outdoor festival site with extensive campsites, mixed terrain, tarmac, service routes, vehicle interfaces and long walking distances. Accessibility campsite areas at grids W16 to S16 and R09 require 24-hour support, route awareness and careful welfare escalation.',
  dim_aliced_ingress:
    'Ingress includes campsite entry, arena entry, accessible day and accessible camping routes, Paddock interfaces, sponsor activation set-up and bar staff/stock access. Search is consent-based, SIA-led where person search applies, and controlled under the client search policy.',
  dim_aliced_circulation:
    'Circulation risks include bar queue tails, sponsor activation queues, accessible route obstruction, campsite movement, District X demand, medical/welfare movement and service vehicle or stock-route conflict. KSS supervisors must actively preserve route width and report congestion.',
  dim_aliced_egress:
    'Egress includes nightly arena exit, accessible and guest exit routes, campsite return and Monday campsite clearance. Accessible/guest egress requires wristband checks, removal of search-lane infrastructure before egress where required, and retention of sufficient width.',
  dim_aliced_dynamics:
    'Dynamic risks are highest when alcohol, fatigue, loud environments, long walking distances, disability needs, sensory overload, poor weather, crowd frustration and late-night campsite returns combine. Safeguarding and welfare escalation must be treated as a live operational control, not an after-action process.',

  ramp_routes:
    'Primary KSS route considerations are bar queue lanes, sponsor activation queue lanes, accessible campsite routes, Paddock routes, welfare/medical routes, stock routes, service crossings and accessible egress routes. No queue or security cordon may block an accessible route or emergency route.',
  ramp_arrival:
    'Arrival pressure is expected across Wednesday and Thursday campsite ingress, with accessibility campsite search and Paddock access requiring calm processing, clear signage, consent-based search and supervisor support for disabled customers.',
  ramp_movement:
    'Movement pressure will build around bars, sponsor activations such as Co-Op, accessible campsite interfaces, District X services and arena egress. KSS must prevent queue spillback into main routes and support customers who need welfare, medical or accessibility assistance.',
  ramp_profile:
    'The profile includes disabled guests, customers with hidden disabilities, children, teenagers, temporarily vulnerable adults, intoxicated persons, LGBTQ+ customers, people experiencing harassment, mental health crisis, substance-related welfare needs or sensory overload, and staff/contractors working long shifts.',

  gross_area:
    'Full-site capacities and areas are controlled by the wider Download EMP. KSS operational area assessment is based on the allocated bar, sponsor activation, Paddock and accessibility campsite footprints confirmed in the deployment schedule and site plans.',
  net_area:
    'Net usable KSS operating space excludes bar counters, back-of-house, sponsor structures, stock storage, emergency routes, accessible routes, service lanes, toilets, medical/welfare routes, tent lines, vehicle routes and any area unavailable due to ground condition.',
  excluded_areas:
    'Excluded areas include stage fields not assigned to KSS, non-KSS campsite areas, production areas unless tasked, police/medical/welfare treatment areas, restricted back-of-house, structures, plant, vehicle routes, emergency lanes, accessible routes and any area under another contractor control unless Event Control directs KSS support.',
  density_assumptions:
    'KSS must manage queues at conservative densities and intervene before stop-start movement, pressure at barriers, route encroachment, accessibility obstruction, distress, overheating or conflict develops. Sponsor activation queues must be treated as high-demand public queues when prizes, product distribution or timed activity creates a surge.',
  zone_capacities: lines(
    'Download expected attendance - 95,000 public plus approximately 5,000 staff.',
    'Camping and guest ticket population - approximately 70,000.',
    'Day ticket population - approximately 25,000.',
    'Accessibility campsites - grids W16 to S16 and R09, 24-hour provision.',
    'KSS allocated areas - Paddock, Accessible Campsite A4 and Accessible Campsite D, plus scheduled bars and sponsor activations.'
  ),
  ingress_flow_assumptions:
    'Ingress flow is controlled by the wider event gate plan. KSS accessibility campsite search support must allow additional processing time for mobility aids, medication, medical equipment, companions, sensory needs and private discussion while preserving throughput and dignity.',
  egress_flow_assumptions:
    'Egress assumptions must follow Event Control and the wider egress plan. KSS must remove or reconfigure local queue infrastructure when instructed, keep accessible exits clear, assist wristband checks where tasked, and report any customer directed to the wrong route.',
  emergency_clearance_assumptions:
    'Emergency clearance from KSS areas depends on immediate route protection, stopping service where required, opening barrier lines, directing customers away from the incident, supporting disabled and vulnerable persons, and maintaining radio updates to Event Control.',
  degraded_route_weather_assumptions:
    'Wet ground, mud, darkness, fatigue, crowd frustration or route loss will reduce performance. KSS must request additional lighting, matting, barrier changes, hold-and-release, welfare support or redeployment where accessible routes, campsite access or bar/activation queues become unsafe.',

  command_structure:
    'KSS command operates through the KSS operational lead, area supervisors and Event Control. The wider Event Control Centre is located at Pit Lane Suites - Garage 39 and operates within the multi-agency structure managed by the client and Event Control Manager.',
  named_command_roles: lines(
    'KSS Operational Lead - David Capener - Overall KSS delivery, client liaison and escalation.',
    'KSS Bars Supervisor - TBC - Bar queue, refusals, Challenge 21 support and stock-route protection.',
    'KSS Sponsor Activations Supervisor - TBC - Co-Op and other activation queue/asset/welfare support.',
    'KSS Accessibility Campsite Supervisor - TBC - Accessible Campsite A4, Accessible Campsite D and search support.',
    'Download Safeguarding Coordinators - Leigh Harvey, Sandie Dunn and Lauren Stewart - safeguarding lead decision making across event shifts.',
    'Event Control Manager / Security Director or Deputies - wider event command and security escalation.'
  ),
  radio_channels_callsigns:
    'Radio channels and call signs are allocated by the Download Event Control radio plan. KSS supervisors must monitor the assigned KSS channel and maintain access to Event Control escalation. Priority incidents must include exact location using grid, What3Words where available, landmark, incident type, immediate risk, support required and whether safeguarding/welfare/medical/police is needed.',
  reporting_lines:
    'KSS staff report to their KSS supervisor. KSS supervisors escalate to the KSS Operational Lead and Event Control. Safeguarding concerns, missing persons, sexual assault or harassment disclosures, Ask for Angela, under-18 concerns, vulnerable-person ejection/eviction, medical risk, crime, search refusal with illegality, crowd pressure or route compromise must be reported immediately.',
  external_interfaces: lines(
    'Event Control Centre - Pit Lane Suites, Garage 39.',
    'Festival Safeguarding Coordinators and Events Wellbeing welfare team.',
    'Medical provider and first aid posts.',
    'Security Director, deputies and other security contractor control teams.',
    'Accessibility team and accessibility campsite management.',
    'Bar operator management, Co-Op shop management and sponsor activation management.',
    'Leicestershire Police and Local Authority through Event Control where required.'
  ),
  key_contacts_directory: lines(
    'KSS Operational Lead - David Capener - contact via KSS channel / phone TBC',
    'Event Control Centre - Pit Lane Suites, Garage 39 - radio route via Event Control',
    'Download Safeguarding Coordinators - Leigh Harvey / Sandie Dunn / Lauren Stewart - via Event Control',
    'Deputy Event Gold - Sheena Jones - 07789 225511',
    'Welfare Team - Events Wellbeing - via Welfare / Event Control',
    'Medical Lead - via Medical / Event Control',
    'Accessibility Lead - via Accessibility / Event Control'
  ),
  control_room_structure:
    'The ECC operates 24/7 during the live period and coordinates radio control, logging, CCTV focus, contractor reporting, daily coordination meetings and escalation to safeguarding, welfare, medical, police and Local Authority partners. KSS material decisions and incidents are logged through the KSS supervisor and Event Control route.',
  briefing_and_induction:
    'All KSS staff must receive a Download-specific briefing covering site layout, allocated areas, radio protocol, Challenge 21, search consent, prohibited items, Ask for Angela, safeguarding indicators, lost/found code words, accessibility etiquette, welfare handover, ejection/eviction pause, incident logging, emergency routes and staff welfare.',
  monitoring_and_density_tools:
    'Monitoring combines KSS supervisor observation, queue marshal reporting, bar and sponsor activation manager feedback, accessibility campsite patrols, Event Control/CCTV updates, welfare/medical trend reports and dynamic risk assessment. Supervisors provide regular SITREPs during ingress, trading peaks, headline periods, nightly egress and campsite clearance.',

  service_delivery_scope:
    'KSS service delivery covers allocated bars, the Co-Op shop, sponsor activations, Paddock, Accessible Campsite A4, Accessible Campsite D, accessibility campsite search support, queue management, asset protection, access control, welfare recognition, safeguarding escalation, incident response and emergency interface duties.',
  build_break_operations:
    'During build and break, KSS protects assigned assets and routes, controls access where tasked, reports unsafe activity, supports staff welfare, preserves emergency routes and follows Event Control instruction. Children of working parents must not access construction areas and any lost child during build/break is escalated via Production/Event Control procedures.',
  specialist_teams_and_assets:
    'Specialist KSS assets include SIA search-capable staff, bar support officers, queue marshals, sponsor activation support, accessibility campsite patrols, Paddock access staff, response capability, supervisors, welfare-aware staff and radios. Search involving a person is conducted only by SIA staff, with consent, in line with event policy.',
  staffing_by_zone_and_time: lines(
    'Campsite ingress - Accessibility campsite search support, accessible routes, Paddock and campsite access points.',
    'Arena live periods - Bars, sponsor activations, queue tails, refusal support, welfare routing and route preservation.',
    'Headline and late evening - Reinforced bar/activation monitoring, intoxication, harassment disclosure, Ask for Angela and egress interface.',
    'Overnight - Accessibility campsite patrols, welfare-linked checks, asset protection and ejection/eviction safeguarding pause.',
    'Monday clearance - Accessibility campsite departure support, lost/found escalation, welfare support and demobilisation checks.'
  ),
  response_teams: lines(
    'KSS response pair/team - Support refusals, sponsor activation pressure, route compromise, welfare escort and supervisor requests.',
    'Accessibility campsite response - Support accessible campsite incidents, welfare concerns, search escalation, lost/found reports and overnight patrols.',
    'Bar response - Support service refusal conflict, queue pressure, Challenge 21 escalation, proxy-purchase concerns and ejection requests.',
    'Safeguarding support role - Preserve privacy, maintain safety, escort to welfare/safe space with a minimum two-person approach where required, and hand over to welfare/safeguarding.'
  ),
  relief_and_contingency:
    'Supervisors must rotate staff to manage fatigue, hydration, meal breaks, sensory load and night-shift tiredness. Relief must not leave search points, accessibility routes, bar queues or activation queues unsupported. Any staffing gap in a safeguarding-sensitive area is escalated immediately.',
  escalation_staffing:
    'Escalation staffing is requested where bar queues or sponsor activations block routes, accessibility search delay causes distress, welfare incidents increase, lost person reports are active, weather degrades routes, ejection/eviction volume rises, or Event Control requests area search or emergency support.',
  bar_operations_roles:
    'KSS bar roles include queue entry management, queue-tail monitoring, Challenge 21 support, refusal conflict support, stock/service route protection, welfare recognition, Ask for Angela response, evidence preservation, ejection pause and reporting to the bar supervisor and Event Control.',
  search_screening_roles:
    'KSS search roles include consent-based person and bag search where tasked, accessibility campsite search support, prohibited item escalation, refusal reporting, same-sex person search unless a customer requests wand-based mixed-gender support, PPE use, privacy, witness support and Event Control logging.',
  front_of_stage_roles:
    'For sponsor activations, KSS roles include queue layout, barrier control, asset protection, participant welfare, surge prevention, staff/stock route protection, vulnerable-person recognition, welfare handover and supervisor liaison with the activation manager.',
  traffic_pedestrian_roles:
    'KSS pedestrian interface roles include preserving accessible routes, separating queues from vehicle/stock routes, supporting Paddock movement, reporting unsafe crossings, assisting hold-and-release where instructed, and maintaining clear routes to welfare, medical and emergency exits.',
  camping_security_roles:
    'KSS camping roles focus on Accessible Campsite A4 and Accessible Campsite D, including access checks, accessibility campsite search support, perimeter awareness, patrols, 24-hour welfare vigilance, quiet support, lost/found escalation, safeguarding-led ejection/eviction pause and emergency route preservation.',
  vip_backstage_roles:
    'KSS has no general RIP/VIP ownership under this plan unless separately tasked by Event Control. If tasked, KSS will support accreditation checks, route protection, welfare escalation and handover to the controlling contractor.',
  stewarding_roles:
    'KSS stewarding and queue marshal roles include customer direction, queue-tail management, accessible service support, signage reinforcement, route protection, welfare reporting, help hub direction and immediate supervisor escalation when authority beyond stewarding is required.',

  ingress_routes_holding_areas:
    'KSS ingress activity is focused on accessibility campsite search, Paddock and assigned bars/activations as they open. Accessible customers must be processed calmly with suitable space, privacy, companion consideration, medication/medical equipment sensitivity and clear routes onward.',
  search_policy:
    'Search is carried out only on behalf of and under instruction of the client. Security staff have no independent power to search; consent must be requested and given. SIA staff may conduct person searches. Bags may be searched by either sex. Nobody is exempt from the search procedure, subject to event-specific arrangements. Refusal of search is escalated to the supervisor, Event Control and client decision route. Illegal items, weapons, pyrotechnics or harmful items are escalated immediately.',
  queue_design:
    'Queue design for bars, sponsor activations and accessibility campsite search must keep emergency routes, accessible routes, welfare/medical routes, stock routes and service lanes clear. Barrier lines should avoid compression, allow escape gaps, maintain sight lines and provide space for wheelchair users, mobility aids and companions.',
  overspill_controls:
    'If queues overspill, KSS supervisors will extend or re-route lanes only with safe route checks, pause entry to the queue where required, call Event Control, request extra staff, protect accessibility routes, communicate expected wait and stop activity/service if public safety is compromised.',
  accessible_entry_arrangements:
    'Accessibility customers must receive dignified, proportionate search and entry support. Accessibility campsite search must account for mobility aids, medical equipment, medication, carers/companions, hidden disabilities, sensory needs and additional time. Any uncertainty is escalated to the accessibility lead and Event Control rather than resolved by refusal alone.',
  ingress_operations:
    'Pre-opening checks include barrier layout, signage, prohibited item information, radio checks, PPE, surrender bins, lighting, ground condition, accessible route width, welfare route, medical route, staff briefing and escalation contacts. Supervisors confirm readiness to KSS control/Event Control.',

  circulation_controls:
    'KSS protects circulation around bars, sponsor activations, Paddock and accessibility campsites through fixed observation, queue marshal reporting, patrols and supervisor intervention. Service or stock movements are held where public density makes movement unsafe.',
  high_density_controls:
    'High-density controls apply to the Co-Op shop when shop entry, exit or queue demand creates pressure, and to other sponsor activations when product distribution or timed activity creates crowd pressure. Controls include queue caps, barriered feeder lanes, protected shop ingress and egress, soft holds, staff reinforcement, welfare observation, public communication, stopping entry or activity if needed and preserving accessible routes.',
  internal_queue_controls:
    'Internal queues must be actively managed so they do not block emergency exits, accessible routes, medical/welfare routes, toilets, stock routes or public circulation. Queue tails are monitored and reported, and vulnerable or distressed persons are removed from queue pressure for welfare support.',

  transport_interface:
    'KSS has no primary transport ownership unless tasked, but must support accessible drop-off/search interfaces, Paddock routes, campsite return and any shared-space deployment under Event Control. Any vehicle/person conflict is reported immediately.',
  dispersal_routes:
    'Nightly dispersal includes arena egress, accessible and guest exits, campsite return and bar/activation close-down. KSS staff must clear queue infrastructure where instructed, keep accessible routes open and direct customers to the correct route based on wristband/access entitlement.',
  reentry_policy:
    'Re-entry and access entitlement are controlled by the Download ticketing and wristband policy. KSS must not create informal exceptions except under Event Control instruction for welfare, medical or accessibility reasons, and any such decision is logged.',
  egress_operations:
    'Egress operations include bar wind-down, queue clear-down, sponsor activation closure, asset checks, accessible route protection, wristband checks where tasked, welfare monitoring and SITREPs to Event Control until the area is stood down.',

  safeguarding_process:
    'Safeguarding at Download Festival 2026 is governed by the FAB Safeguarding Policy v2.1 and the event Safeguarding and Welfare Plan. KSS staff are responsible for vigilance, early identification, immediate risk control, privacy and escalation only. KSS staff must not conduct safeguarding investigations or make safeguarding decisions. All concerns go via Event Control to the Safeguarding Coordinator, Welfare, Medical, Police or Local Authority as required.',
  safe_spaces:
    'Safe spaces include welfare tents, Campsite Manager/Help Hubs, BOH bar areas where appropriate, the welfare facility and other locations directed by Event Control. Ask for Angela customers are discreetly removed from the situation with consent and escorted by a minimum of two staff where practicable, including at least one of the same sex where possible.',
  lost_vulnerable_person_process:
    'Lost or found children/vulnerable adults are priority safeguarding incidents. Use code word Disney for lost/found child and Mr Care for lost/found vulnerable adult. Notify supervisor and Event Control immediately, keep radio detail discreet, preserve the reporting person, escort found persons to welfare using two staff where instructed, and continue logging until Event Control confirms resolution.',
  ask_for_angela_process:
    'Ask for Angela operates across the festival and is briefed to security, stewards and bar staff. In bars or activations, discreetly move the person away from the concern to a safe space or welfare point, contact Event Control with precise location, avoid public challenge, monitor any suspect only if safe, and await welfare/safeguarding direction.',
  confidentiality_logging:
    'Safeguarding information is sensitive. KSS logs must be factual, minimal, time-stamped and shared only with those who need it for immediate safety. Event Control and safeguarding records are handled under GDPR. KSS records should not duplicate detailed welfare case notes unless required for security action.',

  licensable_activities:
    'Licensable activities include alcohol sales at bars and regulated entertainment under the Donington Park venue licence and Download operating arrangements. KSS supports licence objectives by preventing crime and disorder, protecting public safety, preventing public nuisance and protecting children from harm.',
  dps_name: 'Jess Shields',
  challenge_policy: 'Challenge 21',
  licensing_conditions:
    'Key conditions relevant to KSS include Challenge 21 at all bars, licence display at all bars and Production Office, compliance with search and prohibited-item policies, protection of children from harm, public safety, prevention of crime and disorder, welfare escalation and preservation of emergency/accessibility routes.',
  venue_rules:
    'Venue rules include valid ticket/wristband access, compliance with search, no prohibited items, no illegal drugs, no weapons or pyrotechnics, no unauthorised alcohol/tobacco sales, no disruptive or anti-social behaviour, no harassment, no unauthorised access and compliance with lawful staff instructions.',
  prohibited_items:
    'Prohibited items include controlled substances, weapons, pyrotechnics, items that could cause harm, camping equipment in the arena, bags outside arena restrictions, and any item prohibited by the current Download Festival conditions of entry. Accessibility-related medication or equipment must be handled sensitively and escalated rather than refused without review.',

  incident_management:
    'Incident response prioritises life safety, safeguarding, crowd stability, privacy and accurate escalation. Staff make the area safe, call the supervisor/Event Control, preserve evidence where relevant, avoid public confrontation, request welfare/medical/police support and log actions. Safeguarding concerns override routine behavioural removal.',

  risk_assessment_methodology:
    'This risk assessment is derived from the KSS Download scope, supplied CSMP, Safeguarding and Welfare Plan, FAB Safeguarding Policy, selected annexes, site profile and dynamic risk assessment. It focuses on bars, sponsor activations, accessibility campsite operations, search support, welfare, safeguarding, ejection/eviction pause and emergency interface duties.',
  risk_assessment_scope:
    'The KSS risk assessment covers bar queues and refusals, Co-Op shop ingress, egress, queueing and perimeter support, sponsor activation crowd pressure, accessibility campsite search, Accessible Campsite A4 and D operations, Paddock duties, lost/found persons, Ask for Angela, ejection/eviction, welfare handover, staff welfare and route protection.',
  risk_assessment_source_notes:
    'Source documents identify Download as a high-capacity 95,000 public event at Donington Park, with 70,000 campers/guest tickets, 25,000 day tickets, 5,000 staff, 24-hour Event Control, Challenge 21, accessibility campsites, consent-based search, welfare providers, safeguarding coordinators, lost/found procedures and a mandatory safeguarding pause before vulnerable-person ejection or eviction.',
  additional_operational_risks: lines(
    'Safeguarding concern during refusal or ejection - Child, vulnerable adult or temporarily vulnerable person - Stop removal, move to safety, notify Event Control, deploy welfare/safeguarding and record only factual security actions.',
    'Sponsor activation queue surge - Activation guests, disabled customers, staff and assets - Queue cap, barrier adjustment, pause activation, preserve accessible route and request Event Control support.',
    'Accessibility campsite search distress - Disabled guests, companions and search staff - Use consent-based search, privacy, additional time, supervisor review and accessibility lead escalation.',
    'Bar refusal conflict - Bar staff, customers and KSS - Challenge 21 support, de-escalation, welfare check, no unmanaged ejection and Event Control logging.',
    'Lost child or vulnerable adult - Public, welfare, security and police - Use Disney/Mr Care code words, notify Event Control, retain reporting party, circulate description discreetly and follow welfare lead.'
  ),

  emergency_procedures:
    'Emergency procedures are directed by the wider Download EMP and Event Control. KSS duties are to protect life, stop service/activity where instructed, clear and hold routes, support disabled and vulnerable persons, preserve emergency access, report conditions and await Event Control or emergency-service direction.',
  partial_evacuation_procedure:
    'For partial evacuation of a bar, sponsor activation, Paddock or accessibility campsite area, KSS stops entry, clears the affected footprint, protects adjoining routes, supports vulnerable/disabled persons, updates Event Control and prevents re-entry until authorised.',
  full_evacuation_procedure:
    'For full evacuation, KSS follows Event Control instructions, opens pre-briefed routes, directs customers calmly, prioritises accessibility and welfare support, reports sector status and does not release staff until accountability and route duties are complete.',
  lockdown_invacuation_procedure:
    'For lockdown or invacuation, KSS moves customers away from exposed areas where safe, closes access points under instruction, preserves cover, avoids unnecessary movement, reports suspicious activity and follows Run Hide Tell / ACT guidance.',
  shelter_procedure:
    'Shelter may be required for severe weather, lightning or other environmental conditions. KSS identifies local shelter options, prevents queue pressure at shelter points, supports disabled guests and vulnerable persons and keeps emergency routes available.',
  show_stop_triggers:
    'Show stop or activity stop triggers include crowd pressure, major medical or safeguarding incident, fire or smoke, structural concern, severe weather, hostile threat, route loss, uncontrolled activation surge, serious disorder or any incident where continued service/activity increases risk.',
  rendezvous_points:
    'RVPs are controlled by Event Control. Offsite RVP1 is MOTO Donington Park; onsite RVP is in the Donington Park Paddock at Event Control. KSS staff should provide exact grid, What3Words where available and landmark-based location information.',
  command_escalation:
    'Emergency escalation goes from KSS staff to KSS supervisor, KSS Operational Lead and Event Control. Immediate life safety action may be taken before formal approval, but all actions must be reported and logged as soon as safe.',
  emergency_search_zones:
    'Emergency search zones for KSS include bars, sponsor activations, Paddock, Accessible Campsite A4, Accessible Campsite D, accessibility search points, local BOH/storage areas, queue lanes and routes assigned by Event Control. Suspicious items are handled under HOT and 4Cs principles.',

  ct_procedures:
    'KSS staff are briefed on ACT, SCaN, hostile reconnaissance, suspicious items, unattended items, hostile vehicles, drone reporting and unusual behaviour around bars, activations, search points, accessible routes and Paddock. Concerns are reported immediately to Event Control.',
  suspicious_item_protocol:
    'Do not touch or move suspicious items. Use HOT assessment, clear the immediate area if safe, communicate exact location and description, apply 4Cs principles, protect routes and await Event Control/police instruction.',
  hostile_recon_indicators:
    'Indicators include repeated filming of search lanes, unusual interest in barriers or emergency routes, testing staff reactions, asking detailed security questions, loitering outside normal behaviour, abandoned bags, vehicle placement near crowded areas or attempts to access restricted areas.',
  run_hide_tell_guidance:
    'For a weapons or marauding threat, leave by a safe route if possible, hide if escape is unsafe, silence phones, barricade where possible and tell police/Event Control when safe. KSS staff prioritise life safety and direction, not pursuit.',

  staff_welfare_arrangements:
    'KSS supervisors must monitor fatigue, hydration, meal breaks, overnight tiredness, heat/cold exposure, welfare impact after difficult safeguarding incidents and radio stress. Staff can be rotated away from distressing incidents and should know how to access staff welfare, Music Support and mental health first aid routes through Event Control.',

  accessibility_arrangements:
    'Accessibility arrangements include accessible campsites at grids W16 to S16 and R09, accessible viewing platforms, accessible routes, medical and welfare links, accessible day/camping entry arrangements and 24-hour accessibility campsite provision. KSS must keep routes clear, avoid assumptions about visible or hidden disability and escalate any adjustment needs.',
  accessibility_team_liaison:
    'KSS accessibility campsite supervisors liaise with the accessibility lead through Event Control. Any route change, search concern, medication/equipment issue, distressed guest, mobility-aid issue, welfare concern or egress obstruction must be escalated promptly.',

  communications_plan:
    'Operational communications use the Download radio plan, Event Control logging, KSS supervisor SITREPs, daily coordination meetings and precise location reporting. Safeguarding and lost/found communications must be discreet and use agreed code words where applicable.',
  sitrep_decision_logging:
    'SITREPs are required at start of shift, pre-opening, during ingress/search peaks, bar and activation peaks, headline periods, nightly egress, overnight campsite checks and final clearance. Logs must record time, location, issue, action, owner, escalation and outcome.',
  refusal_false_id_protocol:
    'Challenge 21 failures, false ID, proxy-purchase concerns, intoxication refusals and repeated attempts are supported by KSS where conflict or welfare risk exists. Refusal does not automatically mean ejection. Welfare checks and safeguarding pause apply before removal where vulnerability is suspected.',
  ejection_protocol:
    'Ejection is a last resort, SIA-led, authorised and coordinated via Event Control. KSS must consider welfare before removal, use proportionate force only if lawful and necessary, preserve dignity, request medical/welfare/police support where required and document the reason, route and receiving party.',
  confiscation_process:
    'Confiscated items are placed in bins or designated areas in line with the event policy. Illegal items are reported and escalated. Security staff do not remove items once contained in bins and do not accept responsibility for confiscated property beyond the event procedure.',
  ejection_safeguarding:
    'If the person is or may be a child, vulnerable adult, intoxicated, distressed, injured, mentally unwell, isolated, disabled, subject to harassment or otherwise temporarily vulnerable, ejection or eviction must pause immediately. Event Control, Safeguarding Coordinator and Welfare Team are contacted before any removal continues.',

  debrief_reporting:
    'KSS supervisors complete daily debriefs covering bar refusals, sponsor activation queue pressure, accessibility campsite incidents, searches, welfare referrals, safeguarding concerns, Ask for Angela, lost/found persons, ejections/evictions, staff welfare, route issues and recommendations.',
  close_down_operations:
    'Close-down includes bar queue clear-down, sponsor activation stand-down, asset checks, stock route protection, campsite patrol handover, welfare route preservation, incident reconciliation and confirmation to Event Control before KSS stands down an area.',
  end_of_shift_reporting:
    'End-of-shift reports must include staffing, incidents, refusals, ejections, search issues, welfare and safeguarding handovers, lost/found reports, accessibility issues, activation concerns, near misses, route obstructions, equipment and outstanding actions.',
  asset_security_demobilisation:
    'KSS asset protection covers bar assets, Co-Op shop queue barriers and perimeter assets, sponsor activation equipment, radios, PPE, barriers, signage, search equipment, Paddock assets and accessibility campsite infrastructure until handed over or stood down.',
  health_safety_overview:
    'KSS staff follow site induction, risk assessment, dynamic risk assessment, PPE requirements, manual handling expectations, radio discipline, safe search practice, welfare procedures, incident escalation and emergency route protection. Any hazard or near miss is reported immediately.',

  site_maps_and_route_diagrams: lines(
    'Download Festival site plan and arena/campsite maps',
    'KSS deployment map for bars, sponsor activations and Paddock',
    'Accessible Campsite A4 and Accessible Campsite D plan',
    'Accessibility campsite search layout',
    'Accessible routes, AVPs, welfare, medical and toilets map',
    'Emergency routes, RVPs and Event Control map'
  ),
  appendix_notes: lines(
    'Appendix A - Bar Operations annex',
    'Appendix B - Search and Screening annex, including accessibility campsite search',
    'Appendix C - Co-Op Shop and Sponsor Activation annex, including shop ingress, egress, queuing and perimeter controls',
    'Appendix D - Pedestrian, service route and Paddock interface annex',
    'Appendix E - Accessibility Campsite Security annex',
    'Appendix F - Stewarding and Queue Marshal deployment matrix',
    'Appendix G - Emergency Action Cards',
    'Supporting documents - CSMP v3.0, Safeguarding and Welfare Plan v1.2, FAB Safeguarding Policy v2.1'
  ),
  version_history_summary: lines(
    'V1.0 - Initial Download Festival 2026 KSS EMP created from the KSS EMP framework and Download source documents.'
  ),
  contact_directory: lines(
    'KSS Operational Lead - David Capener - KSS channel / phone TBC',
    'Event Control Centre - Pit Lane Suites, Garage 39 - 24/7 live event control',
    'Safeguarding Coordinators - Leigh Harvey / Sandie Dunn / Lauren Stewart - via Event Control',
    'Deputy Event Gold - Sheena Jones - 07789 225511',
    'Welfare Team - Events Wellbeing - via Event Control',
    'Medical - via Event Control',
    'Accessibility Lead - via Event Control'
  ),
}
