import type { EmpAnnexKey } from '@/lib/emp/master-template'
import { EMP_BUSINESS_TEMPLATE_VALUES } from '@/lib/emp/business-template'

const lines = (...items: string[]) => items.join('\n')

export type EmpFestivalStarterPlan = {
  key:
    | 'state_fayre'
    | 'latitude'
    | 'wilderness'
    | 'leeds'
    | 'reading'
    | 'electric_picnic'
    | 'radio_2'
  badgeLabel: string
  eventName: string
  planTitle: string
  startDate: string
  endDate: string
  selectedAnnexes: EmpAnnexKey[]
  values: Record<string, string>
}

const STARTER_SELECTED_ANNEXES: EmpAnnexKey[] = [
  'bar_operations',
  'stewarding_deployment',
  'emergency_action_cards',
]

function buildStarterPlanValues(input: {
  eventName: string
  planTitle: string
  showDates: string
  venueName: string
  venueAddress: string
  venueReference: string
  organiserName: string
  clientName: string
  eventType: string
  publicIngressTime: string
  audienceProfile: string
  alcoholProfile: string
  knownInformation: string[]
}) {
  return {
    ...EMP_BUSINESS_TEMPLATE_VALUES,
    plan_title: input.planTitle,
    document_version: 'V0.1',
    document_status: 'Draft',
    author_name: 'David Capener - KSS NW LTD',
    approver_name: 'Floyd Allen - KSS NW LTD',
    issue_date: '2026-06-03',
    review_date: '2026-06-10',
    distribution_list: lines(
      'KSS operational leadership and supervisors',
      `${input.eventName} Event Control - TBC`,
      `${input.organiserName} - client / organiser contact TBC`,
      'Bar operator / licence holder representative - TBC',
      'Event safeguarding, welfare and medical leads - TBC',
      'Relevant delivery partners - TBC'
    ),
    purpose_scope_summary:
      `This starter Event Management Plan sets out the initial KSS NW LTD planning framework for ${input.eventName} at ${input.venueName}. KSS scope, deployment numbers, bar or licensed-area allocations, access-control duties, welfare interfaces, safeguarding routes, Event Control contacts, site plans and live timings remain to be built out from client source documents. The draft is intended as a working shell for event-specific content rather than a final operational issue.`,
    related_documents: lines(
      `${input.eventName} event management plan - pending issue to KSS`,
      `${input.eventName} crowd / security management plan - pending issue to KSS`,
      `${input.eventName} site plan, bar plan and route maps - pending issue to KSS`,
      'KSS deployment schedule and supervisor briefing pack - to be added when supplied',
      'Licensing schedule and alcohol-management procedures - to be added when supplied',
      ...input.knownInformation
    ),
    operational_assumptions_dependencies: lines(
      'This draft is based on public event date and venue information plus the standard KSS EMP framework.',
      'Final operating scope remains dependent on client appointment, KSS deployment schedule, source plans, licence conditions, site maps, radio plan and Event Control procedures.',
      'KSS will not assume ownership of full-site crowd management, search, traffic, medical, welfare, CCTV, public messaging or emergency command unless specifically appointed.',
      'Deployment, queue layouts, access points, compound controls and emergency routes must be reconciled against issued event plans before the document is moved beyond draft.'
    ),
    event_name: input.eventName,
    event_type: input.eventType,
    venue_name: input.venueName,
    venue_address: input.venueAddress,
    venue_reference: input.venueReference,
    organiser_name: input.organiserName,
    client_name: input.clientName,
    principal_contractor: 'TBC - to be confirmed from client source documents',
    key_delivery_partners: lines(
      'KSS NW LTD - security / stewarding delivery where allocated',
      `${input.eventName} Event Control - command, logging and escalation route TBC`,
      'Medical provider - TBC',
      'Welfare and safeguarding provider - TBC',
      'Local authority, police, fire and ambulance liaison routes - TBC'
    ),
    build_dates: `TBC - to be confirmed from ${input.eventName} build schedule`,
    show_dates: input.showDates,
    break_dates: `TBC - to be confirmed from ${input.eventName} break schedule`,
    public_ingress_time: input.publicIngressTime,
    operational_hours: lines(
      'KSS deployment hours are TBC and will be inserted from the final staffing schedule.',
      'Event Control operating hours, daily brief timings, bar opening times, last orders, close-down timings and overnight requirements remain to be confirmed.',
      'The show dates in this starter plan should be treated as event-date placeholders until reconciled with the live deployment sheet.'
    ),
    client_objectives: lines(
      `Build a site-specific KSS operating plan for ${input.eventName}.`,
      'Confirm KSS scope, staffing levels, duty areas, reporting lines, radio channels and escalation contacts.',
      'Protect licensed areas, staff, customers, vulnerable persons, emergency routes and client assets where allocated.',
      'Capture final procedures for refusals, ejections, safeguarding, incident reporting, welfare handover, emergency actions and debrief.'
    ),
    licensed_capacity: 'TBC - to be confirmed from licence / event management plan',
    expected_attendance: 'TBC - to be confirmed from client source documents',
    staff_and_contractor_count: 'TBC - KSS and wider contractor numbers to be added from deployment schedule',
    audience_age_profile: input.audienceProfile,
    alcohol_profile: input.alcoholProfile,
    camping_profile: 'TBC - camping, boutique camping or day-ticket-only scope to be confirmed from event documents.',
    historic_issues: 'TBC - event-specific previous issues, intelligence and lessons learned to be added when supplied.',
    mood_and_trigger_points:
      'Potential trigger points to reconcile include arrival pressure, bar queueing, refusals, intoxication, lost friends, welfare demand, adverse weather, transport pressure and show-stop communication.',
    peak_periods:
      'TBC - peak periods to be inserted from gates, stage times, bar schedule, headliner periods, egress plan and transport timetable.',
    site_layout_summary:
      `Final ${input.eventName} site layout, KSS duty areas, bar names, compounds, queue lanes, access routes, emergency routes and welfare / medical locations are pending source plans.`,
    key_zones: lines(
      'Allocated bars / licensed service points - TBC',
      'KSS supervisor base / muster point - TBC',
      'Event Control interface - TBC',
      'Medical, welfare and safeguarding handover locations - TBC',
      'Emergency routes, RVPs and sterile routes - TBC'
    ),
    emergency_exits_holding_areas:
      'Emergency exits, holding areas, rendezvous points and evacuation routes are TBC and must be copied from the issued site plan and emergency plan before operational issue.',
    gross_area: 'TBC - to be confirmed from site plan',
    density_assumptions:
      'Density assumptions are TBC and should be built from the event capacity, bar queue layouts, stage demand, route widths, ingress / egress modelling and local area plans.',
    zone_capacities:
      'Zone capacities are TBC. Bar queue capacity, compound capacity, emergency route widths and holding-area limits must be confirmed from source plans.',
    ingress_flow_assumptions:
      'Ingress flow assumptions are TBC. KSS duties around public entry, wristband checks, queue support or licensed-area opening will be added only where allocated.',
    egress_flow_assumptions:
      'Egress flow assumptions are TBC. KSS will follow Event Control direction and protect allocated service areas, stock routes and emergency routes during close-down where tasked.',
    command_structure:
      'KSS command structure is TBC. Draft assumption: KSS staff report to their immediate supervisor, supervisors escalate to the KSS operational lead, and the KSS operational lead interfaces with Event Control and client representatives.',
    named_command_roles: lines(
      'KSS Operational Lead - TBC',
      'KSS Supervisors - TBC',
      `${input.eventName} Event Control - TBC`,
      'Client / organiser operations lead - TBC',
      'Bar operator / licence holder representative - TBC',
      'Medical / welfare / safeguarding leads - TBC'
    ),
    radio_channels_callsigns:
      'Radio channels, call signs, escalation phrases and fallback communications are TBC and will be inserted from the issued radio plan.',
    reporting_lines:
      'KSS staff report to their KSS supervisor. Supervisors escalate operational, welfare, safeguarding, medical, disorder, refusal and emergency issues to the KSS operational lead and Event Control as required.',
    external_interfaces:
      'External interfaces are TBC and should include Event Control, bar management, medical, welfare, safeguarding, police, local authority, fire, ambulance, traffic, accessibility and lost property where relevant.',
    key_contacts_directory: lines(
      'KSS Operational Lead - TBC',
      `${input.eventName} Event Control - TBC`,
      'Client / organiser contact - TBC',
      'Bar operator / licence holder representative - TBC',
      'Medical lead - TBC',
      'Welfare / safeguarding lead - TBC'
    ),
    briefing_and_induction:
      `All KSS staff will receive a ${input.eventName}-specific briefing once source documents are issued. The briefing must cover site layout, duty area, radio protocol, Challenge policy, refusals, incident logging, welfare recognition, safeguarding escalation, emergency routes, staff welfare and post-event reporting.`,
    staffing_by_zone_and_time:
      'TBC - final KSS deployment schedule, shift times, supplier allocations and supervisor structure to be added when supplied.',
    response_teams:
      'TBC - any KSS response team, roaming support or escalation resource will be confirmed from the final deployment schedule.',
    relief_and_contingency:
      'TBC - relief, meal break, reserve and contingency arrangements to be confirmed from staffing schedule.',
    service_delivery_scope:
      'Starter scope only. Confirm whether KSS is appointed for bar security, licensed-area queue support, compound protection, stewarding, search, access control, VIP / backstage, response, overnight asset protection or documentation-only support.',
    bar_operations_roles:
      'TBC - bar operations roles will be added from the final bar list, licence conditions, queue plans, Challenge policy, refusal process, bar breach procedure and close-down schedule.',
    stewarding_roles:
      'TBC - stewarding / queue marshal roles will be added if KSS is allocated public-facing stewarding or queue duties.',
    search_screening_roles:
      'TBC - no KSS search or screening ownership is assumed until confirmed in client source documents.',
    vip_backstage_roles:
      'TBC - restricted-area, VIP, backstage or compound duties to be added only where KSS is allocated that scope.',
    queue_design:
      'TBC - queue design, barrier layout, feeder lanes, accessible routing, service-lane protection and degraded-operation controls to be built from site plans.',
    safe_spaces:
      'TBC - welfare, safeguarding, medical and safe-space locations to be confirmed from event plans.',
    lost_vulnerable_person_process:
      'TBC - lost, vulnerable, intoxicated, distressed or isolated persons must be escalated to supervisors and Event Control pending the event-specific welfare and safeguarding procedure.',
    ask_for_angela_process:
      'TBC - Ask for Angela / anti-harassment / spiking response process to be confirmed with the client, bar operator and welfare provider.',
    dps_name: 'TBC - to be confirmed from licensing schedule',
    licensing_conditions:
      'TBC - relevant licence conditions, Challenge policy, underage controls, refusal logging, proxy-purchase controls and alcohol-management rules to be inserted from source documents.',
    incident_management:
      'Incidents are managed by making the area safe, notifying the supervisor, escalating to Event Control where required, preserving evidence, supporting welfare and medical handover, and completing the required KSS and client records.',
    risk_assessment_methodology:
      'This starter risk assessment is a placeholder. It must be updated using supplied event plans, KSS scope, duty areas, deployment schedule, site maps, licence conditions and dynamic risk assessment before operational use.',
    risk_assessment_source_notes:
      `Source documents are pending for ${input.eventName}. Final hazards, controls, residual risks, area names, staffing assumptions and emergency interfaces must be reconciled before issue.`,
    emergency_procedures:
      `Emergency procedures are directed by ${input.eventName} Event Control and the wider event emergency plan. KSS duties are to protect life, report accurately, preserve routes, stop activity where instructed, support vulnerable persons and follow Event Control / emergency-service direction.`,
    full_evacuation_procedure:
      'For full evacuation, KSS follows Event Control instructions, directs customers away from risk where safe, protects allocated emergency routes, supports vulnerable persons and reports route status back to control.',
    lockdown_invacuation_procedure:
      'For lockdown or invacuation, KSS follows Event Control messaging, moves people away from exposed areas where safe, avoids unnecessary movement, reports suspicious activity and awaits further command instruction.',
    rendezvous_points:
      'TBC - RVPs and emergency-service access routes to be inserted from emergency plan and site map.',
    emergency_search_zones:
      'TBC - emergency search zones and sterile-route responsibilities to be confirmed from emergency plan.',
    communications_plan:
      'Communications plan is TBC. Add radio channels, call signs, command net, escalation contacts, logging route, mobile fallback, briefing cadence and SITREP rhythm when issued.',
    sitrep_decision_logging:
      'SITREPs, decisions, significant contacts, refusals, ejections, welfare concerns and emergency actions must be logged through the agreed KSS and Event Control route once confirmed.',
    refusal_false_id_protocol:
      'TBC - refusal, false ID, proxy purchase and Challenge policy procedure to be inserted from bar operator and licence-holder documents.',
    ejection_protocol:
      'TBC - ejection / eviction process to be confirmed from event policy. Welfare and safeguarding checks must be completed before removal continues where vulnerability is suspected.',
    debrief_reporting:
      'Hot debrief and post-event reporting requirements are TBC. Add supervisor debrief route, incident summary, staffing performance notes and lessons-learned process before issue.',
    site_maps_and_route_diagrams:
      'TBC - add issued site map, bar plan, route map, emergency route extracts, RVP map and KSS deployment map when supplied.',
    appendix_notes: lines(
      `Appendix A - ${input.eventName} source document schedule - pending`,
      `Appendix B - ${input.eventName} site map and bar plan - pending`,
      'Appendix C - KSS deployment schedule and supervisor briefing - pending',
      'Appendix D - Radio channel and call sign plan - pending',
      'Appendix E - Emergency action cards - draft placeholders'
    ),
    version_history_summary:
      `V0.1 - Initial ${input.eventName} starter EMP shell created with dates and venue placeholders. Source documents, KSS deployment scope, contacts, radio plan, site maps and risk controls remain pending.`,
    contact_directory: lines(
      'KSS Operational Lead - TBC',
      `${input.eventName} Event Control - TBC`,
      'Client / organiser contact - TBC',
      'Bar operator / licence holder representative - TBC',
      'Medical lead - TBC',
      'Welfare / safeguarding lead - TBC'
    ),
  }
}

