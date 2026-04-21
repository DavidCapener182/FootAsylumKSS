import {
  CMP_ANNEX_ROLE_FIELD_KEYS,
  CMP_ANNEX_DEFINITIONS,
  CMP_MASTER_TEMPLATE_SECTIONS,
  type CmpAnnexKey,
  type CmpMasterTemplateField,
} from '@/lib/cmp/master-template'

export interface CmpResolvedFieldValue {
  key: string
  label: string
  valueText: string
  source: string
}

export type CmpPreviewBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'bullet_list'; items: string[] }
  | { type: 'table'; rows: Array<{ label: string; value: string }> }
  | { type: 'multi_table'; headers: string[]; rows: string[][] }
  | { type: 'metric_grid'; items: Array<{ label: string; value: string }> }
  | { type: 'toc_columns'; items: Array<{ ref: string; title: string }> }
  | { type: 'image'; title: string; caption?: string; imageUrl: string; alt: string }
  | {
      type: 'image_grid'
      title: string
      caption?: string
      items: Array<{ title: string; caption?: string; imageUrl: string; alt: string }>
    }
  | {
      type: 'diagram'
      variant: 'ramp'
      items: Array<{ title: string; value: string }>
    }
  | {
      type: 'diagram'
      variant: 'crowd_flow'
      stages: Array<{ label: string; note: string }>
    }
  | {
      type: 'diagram'
      variant: 'command'
      lead: string
      control: string
      supervisors: string[]
      interfaces: string[]
    }
  | {
      type: 'diagram'
      variant: 'emergency'
      cards: Array<{ title: string; icon: 'part_evac' | 'full_evac' | 'lockdown' | 'shelter'; detail: string }>
    }
  | {
      type: 'diagram'
      variant: 'ct'
      cards: Array<{ title: string; icon: 'recon' | 'suspicious_item' | 'vehicle_threat' | 'run_hide_tell'; detail: string }>
    }

export interface CmpPreviewSourceDocument {
  documentKind: string
  fileName: string
  fileType: string
  signedUrl: string | null
}

export interface CmpPreviewSection {
  key: string
  title: string
  description?: string
  blocks: CmpPreviewBlock[]
}

export interface CmpPreviewAnnex {
  key: string
  title: string
  description?: string
  blocks: CmpPreviewBlock[]
}

export interface CmpPreviewModel {
  title: string
  subtitle: string
  coverRows: Array<{ label: string; value: string }>
  sections: CmpPreviewSection[]
  annexes: CmpPreviewAnnex[]
}

const FIXED_OBJECTIVES = [
  'Protect the public, staff, contractors, and event participants.',
  'Support safe ingress, circulation, and egress at all times.',
  'Prevent crime, disorder, crowd pressure, and avoidable disruption.',
  'Support safeguarding, welfare, medical, and emergency response functions.',
  'Support client, organiser, venue, and licensing objectives through a consistent operational structure.',
]

const SECTION_TITLES: Record<string, string> = Object.fromEntries(
  CMP_MASTER_TEMPLATE_SECTIONS.map((section) => [section.key, section.title])
)

const IMAGE_KIND_LABELS: Record<string, string> = {
  site_map: 'Site Map / Plan',
  ingress_map: 'Ingress Map / Queue Plan',
  egress_map: 'Egress Map / Dispersal Plan',
  emergency_map: 'Emergency / Evacuation Map',
  route_map: 'Route / Traffic Interface Map',
}
const CMP_SECTION_VISUALS = {
  emergency: '/cmp-assets/cmp-emergency-procedures.png',
  runHideTell: '/cmp-assets/run-hide-tell-poster.png',
  iorRemove: '/cmp-assets/ior-remove-poster.jpg',
} as const

function clean(value: string | null | undefined) {
  return String(value || '').trim()
}

