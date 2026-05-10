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
    'Welfare, medical, accessibility, bar and Co-Op shop leads',
    'Security Director, deputies, and relevant contractor control teams'
  ),

  purpose_scope_summary:
    'This Event Management Plan sets out the KSS NW LTD operational arrangements for Download Festival 2026 at Donington Park. KSS scope covers allocated bar-security support, the Co-Op shop, Paddock duties, Accessible Campsite A4, Accessible Campsite D, accessibility campsite search support, queue management, incident response, welfare escalation, safeguarding reporting, and emergency interface duties. KSS will deliver this as an operational plan read alongside the Download Festival Crowd and Security Management Plan, the Safeguarding and Welfare Plan, the FAB Safeguarding Policy, licensing documentation, site plans, the latest deployment schedule, and live Event Control instructions.',
  related_documents: lines(
    'Appendix 3 - DLF26 - Crowd and Security Management Plan - v3.0',
    'Appendix 4 - DLF26 - Safeguarding and Welfare Plan - v1.2',
    'Appendix 4a - DLF26 - Safeguarding Policy - v2.1',
    'Download Festival Operational Management Plan and site plans',
    'KSS deployment schedule and supervisor briefing pack',
    'Download prohibited items and search policy',
    'Accessibility campsite and accessible routes information',
    'Bar operator and Co-Op shop local operating procedures'
  ),
  operational_assumptions_dependencies: lines(
    'Deployment numbers remain subject to final client confirmation and the latest KSS live deployment sheet.',
    'KSS operates under Download Event Control direction and within the wider organiser Crowd and Security Management Plan, Event Management Plan and emergency command structure.',
    'Site plans, queue layouts, bar footprints, Co-Op shop queuing, search lanes, accessible routes and Paddock arrangements may be revised before or during the event.',
    'Emergency procedures, evacuation decisions, invacuation, lockdown, show stop, public messaging and emergency-service interface are governed by festival Silver/Gold and Event Control.',
    'Weather, ground condition, welfare demand, security intelligence, transport pressure or route loss may alter deployment, queue layouts, patrol focus or area priorities.',
    'Search policy is controlled by the client/event search policy; ejection and eviction authority is retained by the designated event management, Eviction Team and Event Control route.',
    'If a named KSS lead is replaced operationally, Event Control will be notified and the live deployment sheet supersedes this document for the relevant role or shift.'
  ),

  event_name: EMP_DOWNLOAD_EVENT_NAME,
  event_type:
    'Five-day rock and metal festival with camping, arena entertainment, bars, Co-Op shop, accessible campsites, VIP/RIP areas, funfair, food and non-food traders, and public egress on 15 June 2026.',
  venue_name: 'Donington Park',
  venue_address: 'Donington Park, Castle Donington, Derby, DE74 2RP',
  venue_reference: 'Donington Park / Event Control Centre at Pit Lane Suites - Garage 39',
  organiser_name: 'Live Nation (Music) UK Ltd',
  client_name: 'Live Nation (Music) UK Ltd / Far and Beyond Events Ltd',
  principal_contractor: 'Far and Beyond Events Ltd',
  key_delivery_partners: lines(
    'KSS NW LTD - allocated security delivery for bars, Co-Op shop, Paddock and accessibility campsite areas',
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
    'Bars and the Co-Op shop operate in accordance with the licence, operator schedule, arena/campsite opening hours and client instruction.',
    'Campsites are scheduled to close by midday on Monday 15 June 2026.'
  ),

  client_objectives: lines(
    'Deliver safe, proportionate and professional KSS security support across bars, Co-Op shop, Paddock and accessibility campsite areas.',
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
    'Approximately 5,000 staff, contractors and performers are expected across the wider event. KSS staffing is deployed by the latest agreed schedule across bars, Co-Op shop, Paddock, Accessible Campsite A4 and Accessible Campsite D.',
  audience_age_profile:
    'Mixed-age rock and metal festival audience. Under-16s are required to be accompanied by an adult ticket holder aged 18 or over, and under-13s are required to remain supervised by an adult at all times. For safeguarding purposes, anyone aged 17 or under is treated as a child.',
  attendance_profile:
    'The event profile includes high-energy music fans, a large overnight camping population, accessibility campsite guests, day ticket holders, staff, contractors, artists and Co-Op shop customers. Demand will vary between campsite ingress, arena opening, headline periods, bar peaks, Co-Op shop peaks, late-night campsite return and Monday campsite clearance.',
  travel_modes:
    'Arrival modes include camping arrivals, day-ticket parking, accessible drop-off and parking, transport hub, PUDO, coach and shuttle movements, campervans and staff/production access. KSS will preserve accessible movement routes and follow Event Control instructions for any transport or shared-space deployment.',
  family_presence:
    'Children and young people may be present, including family groups, Mini Moshers, children of staff, teenagers and young adults. Safeguarding controls will treat under-18s as children and will not allow refusal, ejection or eviction to place a child or vulnerable person at additional risk.',
  alcohol_profile:
    'Alcohol demand will be significant around arena bars, campsite bars, Co-Op shop adjacency and post-headline periods. Challenge 21 applies at all bars. Refusals, intoxication, suspected proxy purchasing, welfare disclosure, drink spiking concerns and vulnerable-person indicators will be escalated early.',
  camping_profile:
    'The camping profile is substantial, with approximately 70,000 campers and guest tickets. KSS scope includes Accessible Campsite A4 and Accessible Campsite D, plus Paddock and accessibility campsite search support. Overnight welfare, quiet support, access control, route preservation, safe ejection/eviction pause and lost/found person response are critical.',
  historic_issues:
    'Planning assumptions from the supplied Crowd and Security Management Plan highlight high-capacity ingress, search pressure, camping load, arena access, accessible routes, bar and Co-Op shop demand, egress route management, lost persons, welfare demand, intoxication, refusal conflict and safeguarding-led eviction controls.',
  mood_and_trigger_points:
    'Trigger points include delayed ingress, inconsistent search decisions, queue compression at bars or the Co-Op shop, frustration after refusal of service, intoxication, harassment disclosures, loss of contact between groups, adverse weather, inaccessible route obstruction, campsite eviction requests, and post-headline egress or campsite return.',
  peak_periods: lines(
    'Wednesday 10 June and Thursday 11 June - campsite arrival, accessibility campsite entry and search support.',
    'Friday 12 June to Sunday 14 June - arena opening, bar and Co-Op shop peaks, headline periods and nightly egress.',
    'Late evening and overnight - campsite return, welfare demand, intoxication and safeguarding escalation.',
    'Monday 15 June - campsite clearance, lost property/person reports, staff fatigue and final demobilisation.'
  ),

  site_layout_summary:
    'Download Festival 2026 occupies Donington Park with campsites, District X/Campsite Village, arena fields, bars, Co-Op shop, Paddock, accessible campsites, medical and welfare provision, emergency routes, gates, car parks, transport hub and production/back-of-house areas. KSS allocated areas include Paddock, Accessible Campsite A4 and Accessible Campsite D, with bar and Co-Op shop security support delivered where scheduled.',
  key_zones: lines(
    'KSS bars and licensed service areas',
    'Co-Op shop requiring ingress, egress, queue, perimeter, asset and welfare support',
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
    'Controlled areas include KSS bar footprints, queue lanes, bar back-of-house and stock routes, Co-Op shop ingress, egress, queue and perimeter areas, Paddock, accessibility campsite entrances, accessible campsite search points, welfare/safeguarding spaces, medical interfaces, service routes and any restricted compound or route temporarily assigned by Event Control.',
  emergency_exits_holding_areas:
    'Emergency exits, holding areas and RVPs are controlled by the wider Download EMP and Event Control. KSS will protect routes in its zones, keep bar queues and Co-Op shop queues clear of emergency routes, maintain accessible exit width, and report route compromise immediately. Offsite RVP1 is MOTO Donington Park and the onsite RVP is in the Donington Park Paddock at Event Control.',
  dim_aliced_design:
    'KSS queue designs will segregate customer queues from service routes, accessible routes and emergency access. Accessibility campsite search will allow dignity, privacy, space for mobility aids, companions and additional time without reducing proportionality or route safety.',
  dim_aliced_information:
    'Information is provided through Event Control, radio briefings, help maps, Festival App, signage, help hubs, bar/Co-Op supervisors and public-facing welfare messaging. Staff will know how to direct customers to welfare, medical, safeguarding, accessibility support and Help Hubs.',
  dim_aliced_management:
    'KSS management works under Event Control, the Security Director/deputies, KSS supervisors and area leads. Safeguarding decisions sit with the appointed Safeguarding Coordinators and welfare professionals; KSS staff identify, protect, report, preserve privacy and escalate.',
  dim_aliced_activity:
    'Key activities affecting KSS are alcohol service, Challenge 21 refusals, Co-Op shop queueing, campsite access, accessibility campsite search, Paddock movement, welfare support, ejection/eviction requests, lost/found person reports, and egress or campsite clearance.',
  dim_aliced_location:
    'Donington Park is a large outdoor festival site with extensive campsites, mixed terrain, tarmac, service routes, vehicle interfaces and long walking distances. Accessibility campsite areas at grids W16 to S16 and R09 require 24-hour support, route awareness and careful welfare escalation.',
  dim_aliced_ingress:
    'Ingress includes campsite entry, arena entry, accessible day and accessible camping routes, Paddock interfaces, Co-Op shop set-up and bar staff/stock access. Search is consent-based, SIA-led where person search applies, and controlled under the client search policy.',
  dim_aliced_circulation:
    'Circulation risks include bar queue tails, Co-Op shop queues, accessible route obstruction, campsite movement, District X demand, medical/welfare movement and service vehicle or stock-route conflict. KSS supervisors will actively preserve route width and report congestion.',
  dim_aliced_egress:
    'Egress includes nightly arena exit, accessible and guest exit routes, campsite return and Monday campsite clearance. Accessible/guest egress requires wristband checks, removal of search-lane infrastructure before egress where required, and retention of sufficient width.',
  dim_aliced_dynamics:
    'Dynamic risks are highest when alcohol, fatigue, loud environments, long walking distances, disability needs, sensory overload, poor weather, crowd frustration and late-night campsite returns combine. Safeguarding and welfare escalation will be treated as a live operational control, not an after-action process.',

  ramp_routes:
    'Primary KSS route considerations are bar queue lanes, Co-Op shop queue lanes, accessible campsite routes, Paddock routes, welfare/medical routes, stock routes, service crossings and accessible egress routes. No queue or security cordon may block an accessible route or emergency route.',
  ramp_arrival:
    'Arrival pressure is expected across Wednesday and Thursday campsite ingress, with accessibility campsite search and Paddock access requiring calm processing, clear signage, consent-based search and supervisor support for disabled customers.',
  ramp_movement:
    'Movement pressure will build around bars, the Co-Op shop, accessible campsite interfaces, District X services and arena egress. KSS will prevent queue spillback into main routes and support customers who need welfare, medical or accessibility assistance.',
  ramp_profile:
    'The profile includes disabled guests, customers with hidden disabilities, children, teenagers, temporarily vulnerable adults, intoxicated persons, LGBTQ+ customers, people experiencing harassment, mental health crisis, substance-related welfare needs or sensory overload, and staff/contractors working long shifts.',

  gross_area:
    'Full-site capacities and areas are controlled by the wider Download EMP. KSS operational area assessment is based on the allocated bar, Co-Op shop, Paddock and accessibility campsite footprints confirmed in the latest deployment schedule and site plans.',
  net_area:
    'Net usable KSS operating space excludes bar counters, back-of-house, Co-Op shop structures, stock storage, emergency routes, accessible routes, service lanes, toilets, medical/welfare routes, tent lines, vehicle routes and any area unavailable due to ground condition.',
  excluded_areas:
    'Excluded areas include stage fields not assigned to KSS, non-KSS campsite areas, production areas unless tasked, police/medical/welfare treatment areas, restricted back-of-house, structures, plant, vehicle routes, emergency lanes, accessible routes and any area under another contractor control unless Event Control directs KSS support.',
  density_assumptions:
    'KSS will manage queues at conservative densities and intervene before stop-start movement, pressure at barriers, route encroachment, accessibility obstruction, distress, overheating or conflict develops. Co-Op shop queues will be treated as high-demand public queues when shop demand, product availability or customer flow creates a surge.',
  zone_capacities: lines(
    'Download expected attendance - 95,000 public plus approximately 5,000 staff.',
    'Camping and guest ticket population - approximately 70,000.',
    'Day ticket population - approximately 25,000.',
    'Accessibility campsites - grids W16 to S16 and R09, 24-hour provision.',
    'KSS allocated areas - Paddock, Accessible Campsite A4 and Accessible Campsite D, plus scheduled bars and the Co-Op shop.'
  ),
  ingress_flow_assumptions:
    'Ingress flow is controlled by the wider event gate plan. KSS accessibility campsite search support will allow additional processing time for mobility aids, medication, medical equipment, companions, sensory needs and private discussion while preserving throughput and dignity.',
  egress_flow_assumptions:
    'Egress assumptions will follow Event Control and the wider egress plan. KSS will remove or reconfigure local queue infrastructure when instructed, keep accessible exits clear, assist wristband checks where tasked, and report any customer directed to the wrong route.',
  emergency_clearance_assumptions:
    'Emergency clearance from KSS areas depends on immediate route protection, stopping service where required, opening barrier lines, directing customers away from the incident, supporting disabled and vulnerable persons, and maintaining radio updates to Event Control.',
  degraded_route_weather_assumptions:
    'Wet ground, mud, darkness, fatigue, crowd frustration or route loss will reduce performance. KSS will request additional lighting, matting, barrier changes, hold-and-release, welfare support or redeployment where accessible routes, campsite access, bar queues or Co-Op shop queues become unsafe.',

  command_structure:
    'KSS command operates through the KSS operational lead, area supervisors and Event Control. The wider Event Control Centre is located at Pit Lane Suites - Garage 39 and operates within the multi-agency structure managed by the client and Event Control Manager.',
  named_command_roles: lines(
    'KSS Operational Lead - Floyd Allen - Overall KSS delivery, client liaison and escalation.',
    'KSS Deputy / Escalation Lead - David Capener - Operational support, documentation, supervisor support, issue tracking and deputy escalation route.',
    'KSS Bars Supervisor - Nigel Train - Bar queue, refusals, Challenge 21 support and stock-route protection.',
    'KSS Co-Op Supervisor - Sponsorship Supervisor post holder - Co-Op shop ingress, egress, queue, perimeter, asset and welfare support, named on the live deployment sheet.',
    'KSS Accessibility Lead - Accessibility Manager post holder - Accessible Campsite A4, Accessible Campsite D, Accessibility Black Campsite and search support, named on the live deployment sheet.',
    'Download Safeguarding Coordinators - Leigh Harvey, Sandie Dunn and Lauren Stewart - safeguarding lead decision making across event shifts.',
    'Event Control Manager / Security Director or Deputies - wider event command and security escalation.'
  ),
  radio_channels_callsigns: lines(
    'Assigned KSS operational channel - Primary KSS supervisor, bar, Co-Op, Paddock and accessibility-area coordination using Download Event Control radio plan allocations.',
    'Event Control priority route - Emergency, safeguarding, welfare, medical, police, evacuation, route compromise, CT and major incident escalation.',
    'Area supervisor call signs - KSS Lead, KSS Deputy, Bars Lead, Co-Op Lead, Accessibility Lead, Paddock Lead and Search Lead, followed by post or zone where required.',
    'Team call sign format - KSS [Area] [Post/Number], for example KSS Co-Op 1, KSS Accessibility Search 1, KSS Paddock Gate or KSS Bar 3.',
    'Fallback communications - Supervisor mobile contact route held on the live contact sheet if radio failure, dead spot or confidentiality requires phone escalation.'
  ),
  reporting_lines:
    'KSS staff report to their KSS supervisor. KSS supervisors escalate to the KSS Operational Lead, KSS Deputy/Escalation Lead and Event Control. Safeguarding concerns, missing persons, sexual assault or harassment disclosures, Ask for Angela, under-18 concerns, vulnerable-person ejection/eviction, medical risk, crime, search refusal with illegality, crowd pressure or route compromise will be reported immediately. Welfare escalation is through Event Control to Events Wellbeing, Safeguarding Coordinators, Medical or Police as required. Evacuation authority sits with the event command structure through Event Control, Security Director/deputies and festival Silver/Gold; KSS may take immediate life-safety action while reporting actions as soon as safe. Eviction decisions sit with the onsite Eviction Team/Eviction Manager, line managed by the Security Director or deputies, with Event Silver/Gold sign-off where required.',
  external_interfaces: lines(
    'Event Control Centre - Pit Lane Suites, Garage 39.',
    'Festival Safeguarding Coordinators and Events Wellbeing welfare team.',
    'Medical provider and first aid posts.',
    'Security Director, deputies and other security contractor control teams.',
    'Accessibility team and accessibility campsite management.',
    'Bar operator management and Co-Op shop management.',
    'Leicestershire Police and Local Authority through Event Control where required.'
  ),
  key_contacts_directory: lines(
    'KSS Operational Lead - Floyd Allen - KSS Lead call sign / live contact sheet',
    'KSS Deputy / Escalation Lead - David Capener - KSS Deputy call sign / live contact sheet',
    'KSS Bars Supervisor - Nigel Train - Bars Lead call sign / live contact sheet',
    'KSS Co-Op Supervisor - Sponsorship Supervisor post holder - Co-Op Lead call sign / live deployment sheet',
    'KSS Accessibility Lead - Accessibility Manager post holder - Accessibility Lead call sign / live deployment sheet',
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
    'All KSS staff will receive a Download-specific briefing covering site layout, allocated areas, radio protocol, Challenge 21, search consent, prohibited items, Ask for Angela, safeguarding indicators, lost/found code words, accessibility etiquette, welfare handover, ejection/eviction pause, incident logging, emergency routes and staff welfare.',
  monitoring_and_density_tools:
    'Monitoring combines KSS supervisor observation, queue marshal reporting, bar and Co-Op manager feedback, accessibility campsite patrols, Event Control/CCTV updates, welfare/medical trend reports and dynamic risk assessment. Supervisors provide regular SITREPs during ingress, trading peaks, headline periods, nightly egress and campsite clearance.',

  service_delivery_scope:
    'KSS service delivery covers allocated bars, the Co-Op shop, Paddock, Accessible Campsite A4, Accessible Campsite D, Accessibility Black Campsite, accessibility campsite search support, queue management, asset protection, access control, welfare recognition, safeguarding escalation, incident response and emergency interface duties. KSS works proactively: supervisors walk routes before opening, officers monitor queue tails and customer mood, patrols look for vulnerability and route obstruction, and intervention is made early through calm conversation, queue reshaping, soft holds, welfare referral, response support or Event Control escalation before pressure becomes unmanaged.',
  build_break_operations:
    'During build and break, KSS protects assigned assets and routes, controls access where tasked, reports unsafe activity, supports staff welfare, preserves emergency routes and follows Event Control instruction. Children of working parents will not access construction areas and any lost child during build/break is escalated via Production/Event Control procedures.',
  specialist_teams_and_assets:
    'Specialist KSS assets include SIA search-capable staff, bar support officers, queue marshals, Co-Op shop ingress/egress support, Co-Op supervisors, accessibility campsite patrols, Paddock access staff, response capability, supervisors, welfare-aware staff and radios. Search involving a person is conducted only by SIA staff, with consent, in line with event policy.',
  staffing_by_zone_and_time: lines(
    'Saturday 6 June|SPONSORSHIP|Coop Campsite Security|Access Control|KSS Security|SIA|0||||0|||',
    'Saturday 6 June|SPONSORSHIP|Coop Security No 1|Access Control|KSS Security|SIA|0||||1|19:00|07:00|12.00',
    'Sunday 7 June|SPONSORSHIP|Coop Campsite Security|Access Control|KSS Security|SIA|0||||0|||',
    'Sunday 7 June|SPONSORSHIP|Coop Security No 1|Access Control|KSS Security|SIA|0||||1|19:00|07:00|12.00',
    'Monday 8 June|SPONSORSHIP|Sponsorship Supervisor|Access Control|KSS Security|SUP|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Monday 8 June|SPONSORSHIP|Coop Campsite Security|Access Control|KSS Security|SIA|0||||1|19:00|07:00|12.00',
    'Monday 8 June|SPONSORSHIP|Coop Security No 1|Access Control|KSS Security|SIA|0||||1|19:00|07:00|12.00',
    'Tuesday 9 June|SPONSORSHIP|Sponsorship Supervisor|Access Control|KSS Security|SUP|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Tuesday 9 June|SPONSORSHIP|Coop Campsite Security|Access Control|KSS Security|SIA|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Tuesday 9 June|SPONSORSHIP|Coop Security No 1|Access Control|KSS Security|SIA|0||||1|20:00|08:00|12.00',
    'Wednesday 10 June|SPONSORSHIP|Sponsorship Supervisor|Access Control|KSS Security|SUP|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Wednesday 10 June|SPONSORSHIP|Coop Campsite Security|Access Control|KSS Security|SIA|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Wednesday 10 June|SPONSORSHIP|Coop Security No 1|Access Control|KSS Security|SIA|1|12:00|00:00|12.00||||',
    'Wednesday 10 June|SPONSORSHIP|Coop Security No 2|Access Control|KSS Security|SIA|1|10:00|22:00|12.00|1|19:00|03:30|8.50',
    'Wednesday 10 June|SPONSORSHIP|Coop Security No 3|Access Control|KSS Security|SIA|1|15:00|03:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|SPONSORSHIP|Coop Security No 4|Access Control|KSS Security|SIA|0||||0|||',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessibility Entrance Supervisor|Supervisor|KSS Security|SUP|1|08:00|20:00|12.00||||',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Entrance Search Team|Access Control|KSS Security|SIA|4|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE ENTRANCE|Queue Management|Directional|KSS Security|ST|4|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Parking to Entrance Crossover|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE|Accessibility Manager|Manager|KSS Security|MGMT|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|ST|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE|Response Team 2 - Campsite D|Security Patrol|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE|Response Team 2 - Campsite D|Security Patrol|KSS Security|ST|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE|Access Control - Main Campsite Entrance|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE|Access Control - Main Campsite Buggy Pick Up|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE|Production Road - Crossing Point|Directional|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE|Access Control - Campsite D Point 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY CAMPSITE|Access Control - Campsite D Point 2 (Arena Only)|Access Control|KSS Security|SIA|0||||0|||',
    'Wednesday 10 June|ACCESSIBILITY BLACK CAMPSITE|Accessibility Black Campsite Supervisor|Access Control|KSS Security|SUP|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY BLACK CAMPSITE|Campsite Entrance 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY BLACK CAMPSITE|Campsite Entrance 2|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|ACCESSIBILITY BLACK CAMPSITE|Back Steelshield Gate|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|PADDOCK|Event Control|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Wednesday 10 June|PADDOCK|Paddock Gate|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Wednesday 10 June|PADDOCK|Artist Parking|Access Control|KSS Security|SIA|0||||0|||',
    'Wednesday 10 June|PADDOCK|Hospital Gate 2|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|SPONSORSHIP|Sponsorship Supervisor|Access Control|KSS Security|SUP|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessibility Entrance Supervisor|Supervisor|KSS Security|SUP|1|08:00|20:00|12.00||||',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Entrance Search Team|Access Control|KSS Security|SIA|3|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE ENTRANCE|Queue Management|Directional|KSS Security|ST|2|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Parking to Entrance Crossover|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE|Accessibility Manager|Manager|KSS Security|MGMT|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|ST|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE|Response Team 2 - Campsite D|Security Patrol|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE|Response Team 2 - Campsite D|Security Patrol|KSS Security|ST|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE|Access Control - Main Campsite Entrance|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE|Access Control - Main Campsite Buggy Pick Up|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE|Production Road - Crossing Point|Directional|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE|Access Control - Campsite D Point 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY CAMPSITE|Access Control - Campsite D Point 2 (Arena Only)|Access Control|KSS Security|SIA|0||||0|||',
    'Thursday 11 June|ACCESSIBILITY BLACK CAMPSITE|Accessibility Black Campsite Supervisor|Access Control|KSS Security|SUP|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY BLACK CAMPSITE|Campsite Entrance 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY BLACK CAMPSITE|Campsite Entrance 2|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|ACCESSIBILITY BLACK CAMPSITE|Back Steelshield Gate|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|PADDOCK|Event Control|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|PADDOCK|Paddock Gate|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Thursday 11 June|PADDOCK|Artist Parking|Access Control|KSS Security|SIA|0||||0|||',
    'Thursday 11 June|PADDOCK|Hospital Gate 2|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|SPONSORSHIP|Coop Campsite Security|Access Control|KSS Security|SIA|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Thursday 11 June|SPONSORSHIP|Coop Security No 1|Access Control|KSS Security|SIA|1|07:00|19:00|12.00|1|20:00|08:00|12.00',
    'Thursday 11 June|SPONSORSHIP|Coop Security No 2|Access Control|KSS Security|SIA|1|07:00|19:00|12.00|1|19:00|03:00|8.00',
    'Thursday 11 June|SPONSORSHIP|Coop Security No 3|Access Control|KSS Security|SIA|1|10:00|22:00|12.00|1|19:00|03:00|8.00',
    'Thursday 11 June|SPONSORSHIP|Coop Security No 4|Access Control|KSS Security|SIA|0||||1|19:00|03:00|8.00',
    'Friday 12 June|SPONSORSHIP|Sponsorship Supervisor|Access Control|KSS Security|SUP|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessibility Entrance Supervisor|Supervisor|KSS Security|SUP|1|08:00|20:00|12.00||||',
    'Friday 12 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Entrance Search Team|Access Control|KSS Security|SIA|4|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE ENTRANCE|Queue Management|Directional|KSS Security|ST|4|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Parking to Entrance Crossover|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE|Accessibility Manager|Manager|KSS Security|MGMT|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|SIA|1|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|ST|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE|Response Team 2 - Campsite D|Security Patrol|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE|Response Team 2 - Campsite D|Security Patrol|KSS Security|ST|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE|Access Control - Main Campsite Entrance|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE|Access Control - Main Campsite Buggy Pick Up|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE|Production Road - Crossing Point|Directional|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE|Access Control - Campsite D Point 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY CAMPSITE|Access Control - Campsite D Point 2 (Arena Only)|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY BLACK CAMPSITE|Accessibility Black Campsite Supervisor|Access Control|KSS Security|SUP|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY BLACK CAMPSITE|Campsite Entrance 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY BLACK CAMPSITE|Campsite Entrance 2|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|ACCESSIBILITY BLACK CAMPSITE|Back Steelshield Gate|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|PADDOCK|Event Control|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|PADDOCK|Paddock Gate|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Friday 12 June|PADDOCK|Artist Parking|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Friday 12 June|PADDOCK|Hospital Gate 2|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|SPONSORSHIP|Coop Campsite Security|Access Control|KSS Security|SIA|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Friday 12 June|SPONSORSHIP|Coop Security No 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Friday 12 June|SPONSORSHIP|Coop Security No 2|Access Control|KSS Security|SIA|1|07:00|19:00|12.00|1|19:00|03:00|8.00',
    'Friday 12 June|SPONSORSHIP|Coop Security No 3|Access Control|KSS Security|SIA|1|10:00|22:00|12.00|0||||',
    'Friday 12 June|SPONSORSHIP|Coop Security No 4|Access Control|KSS Security|SIA|1|15:00|03:00|12.00|1|19:00|03:00|8.00',
    'Saturday 13 June|SPONSORSHIP|Sponsorship Supervisor|Access Control|KSS Security|SUP|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessibility Entrance Supervisor|Supervisor|KSS Security|SUP|0||||0|||',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Entrance Search Team|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE ENTRANCE|Queue Management|Directional|KSS Security|ST|0||||0|||',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Parking to Entrance Crossover|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE|Accessibility Manager|Manager|KSS Security|MGMT|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|SIA|1|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|ST|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE|Response Team 2 - Campsite D|Security Patrol|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE|Response Team 2 - Campsite D|Security Patrol|KSS Security|ST|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE|Access Control - Main Campsite Entrance|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE|Access Control - Main Campsite Buggy Pick Up|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE|Production Road - Crossing Point|Directional|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE|Access Control - Campsite D Point 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY CAMPSITE|Access Control - Campsite D Point 2 (Arena Only)|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY BLACK CAMPSITE|Accessibility Black Campsite Supervisor|Access Control|KSS Security|SUP|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY BLACK CAMPSITE|Campsite Entrance 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY BLACK CAMPSITE|Campsite Entrance 2|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|ACCESSIBILITY BLACK CAMPSITE|Back Steelshield Gate|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|PADDOCK|Event Control|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|PADDOCK|Paddock Gate|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Saturday 13 June|PADDOCK|Artist Parking|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Saturday 13 June|PADDOCK|Hospital Gate 2|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|SPONSORSHIP|Coop Campsite Security|Access Control|KSS Security|SIA|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Saturday 13 June|SPONSORSHIP|Coop Security No 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Saturday 13 June|SPONSORSHIP|Coop Security No 2|Access Control|KSS Security|SIA|1|07:00|19:00|12.00|1|19:00|03:00|8.00',
    'Saturday 13 June|SPONSORSHIP|Coop Security No 3|Access Control|KSS Security|SIA|1|10:00|22:00|12.00|0||||',
    'Saturday 13 June|SPONSORSHIP|Coop Security No 4|Access Control|KSS Security|SIA|1|15:00|03:00|12.00|1|19:00|03:00|8.00',
    'Sunday 14 June|SPONSORSHIP|Sponsorship Supervisor|Access Control|KSS Security|SUP|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessibility Entrance Supervisor|Supervisor|KSS Security|SUP|0||||0|||',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Entrance Search Team|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE ENTRANCE|Queue Management|Directional|KSS Security|ST|0||||0|||',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Parking to Entrance Crossover|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE|Accessibility Manager|Manager|KSS Security|MGMT|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|SIA|1|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|ST|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE|Response Team 2 - Campsite D|Security Patrol|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE|Response Team 2 - Campsite D|Security Patrol|KSS Security|ST|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE|Access Control - Main Campsite Entrance|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE|Access Control - Main Campsite Buggy Pick Up|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE|Production Road - Crossing Point|Directional|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE|Access Control - Campsite D Point 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY CAMPSITE|Access Control - Campsite D Point 2 (Arena Only)|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY BLACK CAMPSITE|Accessibility Black Campsite Supervisor|Access Control|KSS Security|SUP|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY BLACK CAMPSITE|Campsite Entrance 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY BLACK CAMPSITE|Campsite Entrance 2|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|ACCESSIBILITY BLACK CAMPSITE|Back Steelshield Gate|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|PADDOCK|Event Control|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|PADDOCK|Paddock Gate|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Sunday 14 June|PADDOCK|Artist Parking|Access Control|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00',
    'Sunday 14 June|PADDOCK|Hospital Gate 2|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|SPONSORSHIP|Coop Campsite Security|Access Control|KSS Security|SIA|1|07:00|19:00|12.00|1|19:00|07:00|12.00',
    'Sunday 14 June|SPONSORSHIP|Coop Security No 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00',
    'Sunday 14 June|SPONSORSHIP|Coop Security No 2|Access Control|KSS Security|SIA|1|07:00|19:00|12.00|1|19:00|03:00|8.00',
    'Sunday 14 June|SPONSORSHIP|Coop Security No 3|Access Control|KSS Security|SIA|1|10:00|22:00|12.00|0||||',
    'Sunday 14 June|SPONSORSHIP|Coop Security No 4|Access Control|KSS Security|SIA|1|15:00|03:00|12.00|1|19:00|03:00|8.00',
    'Monday 15 June|SPONSORSHIP|Sponsorship Supervisor|Access Control|KSS Security|SUP|1|07:00|13:00|6.00||||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessibility Entrance Supervisor|Supervisor|KSS Security|SUP|0||||0|||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Entrance Search Team|Access Control|KSS Security|SIA|1|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE ENTRANCE|Queue Management|Directional|KSS Security|ST|0||||0|||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Parking to Entrance Crossover|Access Control|KSS Security|SIA|1|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE|Accessibility Manager|Manager|KSS Security|MGMT|1|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|SIA|2|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|ST|1|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE|Response Team 2 - Campsite D|Security Patrol|KSS Security|SIA|1|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE|Response Team 2 - Campsite D|Security Patrol|KSS Security|ST|1|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE|Access Control - Main Campsite Entrance|Access Control|KSS Security|SIA|1|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE|Access Control - Main Campsite Buggy Pick Up|Access Control|KSS Security|SIA|1|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE|Production Road - Crossing Point|Directional|KSS Security|SIA|2|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE|Access Control - Campsite D Point 1|Access Control|KSS Security|SIA|1|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY CAMPSITE|Access Control - Campsite D Point 2 (Arena Only)|Access Control|KSS Security|SIA|0||||0|||',
    'Monday 15 June|ACCESSIBILITY BLACK CAMPSITE|Accessibility Black Campsite Supervisor|Access Control|KSS Security|SUP|1|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY BLACK CAMPSITE|Campsite Entrance 1|Access Control|KSS Security|SIA|1|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY BLACK CAMPSITE|Campsite Entrance 2|Access Control|KSS Security|SIA|1|08:00|15:00|7.00||||',
    'Monday 15 June|ACCESSIBILITY BLACK CAMPSITE|Back Steelshield Gate|Access Control|KSS Security|SIA|1|08:00|15:00|7.00||||',
    'Monday 15 June|PADDOCK|Event Control|Access Control|KSS Security|SIA|1|08:00|15:00|7.00||||',
    'Monday 15 June|PADDOCK|Paddock Gate|Access Control|KSS Security|SIA|2|08:00|15:00|7.00||||',
    'Monday 15 June|PADDOCK|Artist Parking|Access Control|KSS Security|SIA|0||||0|||',
    'Monday 15 June|PADDOCK|Hospital Gate 2|Access Control|KSS Security|SIA|1|08:00|15:00|7.00||||',
    'Monday 15 June|SPONSORSHIP|Coop Campsite Security|Access Control|KSS Security|SIA|1|07:00|13:00|6.00||||',
    'Monday 15 June|SPONSORSHIP|Coop Security No 1|Access Control|KSS Security|SIA|1|08:00|20:00|12.00||||',
    'Monday 15 June|SPONSORSHIP|Coop Security No 2|Access Control|KSS Security|SIA|0||||0|||',
    'Monday 15 June|SPONSORSHIP|Coop Security No 3|Access Control|KSS Security|SIA|0||||0|||',
    'Monday 15 June|SPONSORSHIP|Coop Security No 4|Access Control|KSS Security|SIA|0||||0|||',
    'Thursday 11 June|BARS|STAFF CAMPSITE|Bar Security|KSS Security|1 SIA|1|11:00|23:00|12.00|1|23:00|11:00|12.00',
    'Friday 12 June|BARS|STAFF CAMPSITE|Bar Security|KSS Security|1 SIA|1|11:00|23:00|12.00|1|23:00|11:00|12.00',
    'Saturday 13 June|BARS|STAFF CAMPSITE|Bar Security|KSS Security|1 SIA|1|11:00|23:00|12.00|1|23:00|11:00|12.00',
    'Sunday 14 June|BARS|STAFF CAMPSITE|Bar Security|KSS Security|1 SIA|1|11:00|23:00|12.00|1|23:00|11:00|12.00',
    'Thursday 11 June|BARS|MGMT|Bar Security|KSS Security|1 SUP|1|20:00|08:00|12.00|0|||',
    'Friday 12 June|BARS|MGMT|Bar Security|KSS Security|1 MGMT, 1 SUP|2|08:00|08:00|24.00|0|||',
    'Saturday 13 June|BARS|MGMT|Bar Security|KSS Security|1 MGMT, 1 SUP|2|08:00|08:00|24.00|0|||',
    'Sunday 14 June|BARS|MGMT|Bar Security|KSS Security|1 MGMT, 1 SUP|2|08:00|08:00|24.00|0|||',
    'Friday 12 June|BARS|RESPONSE|Bar Security|KSS Security|1 SUP, 2 SIA|3|11:30|23:00|11.50|0|||',
    'Saturday 13 June|BARS|RESPONSE|Bar Security|KSS Security|1 SUP, 2 SIA|3|09:30|23:00|13.50|0|||',
    'Sunday 14 June|BARS|RESPONSE|Bar Security|KSS Security|1 SUP, 2 SIA|3|09:30|23:00|13.50|0|||',
    'Thursday 11 June|BARS|BAR 1|Bar Security|KSS Security|Overnight SIA|0||||1|23:00|11:30|12.50',
    'Friday 12 June|BARS|BAR 1|Bar Security|KSS Security|1 SUP, 2 SIA, 2 ST|5|12:00|22:30|10.50|1|22:30|09:30|11.00',
    'Saturday 13 June|BARS|BAR 1|Bar Security|KSS Security|1 SUP, 2 SIA, 2 ST|5|10:00|22:30|12.50|1|23:00|09:30|10.50',
    'Sunday 14 June|BARS|BAR 1|Bar Security|KSS Security|1 SUP, 2 SIA, 2 ST|5|10:00|22:30|12.50|1|23:00|08:00|9.00',
    'Thursday 11 June|BARS|BAR 2|Bar Security|KSS Security|Overnight SIA|0||||1|23:00|11:30|12.50',
    'Friday 12 June|BARS|BAR 2|Bar Security|KSS Security|1 SUP, 2 SIA, 2 ST|5|12:00|23:00|11.00|1|23:00|09:30|10.50',
    'Saturday 13 June|BARS|BAR 2|Bar Security|KSS Security|1 SUP, 2 SIA, 2 ST|5|10:00|23:00|13.00|1|23:00|09:30|10.50',
    'Sunday 14 June|BARS|BAR 2|Bar Security|KSS Security|1 SUP, 2 SIA, 2 ST|5|10:00|23:00|13.00|1|23:00|08:00|9.00',
    'Thursday 11 June|BARS|BAR 3|Bar Security|KSS Security|Overnight SIA|0||||1|23:00|11:30|12.50',
    'Friday 12 June|BARS|BAR 3|Bar Security|KSS Security|1 SUP, 2 SIA, 2 ST|5|12:00|23:00|11.00|1|23:00|09:30|10.50',
    'Saturday 13 June|BARS|BAR 3|Bar Security|KSS Security|1 SUP, 2 SIA, 2 ST|5|10:00|23:00|13.00|1|23:00|09:30|10.50',
    'Sunday 14 June|BARS|BAR 3|Bar Security|KSS Security|1 SUP, 2 SIA, 2 ST|5|10:00|23:00|13.00|1|23:00|08:00|9.00',
    'Thursday 11 June|BARS|BAR 4|Bar Security|KSS Security|Overnight SIA|0||||1|23:00|11:30|12.50',
    'Friday 12 June|BARS|BAR 4|Bar Security|KSS Security|1 SUP, 2 SIA, 2 ST|5|12:00|22:30|10.50|1|23:00|09:30|10.50',
    'Saturday 13 June|BARS|BAR 4|Bar Security|KSS Security|1 SUP, 2 SIA, 2 ST|5|10:00|22:30|12.50|1|23:00|09:30|10.50',
    'Sunday 14 June|BARS|BAR 4|Bar Security|KSS Security|1 SUP, 2 SIA, 2 ST|5|10:00|22:30|12.50|1|23:00|08:00|9.00',
    'Thursday 11 June|BARS|ROCKTAIL|Bar Security|KSS Security|Overnight SIA|0||||1|23:00|11:30|12.50',
    'Friday 12 June|BARS|ROCKTAIL|Bar Security|KSS Security|1 SUP, 1 SIA|2|12:00|22:00|10.00|1|22:00|09:30|11.50',
    'Saturday 13 June|BARS|ROCKTAIL|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|22:00|12.00|1|22:00|09:30|11.50',
    'Sunday 14 June|BARS|ROCKTAIL|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|22:00|12.00|1|22:00|08:00|10.00',
    'Thursday 11 June|BARS|Guest Area|Bar Security|KSS Security|1 SUP|1|16:00|02:00|10.00|1|02:00|09:30|7.50',
    'Friday 12 June|BARS|Guest Area|Bar Security|KSS Security|1 SUP|1|10:00|02:00|16.00|0|||',
    'Saturday 13 June|BARS|Guest Area|Bar Security|KSS Security|1 SUP|1|10:00|02:00|16.00|0|||',
    'Sunday 14 June|BARS|Guest Area|Bar Security|KSS Security|1 SUP|1|10:00|01:00|15.00|0|||',
    'Thursday 11 June|BARS|IRON HARP|Bar Security|KSS Security|Overnight SIA|0||||1|23:00|11:30|12.50',
    'Friday 12 June|BARS|IRON HARP|Bar Security|KSS Security|1 SUP, 2 SIA|3|12:00|22:30|10.50|1|23:00|09:30|10.50',
    'Saturday 13 June|BARS|IRON HARP|Bar Security|KSS Security|1 SUP, 2 SIA|3|10:00|22:30|12.50|1|23:00|09:30|10.50',
    'Sunday 14 June|BARS|IRON HARP|Bar Security|KSS Security|1 SUP, 2 SIA|3|10:00|22:30|12.50|1|23:00|08:00|9.00',
    'Friday 12 June|BARS|Goose Neck|Bar Security|KSS Security|2 SIA, 1 ST|3|12:00|22:30|10.50|0|||',
    'Saturday 13 June|BARS|Goose Neck|Bar Security|KSS Security|2 SIA, 1 ST|3|10:00|22:30|12.50|0|||',
    'Sunday 14 June|BARS|Goose Neck|Bar Security|KSS Security|2 SIA, 1 ST|3|10:00|22:30|12.50|0|||',
    'Thursday 11 June|BARS|BEERHALL|Bar Security|KSS Security|Overnight SIA|0||||1|20:00|08:00|12.00',
    'Friday 12 June|BARS|BEERHALL|Bar Security|KSS Security|1 SUP, 1 SIA|2|12:00|22:30|10.50|1|20:00|08:00|12.00',
    'Saturday 13 June|BARS|BEERHALL|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|22:30|12.50|1|03:00|08:00|5.00',
    'Sunday 14 June|BARS|BEERHALL|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|22:30|12.50|1|23:00|08:00|9.00',
    'Friday 12 June|BARS|BEERHALL SPIRIT|Bar Security|KSS Security|1 SIA|1|12:00|22:30|10.50|0|||',
    'Saturday 13 June|BARS|BEERHALL SPIRIT|Bar Security|KSS Security|1 SIA|1|10:00|22:30|12.50|0|||',
    'Sunday 14 June|BARS|BEERHALL SPIRIT|Bar Security|KSS Security|1 SIA|1|10:00|22:30|12.50|0|||',
    'Thursday 11 June|BARS|VIPN Bar|Bar Security|KSS Security|Overnight SIA|0||||1|23:00|11:30|12.50',
    'Friday 12 June|BARS|VIPN Bar|Bar Security|KSS Security|1 SUP, 1 SIA|2|12:00|22:30|10.50|1|23:00|09:30|10.50',
    'Saturday 13 June|BARS|VIPN Bar|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|22:30|12.50|1|23:00|09:30|10.50',
    'Sunday 14 June|BARS|VIPN Bar|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|22:30|12.50|1|23:00|08:00|9.00',
    'Thursday 11 June|BARS|HAIR OF THE DOG|Bar Security|KSS Security|1 SIA|1|10:00|03:00|17.00|0|||',
    'Friday 12 June|BARS|HAIR OF THE DOG|Bar Security|KSS Security|1 SIA|1|10:00|03:00|17.00|0|||',
    'Saturday 13 June|BARS|HAIR OF THE DOG|Bar Security|KSS Security|1 SIA|1|10:00|03:00|17.00|0|||',
    'Sunday 14 June|BARS|HAIR OF THE DOG|Bar Security|KSS Security|1 SIA|1|10:00|03:00|17.00|0|||',
    'Friday 12 June|BARS|GUINNESS|Bar Security|KSS Security|1 SIA|1|12:00|22:30|10.50|0|||',
    'Saturday 13 June|BARS|GUINNESS|Bar Security|KSS Security|1 SIA|1|12:00|22:30|10.50|0|||',
    'Sunday 14 June|BARS|GUINNESS|Bar Security|KSS Security|1 SIA|1|12:00|22:30|10.50|0|||',
    'Thursday 11 June|BARS|Pub - DX|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|03:00|17.00|1|03:00|08:00|5.00',
    'Friday 12 June|BARS|Pub - DX|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|03:00|17.00|1|03:00|08:00|5.00',
    'Saturday 13 June|BARS|Pub - DX|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|03:00|17.00|1|03:00|08:00|5.00',
    'Sunday 14 June|BARS|Pub - DX|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|03:00|17.00|1|03:00|08:00|5.00',
    'Thursday 11 June|BARS|The Mercian Axe|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|02:30|16.50|1|03:00|09:00|6.00',
    'Friday 12 June|BARS|The Mercian Axe|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|02:30|16.50|1|03:00|09:00|6.00',
    'Saturday 13 June|BARS|The Mercian Axe|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|02:30|16.50|1|03:00|09:00|6.00',
    'Sunday 14 June|BARS|The Mercian Axe|Bar Security|KSS Security|1 SUP, 1 SIA|2|10:00|02:30|16.50|1|03:00|11:00|8.00'
  ),
  response_teams: lines(
    'KSS response pair/team - Support refusals, Co-Op shop pressure, route compromise, welfare escort and supervisor requests.',
    'Accessibility campsite response - Response Team 1 Main Campsite and Response Team 2 Campsite D provide SIA/ST patrol coverage as scheduled, supporting accessible campsite incidents, welfare concerns, search escalation, lost/found reports and overnight patrols.',
    'Bar response - Support service refusal conflict, queue pressure, Challenge 21 escalation, proxy-purchase concerns and ejection requests.',
    'Paddock response/access support - Event Control, Paddock Gate, Artist Parking and Hospital Gate 2 posts maintain access control, route protection, escalation and welfare-aware monitoring as scheduled.',
    'Safeguarding support role - Preserve privacy, maintain safety, escort to welfare/safe space with a minimum two-person approach where required, and hand over to welfare/safeguarding.'
  ),
  relief_and_contingency:
    'Supervisors will rotate staff to manage fatigue, hydration, meal breaks, sensory load and night-shift tiredness. Relief will not leave search points, accessibility routes, bar queues or Co-Op shop queues unsupported. Any staffing gap in a safeguarding-sensitive area is escalated immediately.',
  escalation_staffing:
    'Escalation staffing is requested where bar queues or Co-Op shop queues block routes, accessibility search delay causes distress, welfare incidents increase, lost person reports are active, weather degrades routes, ejection/eviction volume rises, or Event Control requests area search or emergency support. Supervisors should request support before the queue footprint is lost, before accessible dignity is compromised, and before repeated conflict becomes normalised.',
  dynamic_escalation_triggers: lines(
    'Queue spillback onto an emergency route, accessible route, stock route, toilet route, welfare/medical route or main circulation route.',
    'Sustained stop/start movement, barrier pressure, crowd compression, customer distress, overheating or inability to leave a queue freely.',
    'Repeated refusal conflict, proxy purchasing, intoxication, harassment disclosure, suspected spiking, theft, disorder or staff safety concern.',
    'Accessibility route width compromised, buggy movement delayed, medication/equipment search uncertainty, search privacy unavailable or disabled guest distress escalating.',
    'Welfare, medical, safeguarding, Ask for Angela, lost/found child or vulnerable adult demand exceeding local supervisor capability.',
    'Severe weather, mud, poor lighting, route closure, barrier damage or service vehicle conflict reducing safe route usability.',
    'Co-Op shop or bar demand exceeding the planned queue footprint, causing uncontrolled dwell, entry pressure, exit conflict or shop/service suspension risk.'
  ),
  bar_operations_roles:
    'KSS bar roles include queue entry management, queue-tail monitoring, Challenge 21 support, refusal conflict support, stock/service route protection, welfare recognition, Ask for Angela response, evidence preservation, ejection pause and reporting to the bar supervisor and Event Control.',
  search_screening_roles:
    'KSS search roles include consent-based person and bag search where tasked, accessibility campsite search support, prohibited item escalation, refusal reporting, same-sex person search unless a customer requests wand-based mixed-gender support, PPE use, privacy, witness support and Event Control logging.',
  front_of_stage_roles:
    'For the Co-Op shop, KSS roles include queue layout, barrier control, asset protection, customer welfare, surge prevention, staff/stock route protection, vulnerable-person recognition, welfare handover and supervisor liaison with the Co-Op manager. The Co-Op is an actual shop, not a style of queue: KSS supports shop ingress, egress, queue control, perimeter protection, asset protection and welfare escalation around the retail operation.',
  traffic_pedestrian_roles:
    'KSS pedestrian interface roles include preserving accessible routes, separating queues from vehicle/stock routes, supporting Paddock movement, reporting unsafe crossings, assisting hold-and-release where instructed, and maintaining clear routes to welfare, medical and emergency exits.',
  camping_security_roles:
    'KSS camping roles focus on Accessible Campsite A4, Accessible Campsite D, Accessibility Black Campsite and Paddock interfaces shown on the supplied schedule. Roles include accessibility entrance supervision, accessible entrance search team, queue management, accessible parking-to-entrance crossover, accessibility manager, response teams, main campsite entrance access control, buggy pick-up, production road crossing, Campsite D access points, Black Campsite entrances, Back Steelshield Gate, Paddock Event Control, Paddock Gate, Artist Parking and Hospital Gate 2. Duties include access checks, accessibility campsite search support, perimeter awareness, patrols, 24-hour welfare vigilance, quiet support, lost/found escalation, safeguarding-led ejection/eviction pause and emergency route preservation.',
  vip_backstage_roles:
    'KSS has no general RIP/VIP ownership under this plan unless separately tasked by Event Control. If tasked, KSS will support accreditation checks, route protection, welfare escalation and handover to the controlling contractor.',
  stewarding_roles:
    'KSS stewarding and queue marshal roles include customer direction, queue-tail management, accessible service support, signage reinforcement, route protection, welfare reporting, help hub direction and immediate supervisor escalation when authority beyond stewarding is required.',

  ingress_routes_holding_areas:
    'KSS ingress activity is focused on accessibility campsite search, Paddock and assigned bars/Co-Op shop areas as they open. Accessible customers will be processed calmly with suitable space, privacy, companion consideration, medication/medical equipment sensitivity and clear routes onward.',
  search_policy:
    'Search is carried out only on behalf of and under instruction of the client. Security staff have no independent power to search; consent will be requested and confirmed. SIA staff may conduct person searches. Bags may be searched by either sex. Nobody is exempt from the search procedure, subject to event-specific arrangements. Refusal of search is escalated to the supervisor, Event Control and client decision route. Illegal items, weapons, pyrotechnics or harmful items are escalated immediately.',
  queue_design:
    'Queue design for bars, Co-Op shop and accessibility campsite search will keep emergency routes, accessible routes, welfare/medical routes, stock routes and service lanes clear. Barrier lines should avoid compression, allow escape gaps, maintain sight lines and provide space for wheelchair users, mobility aids and companions.',
  overspill_controls:
    'If queues overspill, KSS supervisors will extend or re-route lanes only with safe route checks, pause entry to the queue where required, call Event Control, request extra staff, protect accessibility routes, communicate expected wait and stop activity/service if public safety is compromised.',
  accessible_entry_arrangements:
    'Accessibility customers will receive dignified, proportionate search and entry support. Accessibility campsite search will account for mobility aids, medical equipment, medication, carers/companions, hidden disabilities, sensory needs and additional time. Any uncertainty is escalated to the accessibility lead and Event Control rather than resolved by refusal alone.',
  ingress_operations:
    'Pre-opening checks include barrier layout, signage, prohibited item information, radio checks, PPE, surrender bins, lighting, ground condition, accessible route width, welfare route, medical route, staff briefing and escalation contacts. Supervisors confirm readiness to KSS control/Event Control.',

  circulation_controls:
    'KSS protects circulation around bars, Co-Op shop, Paddock and accessibility campsites through fixed observation, queue marshal reporting, patrols and supervisor intervention. The working method is active and supervisory: route width is checked repeatedly, queue tails are repositioned before they drift into circulation, accessible users are given space rather than pushed through pressure, and service or stock movements are held where public density makes movement unsafe.',
  high_density_controls:
    'High-density controls apply to the Co-Op shop when shop entry, exit or queue demand creates pressure. Controls include queue caps, barriered feeder lanes, protected shop ingress and egress, soft holds, staff reinforcement, welfare observation, public communication, stopping entry or shop access if needed and preserving accessible routes.',
  internal_queue_controls:
    'Internal queues will be actively managed so they do not block emergency exits, accessible routes, medical/welfare routes, toilets, stock routes or public circulation. Queue tails are monitored and reported, and vulnerable or distressed persons are removed from queue pressure for welfare support.',

  transport_interface:
    'KSS has no primary transport ownership unless tasked, and KSS will support accessible drop-off/search interfaces, Paddock routes, campsite return and any shared-space deployment under Event Control. Any vehicle/person conflict is reported immediately.',
  dispersal_routes:
    'Nightly dispersal includes arena egress, accessible and guest exits, campsite return, bar close-down and Co-Op shop close-down. KSS staff will clear queue infrastructure where instructed, keep accessible routes open and direct customers to the correct route based on wristband/access entitlement.',
  reentry_policy:
    'Re-entry and access entitlement are controlled by the Download ticketing and wristband policy. KSS will not create informal exceptions except under Event Control instruction for welfare, medical or accessibility reasons, and any such decision is logged.',
  egress_operations:
    'Egress operations include bar wind-down, queue clear-down, Co-Op shop closure, asset checks, accessible route protection, wristband checks where tasked, welfare monitoring and SITREPs to Event Control until the area is stood down. Queue collapse is managed by closing the queue tail first, stopping new joiners, keeping exit channels open, removing or opening barriers only when crowd pressure allows, directing customers to the agreed route split and holding local movement if Event Control reports downstream congestion.',

  safeguarding_process:
    'Safeguarding at Download Festival 2026 is governed by the FAB Safeguarding Policy v2.1 and the event Safeguarding and Welfare Plan. KSS staff are responsible for vigilance, early identification, immediate risk control, privacy and escalation only. KSS staff will not conduct safeguarding investigations or make safeguarding decisions. All concerns go via Event Control to the Safeguarding Coordinator, Welfare, Medical, Police or Local Authority as required.',
  safe_spaces:
    'Safe spaces include welfare tents, Campsite Manager/Help Hubs, BOH bar areas where appropriate, the welfare facility and other locations directed by Event Control. Ask for Angela customers are discreetly removed from the situation with consent and escorted by a minimum of two staff where practicable, including at least one of the same sex where possible.',
  lost_vulnerable_person_process:
    'Lost or found children/vulnerable adults are priority safeguarding incidents. Use code word Disney for lost/found child and Mr Care for lost/found vulnerable adult. Notify supervisor and Event Control immediately, keep radio detail discreet, preserve the reporting person, escort found persons to welfare using two staff where instructed, and continue logging until Event Control confirms resolution.',
  ask_for_angela_process:
    'Ask for Angela operates across the festival and is briefed to security, stewards and bar staff. In bars or the Co-Op shop, discreetly move the person away from the concern to a safe space or welfare point, contact Event Control with precise location, avoid public challenge, monitor any suspect only if safe, and await welfare/safeguarding direction.',
  confidentiality_logging:
    'Safeguarding information is sensitive. KSS logs will be factual, minimal, time-stamped and shared only with those who need it for immediate safety. Event Control and safeguarding records are handled under GDPR. KSS records will not duplicate detailed welfare case notes unless required for security action.',

  licensable_activities:
    'Licensable activities include alcohol sales at bars and regulated entertainment under the Donington Park venue licence and Download operating arrangements. The Download Challenge 21 policy also applies to stalls selling, sampling or advertising cigarettes, vapes, snus nicotine pouches or other nicotine products. KSS supports licence objectives by preventing crime and disorder, protecting public safety, preventing public nuisance and protecting children from harm.',
  dps_name: 'Jess Shields',
  challenge_policy: 'Challenge 21',
  licensing_conditions:
    'Premises Licence NWL20390 requires Challenge 21 at all bars within the premises. The Premises Licence Holder is required to adopt Challenge 21 and ensure adequate documented training before staff serve alcohol. The mandatory age verification condition requires photographic ID showing date of birth and either a holographic mark or ultraviolet feature. Key conditions relevant to KSS include Challenge 21 at all bars, application of the policy to nicotine-product stalls, refusal logging, proxy-purchase controls, protection of children from harm, public safety, prevention of crime and disorder, welfare escalation and preservation of emergency/accessibility routes.',
  venue_rules:
    'Venue rules include valid ticket/wristband access, compliance with search, no prohibited items, no illegal drugs, no weapons or pyrotechnics, no unauthorised alcohol/tobacco/nicotine-product sales, no disruptive or anti-social behaviour, no harassment, no unauthorised access and compliance with lawful staff instructions. Customers who appear under 21 are required to produce acceptable proof of age before alcohol or nicotine products are sold, sampled or provided. Proxy purchasing for under-18s is prohibited and may lead to refusal and escalation to the Eviction Team/Event Control. Entry-refusal grounds before ticket scan include no valid ticket/pass/wristband, breach of admissions policy, unacceptable/disruptive/anti-social behaviour, arrest/caution linked to a criminal offence, refusal to submit to search, illegal activity, offensive behaviour, object throwing, incitement, obstructing security/emergency services, unlawful drugs, unauthorised selling, ticket touting or conduct that compromises a safe event. Eviction grounds after entry follow the Eviction Team process.',
  prohibited_items:
    'Prohibited items include controlled substances, weapons, pyrotechnics, items that could cause harm, camping equipment in the arena, bags outside arena restrictions, and any item prohibited by the current Download Festival conditions of entry. Accessibility-related medication or equipment will be handled sensitively and escalated rather than refused without review.',

  incident_management:
    'Incident response prioritises life safety, safeguarding, crowd stability, privacy and accurate escalation. Staff make the area safe, call the supervisor/Event Control, preserve evidence where relevant, avoid public confrontation, request welfare/medical/police support and log actions. Safeguarding concerns override routine behavioural removal. Where eviction is requested, KSS will provide the Eviction Manager with the requesting staff member name, tabard number/contact where available, full grounds for the request, date/time, evidence/witness information and any welfare or safeguarding concerns.',

  risk_assessment_methodology:
    'This risk assessment is derived from the KSS Download scope, supplied CSMP, Safeguarding and Welfare Plan, FAB Safeguarding Policy, selected annexes, site profile and dynamic risk assessment. It focuses on bars, Co-Op shop, accessibility campsite operations, search support, welfare, safeguarding, ejection/eviction pause and emergency interface duties.',
  risk_assessment_scope:
    'The KSS risk assessment covers bar queues and refusals, Co-Op shop ingress, egress, queueing and perimeter support, accessibility campsite search, Accessible Campsite A4 and D operations, Paddock duties, lost/found persons, Ask for Angela, ejection/eviction, welfare handover, staff welfare and route protection.',
  risk_assessment_source_notes:
    'Source documents identify Download as a high-capacity 95,000 public event at Donington Park, with 70,000 campers/guest tickets, 25,000 day tickets, 5,000 staff, 24-hour Event Control, Challenge 21, accessibility campsites, consent-based search, welfare providers, safeguarding coordinators, lost/found procedures and a mandatory safeguarding pause before vulnerable-person ejection or eviction.',
  additional_operational_risks: lines(
    'Safeguarding concern during refusal or ejection - Child, vulnerable adult or temporarily vulnerable person - Stop removal, move to safety, notify Event Control, deploy welfare/safeguarding and record only factual security actions.',
    'Co-Op shop queue surge - Co-Op customers, disabled customers, staff and assets - Queue cap, barrier adjustment, pause shop entry, preserve accessible route and request Event Control support.',
    'Accessibility campsite search distress - Disabled guests, companions and search staff - Use consent-based search, privacy, additional time, supervisor review and accessibility lead escalation.',
    'Bar refusal conflict - Bar staff, customers and KSS - Challenge 21 support, de-escalation, welfare check, no unmanaged ejection and Event Control logging.',
    'Lost child or vulnerable adult - Public, welfare, security and police - Use Disney/Mr Care code words, notify Event Control, retain reporting party, circulate description discreetly and follow welfare lead.'
  ),

  emergency_procedures:
    'Emergency procedures are directed by the wider Download EMP and Event Control. KSS duties are to protect life, stop service/activity where instructed, clear and hold routes, support disabled and vulnerable persons, preserve emergency access, report conditions and await Event Control or emergency-service direction. KSS bars, Co-Op shop, Paddock and accessibility campsite teams will immediately identify the affected footprint, keep emergency and accessible routes open, collapse local queues in a controlled direction, and confirm route status back to Event Control.',
  partial_evacuation_procedure:
    'For partial evacuation of a bar, Co-Op shop, Paddock or accessibility campsite area, KSS stops entry, closes or collapses the queue tail, clears the affected footprint using the route instructed by Event Control, protects adjoining routes, supports vulnerable/disabled persons, updates Event Control and prevents re-entry until authorised. If the primary route is blocked, supervisors hold the area locally and request the approved fallback route from Event Control rather than self-routing crowds into unknown conditions.',
  full_evacuation_procedure:
    'For full evacuation, KSS follows Event Control instructions, opens pre-briefed routes, directs customers calmly, prioritises accessibility and welfare support, reports sector status and does not release staff until accountability and route duties are complete. Accessibility campsite teams support disabled evacuation by keeping mobility routes clear, identifying guests requiring assistance, linking with accessibility buggy/support provision where directed and reporting any person unable to move without assistance.',
  lockdown_invacuation_procedure:
    'For lockdown or invacuation, KSS moves customers away from exposed areas where safe, closes access points under instruction, preserves cover, avoids unnecessary movement, reports suspicious activity and follows Run Hide Tell / ACT guidance. Dynamic lockdown may require bars, Co-Op shop or campsite access points to stop entry, move people away from glazing/open frontages, secure staff-only areas where suitable, keep radio traffic factual and await release by Event Control.',
  shelter_procedure:
    'Shelter may be required for severe weather, lightning or other environmental conditions. KSS identifies local shelter options, prevents queue pressure at shelter points, supports disabled guests and vulnerable persons and keeps emergency routes available.',
  show_stop_triggers:
    'Show stop, shop stop or activity stop triggers include crowd pressure, major medical or safeguarding incident, fire or smoke, structural concern, severe weather, hostile threat, route loss, uncontrolled Co-Op shop surge, serious disorder or any incident where continued service/activity increases risk.',
  rendezvous_points:
    'RVPs are controlled by Event Control. Offsite RVP1 is MOTO Donington Park; onsite RVP is in the Donington Park Paddock at Event Control. KSS staff should provide exact grid, What3Words where available and landmark-based location information. Emergency rendezvous, casualty handover, disabled assistance points and staff accountability locations are confirmed by Event Control during the live incident; KSS supervisors will not move teams away from route duties until relieved or stood down.',
  command_escalation:
    'Emergency escalation goes from KSS staff to KSS supervisor, KSS Operational Lead / KSS Deputy and Event Control. Immediate life safety action may be taken before formal approval, but all actions will be reported and logged as soon as safe. Evacuation, invacuation, lockdown, route closure, service suspension and public messaging authority remains with the event command structure unless immediate life safety requires local protective action.',
  emergency_search_zones:
    'Emergency search zones for KSS include bars, Co-Op shop, Paddock, Accessible Campsite A4, Accessible Campsite D, accessibility search points, local BOH/storage areas, queue lanes and routes assigned by Event Control. Suspicious items are handled under HOT and 4Cs principles.',

  ct_procedures:
    'KSS staff are briefed on ACT, SCaN, hostile reconnaissance, suspicious items, unattended items, hostile vehicles, drone reporting, dynamic lockdown/invacuation and unusual behaviour around bars, Co-Op shop, search points, accessible routes and Paddock. The organiser retains the primary vehicle-mitigation and site-security strategy; KSS supports by remaining alert at its posts, preserving routes and reporting behaviour that does not feel right. Staff use a See Something, Say Something approach: report early, give exact location and behaviour, avoid assumptions, and let Event Control/police assess intent.',
  suspicious_item_protocol:
    'Do not touch or move suspicious items. Use HOT assessment, clear the immediate area if safe, communicate exact location and description, apply 4Cs principles, protect routes and await Event Control/police instruction. If a search point identifies a suspicious item, weapon, pyrotechnic, chemical concern or concealment pattern beyond routine prohibited-item handling, the supervisor pauses the lane, protects evidence and requests Event Control authority for search escalation.',
  hostile_recon_indicators:
    'Indicators include repeated filming of search lanes, unusual interest in barriers, queue density, emergency routes, vehicle mitigation or staff rotations, testing staff reactions, asking detailed security questions, loitering without plausible event purpose, repeated pass-back through access points, abandoned bags, vehicle placement near crowded areas, attempts to access restricted areas or efforts to distract staff while another person observes controls.',
  run_hide_tell_guidance:
    'For a weapons or marauding threat, leave by a safe route if possible, hide if escape is unsafe, silence phones, barricade where possible and tell police/Event Control when safe. KSS staff prioritise life safety and direction, not pursuit.',

  staff_welfare_arrangements:
    'KSS supervisors will monitor fatigue, hydration, meal breaks, overnight tiredness, heat/cold exposure, welfare impact after difficult safeguarding incidents and radio stress. Staff can be rotated away from distressing incidents and should know how to access staff welfare, Music Support and mental health first aid routes through Event Control.',

  accessibility_arrangements:
    'Accessibility arrangements include accessible campsites at grids W16 to S16 and R09, accessible viewing platforms, accessible routes, medical and welfare links, accessible day/camping entry arrangements and 24-hour accessibility campsite provision. KSS will keep routes clear, avoid assumptions about visible or hidden disability and escalate any adjustment needs.',
  accessibility_team_liaison:
    'KSS accessibility campsite supervisors liaise with the accessibility lead through Event Control. Any route change, search concern, medication/equipment issue, distressed guest, mobility-aid issue, welfare concern or egress obstruction will be escalated promptly.',

  communications_plan:
    'Operational communications use the Download radio plan, Event Control logging, KSS supervisor SITREPs, daily coordination meetings and precise location reporting. Safeguarding and lost/found communications will be discreet and use agreed code words where applicable.',
  sitrep_decision_logging:
    'SITREPs are required at start of shift, pre-opening, during ingress/search peaks, bar and Co-Op shop peaks, headline periods, nightly egress, overnight campsite checks and final clearance. Logs will record time, location, issue, action, owner, escalation and outcome.',
  refusal_false_id_protocol:
    'Entry refusal before ticket scan is owned by the relevant Gate Manager/gate management team. KSS may present a person for refusal and support safe control of the gate area, but no person other than the Gate Manager can refuse entry or confiscate tickets. The Gate Manager questions the person independently of security and records details on the Refusal JotForm, including name if given, ticket details if given and reason for refusal. If the refusal is under 18, the safeguarding team will be requested to attend the gate. Persons refused entry may be asked to surrender a paper ticket or show an e-ticket for photographing and upload to JotForm; if they refuse, they retain the ticket and are processed away from the gate to reduce conflict. Refusals are walked by the Gate Manager and security through the designated refusal gate and returned to the relevant car park area. Bar and nicotine-product staff will refuse service when Challenge 21 ID is not produced or is not acceptable. KSS may challenge on approach to a bar where a person appears under 21 and may assist bar or stall staff where refusal creates conflict or welfare risk. Refusal logs will be completed for refusals at bars or bar areas and made available to the Event Management Team, Police or local authority officers. Fake or altered ID identified by the operator should be confiscated in line with the event policy and escalated. Repeated attempts to purchase alcohol or nicotine products without valid ID, or proxy purchasing by an adult for a person under 18, will be escalated to the supervisor/Event Control and may result in wristband removal and eviction. Refusal does not automatically mean ejection; welfare checks and the safeguarding pause apply before removal where vulnerability is suspected.',
  ejection_protocol:
    'Ejection/eviction is a last resort and is coordinated via Event Control and the Download Eviction Team. All persons being evicted will be processed via the Eviction Manager unless first arrested by Police; even then, they may be taken to the Eviction Cabin for logging and wristband removal before police handover. The Eviction Team removes wristbands, not KSS security or Police. KSS may support safe escort, evidence preservation, witness information and immediate risk control, but the eviction decision remains with the Eviction Manager/Event Silver or Gold where required. Evictees will be offered complaint opportunity, phone-call opportunity and welfare consideration. Police/Social Care liaison will be through Event Silver/Gold, Security Director or deputy, not directly by KSS unless immediate life safety requires emergency action.',
  confiscation_process:
    'Confiscated items are placed in bins or designated areas in line with the event policy. Illegal items are reported and escalated. Fake or altered ID identified during Challenge 21 checks should be confiscated by the operator or responsible staff in line with the event policy and escalated for logging. Security staff do not remove items once contained in bins and do not accept responsibility for confiscated property beyond the event procedure.',
  ejection_safeguarding:
    'If the person is or may be a child, vulnerable adult, intoxicated, distressed, injured, mentally unwell, isolated, disabled, subject to harassment or otherwise temporarily vulnerable, ejection or eviction will pause immediately. Event Control, Safeguarding Coordinator and Welfare Team are contacted before any removal continues. Juveniles are defined by the Download Eviction Policy as 17 and under. Juvenile evictions require attempts to contact an appropriate adult; if none is onsite or contactable, the juvenile will be looked after through the Eviction Team/Safeguarding Coordinator until safe arrangements are confirmed. If a juvenile insists on leaving and cannot lawfully be detained unless in imminent danger, Leicestershire Police will be notified via the Security Director/deputy route and staff will consider money, transport availability and capacity to travel. Vulnerable adults left with the Eviction Team require Welfare/Safeguarding support and attempts to contact a caregiver/companion; abandonment or neglect concerns are escalated to Safeguarding, Police, Security Director/deputy and Event Organiser for Social Care/Police decision.',

  debrief_reporting:
    'KSS supervisors complete daily debriefs covering bar refusals, Co-Op shop queue pressure, accessibility campsite incidents, searches, welfare referrals, safeguarding concerns, Ask for Angela, lost/found persons, ejections/evictions, staff welfare, route issues and recommendations.',
  close_down_operations:
    'Close-down includes bar queue clear-down, Co-Op shop stand-down, asset checks, stock route protection, campsite patrol handover, welfare route preservation, incident reconciliation and confirmation to Event Control before KSS stands down an area.',
  end_of_shift_reporting:
    'End-of-shift reports will include staffing, incidents, refusals, ejections, search issues, welfare and safeguarding handovers, lost/found reports, accessibility issues, Co-Op shop concerns, near misses, route obstructions, equipment and outstanding actions.',
  asset_security_demobilisation:
    'KSS asset protection covers bar assets, Co-Op shop queue barriers and perimeter assets, radios, PPE, barriers, signage, search equipment, Paddock assets and accessibility campsite infrastructure until handed over or stood down.',
  health_safety_overview:
    'KSS staff follow site induction, risk assessment, dynamic risk assessment, PPE requirements, manual handling expectations, radio discipline, safe search practice, welfare procedures, incident escalation and emergency route protection. Any hazard or near miss is reported immediately.',

  site_maps_and_route_diagrams: lines(
    'Download 2026 Site Plan V5 140426 - A0 OS Grid PDF',
    'Download Festival site plan and arena/campsite maps',
    'KSS deployment map for bars, Co-Op shop and Paddock',
    'Accessible Campsite A4 and Accessible Campsite D plan',
    'Accessibility campsite search layout',
    'Accessible routes, AVPs, welfare, medical and toilets map',
    'Emergency routes, RVPs and Event Control map'
  ),
  appendix_notes: lines(
    'Appendix A - Bar Operations annex',
    'Appendix B - Search and Screening annex, including accessibility campsite search',
    'Appendix C - Co-Op Shop annex, including shop ingress, egress, queuing and perimeter controls',
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
    'KSS Operational Lead - Floyd Allen - KSS Lead call sign / live contact sheet',
    'KSS Deputy / Escalation Lead - David Capener - KSS Deputy call sign / live contact sheet',
    'KSS Bars Supervisor - Nigel Train - Bars Lead call sign / live contact sheet',
    'KSS Co-Op Supervisor - Sponsorship Supervisor post holder - Co-Op Lead call sign / live deployment sheet',
    'KSS Accessibility Lead - Accessibility Manager post holder - Accessibility Lead call sign / live deployment sheet',
    'Event Control Centre - Pit Lane Suites, Garage 39 - 24/7 live event control',
    'Safeguarding Coordinators - Leigh Harvey / Sandie Dunn / Lauren Stewart - via Event Control',
    'Deputy Event Gold - Sheena Jones - 07789 225511',
    'Welfare Team - Events Wellbeing - via Event Control',
    'Medical - via Event Control',
    'Accessibility Lead - via Event Control'
  ),
}