export const EMP_STARTER_FESTIVAL_PLANS: EmpFestivalStarterPlan[] = [
  {
    key: 'state_fayre',
    badgeLabel: 'State Fayre',
    eventName: 'State Fayre Festival 2026',
    planTitle: 'KSS NW LTD Event Management Plan - State Fayre Festival 2026',
    startDate: '2026-06-26',
    endDate: '2026-06-28',
    selectedAnnexes: STARTER_SELECTED_ANNEXES,
    values: buildStarterPlanValues({
      eventName: 'State Fayre Festival 2026',
      planTitle: 'KSS NW LTD Event Management Plan - State Fayre Festival 2026',
      showDates: '26 June 2026 to 28 June 2026',
      venueName: 'Hylands Park',
      venueAddress: 'Hylands Park, Chelmsford, Essex',
      venueReference: 'Hylands Park / Event Control - exact location TBC',
      organiserName: 'State Fayre / Festival Republic',
      clientName: 'State Fayre / Festival Republic - client contact TBC',
      eventType:
        'Three-day music festival with camping and arena operations at Hylands Park, Chelmsford, running 26 to 28 June 2026.',
      publicIngressTime:
        'Public arena opening is listed as Friday 26 June to Sunday 28 June 2026. Campsite and early-entry timings must be confirmed from client source documents.',
      audienceProfile:
        'All-ages audience with under-16 entry restrictions and guardian requirements; age-profile controls to be confirmed from event conditions.',
      alcoholProfile:
        'Licensed bar activity expected. Public information references Challenge 21; final alcohol-management and refusal process to be confirmed from licence and bar operator documents.',
      knownInformation: [
        'Official public information confirms State Fayre Festival 2026 dates as 26, 27 and 28 June 2026 at Hylands Park, Chelmsford, Essex.',
      ],
    }),
  },
  {
    key: 'latitude',
    badgeLabel: 'Latitude',
    eventName: 'Latitude Festival 2026',
    planTitle: 'KSS NW LTD Event Management Plan - Latitude Festival 2026',
    startDate: '2026-07-23',
    endDate: '2026-07-26',
    selectedAnnexes: STARTER_SELECTED_ANNEXES,
    values: buildStarterPlanValues({
      eventName: 'Latitude Festival 2026',
      planTitle: 'KSS NW LTD Event Management Plan - Latitude Festival 2026',
      showDates: '23 July 2026 to 26 July 2026',
      venueName: 'Henham Park',
      venueAddress: 'Henham Park, Suffolk',
      venueReference: 'Henham Park / Event Control - exact location TBC',
      organiserName: 'Festival Republic',
      clientName: 'Festival Republic / Latitude Festival - client contact TBC',
      eventType:
        'Four-day music, arts and culture festival at Henham Park, Suffolk, running 23 to 26 July 2026.',
      publicIngressTime:
        'Public ingress and campsite timings are TBC and must be confirmed from Latitude Festival source documents.',
      audienceProfile:
        'Mixed music, arts and family festival audience; age restrictions, family areas and safeguarding controls to be confirmed from source documents.',
      alcoholProfile:
        'Licensed bar activity expected. Challenge policy, refusal logs, proxy-purchase controls and bar close-down timings to be confirmed from licence and bar operator documents.',
      knownInformation: [
        'Official Latitude public information lists 23 to 26 July 2026 at Henham Park, Suffolk.',
      ],
    }),
  },
  {
    key: 'wilderness',
    badgeLabel: 'Wilderness',
    eventName: 'Wilderness Festival 2026',
    planTitle: 'KSS NW LTD Event Management Plan - Wilderness Festival 2026',
    startDate: '2026-07-30',
    endDate: '2026-08-02',
    selectedAnnexes: STARTER_SELECTED_ANNEXES,
    values: buildStarterPlanValues({
      eventName: 'Wilderness Festival 2026',
      planTitle: 'KSS NW LTD Event Management Plan - Wilderness Festival 2026',
      showDates: '30 July 2026 to 2 August 2026',
      venueName: 'Cornbury Park',
      venueAddress: 'Cornbury Park, Oxfordshire',
      venueReference: 'Cornbury Park / Event Control - exact location TBC',
      organiserName: 'Wilderness Festival',
      clientName: 'Wilderness Festival - client contact TBC',
      eventType:
        'Four-day music, arts, food, wellbeing and camping festival at Cornbury Park, Oxfordshire, running 30 July to 2 August 2026.',
      publicIngressTime:
        'Public ingress, campsite, boutique camping and arena timings are TBC and must be confirmed from Wilderness source documents.',
      audienceProfile:
        'Mixed festival audience with music, dining, family, wellbeing and camping elements; family, accessibility and safeguarding controls to be confirmed from source documents.',
      alcoholProfile:
        'Licensed bar and hospitality activity expected. Final Challenge policy, refusal process, bar locations and close-down timings to be confirmed from licence and bar operator documents.',
      knownInformation: [
        'Official Wilderness public information lists 30 July to 2 August 2026 at Cornbury Park, Oxfordshire.',
      ],
    }),
  },
  {
    key: 'leeds',
    badgeLabel: 'Leeds',
    eventName: 'Leeds Festival 2026',
    planTitle: 'KSS NW LTD Event Management Plan - Leeds Festival 2026',
    startDate: '2026-08-27',
    endDate: '2026-08-30',
    selectedAnnexes: STARTER_SELECTED_ANNEXES,
    values: buildStarterPlanValues({
      eventName: 'Leeds Festival 2026',
      planTitle: 'KSS NW LTD Event Management Plan - Leeds Festival 2026',
      showDates: '27 August 2026 to 30 August 2026',
      venueName: 'Bramham Park',
      venueAddress: 'Bramham Park, Leeds',
      venueReference: 'Bramham Park / Event Control - exact location TBC',
      organiserName: 'Festival Republic',
      clientName: 'Festival Republic / Leeds Festival - client contact TBC',
      eventType:
        'Four-day music festival with camping and arena operations at Bramham Park, Leeds, running 27 to 30 August 2026.',
      publicIngressTime:
        'Public arena opening is listed from Thursday 27 August to Sunday 30 August 2026. Campsite and early-entry timings must be confirmed from client source documents.',
      audienceProfile:
        'All-ages festival audience with under-16 entry restrictions and guardian requirements; safeguarding, family and accessibility controls to be confirmed from source documents.',
      alcoholProfile:
        'Licensed bar activity expected. Public information references Challenge 25; final alcohol-management and refusal process to be confirmed from licence and bar operator documents.',
      knownInformation: [
        'Official Leeds Festival public information confirms 27 to 30 August 2026 at Bramham Park, Leeds.',
      ],
    }),
  },
  {
    key: 'reading',
    badgeLabel: 'Reading',
    eventName: 'Reading Festival 2026',
    planTitle: 'KSS NW LTD Event Management Plan - Reading Festival 2026',
    startDate: '2026-08-27',
    endDate: '2026-08-30',
    selectedAnnexes: STARTER_SELECTED_ANNEXES,
    values: buildStarterPlanValues({
      eventName: 'Reading Festival 2026',
      planTitle: 'KSS NW LTD Event Management Plan - Reading Festival 2026',
      showDates: '27 August 2026 to 30 August 2026',
      venueName: 'Richfield Avenue',
      venueAddress: 'Richfield Avenue, Reading',
      venueReference: 'Richfield Avenue / Event Control - exact location TBC',
      organiserName: 'Festival Republic',
      clientName: 'Festival Republic / Reading Festival - client contact TBC',
      eventType:
        'Four-day music festival with camping and arena operations at Richfield Avenue, Reading, running 27 to 30 August 2026.',
      publicIngressTime:
        'Public arena opening is listed from Thursday 27 August to Sunday 30 August 2026. Campsite and early-entry timings must be confirmed from client source documents.',
      audienceProfile:
        'All-ages festival audience with under-16 entry restrictions and guardian requirements; safeguarding, family and accessibility controls to be confirmed from source documents.',
      alcoholProfile:
        'Licensed bar activity expected. Public information references Challenge 25; final alcohol-management and refusal process to be confirmed from licence and bar operator documents.',
      knownInformation: [
        'Official Reading Festival public information confirms 27 to 30 August 2026 at Richfield Avenue, Reading.',
      ],
    }),
  },
  {
    key: 'electric_picnic',
    badgeLabel: 'Electric Picnic',
    eventName: 'Electric Picnic 2026',
    planTitle: 'KSS NW LTD Event Management Plan - Electric Picnic 2026',
    startDate: '2026-08-28',
    endDate: '2026-08-30',
    selectedAnnexes: STARTER_SELECTED_ANNEXES,
    values: buildStarterPlanValues({
      eventName: 'Electric Picnic 2026',
      planTitle: 'KSS NW LTD Event Management Plan - Electric Picnic 2026',
      showDates: '28 August 2026 to 30 August 2026',
      venueName: 'Stradbally Hall',
      venueAddress: 'Stradbally Hall, Co. Laois, Ireland',
      venueReference: 'Stradbally Hall / Event Control - exact location TBC',
      organiserName: 'Electric Picnic / Festival Republic',
      clientName: 'Electric Picnic / Festival Republic - client contact TBC',
      eventType:
        'Three-day music and arts festival with camping and arena operations at Stradbally Hall, Co. Laois, running 28 to 30 August 2026.',
      publicIngressTime:
        'Public ingress, campsite and arena timings are TBC and must be confirmed from Electric Picnic source documents.',
      audienceProfile:
        'Large mixed music and arts festival audience with camping, hospitality, family, wellbeing and late-night elements; age restrictions and safeguarding controls to be confirmed from source documents.',
      alcoholProfile:
        'Licensed bar and hospitality activity expected. Final Challenge policy, refusal process, bar locations and close-down timings to be confirmed from licence and bar operator documents.',
      knownInformation: [
        'Official Electric Picnic public information lists 28 to 30 August 2026 at Stradbally Hall, Co. Laois, Ireland.',
      ],
    }),
  },
  {
    key: 'radio_2',
    badgeLabel: 'Radio 2',
    eventName: 'BBC Radio 2 in the Park 2026',
    planTitle: 'KSS NW LTD Event Management Plan - BBC Radio 2 in the Park 2026',
    startDate: '2026-09-11',
    endDate: '2026-09-13',
    selectedAnnexes: STARTER_SELECTED_ANNEXES,
    values: buildStarterPlanValues({
      eventName: 'BBC Radio 2 in the Park 2026',
      planTitle: 'KSS NW LTD Event Management Plan - BBC Radio 2 in the Park 2026',
      showDates: '11 September 2026 to 13 September 2026',
      venueName: 'City Park',
      venueAddress: 'City Park, Stirling, Scotland',
      venueReference: 'City Park, Stirling / Event Control - exact location TBC',
      organiserName: 'BBC Radio 2',
      clientName: 'BBC Radio 2 / event delivery partner - client contact TBC',
      eventType:
        'Three-day live music event at City Park, Stirling, running 11 to 13 September 2026.',
      publicIngressTime:
        'Public ingress, arena opening and daily operating timings are TBC and must be confirmed from BBC Radio 2 in the Park source documents.',
      audienceProfile:
        'Mixed live music audience with BBC broadcast and public-event profile; age restrictions, accessibility and safeguarding controls to be confirmed from source documents.',
      alcoholProfile:
        'Licensed bar activity expected if KSS is appointed to bar or licensed-area duties. Final alcohol-management, Challenge policy and refusal process to be confirmed from licence and bar operator documents.',
      knownInformation: [
        'Stirling Council public information confirms BBC Radio 2 in the Park 2026 at City Park, Stirling from 11 to 13 September 2026.',
      ],
    }),
  },
]

export function getEmpStarterFestivalPlanByKey(key: string) {
  const normalized = key.trim().toLowerCase().replace(/-/g, '_')
  return EMP_STARTER_FESTIVAL_PLANS.find((plan) => plan.key === normalized) || null
}