function splitList(value: string | null | undefined) {
  return clean(value)
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitLines(value: string | null | undefined) {
  return clean(value)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitDashParts(line: string) {
  return line.split(/\s+-\s+/).map((item) => item.trim()).filter(Boolean)
}

function summarizeText(value: string | null | undefined, maxLength = 92) {
  const normalized = clean(value).replace(/\s+/g, ' ')
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  const truncated = normalized.slice(0, maxLength - 1)
  const lastSpace = truncated.lastIndexOf(' ')
  return `${(lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated).trim()}...`
}

function maybeParagraph(text: string | null | undefined): CmpPreviewBlock[] {
  const value = clean(text)
  return value ? [{ type: 'paragraph', text: value }] : []
}

function maybeBullets(value: string | null | undefined): CmpPreviewBlock[] {
  const items = splitList(value)
  return items.length ? [{ type: 'bullet_list', items }] : []
}

function maybeTable(rows: Array<{ label: string; value: string | null | undefined }>): CmpPreviewBlock[] {
  const filtered = rows
    .map((row) => ({ label: row.label, value: clean(row.value) }))
    .filter((row) => row.value)

  return filtered.length ? [{ type: 'table', rows: filtered }] : []
}

function maybeMultiTable(headers: string[], rows: string[][]): CmpPreviewBlock[] {
  const filtered = rows.filter((row) => row.some((cell) => clean(cell)))
  return filtered.length ? [{ type: 'multi_table', headers, rows: filtered }] : []
}

function maybeMetricGrid(items: Array<{ label: string; value: string | null | undefined }>): CmpPreviewBlock[] {
  const filtered = items
    .map((item) => ({ label: item.label, value: clean(item.value) }))
    .filter((item) => item.value)

  return filtered.length ? [{ type: 'metric_grid', items: filtered }] : []
}

function maybeTocColumns(items: Array<{ ref: string; title: string }>): CmpPreviewBlock[] {
  const filtered = items.filter((item) => clean(item.ref) && clean(item.title))
  return filtered.length ? [{ type: 'toc_columns', items: filtered }] : []
}

function labeledParagraph(label: string, value: string | null | undefined): CmpPreviewBlock[] {
  const cleaned = clean(value)
  return cleaned ? [{ type: 'paragraph', text: `${label}: ${cleaned}` }] : []
}

function isImageDocument(document: CmpPreviewSourceDocument) {
  const normalizedType = clean(document.fileType).toLowerCase()
  const normalizedName = clean(document.fileName).toLowerCase()

  return (
    normalizedType.startsWith('image/')
    || ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((extension) => normalizedName.endsWith(extension))
  )
}

function buildImageBlocks(
  documents: CmpPreviewSourceDocument[],
  documentKinds: string[],
  sectionTitle: string
): CmpPreviewBlock[] {
  return documents
    .filter((document) => documentKinds.includes(document.documentKind) && isImageDocument(document) && clean(document.signedUrl))
    .map((document, index) => ({
      type: 'image',
      title: IMAGE_KIND_LABELS[document.documentKind] || sectionTitle,
      caption: document.fileName,
      imageUrl: clean(document.signedUrl),
      alt: `${sectionTitle} attachment ${index + 1}`,
    })) satisfies CmpPreviewBlock[]
}

function parseTwoColumnLines(value: string | null | undefined) {
  return splitLines(value)
    .map((line) => {
      const [first, ...rest] = splitDashParts(line)
      return first && rest.length ? [first, rest.join(' - ')] : null
    })
    .filter(Boolean) as string[][]
}

function parseThreeColumnLines(value: string | null | undefined) {
  return splitLines(value)
    .map((line) => {
      const [first, second, ...rest] = splitDashParts(line)
      return first && second && rest.length ? [first, second, rest.join(' - ')] : null
    })
    .filter(Boolean) as string[][]
}

function splitThreeColumnLinesToLabels(value: string | null | undefined) {
  return parseThreeColumnLines(value).map(([first, second]) =>
    [first, second].filter(Boolean).join(' - ')
  )
}

function parseColonRows(value: string | null | undefined) {
  return splitLines(value)
    .map((line) => {
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) return null
      const label = clean(line.slice(0, colonIndex))
      const detail = clean(line.slice(colonIndex + 1))
      return label && detail ? [label, detail] : null
    })
    .filter(Boolean) as string[][]
}

function getValue(
  fieldValues: Record<string, CmpResolvedFieldValue>,
  fieldKey: string
): string {
  return fieldValues[fieldKey]?.valueText || ''
}

function joinRiskControls(...values: Array<string | null | undefined>) {
  const parts = values
    .map((value) => summarizeText(value, 190))
    .filter(Boolean)

  return parts.join(' ') || 'Refer to the relevant operational controls within this CMP.'
}

function buildRiskRow(
  activity: string,
  hazard: string,
  affected: string,
  controls: string,
  rating: string
) {
  return [activity, hazard, affected, controls, rating]
}

function buildOperationalRiskRows(
  fieldValues: Record<string, CmpResolvedFieldValue>,
  selectedAnnexes: string[]
) {
  const rows: string[][] = [
    buildRiskRow(
      'Ingress, admission, and queue containment',
      'Queue pressure, delayed admission, prohibited items, refusal conflict, or poor accessible access.',
      'Waiting attendees, accessible guests, search teams, and route stewards.',
      joinRiskControls(
        getValue(fieldValues, 'ingress_routes_holding_areas'),
        getValue(fieldValues, 'search_policy'),
        getValue(fieldValues, 'queue_design'),
        getValue(fieldValues, 'overspill_controls'),
        getValue(fieldValues, 'accessible_entry_arrangements')
      ),
      'Medium once controlled'
    ),
    buildRiskRow(
      'Internal circulation and high-density areas',
      'Crowd pressure, route obstruction, counterflow, spillback from attractions, or poor visibility of developing density.',
      'Public attendees, stewards, supervisors, performers, and adjacent contractors.',
      joinRiskControls(
        getValue(fieldValues, 'circulation_controls'),
        getValue(fieldValues, 'high_density_controls'),
        getValue(fieldValues, 'internal_queue_controls'),
        getValue(fieldValues, 'monitoring_and_density_tools')
      ),
      'Medium with dynamic monitoring'
    ),
    buildRiskRow(
      'Egress, transport, and dispersal',
      'Compressed egress, uncontrolled crossings, transport congestion, route loss, or poor route information after show close.',
      'Departing public, transport staff, taxi and coach marshals, and campsite return routes.',
      joinRiskControls(
        getValue(fieldValues, 'transport_interface'),
        getValue(fieldValues, 'dispersal_routes'),
        getValue(fieldValues, 'reentry_policy'),
        getValue(fieldValues, 'egress_operations'),
        getValue(fieldValues, 'degraded_route_weather_assumptions')
      ),
      'Medium once phased'
    ),
    buildRiskRow(
      'Safeguarding, welfare, and vulnerability response',
      'Lost children, vulnerable adults, harassment disclosures, intoxication, dehydration, or delayed handover to welfare or medical teams.',
      'Children, vulnerable persons, intoxicated guests, welfare teams, and response staff.',
      joinRiskControls(
        getValue(fieldValues, 'safeguarding_process'),
        getValue(fieldValues, 'safe_spaces'),
        getValue(fieldValues, 'lost_vulnerable_person_process'),
        getValue(fieldValues, 'ask_for_angela_process'),
        getValue(fieldValues, 'confidentiality_logging')
      ),
      'Medium once supervised'
    ),
    buildRiskRow(
      'Emergency response, route protection, and evacuation decision-making',
      'Delayed emergency recognition, conflicting instructions, blocked routes, incomplete area clearance, or poor command escalation.',
      'Public attendees, staff, contractors, emergency responders, and vulnerable persons needing assisted movement.',
      joinRiskControls(
        getValue(fieldValues, 'emergency_procedures'),
        getValue(fieldValues, 'partial_evacuation_procedure'),
        getValue(fieldValues, 'full_evacuation_procedure'),
        getValue(fieldValues, 'lockdown_invacuation_procedure'),
        getValue(fieldValues, 'command_escalation'),
        getValue(fieldValues, 'rendezvous_points')
      ),
      'Medium / escalation critical'
    ),
    buildRiskRow(
      'Counter-terrorism and suspicious item response',
      'Hostile reconnaissance, suspicious item reports, vehicle or weapons threat, or delayed protective action.',
      'Public attendees, perimeter staff, supervisors, control, and emergency responders.',
      joinRiskControls(
        getValue(fieldValues, 'ct_procedures'),
        getValue(fieldValues, 'suspicious_item_protocol'),
        getValue(fieldValues, 'hostile_recon_indicators'),
        getValue(fieldValues, 'run_hide_tell_guidance')
      ),
      'Medium / immediate escalation'
    ),
  ]

  if (clean(getValue(fieldValues, 'build_break_operations')) || clean(getValue(fieldValues, 'service_delivery_scope'))) {
    rows.push(
      buildRiskRow(
        'Build, break, and contractor interface',
        'Unauthorised access, route obstruction, plant or vehicle interface, and contractor activity conflicting with sterile or emergency routes.',
        'Contractors, staff, delivery drivers, and any public or authorised persons near working areas.',
        joinRiskControls(
          getValue(fieldValues, 'service_delivery_scope'),
          getValue(fieldValues, 'build_break_operations'),
          getValue(fieldValues, 'command_structure')
        ),
        'Medium while controlled'
      )
    )
  }

  if (selectedAnnexes.includes('bar_operations')) {
    rows.push(
      buildRiskRow(
        'Bar operations and licensed trading areas',
        'Intoxication, refusal conflict, queue spillback, cash or stock-gate intrusion, and disorder linked to bar demand.',
        'Bar customers, queue stewards, bar staff, roaming responders, and nearby circulation routes.',
        joinRiskControls(
          getValue(fieldValues, 'bar_operations_roles'),
          getValue(fieldValues, 'venue_rules'),
          getValue(fieldValues, 'challenge_policy'),
          getValue(fieldValues, 'queue_design'),
          getValue(fieldValues, 'incident_management')
        ),
        'Medium with reinforced supervision'
      )
    )
  }

  if (selectedAnnexes.includes('search_screening')) {
    rows.push(
      buildRiskRow(
        'Search and screening escalation',
        'Secondary search conflict, prohibited item recovery, surrender refusal, or inconsistent screening posture.',
        'Searching staff, attendees, accessible guests, and supervisors supporting the entry line.',
        joinRiskControls(
          getValue(fieldValues, 'search_screening_roles'),
          getValue(fieldValues, 'search_policy'),
          getValue(fieldValues, 'prohibited_items'),
          getValue(fieldValues, 'overspill_controls')
        ),
        'Medium once supervised'
      )
    )
  }

  if (selectedAnnexes.includes('front_of_stage_pit')) {
    rows.push(
      buildRiskRow(
        'Front of stage and pit operations',
        'Crowd surge, barrier line compression, extraction demand, and poor communication during performance changes.',
        'Audience at the front-of-stage line, pit teams, performers, and adjacent response staff.',
        joinRiskControls(
          getValue(fieldValues, 'front_of_stage_roles'),
          getValue(fieldValues, 'high_density_controls'),
          getValue(fieldValues, 'response_teams'),
          getValue(fieldValues, 'command_escalation')
        ),
        'Medium / performance dependent'
      )
    )
  }

  if (selectedAnnexes.includes('traffic_pedestrian_routes')) {
    rows.push(
      buildRiskRow(
        'Traffic and pedestrian route interface',
        'Vehicle or pedestrian conflict, crossing-point congestion, route encroachment, and uncontrolled public movement at dispersal.',
        'Attendees, route stewards, traffic marshals, contractors, and taxi or coach users.',
        joinRiskControls(
          getValue(fieldValues, 'traffic_pedestrian_roles'),
          getValue(fieldValues, 'transport_interface'),
          getValue(fieldValues, 'dispersal_routes'),
          getValue(fieldValues, 'ramp_routes')
        ),
        'Medium with route protection'
      )
    )
  }

  if (selectedAnnexes.includes('camping_security')) {
    rows.push(
      buildRiskRow(
        'Camping and overnight security',
        'Late-night welfare demand, noise or antisocial behaviour, perimeter breaches, small fires, or delayed response in darkness.',
        'Campers, overnight patrols, welfare teams, and adjacent backstage or perimeter staff.',
        joinRiskControls(
          getValue(fieldValues, 'camping_security_roles'),
          getValue(fieldValues, 'camping_profile'),
          getValue(fieldValues, 'staffing_by_zone_and_time'),
          getValue(fieldValues, 'safeguarding_process')
        ),
        'Medium with overnight supervision'
      )
    )
  }

  if (selectedAnnexes.includes('vip_backstage_security')) {
    rows.push(
      buildRiskRow(
        'VIP, backstage, and controlled-area access',
        'Unauthorised access, challenge conflict, sterile route loss, or compromise of restricted compounds.',
        'Artists, VIP guests, staff, contractors, and access-control teams.',
        joinRiskControls(
          getValue(fieldValues, 'vip_backstage_roles'),
          getValue(fieldValues, 'controlled_areas'),
          getValue(fieldValues, 'venue_rules'),
          getValue(fieldValues, 'named_command_roles')
        ),
        'Low to medium once controlled'
      )
    )
  }

  if (selectedAnnexes.includes('stewarding_deployment')) {
    rows.push(
      buildRiskRow(
        'Stewarding coverage, relief, and redeployment',
        'Uncovered positions, briefing drift, fatigue, delayed redeployment, or inconsistent route information to the public.',
        'Stewards, supervisors, waiting public, and emergency routes dependent on fixed cover.',
        joinRiskControls(
          getValue(fieldValues, 'stewarding_roles'),
          getValue(fieldValues, 'staffing_by_zone_and_time'),
          getValue(fieldValues, 'relief_and_contingency'),
          getValue(fieldValues, 'escalation_staffing')
        ),
        'Medium unless actively managed'
      )
    )
  }

  parseThreeColumnLines(getValue(fieldValues, 'additional_operational_risks')).forEach(([activity, affected, controls]) => {
    rows.push(
      buildRiskRow(
        activity,
        'Additional event-specific operational risk identified by the plan author or source RA.',
        affected,
        controls,
        'Review live'
      )
    )
  })

  return rows
}

function buildSelectedAnnexRoleRows(
  fieldValues: Record<string, CmpResolvedFieldValue>,
  selectedAnnexes: string[]
) {
  return selectedAnnexes
    .map((annexKey) => {
      const fieldKey = CMP_ANNEX_ROLE_FIELD_KEYS[annexKey as CmpAnnexKey]
      if (!fieldKey) return null

      const value = clean(getValue(fieldValues, fieldKey))
      if (!value) return null

      const annex = CMP_ANNEX_DEFINITIONS.find((item) => item.key === annexKey)
      return annex ? [annex.label, value] : null
    })
    .filter(Boolean) as string[][]
}

function buildSectionBlocks(
  sectionKey: string,
  fieldValues: Record<string, CmpResolvedFieldValue>,
  selectedAnnexes: string[],
  documents: CmpPreviewSourceDocument[]
): CmpPreviewBlock[] {
  switch (sectionKey) {
    case 'document_control':
      return maybeTable([
        { label: 'Plan title', value: getValue(fieldValues, 'plan_title') },
        { label: 'Version', value: getValue(fieldValues, 'document_version') },
        { label: 'Status', value: getValue(fieldValues, 'document_status') },
        { label: 'Author', value: getValue(fieldValues, 'author_name') },
        { label: 'Approver', value: getValue(fieldValues, 'approver_name') },
        { label: 'Issue date', value: getValue(fieldValues, 'issue_date') },
        { label: 'Review date', value: getValue(fieldValues, 'review_date') },
      ]).concat(maybeBullets(getValue(fieldValues, 'distribution_list')))

    case 'purpose_scope':
      return maybeParagraph(getValue(fieldValues, 'purpose_scope_summary')).concat(
        maybeBullets(getValue(fieldValues, 'related_documents'))
      )

    case 'event_overview':
      return maybeTable([
        { label: 'Event name', value: getValue(fieldValues, 'event_name') },
        { label: 'Event type', value: getValue(fieldValues, 'event_type') },
        { label: 'Venue', value: getValue(fieldValues, 'venue_name') },
        { label: 'Venue reference', value: getValue(fieldValues, 'venue_reference') },
        { label: 'Organiser', value: getValue(fieldValues, 'organiser_name') },
        { label: 'Client', value: getValue(fieldValues, 'client_name') },
        { label: 'Principal contractor', value: getValue(fieldValues, 'principal_contractor') },
        { label: 'Build dates', value: getValue(fieldValues, 'build_dates') },
        { label: 'Show dates', value: getValue(fieldValues, 'show_dates') },
        { label: 'Break / egress dates', value: getValue(fieldValues, 'break_dates') },
        { label: 'Public ingress start', value: getValue(fieldValues, 'public_ingress_time') },
      ])
        .concat(maybeParagraph(getValue(fieldValues, 'venue_address')))
        .concat(maybeMultiTable(['Operational Phase', 'Detail'], parseColonRows(getValue(fieldValues, 'operational_hours'))))
        .concat(
          parseTwoColumnLines(getValue(fieldValues, 'key_delivery_partners')).length
            ? maybeMultiTable(
                ['Delivery Partner', 'Function'],
                parseTwoColumnLines(getValue(fieldValues, 'key_delivery_partners'))
              )
            : maybeBullets(getValue(fieldValues, 'key_delivery_partners'))
        )

    case 'strategic_objectives':
      return ([{ type: 'bullet_list', items: FIXED_OBJECTIVES }] as CmpPreviewBlock[]).concat(
        maybeBullets(getValue(fieldValues, 'client_objectives'))
      )

    case 'crowd_profile':
      return maybeMetricGrid([
        { label: 'Licensed capacity', value: getValue(fieldValues, 'licensed_capacity') },
        { label: 'Expected attendance', value: getValue(fieldValues, 'expected_attendance') },
        { label: 'Staff / contractors', value: getValue(fieldValues, 'staff_and_contractor_count') },
        { label: 'Audience age profile', value: getValue(fieldValues, 'audience_age_profile') },
      ])
        .concat(labeledParagraph('Crowd profile', getValue(fieldValues, 'attendance_profile')))
        .concat(labeledParagraph('Travel modes', getValue(fieldValues, 'travel_modes')))
        .concat(labeledParagraph('Family and vulnerability profile', getValue(fieldValues, 'family_presence')))
        .concat(labeledParagraph('Alcohol and behaviour profile', getValue(fieldValues, 'alcohol_profile')))
        .concat(labeledParagraph('Camping / overnight profile', getValue(fieldValues, 'camping_profile')))
        .concat(labeledParagraph('Historic issues and intelligence', getValue(fieldValues, 'historic_issues')))
        .concat(labeledParagraph('Mood and trigger points', getValue(fieldValues, 'mood_and_trigger_points')))
        .concat(
          parseTwoColumnLines(getValue(fieldValues, 'peak_periods')).length
            ? maybeMultiTable(['Time / Phase', 'Pressure Point'], parseTwoColumnLines(getValue(fieldValues, 'peak_periods')))
            : labeledParagraph('Peak periods', getValue(fieldValues, 'peak_periods'))
        )

    case 'site_design':
      return labeledParagraph('Site layout summary', getValue(fieldValues, 'site_layout_summary'))
        .concat(buildImageBlocks(documents, ['site_map'], 'Site layout'))
        .concat([{
          type: 'diagram',
          variant: 'crowd_flow',
          stages: [
            { label: 'Ingress', note: summarizeText(getValue(fieldValues, 'dim_aliced_ingress'), 58) },
            { label: 'Arena Circulation', note: summarizeText(getValue(fieldValues, 'dim_aliced_circulation'), 58) },
            { label: 'Main Activity Zones', note: summarizeText(getValue(fieldValues, 'dim_aliced_activity'), 58) },
            { label: 'Egress / Dispersal', note: summarizeText(getValue(fieldValues, 'dim_aliced_egress'), 58) },
          ],
        } as CmpPreviewBlock])
        .concat(maybeBullets(getValue(fieldValues, 'key_zones')))
        .concat(labeledParagraph('Controlled areas', getValue(fieldValues, 'controlled_areas')))
        .concat(labeledParagraph('Emergency exits / holding areas', getValue(fieldValues, 'emergency_exits_holding_areas')))
        .concat(maybeMultiTable(
          ['DIM-ALICED Factor', 'Assessment Summary'],
          [
            ['Design', getValue(fieldValues, 'dim_aliced_design')],
            ['Information', getValue(fieldValues, 'dim_aliced_information')],
            ['Management', getValue(fieldValues, 'dim_aliced_management')],
            ['Activity', getValue(fieldValues, 'dim_aliced_activity')],
            ['Location', getValue(fieldValues, 'dim_aliced_location')],
            ['Ingress', getValue(fieldValues, 'dim_aliced_ingress')],
            ['Circulation', getValue(fieldValues, 'dim_aliced_circulation')],
            ['Egress', getValue(fieldValues, 'dim_aliced_egress')],
            ['Dynamics', getValue(fieldValues, 'dim_aliced_dynamics')],
          ]
        ))

    case 'ramp_assessment':
      return ([{
        type: 'diagram',
        variant: 'ramp',
        items: [
          { title: 'Routes', value: summarizeText(getValue(fieldValues, 'ramp_routes'), 92) },
          { title: 'Arrival', value: summarizeText(getValue(fieldValues, 'ramp_arrival'), 92) },
          { title: 'Movement', value: summarizeText(getValue(fieldValues, 'ramp_movement'), 92) },
          { title: 'Profile', value: summarizeText(getValue(fieldValues, 'ramp_profile'), 92) },
        ],
      } as CmpPreviewBlock] as CmpPreviewBlock[])
        .concat(maybeMultiTable(
          ['RAMP Element', 'Assessment Summary'],
          [
            ['Routes', getValue(fieldValues, 'ramp_routes')],
            ['Arrival', getValue(fieldValues, 'ramp_arrival')],
            ['Movement', getValue(fieldValues, 'ramp_movement')],
            ['Profile', getValue(fieldValues, 'ramp_profile')],
          ]
        ))

    case 'capacity_flow':
      return maybeMetricGrid([
        { label: 'Licensed capacity', value: getValue(fieldValues, 'licensed_capacity') },
        { label: 'Expected attendance', value: getValue(fieldValues, 'expected_attendance') },
        { label: 'Gross area', value: getValue(fieldValues, 'gross_area') },
        { label: 'Net area', value: getValue(fieldValues, 'net_area') },
      ])
        .concat(labeledParagraph('Excluded areas', getValue(fieldValues, 'excluded_areas')))
        .concat(labeledParagraph('Density assumptions', getValue(fieldValues, 'density_assumptions')))
        .concat(
          parseTwoColumnLines(getValue(fieldValues, 'zone_capacities')).length
            ? maybeMultiTable(['Zone', 'Capacity'], parseTwoColumnLines(getValue(fieldValues, 'zone_capacities')))
            : labeledParagraph('Zone capacities', getValue(fieldValues, 'zone_capacities'))
        )
        .concat(labeledParagraph('Ingress flow assumptions', getValue(fieldValues, 'ingress_flow_assumptions')))
        .concat(labeledParagraph('Egress flow assumptions', getValue(fieldValues, 'egress_flow_assumptions')))
        .concat(labeledParagraph('Emergency clearance assumptions', getValue(fieldValues, 'emergency_clearance_assumptions')))
        .concat(labeledParagraph('Degraded route / weather assumptions', getValue(fieldValues, 'degraded_route_weather_assumptions')))

    case 'command_control':
      return ([{
        type: 'diagram',
        variant: 'command',
        lead: splitThreeColumnLinesToLabels(getValue(fieldValues, 'named_command_roles'))[0] || summarizeText(getValue(fieldValues, 'command_structure'), 40),
        control: splitThreeColumnLinesToLabels(getValue(fieldValues, 'named_command_roles'))[1] || 'Event Control',
        supervisors: splitThreeColumnLinesToLabels(getValue(fieldValues, 'named_command_roles')).slice(2, 6),
        interfaces: splitList(getValue(fieldValues, 'external_interfaces')).slice(0, 4),
      } as CmpPreviewBlock] as CmpPreviewBlock[])
        .concat(labeledParagraph('Command structure', getValue(fieldValues, 'command_structure')))
        .concat(
          parseThreeColumnLines(getValue(fieldValues, 'named_command_roles')).length
            ? maybeMultiTable(
                ['Role', 'Lead', 'Function'],
                parseThreeColumnLines(getValue(fieldValues, 'named_command_roles'))
              )
            : labeledParagraph('Named command roles', getValue(fieldValues, 'named_command_roles'))
        )
        .concat(
          parseTwoColumnLines(getValue(fieldValues, 'radio_channels_callsigns')).length
            ? maybeMultiTable(
                ['Channel / Call Sign', 'Use'],
                parseTwoColumnLines(getValue(fieldValues, 'radio_channels_callsigns'))
              )
            : labeledParagraph('Radio channels and call signs', getValue(fieldValues, 'radio_channels_callsigns'))
        )
        .concat(labeledParagraph('Reporting lines', getValue(fieldValues, 'reporting_lines')))
        .concat(maybeBullets(getValue(fieldValues, 'external_interfaces')))
        .concat(
          parseThreeColumnLines(getValue(fieldValues, 'key_contacts_directory')).length
            ? maybeMultiTable(
                ['Function', 'Lead', 'Contact'],
                parseThreeColumnLines(getValue(fieldValues, 'key_contacts_directory'))
              )
            : labeledParagraph('Key contacts directory', getValue(fieldValues, 'key_contacts_directory'))
        )
        .concat(labeledParagraph('Control room structure', getValue(fieldValues, 'control_room_structure')))
        .concat(labeledParagraph('Briefings and inductions', getValue(fieldValues, 'briefing_and_induction')))
        .concat(labeledParagraph('Monitoring technology and live observation', getValue(fieldValues, 'monitoring_and_density_tools')))

    case 'deployment_strategy':
      return labeledParagraph('Service directory and operational scope', getValue(fieldValues, 'service_delivery_scope'))
        .concat(labeledParagraph('Build and break operations', getValue(fieldValues, 'build_break_operations')))
        .concat(labeledParagraph('Specialist teams and assets', getValue(fieldValues, 'specialist_teams_and_assets')))
        .concat(
          maybeMultiTable(
            ['Selected Annex', 'Roles and Duties'],
            buildSelectedAnnexRoleRows(fieldValues, selectedAnnexes)
          )
        )
        .concat(
        parseThreeColumnLines(getValue(fieldValues, 'staffing_by_zone_and_time')).length
          ? maybeMultiTable(
              ['Time / Phase', 'Zone', 'Deployment Detail'],
              parseThreeColumnLines(getValue(fieldValues, 'staffing_by_zone_and_time'))
            )
          : labeledParagraph('Staffing by zone and time', getValue(fieldValues, 'staffing_by_zone_and_time'))
        )
        .concat(
          parseThreeColumnLines(getValue(fieldValues, 'response_teams')).length
            ? maybeMultiTable(
                ['Team', 'Resourcing', 'Purpose'],
                parseThreeColumnLines(getValue(fieldValues, 'response_teams'))
              )
            : labeledParagraph('Response teams', getValue(fieldValues, 'response_teams'))
        )
        .concat(labeledParagraph('Relief and contingency', getValue(fieldValues, 'relief_and_contingency')))
        .concat(labeledParagraph('Escalation staffing', getValue(fieldValues, 'escalation_staffing')))

    case 'ingress_operations':
      return maybeMultiTable(
        ['Ingress Control', 'Operational Detail'],
        [
          ['Ingress routes and holding areas', getValue(fieldValues, 'ingress_routes_holding_areas')],
          ['Search policy', getValue(fieldValues, 'search_policy')],
          ['Queue design', getValue(fieldValues, 'queue_design')],
          ['Overspill controls', getValue(fieldValues, 'overspill_controls')],
          ['Accessible entry arrangements', getValue(fieldValues, 'accessible_entry_arrangements')],
          ['Ingress operations', getValue(fieldValues, 'ingress_operations')],
        ]
      ).concat(buildImageBlocks(documents, ['ingress_map'], 'Ingress operations'))

    case 'circulation_internal':
      return maybeMultiTable(
        ['Internal Control', 'Operational Detail'],
        [
          ['Circulation controls', getValue(fieldValues, 'circulation_controls')],
          ['High-density controls', getValue(fieldValues, 'high_density_controls')],
          ['Internal queue controls', getValue(fieldValues, 'internal_queue_controls')],
        ]
      )

    case 'egress_dispersal':
      return ([{
        type: 'diagram',
        variant: 'crowd_flow',
        stages: [
          { label: 'Venue Release', note: summarizeText(getValue(fieldValues, 'egress_operations'), 58) },
          { label: 'Route Split', note: summarizeText(getValue(fieldValues, 'dispersal_routes'), 58) },
          { label: 'Transport Interface', note: summarizeText(getValue(fieldValues, 'transport_interface'), 58) },
          { label: 'Re-entry / Return', note: summarizeText(getValue(fieldValues, 'reentry_policy'), 58) },
        ],
      } as CmpPreviewBlock] as CmpPreviewBlock[])
        .concat(
          maybeMultiTable(
            ['Egress Control', 'Operational Detail'],
            [
              ['Transport interface', getValue(fieldValues, 'transport_interface')],
              ['Dispersal routes', getValue(fieldValues, 'dispersal_routes')],
              ['Re-entry policy', getValue(fieldValues, 'reentry_policy')],
              ['Egress operations', getValue(fieldValues, 'egress_operations')],
            ]
          )
        )
        .concat(buildImageBlocks(documents, ['egress_map', 'route_map'], 'Egress and dispersal'))

    case 'safeguarding_vulnerability':
      return maybeMultiTable(
        ['Safeguarding Control', 'Operational Detail'],
        [
          ['Safeguarding process', getValue(fieldValues, 'safeguarding_process')],
          ['Safe spaces / welfare locations', getValue(fieldValues, 'safe_spaces')],
          ['Lost child / vulnerable person process', getValue(fieldValues, 'lost_vulnerable_person_process')],
          ['Disclosure route', getValue(fieldValues, 'ask_for_angela_process')],
          ['Confidentiality and logging', getValue(fieldValues, 'confidentiality_logging')],
        ]
      )

    case 'licensing_rules':
      return maybeTable([
        { label: 'DPS / licence holder', value: getValue(fieldValues, 'dps_name') },
        { label: 'Challenge policy', value: getValue(fieldValues, 'challenge_policy') },
      ])
        .concat(
          maybeMultiTable(
            ['Licensing Control', 'Operational Detail'],
            [
              ['Licensable activities', getValue(fieldValues, 'licensable_activities')],
              ['Licensing conditions', getValue(fieldValues, 'licensing_conditions')],
              ['Venue rules', getValue(fieldValues, 'venue_rules')],
              ['Prohibited items', getValue(fieldValues, 'prohibited_items')],
            ]
          )
        )

    case 'incident_management':
      return maybeParagraph(getValue(fieldValues, 'incident_management')).concat(
        maybeMultiTable(
          ['Incident Type', 'Primary Response Focus'],
          [
            ['Disorder / assault', summarizeText(getValue(fieldValues, 'incident_management'), 140)],
            ['Lost child / vulnerable person', summarizeText(getValue(fieldValues, 'lost_vulnerable_person_process'), 140)],
            ['Medical / welfare', summarizeText(getValue(fieldValues, 'safe_spaces'), 140)],
            ['Crowd pressure / surge', summarizeText(getValue(fieldValues, 'high_density_controls'), 140)],
            ['Suspicious item / CT concern', summarizeText(getValue(fieldValues, 'suspicious_item_protocol'), 140)],
          ]
        )
      )

    case 'risk_assessment':
      return maybeParagraph(getValue(fieldValues, 'risk_assessment_methodology'))
        .concat(labeledParagraph('Risk assessment scope and KSS responsibilities', getValue(fieldValues, 'risk_assessment_scope')))
        .concat(labeledParagraph('Source RA notes, key hazards, and trigger points', getValue(fieldValues, 'risk_assessment_source_notes')))
        .concat(
          maybeMultiTable(
            ['Activity / Position', 'Hazard', 'Who may be harmed', 'Controls in this CMP', 'Residual position'],
            buildOperationalRiskRows(fieldValues, selectedAnnexes)
          )
        )

    case 'emergency_procedures':
      return ([{
        type: 'image',
        title: 'Emergency Procedures Overview',
        caption: 'Operational emergency actions: part evacuation, full evacuation, invacuation / lockdown, and shelter.',
        imageUrl: CMP_SECTION_VISUALS.emergency,
        alt: 'Emergency procedures operational visual',
      } as CmpPreviewBlock] as CmpPreviewBlock[])
        .concat(
          maybeMultiTable(
            ['Emergency Arrangement', 'Operational Detail'],
            [
              ['Emergency procedures', getValue(fieldValues, 'emergency_procedures')],
              ['Part evacuation', getValue(fieldValues, 'partial_evacuation_procedure')],
              ['Full evacuation', getValue(fieldValues, 'full_evacuation_procedure')],
              ['Invacuation / lockdown', getValue(fieldValues, 'lockdown_invacuation_procedure')],
              ['Shelter', getValue(fieldValues, 'shelter_procedure')],
              ['Show stop triggers', getValue(fieldValues, 'show_stop_triggers')],
              ['Rendezvous points / emergency holding areas', getValue(fieldValues, 'rendezvous_points')],
              ['Command escalation', getValue(fieldValues, 'command_escalation')],
              ['Emergency search zones / sterile areas', getValue(fieldValues, 'emergency_search_zones')],
            ]
          )
        )
        .concat(buildImageBlocks(documents, ['emergency_map'], 'Emergency procedures'))

    case 'counter_terrorism':
      return ([{
        type: 'image_grid',
        title: 'Immediate Protective Action Posters',
        caption: 'Use the ACT Run Hide Tell and Initial Operational Response poster guidance during briefings and live-event escalation.',
        items: [
          {
            title: 'Run Hide Tell',
            caption: 'Counter Terrorism Policing firearms or weapons attack guidance.',
            imageUrl: CMP_SECTION_VISUALS.runHideTell,
            alt: 'Run Hide Tell counter-terrorism poster',
          },
          {
            title: 'Remove Remove Remove',
            caption: 'Initial Operational Response guidance for hazardous substance exposure.',
            imageUrl: CMP_SECTION_VISUALS.iorRemove,
            alt: 'Remove Remove Remove hazardous substance response poster',
          },
        ],
      } as CmpPreviewBlock] as CmpPreviewBlock[])
        .concat(
          maybeMultiTable(
            ['CT / Protect Duty Control', 'Operational Detail'],
            [
              ['Counter-terrorism procedures', getValue(fieldValues, 'ct_procedures')],
              ['Suspicious item protocol', getValue(fieldValues, 'suspicious_item_protocol')],
              ['Hostile reconnaissance indicators', getValue(fieldValues, 'hostile_recon_indicators')],
              ['Run Hide Tell / immediate protective actions', getValue(fieldValues, 'run_hide_tell_guidance')],
            ]
          )
        )

    case 'staff_welfare':
      return maybeTable([
        { label: 'Staff welfare arrangements', value: getValue(fieldValues, 'staff_welfare_arrangements') },
      ])

    case 'accessibility':
      return maybeMultiTable(
        ['Accessibility Control', 'Operational Detail'],
        [
          ['Accessibility arrangements', getValue(fieldValues, 'accessibility_arrangements')],
          ['Accessibility team liaison', getValue(fieldValues, 'accessibility_team_liaison')],
        ]
      )

    case 'communications':
      return maybeMultiTable(
        ['Communications Control', 'Operational Detail'],
        [
          ['Communications plan', getValue(fieldValues, 'communications_plan')],
          ['SITREP and decision logging', getValue(fieldValues, 'sitrep_decision_logging')],
        ]
      )

    case 'post_event_reporting':
      return maybeTable([
        { label: 'Post-event reporting and debrief', value: getValue(fieldValues, 'debrief_reporting') },
      ])

    case 'appendices':
      return labeledParagraph('Site maps and route diagrams', getValue(fieldValues, 'site_maps_and_route_diagrams'))
        .concat(maybeBullets(getValue(fieldValues, 'appendix_notes')))

    default:
      return []
  }
}

function buildAnnexBlocks(
  annexKey: CmpAnnexKey,
  fieldValues: Record<string, CmpResolvedFieldValue>,
  documents: CmpPreviewSourceDocument[]
): CmpPreviewBlock[] {
  const roleFieldKey = CMP_ANNEX_ROLE_FIELD_KEYS[annexKey]
  const roleBlocks = roleFieldKey
    ? labeledParagraph('Roles and duties', getValue(fieldValues, roleFieldKey))
    : []

  switch (annexKey) {
    case 'bar_operations':
      return roleBlocks
        .concat(labeledParagraph('Bar and service area controls', getValue(fieldValues, 'venue_rules')))
        .concat(labeledParagraph('Queue design', getValue(fieldValues, 'queue_design')))
        .concat(labeledParagraph('Prohibited items', getValue(fieldValues, 'prohibited_items')))
        .concat(labeledParagraph('Incident response around licensed activity', getValue(fieldValues, 'incident_management')))

    case 'search_screening':
      return roleBlocks
        .concat(labeledParagraph('Search policy', getValue(fieldValues, 'search_policy')))
        .concat(labeledParagraph('Prohibited items', getValue(fieldValues, 'prohibited_items')))
        .concat(labeledParagraph('Overspill and queue controls', getValue(fieldValues, 'overspill_controls')))

    case 'front_of_stage_pit':
      return roleBlocks
        .concat(labeledParagraph('High-density / front-of-stage controls', getValue(fieldValues, 'high_density_controls')))
        .concat(labeledParagraph('Response teams', getValue(fieldValues, 'response_teams')))
        .concat(labeledParagraph('Emergency escalation', getValue(fieldValues, 'command_escalation')))

    case 'traffic_pedestrian_routes':
      return roleBlocks
        .concat(labeledParagraph('Routes', getValue(fieldValues, 'ramp_routes')))
        .concat(labeledParagraph('Transport interface', getValue(fieldValues, 'transport_interface')))
        .concat(labeledParagraph('Dispersal routes', getValue(fieldValues, 'dispersal_routes')))
        .concat(buildImageBlocks(documents, ['route_map', 'egress_map'], 'Traffic and pedestrian routes'))

    case 'camping_security':
      return roleBlocks
        .concat(labeledParagraph('Camping profile', getValue(fieldValues, 'camping_profile')))
        .concat(labeledParagraph('Staffing by zone and time', getValue(fieldValues, 'staffing_by_zone_and_time')))
        .concat(labeledParagraph('Safeguarding process', getValue(fieldValues, 'safeguarding_process')))

    case 'vip_backstage_security':
      return roleBlocks
        .concat(labeledParagraph('Controlled areas', getValue(fieldValues, 'controlled_areas')))
        .concat(labeledParagraph('Named command roles', getValue(fieldValues, 'named_command_roles')))
        .concat(labeledParagraph('Venue rules and accreditation controls', getValue(fieldValues, 'venue_rules')))

    case 'stewarding_deployment':
      return roleBlocks
        .concat(
          parseThreeColumnLines(getValue(fieldValues, 'staffing_by_zone_and_time')).length
            ? maybeMultiTable(
                ['Time / Phase', 'Zone', 'Deployment Detail'],
                parseThreeColumnLines(getValue(fieldValues, 'staffing_by_zone_and_time'))
              )
            : labeledParagraph('Staffing by zone and time', getValue(fieldValues, 'staffing_by_zone_and_time'))
        )
        .concat(
          parseThreeColumnLines(getValue(fieldValues, 'response_teams')).length
            ? maybeMultiTable(
                ['Team', 'Resourcing', 'Purpose'],
                parseThreeColumnLines(getValue(fieldValues, 'response_teams'))
              )
            : labeledParagraph('Response teams', getValue(fieldValues, 'response_teams'))
        )
        .concat(labeledParagraph('Relief and contingency', getValue(fieldValues, 'relief_and_contingency')))
        .concat(labeledParagraph('Escalation staffing', getValue(fieldValues, 'escalation_staffing')))

    case 'emergency_action_cards':
      return labeledParagraph('Emergency procedures', getValue(fieldValues, 'emergency_procedures'))
        .concat(labeledParagraph('Part evacuation', getValue(fieldValues, 'partial_evacuation_procedure')))
        .concat(labeledParagraph('Full evacuation', getValue(fieldValues, 'full_evacuation_procedure')))
        .concat(labeledParagraph('Invacuation / lockdown', getValue(fieldValues, 'lockdown_invacuation_procedure')))
        .concat(labeledParagraph('Shelter', getValue(fieldValues, 'shelter_procedure')))
        .concat(labeledParagraph('Counter-terrorism procedures', getValue(fieldValues, 'ct_procedures')))
        .concat(labeledParagraph('Safeguarding process', getValue(fieldValues, 'safeguarding_process')))
        .concat(buildImageBlocks(documents, ['emergency_map'], 'Emergency action cards'))

    default:
      return []
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function blockToHtml(block: CmpPreviewBlock) {
  switch (block.type) {
    case 'paragraph':
      return `<p>${escapeHtml(block.text)}</p>`
    case 'bullet_list':
      return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    case 'table':
      return `<table class="cmp-key-value-table"><tbody>${block.rows
        .map(
          (row) =>
            `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`
        )
        .join('')}</tbody></table>`
    case 'multi_table':
      return `<table class="cmp-matrix-table"><thead><tr>${block.headers
        .map((header) => `<th>${escapeHtml(header)}</th>`)
        .join('')}</tr></thead><tbody>${block.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
        )
        .join('')}</tbody></table>`
    case 'metric_grid':
      return `<table class="cmp-key-value-table"><tbody>${block.items
        .map(
          (item) =>
            `<tr><th>${escapeHtml(item.label)}</th><td>${escapeHtml(item.value)}</td></tr>`
        )
        .join('')}</tbody></table>`
    case 'toc_columns':
      return `<div class="cmp-toc-columns">${block.items
        .map(
          (item) =>
            `<div class="cmp-toc-item"><span class="cmp-toc-ref">${escapeHtml(item.ref)}</span><span class="cmp-toc-title">${escapeHtml(item.title)}</span></div>`
        )
        .join('')}</div>`
    case 'image':
      return `<figure class="cmp-image-panel"><div class="cmp-image-title">${escapeHtml(block.title)}</div><img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.alt)}" />${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}</figure>`
    case 'image_grid':
      return `<section class="cmp-image-grid-panel"><div class="cmp-image-title">${escapeHtml(block.title)}</div>${block.caption ? `<p class="cmp-image-grid-caption">${escapeHtml(block.caption)}</p>` : ''}<div class="cmp-image-grid">${block.items
        .map(
          (item) =>
            `<figure class="cmp-image-panel"><div class="cmp-image-title">${escapeHtml(item.title)}</div><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.alt)}" />${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}</figure>`
        )
        .join('')}</div></section>`
    case 'diagram':
      switch (block.variant) {
        case 'ramp':
          return `<table class="cmp-matrix-table"><thead><tr><th>RAMP Element</th><th>Assessment Summary</th></tr></thead><tbody>${block.items
            .map(
              (item) =>
                `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.value)}</td></tr>`
            )
            .join('')}</tbody></table>`
        case 'crowd_flow':
          return `<table class="cmp-matrix-table"><thead><tr><th>Flow Stage</th><th>Operational Note</th></tr></thead><tbody>${block.stages
            .map(
              (stage) =>
                `<tr><td>${escapeHtml(stage.label)}</td><td>${escapeHtml(stage.note)}</td></tr>`
            )
            .join('')}</tbody></table>`
        case 'command':
          return `<table class="cmp-key-value-table"><tbody>${[
            ['Operational lead', block.lead],
            ['Event control', block.control],
            ['Supervisors', block.supervisors.join('; ')],
            ['Key interfaces', block.interfaces.join('; ')],
          ]
            .map(
              ([label, value]) =>
                `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
            )
            .join('')}</tbody></table>`
        case 'emergency':
        case 'ct':
          return `<table class="cmp-matrix-table"><thead><tr><th>Action</th><th>Operational Detail</th></tr></thead><tbody>${block.cards
            .map(
              (card) =>
                `<tr><td>${escapeHtml(card.title)}</td><td>${escapeHtml(card.detail)}</td></tr>`
            )
            .join('')}</tbody></table>`
        default:
          return ''
      }
    default:
      return ''
  }
}

export function buildCmpPreviewModel(input: {
  fieldValues: Record<string, CmpResolvedFieldValue>
  selectedAnnexes: string[]
  includeKssProfileAppendix?: boolean
  documents?: CmpPreviewSourceDocument[]
}) {
  const title =
    getValue(input.fieldValues, 'plan_title') ||
    getValue(input.fieldValues, 'event_name') ||
    'Crowd Management and Security Operations Plan'
  const subtitleParts = [
    clean(getValue(input.fieldValues, 'event_name')),
    clean(getValue(input.fieldValues, 'venue_name')),
    clean(getValue(input.fieldValues, 'show_dates')),
  ].filter(Boolean)

  const coverRows = [
    { label: 'Event', value: getValue(input.fieldValues, 'event_name') },
    { label: 'Venue', value: getValue(input.fieldValues, 'venue_name') },
    { label: 'Show dates', value: getValue(input.fieldValues, 'show_dates') },
    { label: 'Version', value: getValue(input.fieldValues, 'document_version') },
    { label: 'Status', value: getValue(input.fieldValues, 'document_status') },
    { label: 'Issue date', value: getValue(input.fieldValues, 'issue_date') },
    { label: 'Review date', value: getValue(input.fieldValues, 'review_date') },
    { label: 'Author', value: getValue(input.fieldValues, 'author_name') },
    { label: 'Approver', value: getValue(input.fieldValues, 'approver_name') },
    { label: 'Organiser', value: getValue(input.fieldValues, 'organiser_name') },
    { label: 'Client', value: getValue(input.fieldValues, 'client_name') },
  ].filter((row) => clean(row.value))

  const documents = input.documents || []
  const baseSections: CmpPreviewSection[] = CMP_MASTER_TEMPLATE_SECTIONS.map((section) => {
    const description = clean(section.description)
    return {
      key: section.key,
      title: SECTION_TITLES[section.key] || section.title,
      description,
      blocks: buildSectionBlocks(section.key, input.fieldValues, input.selectedAnnexes, documents),
    }
  }).filter((section) => section.blocks.length > 0 || clean(section.description))

  const annexes: CmpPreviewAnnex[] = CMP_ANNEX_DEFINITIONS
    .filter((annex) => input.selectedAnnexes.includes(annex.key))
    .map((annex) => ({
      key: annex.key,
      title: annex.label,
      description: annex.description,
      blocks: buildAnnexBlocks(annex.key, input.fieldValues, documents),
    }))
    .filter((annex) => annex.blocks.length > 0 || clean(annex.description))

  if (input.includeKssProfileAppendix) {
    const appendixValue = clean(getValue(input.fieldValues, 'appendix_notes'))
    if (appendixValue) {
      annexes.push({
        key: 'provider_credentials_appendix',
        title: 'Provider Credentials Appendix',
        description: 'Supporting provider profile, credentials, and capability information. This appendix does not form part of the live operational control text.',
        blocks: maybeBullets(appendixValue),
      })
    }
  }

  const contentsItems = [
    ...baseSections.map((section, index) => ({ ref: String(index + 1), title: section.title })),
    ...annexes.map((annex, index) => ({ ref: `Annex ${String.fromCharCode(65 + index)}`, title: annex.title })),
  ]

  const tocSection: CmpPreviewSection = {
    key: 'table_of_contents',
    title: 'Table of Contents',
    description: 'The following core sections and selected annexes form part of this issued document.',
    blocks: maybeTocColumns(contentsItems),
  }

  const documentControlIndex = baseSections.findIndex((section) => section.key === 'document_control')
  const sections =
    documentControlIndex === -1
      ? [tocSection, ...baseSections]
      : [
          ...baseSections.slice(0, documentControlIndex + 1),
          tocSection,
          ...baseSections.slice(documentControlIndex + 1),
        ]

  return {
    title,
    subtitle: subtitleParts.join(' | '),
    coverRows,
    sections,
    annexes,
  } satisfies CmpPreviewModel
}

export function renderCmpPreviewHtml(model: CmpPreviewModel) {
  const sectionsHtml = model.sections
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.title)}</h2>${
          section.description ? `<p>${escapeHtml(section.description)}</p>` : ''
        }${section.blocks.map(blockToHtml).join('')}</section>`
    )
    .join('')
  const annexesHtml = model.annexes.length
    ? model.annexes
        .map(
          (annex) =>
            `<section><h2>Annex: ${escapeHtml(annex.title)}</h2>${
              annex.description ? `<p>${escapeHtml(annex.description)}</p>` : ''
            }${annex.blocks.map(blockToHtml).join('')}</section>`
        )
        .join('')
    : ''

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(model.title)}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 36px; line-height: 1.45; }
      h1 { font-size: 26px; margin: 0 0 8px; }
      .subtitle { color: #475569; margin: 0 0 24px; font-size: 14px; }
      h2 { font-size: 18px; margin: 28px 0 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
      p { margin: 0 0 10px; white-space: pre-wrap; }
      ul { margin: 0 0 12px 18px; padding: 0; }
      li { margin: 0 0 6px; }
      table { width: 100%; border-collapse: collapse; margin: 0 0 12px; }
      th, td { border: 1px solid #cbd5e1; text-align: left; padding: 8px 10px; vertical-align: top; }
      th { background: #f8fafc; }
      .cmp-image-panel { margin: 0 0 14px; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; background: #fff; }
      .cmp-image-title { font-weight: 700; margin: 0 0 8px; }
      .cmp-image-panel img { width: 100%; max-height: 420px; object-fit: contain; border: 1px solid #e2e8f0; background: #f8fafc; }
      .cmp-image-panel figcaption { color: #64748b; font-size: 12px; margin-top: 6px; }
      .cmp-image-grid-panel { margin: 0 0 14px; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; background: #fff; }
      .cmp-image-grid-caption { color: #475569; margin: 0 0 10px; }
      .cmp-image-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .cmp-image-grid .cmp-image-panel { margin: 0; }
      .cmp-toc-columns { column-count: 2; column-gap: 20px; margin: 0 0 12px; }
      .cmp-toc-item { break-inside: avoid; display: flex; gap: 10px; margin: 0 0 8px; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
      .cmp-toc-ref { min-width: 54px; font-weight: 700; color: #475569; }
      .cmp-toc-title { color: #0f172a; }
      .cmp-key-value-table tbody th { width: 32%; }
      .cmp-matrix-table thead th { font-weight: 700; }
      section { page-break-inside: avoid; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(model.title)}</h1>
    ${model.subtitle ? `<p class="subtitle">${escapeHtml(model.subtitle)}</p>` : ''}
    ${
      model.coverRows.length
        ? `<table><tbody>${model.coverRows
            .map(
              (row) => `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`
            )
            .join('')}</tbody></table>`
        : ''
    }
    ${sectionsHtml}
    ${annexesHtml}
  </body>
</html>`
}

export function resolveCmpFieldValueMap(
  fields: Array<
    Pick<CmpMasterTemplateField, 'key' | 'label'> & {
      defaultValueText?: string | null
    }
  >,
  valueRows: Array<{
    fieldKey: string
    valueText?: string | null
    source?: string | null
  }>
) {
  const valueMap = new Map(valueRows.map((row) => [row.fieldKey, row]))

  return Object.fromEntries(
    fields.map((field) => {
      const row = valueMap.get(field.key)
      return [
        field.key,
        {
          key: field.key,
          label: field.label,
          valueText: clean(row?.valueText) || clean(field.defaultValueText),
          source: row?.source || (field.defaultValueText ? 'default' : 'default'),
        } satisfies CmpResolvedFieldValue,
      ]
    })
  ) as Record<string, CmpResolvedFieldValue>
}
