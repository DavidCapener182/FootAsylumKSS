import {
  EMP_ANNEX_ROLE_FIELD_KEYS,
  EMP_ANNEX_DEFINITIONS,
  EMP_MASTER_TEMPLATE_SECTIONS,
  type EmpAnnexKey,
  type EmpMasterTemplateField,
} from '@/lib/emp/master-template'

export interface EmpResolvedFieldValue {
  key: string
  label: string
  valueText: string
  source: string
}

export type EmpPreviewBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'bullet_list'; items: string[] }
  | { type: 'table'; rows: Array<{ label: string; value: string }> }
  | { type: 'multi_table'; headers: string[]; rows: string[][]; keepTogether?: boolean; compact?: boolean; startOnNewPage?: boolean; avoidRowSplit?: boolean; rowUnitScale?: number }
  | { type: 'metric_grid'; items: Array<{ label: string; value: string }> }
  | { type: 'toc_columns'; items: Array<{ ref: string; title: string; page?: number }> }
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
      variant: 'bar_queue_flow'
      lanes: string[]
      controls: string[]
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

export interface EmpPreviewSourceDocument {
  documentKind: string
  fileName: string
  fileType: string
  signedUrl: string | null
}

export interface EmpPreviewSection {
  key: string
  title: string
  description?: string
  blocks: EmpPreviewBlock[]
}

export interface EmpPreviewAnnex {
  key: string
  title: string
  description?: string
  blocks: EmpPreviewBlock[]
}

const RADIO_ONE_PLAN_TITLE = 'KSS NW LTD Bar Security Operations Plan - BBC Radio 1 Big Weekend Sunderland 2026'
const RADIO_ONE_TBC = 'TBC - final Peppermint/KSS deployment required before issue'

export interface EmpPreviewModel {
  title: string
  subtitle: string
  coverRows: Array<{ label: string; value: string }>
  sections: EmpPreviewSection[]
  annexes: EmpPreviewAnnex[]
}

const FIXED_OBJECTIVES = [
  'Protect the public, staff, contractors, client assets, and KSS-allocated areas.',
  'Support safe bar, bar compound, stock, and service-area operations where allocated to KSS.',
  'Prevent crime, disorder, licence breaches, refusal conflict, queue pressure, and avoidable disruption.',
  'Support safeguarding, welfare, medical, and emergency response functions.',
  'Support client, organiser, venue, and licensing objectives through a consistent operational structure.',
]

const SECTION_TITLES: Record<string, string> = Object.fromEntries(
  EMP_MASTER_TEMPLATE_SECTIONS.map((section) => [section.key, section.title])
)

const IMAGE_KIND_LABELS: Record<string, string> = {
  site_map: 'Site Map / Plan',
  ingress_map: 'Ingress Map / Queue Plan',
  egress_map: 'Egress Map / Dispersal Plan',
  emergency_map: 'Emergency / Evacuation Map',
  route_map: 'Route / Traffic Interface Map',
}
const EMP_SECTION_VISUALS = {
  emergency: '/emp-assets/emp-emergency-procedures.png',
  runHideTell: '/emp-assets/run-hide-tell-poster.png',
  iorRemove: '/emp-assets/ior-remove-poster.jpg',
} as const

const RADIO_ONE_EXCLUDED_ANNEXES = new Set<EmpAnnexKey>([
  'traffic_pedestrian_routes',
  'stewarding_deployment',
  'emergency_action_cards',
])

function clean(value: string | null | undefined) {
  return String(value || '').trim()
}

function isRadioOneBarPlan(fieldValues: Record<string, EmpResolvedFieldValue>, selectedAnnexes: string[]) {
  const eventAndTitle = `${getValue(fieldValues, 'event_name')} ${getValue(fieldValues, 'plan_title')}`
  return selectedAnnexes.includes('bar_operations') && /Radio 1|Big Weekend|R1BW/i.test(eventAndTitle)
}

function getEffectiveSelectedAnnexes(fieldValues: Record<string, EmpResolvedFieldValue>, selectedAnnexes: string[]) {
  if (!isRadioOneBarPlan(fieldValues, selectedAnnexes)) return selectedAnnexes
  return selectedAnnexes.filter((annexKey) => !RADIO_ONE_EXCLUDED_ANNEXES.has(annexKey as EmpAnnexKey))
}

function isRadioOnePlan(fieldValues: Record<string, EmpResolvedFieldValue>, selectedAnnexes: string[] = ['bar_operations']) {
  return isRadioOneBarPlan(fieldValues, selectedAnnexes)
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

function maybeParagraph(text: string | null | undefined): EmpPreviewBlock[] {
  const value = clean(text)
  return value ? [{ type: 'paragraph', text: value }] : []
}

function subheading(text: string | null | undefined): EmpPreviewBlock[] {
  const value = clean(text)
  return value ? [{ type: 'subheading', text: value }] : []
}

function maybeBullets(value: string | null | undefined): EmpPreviewBlock[] {
  const items = splitList(value)
  return items.length ? [{ type: 'bullet_list', items }] : []
}

function maybeTable(rows: Array<{ label: string; value: string | null | undefined }>): EmpPreviewBlock[] {
  const filtered = rows
    .map((row) => ({ label: row.label, value: clean(row.value) }))
    .filter((row) => row.value)

  return filtered.length ? [{ type: 'table', rows: filtered }] : []
}

function maybeMultiTable(headers: string[], rows: string[][], options?: { keepTogether?: boolean; compact?: boolean; startOnNewPage?: boolean; avoidRowSplit?: boolean; rowUnitScale?: number }): EmpPreviewBlock[] {
  const filtered = rows.filter((row) => row.some((cell) => clean(cell)))
  return filtered.length ? [{ type: 'multi_table', headers, rows: filtered, ...options }] : []
}

function maybeMetricGrid(items: Array<{ label: string; value: string | null | undefined }>): EmpPreviewBlock[] {
  const filtered = items
    .map((item) => ({ label: item.label, value: clean(item.value) }))
    .filter((item) => item.value)

  return filtered.length ? [{ type: 'metric_grid', items: filtered }] : []
}

function maybeTocColumns(items: Array<{ ref: string; title: string; page?: number }>): EmpPreviewBlock[] {
  const filtered = items.filter((item) => clean(item.ref) && clean(item.title))
  return filtered.length ? [{ type: 'toc_columns', items: filtered }] : []
}

function labeledParagraph(label: string, value: string | null | undefined): EmpPreviewBlock[] {
  const cleaned = clean(value)
  return cleaned ? [{ type: 'paragraph', text: `${label}: ${cleaned}` }] : []
}

function isImageDocument(document: EmpPreviewSourceDocument) {
  const normalizedType = clean(document.fileType).toLowerCase()
  const normalizedName = clean(document.fileName).toLowerCase()

  return (
    normalizedType.startsWith('image/')
    || ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((extension) => normalizedName.endsWith(extension))
  )
}

function buildImageBlocks(
  documents: EmpPreviewSourceDocument[],
  documentKinds: string[],
  sectionTitle: string
): EmpPreviewBlock[] {
  return documents
    .filter((document) => documentKinds.includes(document.documentKind) && isImageDocument(document) && clean(document.signedUrl))
    .map((document, index) => ({
      type: 'image',
      title: IMAGE_KIND_LABELS[document.documentKind] || sectionTitle,
      caption: document.fileName,
      imageUrl: clean(document.signedUrl),
      alt: `${sectionTitle} attachment ${index + 1}`,
    })) satisfies EmpPreviewBlock[]
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

function buildDeploymentScheduleBlocks(value: string | null | undefined, includeAllMappedBars = false): EmpPreviewBlock[] {
  const seenPipeRows = new Set<string>()
  const pipeRows = splitLines(value)
    .map((line) => line.split('|').map((cell) => clean(cell)))
    .filter((cells) => cells.length >= 5 && cells.slice(0, 5).some(Boolean))
    .map((cells) => cells.slice(0, 5))
    .filter((cells) => {
      const key = cells.join('\u0001')
      if (seenPipeRows.has(key)) return false
      seenPipeRows.add(key)
      return true
    })

  if (pipeRows.length) {
    const blocks: EmpPreviewBlock[] = [{
      type: 'multi_table',
      headers: ['Outlet', 'Deployment Detail', 'Friday Time', 'Saturday Time', 'Sunday Time'],
      rows: pipeRows,
      keepTogether: true,
      compact: true,
      rowUnitScale: 0.75,
    }]

    if (includeAllMappedBars) {
      blocks.push({
        type: 'paragraph',
        text: 'Additional event bars shown on the site plan are for general site awareness only and are not included in this draft KSS deployment schedule. They will be added only if Peppermint/KSS confirm KSS staffing for those outlets.',
      })
    }

    return blocks
  }

  const rows = parseThreeColumnLines(value)
  if (!rows.length) return labeledParagraph('Staffing by zone and time', value)

  const hasDaySchedule = rows.some(([timePhase]) => /^(D[123])\s+(?:Fri|Sat|Sun)\s+\d{1,2}\s+\w+\s+/.test(timePhase))
  if (!hasDaySchedule) {
    return maybeMultiTable(['Time / Phase', 'Zone', 'Deployment Detail'], rows)
  }

  const normalizeDeploymentDetail = (zone: string, detail: string) => {
    const normalizedZone = clean(zone).toLowerCase()
    const normalizedDetail = clean(detail)

    if (/^bar [1-4]$/.test(normalizedZone)) {
      return 'Supervisor x1; SIA x5; Steward x2'
    }
    if (/^response$/.test(normalizedZone)) {
      return 'Supervisor x1; SIA support x4'
    }
    return normalizedDetail
  }
  const normalizeDeploymentTime = (zone: string, time: string, dayKey: string) => {
    const normalizedZone = clean(zone).toLowerCase()
    if (/^bar [1-4]$/.test(normalizedZone) && (dayKey === 'D2' || dayKey === 'D3')) {
      return '10:00-21:45'
    }
    return time
  }

  const deploymentByOutlet = new Map<string, {
    outlet: string
    detail: string
    D1: string
    D2: string
    D3: string
    Other: string
  }>()

  rows.forEach(([timePhase, zone, detail]) => {
    const match = timePhase.match(/^(D[123])\s+(?:Fri|Sat|Sun)\s+\d{1,2}\s+\w+\s+(.+)$/)
    const dayKey = match?.[1] || 'Other'
    const time = normalizeDeploymentTime(zone, match?.[2] || timePhase, dayKey)
    const outlet = clean(zone)
    if (!outlet) return

    const existing = deploymentByOutlet.get(outlet) || {
      outlet,
      detail: '',
      D1: '',
      D2: '',
      D3: '',
      Other: '',
    }

    const normalizedDetail = normalizeDeploymentDetail(outlet, detail)
    existing.detail = existing.detail || normalizedDetail
    if (dayKey === 'D1' || dayKey === 'D2' || dayKey === 'D3' || dayKey === 'Other') {
      existing[dayKey] = time
    }
    deploymentByOutlet.set(outlet, existing)
  })

  const combinedRows = Array.from(deploymentByOutlet.values()).map((row) => [
    row.outlet,
    row.detail,
    row.D1 || row.Other,
    row.D2,
    row.D3,
  ])

  const blocks: EmpPreviewBlock[] = [{
    type: 'multi_table',
    headers: ['Outlet', 'Deployment Detail', 'Friday Time', 'Saturday Time', 'Sunday Time'],
    rows: combinedRows,
    keepTogether: true,
    compact: true,
  }]

  if (includeAllMappedBars) {
    blocks.push({
      type: 'paragraph',
      text: 'Additional event bars shown on the site plan are for general site awareness only and are not included in this draft KSS deployment schedule. They will be added only if Peppermint/KSS confirm KSS staffing for those outlets.',
    })
  }

  return blocks
}

function buildEventSiteMapBlocks(fieldValues: Record<string, EmpResolvedFieldValue>): EmpPreviewBlock[] {
  const eventName = `${getValue(fieldValues, 'event_name')} ${getValue(fieldValues, 'site_maps_and_route_diagrams')}`
  if (!/R1BW|Radio 1|Big Weekend/i.test(eventName)) return []

  return [{
    type: 'image',
    title: 'Event Site Overview Map',
    caption: 'Appendix 19 - R1BW26 Site Overview V5. Used for bar locations, Event Control, medical/welfare, emergency exits and interface route awareness.',
    imageUrl: '/emp-assets/r1bw26-site-overview-map.png',
    alt: 'R1BW26 Site Overview V5 event map',
  }]
}

function radioOneCommandRows() {
  return [
    ['KSS Operational Lead', 'Floyd Allen', 'Overall KSS operational lead, strategic liaison, deployment sign-off and serious incident escalation.'],
    ['KSS Operational Support', 'David Capener', 'Operational support, documentation, supervisor support and liaison with Peppermint/FAB where directed.'],
    ['KSS Event Control / Logger', 'TBC', 'KSS log, refusals, incidents, welfare, ejections and close-down status.'],
    ['KSS Response Supervisor', 'TBC', 'Response team coordination for bars.'],
    ['Bar Supervisors', 'TBC', 'Bar-level queue, staff and escalation control.'],
  ]
}

function radioOneContactRows() {
  return [
    ['Event Director Gold', 'TBC', 'Strategic event command route.'],
    ['Event Director Silver', 'TBC', 'Tactical event command route.'],
    ['Event Manager', 'TBC', 'Event Bronze / event management interface.'],
    ['Event Control Manager', 'TBC', 'Event Control coordination and escalation route.'],
    ['Event Control phone', '0203 475 0711', 'Primary Event Control contact.'],
    ['KSS Operational Lead', 'Floyd Allen', 'Overall KSS operational lead.'],
    ['KSS Operational Support', 'David Capener', 'Operational support and documentation.'],
    ['KSS Event Control / Logger', 'TBC', 'KSS log, refusals, incidents, welfare, ejections and close-down.'],
    ['KSS Response Supervisor', 'TBC', 'Response team coordination.'],
    ['Bar Supervisors', 'TBC', 'Bar-level queue, staff and escalation control.'],
    ['Bar operator', 'Peppermint Bars', 'Bar operation and alcohol service management.'],
    ['DPS', 'Jon Reid', 'Designated premises supervisor.'],
    ['Security Manager', 'Mark Logan - FAB', 'Event security management interface.'],
    ['Assistant Security Manager', 'Dan Perry - Showsec', 'Security support interface.'],
    ['Licensing Manager', 'Sarah Tschentscher - FAB', 'Licensing interface.'],
    ['Medical provider lead', 'TBC', 'Medical escalation route via Event Control.'],
    ['Welfare lead', 'TBC', 'Welfare escalation route via Event Control.'],
    ['Accessibility lead', 'TBC', 'Accessibility support route via Event Control.'],
    ['Peppermint Bars duty manager', 'TBC', 'Live bar operations duty lead.'],
    ['Police liaison', 'TBC', 'Police route if confirmed by the event.'],
  ]
}

function radioOneVersionRows() {
  return [
    ['V0.6', '30/04/2026', 'David Capener', 'Bar-security scope update, staffing table, Challenge 25 and R1BW alignment.', 'Draft'],
    ['V0.7', 'TBC', 'David Capener / Floyd Allen', 'Add Alcohol Management Plan, final deployment, call signs and final queue drawings.', 'Pending'],
  ]
}

function radioOneIncludedExcludedRows() {
  return [
    ['Allocated bar queue lanes', 'Public entrance gates'],
    ['Allocated bar fronts/service points', 'Search lanes'],
    ['Allocated bar BOH/service gates', 'Stage and front-of-stage security'],
    ['Bar compound/stock areas where allocated', 'Zone Ex and traffic'],
    ['Refusal/ejection support from bars', 'General arena patrols'],
    ['Challenge 25 support', 'Lost property/lost persons ownership'],
    ['Bar close-down and asset handover', 'CCTV operation'],
  ]
}

function radioOneBarRiskRows() {
  return [
    ['Bar 1 near entrance/access route', 'Early demand, accessible route conflict and queue build-up.', 'Clear entry/exit, accessible support and supervisor monitoring.'],
    ['Bars 2-4 high-volume outlets', 'Queue pressure, lateral crowd movement and Challenge 25 pressure.', 'Serpentine queue, queue-tail marshal and response support.'],
    ['Bar 5 / smaller outlet', 'Limited holding space and overspill.', 'Compact queue and early overspill escalation.'],
    ['Guest/VIP bar', 'Accreditation/service dispute and alcohol refusal.', 'Discreet SIA support and supervisor escalation.'],
    ['Bar compound/stock', 'Unauthorised access and stock interference.', 'Access control only where allocated by Peppermint/FAB.'],
  ]
}

function radioOneBarOperatingMatrixRows() {
  return [
    ['Bar 1', 'R5 / near Arena Entrance and Accessible Entrance', 'Supervisor x1; SIA x5; Steward x2', 'Serpentine / accessible lane. Early demand and accessible route conflict.', 'Keep entrance/access route clear. Welfare/medical route TBC. High monitoring priority.'],
    ['Bar 2', 'V4', 'Supervisor x1; SIA x5; Steward x2', 'Serpentine / split feeder. High-volume queue pressure.', 'Prevent spillback into public circulation. Response support if refusals cluster. Welfare route TBC.'],
    ['Bar 3', 'U6', 'Supervisor x1; SIA x5; Steward x2', 'Serpentine / split feeder. Changeover pressure and lateral movement.', 'Protect adjacent circulation/routes. Monitor queue tail. Welfare route TBC.'],
    ['Bar 4', 'U7', 'Supervisor x1; SIA x5; Steward x2', 'Serpentine / split feeder. High demand and Challenge 25 pressure.', 'Keep emergency/stock routes clear. Coordinate with Peppermint manager. Welfare route TBC.'],
    ['Bar 5', 'O6', 'SIA x1', 'Compact linear queue. Limited holding space and overspill risk.', 'Escalate early if queue exceeds footprint. Response may be required at peaks. Welfare route TBC.'],
    ['Bar 6 Guest', 'Guest / VIP area', 'SIA x1', 'Compact guest queue. Accreditation, service dispute and refusal conflict.', 'Keep guest access clear. Escalate discreetly via supervisor/control. Welfare route TBC.'],
  ]
}

function radioOneCallSignRows() {
  return [
    ['KSS Operational Lead', 'TBC', 'TBC'],
    ['KSS Control / Logger', 'TBC', 'TBC'],
    ['KSS Response', 'TBC', 'TBC'],
    ['Bar 1 Supervisor', 'TBC', 'TBC'],
    ['Bar 2 Supervisor', 'TBC', 'TBC'],
    ['Bar 3 Supervisor', 'TBC', 'TBC'],
    ['Bar 4 Supervisor', 'TBC', 'TBC'],
    ['Bar 5 / Guest', 'TBC', 'TBC'],
  ]
}

function radioOneRiskRatingRows() {
  return [
    ['Low', 'Controlled by standard procedures.'],
    ['Medium', 'Requires supervisor monitoring and dynamic control.'],
    ['High', 'Requires immediate escalation or additional control.'],
    ['Dynamic', 'Rating may increase due to crowd, weather, staffing or incident conditions.'],
  ]
}

function radioOneLicensingObjectiveRows() {
  return [
    ['Prevention of crime and disorder', 'Visible SIA presence, refusal support, response to aggression and incident logging.'],
    ['Public safety', 'Queue control, emergency route protection and welfare/medical escalation.'],
    ['Prevention of public nuisance', 'Calm refusal/ejection handling and prevention of disorder around bar queues.'],
    ['Protection of children from harm', 'Challenge 25 support, proxy-purchase monitoring and welfare referral for under-18 concerns.'],
  ]
}

function radioOneQueueTypeRows() {
  return [
    ['Full Disney / serpentine queue', 'High-volume bars with space, likely Bars 1-4', 'Barriered lanes feeding one or more service points.', 'Entry marshal, lane discipline, queue-tail monitoring and clear exits.'],
    ['Split feeder lane', 'Bars with multiple service faces', 'Two controlled feeder lanes into one service area.', 'Prevent cross-lane cutting and maintain refusal support point.'],
    ['Compact linear queue', 'Smaller bars / limited space', 'One direct lane with controlled queue tail.', 'Prevent spillback and close/hold entry early.'],
    ['Hybrid adaptive queue', 'Where layout changes due to crowd/weather', 'Barriers shortened, extended or re-angled dynamically.', 'Supervisor approval and Event Control/Peppermint notification where routes are affected.'],
    ['Accessible / priority service route', 'KSS-allocated bars where feasible', 'Discreet route for disabled customers or agreed accessibility need.', 'Keep accessible route clear and do not force customers through unsuitable lanes.'],
    ['Degraded-operation queue', 'Weather, damaged barrier or route obstruction', 'Reduced-capacity queue or paused entry.', 'Shorten queue, redirect demand and escalate.'],
  ]
}

function radioOneOfficerRoleRows() {
  return [
    ['KSS Operational Lead', 'Overall KSS bar-security delivery, senior escalation, Peppermint/FAB liaison and sign-off.'],
    ['KSS Operational Support', 'Supports operational lead, documentation, supervisor liaison and issue tracking.'],
    ['KSS Event Control / Logger', 'Maintains KSS log, refusals, incidents, welfare referrals, ejections and close-down status.'],
    ['Bar Supervisor', 'Briefs bar team, controls queue layout, manages radio comms, liaises with Peppermint/bar manager and escalates incidents.'],
    ['SIA Bar Officer', 'Queue and service-area security, Challenge 25/refusal support, intoxication monitoring and disorder prevention.'],
    ['Queue Steward / Marshal', 'Queue-tail monitoring, customer direction, signage reinforcement and accessible queue support; no SIA enforcement unless licensed.'],
    ['Response Supervisor', 'Coordinates response to refusals, ejections, welfare, disorder, prohibited items and route issues.'],
    ['Response SIA Officer', 'Supports incidents, ejections, welfare handovers, queue pressure and emergency route clearance.'],
  ]
}

function radioOneBarOperationsRows() {
  return [
    ['Pre-opening checks', 'Radio check, staff briefing, barrier check, signage, Challenge 25, emergency route, accessible route, stock/service access, cup return, lighting/ground condition and escalation route.'],
    ['Live trading duties', 'Queue discipline, refusal support, intoxication monitoring, proxy-purchase monitoring, staff safety, route protection and welfare identification.'],
    ['Service-area support', 'KSS do not serve alcohol. KSS support Peppermint staff with conflict, refusal, disorder, prohibited items and queue pressure.'],
    ['Supervisor decision points', 'Pause queue entry, call response, request Event Control support, request Peppermint manager, clear route and record incident.'],
    ['Close-down duties', 'Queue closure, last orders support, public dispersal, asset/security handover and incident report.'],
  ]
}

function radioOneCloseDownRows() {
  return [
    ['1', 'Peppermint/Event Control confirms bar close or last service.'],
    ['2', 'Supervisor informs officers/stewards.'],
    ['3', 'Queue tail is closed; no new customers join.'],
    ['4', 'Existing queue is served or dispersed as directed.'],
    ['5', 'Refusals/ejections are escalated before the wider egress peak.'],
    ['6', 'Queue barriers are opened/removed only when safe and authorised.'],
    ['7', 'Bar front is cleared to avoid it becoming a gathering point.'],
    ['8', 'Stock/service areas are secured and handed over.'],
    ['9', 'Supervisor reports bar clear / stock secure / staff stood down to KSS control.'],
  ]
}

function radioOneIncidentRows() {
  return [
    ['Refusal conflict', 'Calm de-escalation and supervisor attendance.', 'Response team / Event Control.'],
    ['Disorder or assault', 'Contain if safe, separate parties and preserve evidence.', 'Event Control / Security Manager / Police.'],
    ['Medical/welfare', 'Keep person safe and request medical/welfare.', 'Event Control / EDMS / TLC Welfare.'],
    ['Safeguarding disclosure', 'Move from queue pressure and maintain privacy.', 'Event Control / welfare / safeguarding.'],
    ['Suspicious item', 'Do not touch; clear immediate area if safe.', 'Event Control / Security Manager.'],
    ['Prohibited item', 'Refuse/confiscate only under event policy.', 'Supervisor / Event Control / Police if high risk.'],
    ['Route obstruction', 'Clear or shorten queue.', 'Event Control if route compromised.'],
  ]
}

function radioOneEmergencyAlertRows() {
  return [
    ['Green', 'Normal operations.', 'Maintain queue, licensing, welfare and route monitoring.'],
    ['Amber', 'Potential incident / raised vigilance.', 'Supervisor checks routes, briefs staff and prepares to pause queue/service.'],
    ['Red', 'Confirmed incident / evacuation, lockdown or show stop may follow.', 'Stop non-essential activity, await Event Control instruction and prepare to clear queues.'],
    ['Black', 'Major incident / emergency services command.', 'Follow Event Control/police instruction, protect life safety and report bar status.'],
  ]
}

function radioOneJesipRows() {
  return [
    ['Co-locate', 'KSS works through Event Control, FAB and Peppermint command routes and does not establish a separate event command structure.'],
    ['Communicate', 'Use the confirmed event radio plan and call signs. Pass bar number/grid, exact location, incident type, immediate action and assistance required.'],
    ['Co-ordinate', 'KSS bar teams follow Event Control, Security Manager and Peppermint instruction for bar closure, queue clearance, route protection and incident support.'],
    ['Jointly understand risk', 'Supervisors pass SitReps on bar queues, emergency routes, welfare, disorder, refusals, suspicious items and weather or crowd-pressure changes.'],
    ['Shared situational awareness', 'Bar teams are briefed on live route, RV, CT, welfare, weather, radio and operational updates issued through Event Control or KSS control.'],
  ]
}

function radioOneCtRows() {
  return [
    ['Suspicious item', 'Do not touch, clear immediate area if safe and report exact bar/grid.'],
    ['Hostile reconnaissance', 'Report person, behaviour, location and direction of travel.'],
    ['Weapons attack', 'Run/Hide/Tell; do not pursue.'],
    ['Hazardous substance', 'Remove, remove, remove; report to Event Control/999 when safe.'],
  ]
}

function radioOneWelfareRows() {
  return [
    ['Breaks and relief', 'Planned breaks and relief cover must protect fixed bar posts and queue lanes.'],
    ['Rotation', 'Rotate staff away from high-pressure refusal, queue and response positions where operationally possible.'],
    ['Hydration/weather', 'Supervisors monitor hydration, heat/cold exposure, wet weather and access to weather protection.'],
    ['Food/toilets', 'Staff must have access to food, toilets and welfare facilities through managed relief.'],
    ['Post-incident welfare', 'Assault, abuse or traumatic incident exposure triggers supervisor welfare check and escalation if needed.'],
    ['Kit and radios', 'Radio batteries, PPE and required equipment checked at start, midpoint and close-down.'],
    ['Unfit to continue', 'Staff member is removed from post, supervisor informs KSS lead/control and replacement/relief is arranged.'],
  ]
}

function radioOneRefusalLogRows() {
  return [
    ['Minimum refusal/ejection log', 'Time, bar, reason, ID issue/intoxication/proxy/aggression/prohibited item, staff involved, outcome and whether Event Control was notified.'],
    ['Vulnerability safeguard', 'No vulnerable, incapacitated, under-18, separated, distressed, injured or safeguarding-concern person is ejected without Event Control/welfare/police direction.'],
  ]
}

function radioOneDebriefRows() {
  return [
    ['Queue performance', 'Queue build-up, lane integrity, overspill, redirections and lessons for next day.'],
    ['Licensing/refusals', 'Challenge 25 refusals, intoxication refusals and proxy-purchase attempts.'],
    ['Incidents/ejections', 'Ejections, disorder, prohibited items and evidence/event-control notifications.'],
    ['Welfare/safeguarding', 'Welfare referrals, Ask for Angela, separated/vulnerable persons and staff welfare.'],
    ['Routes/assets', 'Emergency route issues, barrier/signage issues, stock/security handover and close-down status.'],
    ['Recommendations', 'Actions required for the next day or final report.'],
  ]
}

function radioOneAppendixRows() {
  return [
    ['Annex A', 'Bar Operations', 'Detailed bar operating method and service support controls.'],
    ['Annex B', 'Queue Layouts and Queue Types', 'Queue schematic, queue types and degraded-operation controls.'],
    ['Annex C', 'Officer Role Cards', 'KSS role responsibilities and decision points.'],
    ['Annex D', 'Bar Emergency Action Cards', 'Bar-specific emergency, alert state and CT action cards.'],
    ['Annex E', 'Contact Directory and Call Signs', 'KSS command contacts, event interfaces and call-sign placeholders.'],
    ['Annex F', 'Incident / Refusal / Welfare Log Template', 'Minimum log fields for refusals, ejections, welfare and incidents.'],
    ['Annex G', 'Close-Down Checklist', 'Bar close, queue clear, asset handover and debrief checklist.'],
    ['Annex H', 'Staff Briefing and Sign-Off Record', 'Staff briefing record for Challenge 25, queue, emergency route and safeguarding briefings.'],
  ]
}

function radioOneBriefingSignOffRows() {
  return [
    ['Name', 'Staff member full name.'],
    ['Role', 'Operational role / grade.'],
    ['SIA licence number', 'Required where applicable.'],
    ['Bar / post', 'Allocated bar, response, control or management post.'],
    ['Radio issued', 'Yes / no / radio number.'],
    ['Challenge 25 briefed', 'Initial when briefed.'],
    ['Queue layout briefed', 'Initial when briefed.'],
    ['Emergency route briefed', 'Initial when briefed.'],
    ['Welfare/safeguarding briefed', 'Initial when briefed.'],
    ['Supervisor signature', 'Supervisor confirms briefing complete.'],
  ]
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
  fieldValues: Record<string, EmpResolvedFieldValue>,
  fieldKey: string
): string {
  return fieldValues[fieldKey]?.valueText || ''
}

function joinRiskControls(...values: Array<string | null | undefined>) {
  const parts = values
    .map((value) => summarizeText(value, 190))
    .filter(Boolean)

  return parts.join(' ') || 'Refer to the relevant operational controls within this EMP.'
}

function compactControl(value: string | null | undefined, fallback: string) {
  const normalized = clean(value).replace(/\s+/g, ' ')
  if (!normalized || normalized.length > 100) return fallback
  return summarizeText(normalized, 86)
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
  fieldValues: Record<string, EmpResolvedFieldValue>,
  selectedAnnexes: string[]
) {
  const isBarFocused = selectedAnnexes.includes('bar_operations') || /bar/i.test(getValue(fieldValues, 'plan_title'))

  if (isBarFocused) {
    const rows = [
      buildRiskRow(
        'Bar queues and service points',
        'Queue pressure, spillback, blocked routes or access conflict.',
        'Customers, bar staff, stewards, nearby public.',
        compactControl(getValue(fieldValues, 'queue_design'), 'Visible queue lanes, queue-tail monitoring, supervisor escalation.'),
        'Medium / monitored'
      ),
      buildRiskRow(
        'Licensing and refusals',
        'Underage sale risk, failed ID, refusal conflict or intoxication.',
        'Customers, bar staff, supervisors, licence holder.',
        compactControl(getValue(fieldValues, 'challenge_policy'), 'Challenge 25, refusal support, calm escalation and incident logging.'),
        'Medium / controlled'
      ),
      buildRiskRow(
        'Disorder and ejection support',
        'Aggression, assault, disorder, evidence loss or unsafe removal.',
        'Customers, responders, supervisors, adjacent public.',
        compactControl(getValue(fieldValues, 'incident_management'), 'Supervisor/response attendance, Event Control escalation and police support if required.'),
        'Medium'
      ),
      buildRiskRow(
        'Safeguarding and welfare',
        'Vulnerability, harassment disclosure, intoxication, delayed handover or staff fatigue.',
        'Children, vulnerable persons, customers, welfare teams, KSS staff.',
        compactControl(getValue(fieldValues, 'safeguarding_process'), 'Safeguarding referral, welfare/medical handover, Ask for Angela and staff rotation.'),
        'Medium / referred'
      ),
      buildRiskRow(
        'Emergency / suspicious item interface',
        'Bar queues, barriers, stock or suspicious items affect emergency routes.',
        'Public, staff, responders, vulnerable persons.',
        compactControl(getValue(fieldValues, 'emergency_procedures'), 'Keep routes clear, release queues if instructed, do not touch suspect items, escalate.'),
        'Medium / escalation'
      ),
      buildRiskRow(
        'Stock, compound and assets',
        'Unauthorised access, theft, stock conflict or service route clash.',
        'Bar teams, contractors, KSS staff, asset holders.',
        compactControl(getValue(fieldValues, 'asset_security_demobilisation'), 'Protect allocated assets only; handover/stand-down as directed by Peppermint/FAB.'),
        'Medium'
      ),
      buildRiskRow(
        'Ground and weather at queues',
        'Wet grass, poor footing, heat/cold exposure or reduced queue capacity.',
        'Customers, bar staff, KSS staff.',
        'Supervisor checks, shortened lanes, welfare escalation, weather protection and Event Control update.',
        'Medium / dynamic'
      ),
      buildRiskRow(
        'Barrier movement or failure',
        'Lane collapse, trip risk, route obstruction or crowd compression.',
        'Customers, queue teams, adjacent public.',
        'Pre-opening barrier check, live monitoring, pause entry and request barrier/response support.',
        'Medium'
      ),
      buildRiskRow(
        'Fire or service-area emergency',
        'Fire, smoke, gas, electrical or plant issue near bar/service areas.',
        'Public, staff, contractors, responders.',
        'Stop activity if directed, clear immediate queue, protect routes and report exact location.',
        'Medium / escalation'
      ),
      buildRiskRow(
        'Stock/manual handling interface',
        'Stock movement, manual handling or vehicle interface during public hours.',
        'Bar staff, contractors, public, KSS teams.',
        'Keep queue lanes off stock/service routes and escalate conflicts to Peppermint/Event Control.',
        'Medium'
      ),
      buildRiskRow(
        'Communications or lighting failure',
        'Radio failure, poor visibility or lighting loss during live trading/close-down.',
        'KSS teams, bar staff, customers.',
        'Fallback supervisor contact, runners if required, pause/shorten queues and report to Event Control.',
        'Medium'
      ),
      buildRiskRow(
        'Accessibility route obstruction',
        'Queue tails, barriers or customer movement block accessible routes.',
        'Disabled customers, companions, queue teams.',
        'Keep accessible routes clear, adjust barriers and request accessibility/Event Control support.',
        'Medium / monitored'
      ),
    ]

    parseThreeColumnLines(getValue(fieldValues, 'additional_operational_risks')).slice(0, 2).forEach(([activity, affected, controls]) => {
      rows.push(
        buildRiskRow(
          summarizeText(activity, 38),
          'Event-specific risk noted in source documents.',
          summarizeText(affected, 48),
          summarizeText(controls, 86),
          'Review live'
        )
      )
    })

    return rows
  }

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
      'Departing public, transport staff, taxi and coach marshals, and adjacent pedestrian routes.',
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
        'High-demand bar queue area',
        'Queue surge, barrier line compression, extraction demand, welfare demand, and poor communication during peak bar demand.',
        'Attendees, queue teams, welfare responders, and adjacent response staff.',
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
        'Service and pedestrian route interface',
        'Vehicle or pedestrian conflict, crossing-point congestion, stock-route encroachment, and uncontrolled public movement near KSS areas.',
        'Attendees, route stewards, traffic marshals, contractors, delivery teams, and service users.',
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
        'Overnight bar asset protection',
        'Late-night welfare demand, noise or antisocial behaviour, perimeter breaches, small fires, unauthorised access, or delayed response in darkness.',
        'Staff, overnight patrols, welfare teams, asset holders, and adjacent perimeter staff.',
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
        'Restricted compound access',
        'Unauthorised access, challenge conflict, sterile route loss, or compromise of restricted compounds.',
        'Client teams, staff, contractors, guests, and access-control teams.',
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
  fieldValues: Record<string, EmpResolvedFieldValue>,
  selectedAnnexes: string[]
) {
  const isRadioOneBarPlan = /Radio 1|Big Weekend|KSS NW LTD Bar Security/i.test(
    `${getValue(fieldValues, 'event_name')} ${getValue(fieldValues, 'plan_title')}`
  )
  const compactRadioOneRoles: Partial<Record<EmpAnnexKey, string>> = {
    bar_operations:
      'Visible bar security: queue supervision, Challenge 25/refusal support, intoxication/disorder monitoring, welfare/ejection escalation, close-down and stock/service protection where allocated.',
    traffic_pedestrian_routes:
      'Not a primary KSS function; keep bar queues from obstructing internal crowd flow, emergency routes and service movements.',
    stewarding_deployment:
      'Queue marshal/bar stewarding: queue entry, queue-tail monitoring, accessible service support, signage, queue discipline and barrier release when instructed.',
  }

  return selectedAnnexes
    .map((annexKey) => {
      const fieldKey = EMP_ANNEX_ROLE_FIELD_KEYS[annexKey as EmpAnnexKey]
      if (!fieldKey) return null

      const value = clean(
        isRadioOneBarPlan
          ? compactRadioOneRoles[annexKey as EmpAnnexKey] || getValue(fieldValues, fieldKey)
          : getValue(fieldValues, fieldKey)
      )
      if (!value) return null

      const annex = EMP_ANNEX_DEFINITIONS.find((item) => item.key === annexKey)
      return annex ? [annex.label, value] : null
    })
    .filter(Boolean) as string[][]
}

function buildSectionBlocks(
  sectionKey: string,
  fieldValues: Record<string, EmpResolvedFieldValue>,
  selectedAnnexes: string[],
  documents: EmpPreviewSourceDocument[]
): EmpPreviewBlock[] {
  const radioOne = isRadioOnePlan(fieldValues, selectedAnnexes)

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
      ])
        .concat(radioOne ? maybeMultiTable(['Version', 'Date', 'Author', 'Changes', 'Approval'], radioOneVersionRows(), { compact: true }) : [])
        .concat(maybeBullets(getValue(fieldValues, 'distribution_list')))

    case 'purpose_scope':
      return maybeParagraph(getValue(fieldValues, 'purpose_scope_summary'))
        .concat(
          radioOne
            ? maybeParagraph('KSS operational delivery will be led by Floyd Allen as Operational Lead, supported by David Capener as Operational Support, with bar supervisors, response staff and the KSS Event Control/Logger working within the agreed Peppermint/FAB/Event Control reporting route.')
            : []
        )
        .concat(maybeBullets(getValue(fieldValues, 'related_documents')))

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
          radioOne
            ? maybeParagraph('Bar close-down will be managed in coordination with Peppermint Bars and Event Control. KSS will support last orders, queue closure, final refusal/ejection management, public dispersal from bar fronts, stock/security handover and post-close incident reporting. KSS bar security posts will remain in position until bar close-down, queue clear-down, stock/security handover and Event Control/Peppermint stand-down are complete.')
            : []
        )
        .concat(
          parseTwoColumnLines(getValue(fieldValues, 'key_delivery_partners')).length
            ? maybeMultiTable(
                ['Delivery Partner', 'Function'],
                parseTwoColumnLines(getValue(fieldValues, 'key_delivery_partners'))
              )
            : maybeBullets(getValue(fieldValues, 'key_delivery_partners'))
        )

    case 'strategic_objectives':
      if (radioOne) {
        return maybeBullets(
          Array.from(new Set([...FIXED_OBJECTIVES, ...splitList(getValue(fieldValues, 'client_objectives'))])).join('\n')
        ).concat(maybeMultiTable(['Licensing objective', 'KSS bar-security support'], radioOneLicensingObjectiveRows(), { keepTogether: true }))
      }

      return ([{ type: 'bullet_list', items: Array.from(new Set(FIXED_OBJECTIVES)) }] as EmpPreviewBlock[])
        .concat(maybeBullets(getValue(fieldValues, 'client_objectives')))

    case 'crowd_profile':
      if (selectedAnnexes.includes('bar_operations') || /bar/i.test(getValue(fieldValues, 'plan_title'))) {
        return maybeMultiTable(
          ['Scope Factor', 'Operational Summary'],
          [
            [
              'Licensed capacity',
              '39,999 total capacity, including guests, artists, staff and crew. GA 31,000; VIP 3,000; invited guests 2,000; staff, crew and artists 3,999.',
            ],
            [
              'Expected attendance',
              'Capacity is set at 39,999 for this high-interest BBC Radio 1 Big Weekend event.',
            ],
            [
              'KSS deployment',
              radioOne
                ? 'Confirmed current schedule covers management, Event Control, response and Bars 1-6/Guest only. Additional bars will be added only if Peppermint/KSS confirm KSS staffing for those outlets.'
                : '41 planned KSS posts per show day across management, Event Control, response and bar outlets, subject to final confirmation.',
            ],
            [
              'Audience age profile',
              'BBC Radio 1 targets a 15-24 demographic. Friday and VIP are 18+. Under-16 GA attendees require adult supervision.',
            ],
            [
              'Bar audience profile',
              'Young adults, 18+ Friday attendees, VIP/guest customers and mixed-age weekend attendees. Apply Challenge 25 and monitor intoxication, proxy purchase and vulnerability.',
            ],
            [
              'Transport interface',
              'Transport is outside KSS scope except where end-of-night pressure affects bar closure, queue clear-down or staff stand-down.',
            ],
            [
              'Vulnerability and licensing',
              'Watch for proxy sales, separated young people and vulnerable persons. Peppermint manages alcohol supply; KSS supports Challenge 25, welfare referrals and licensing objectives.',
            ],
            [
              'Camping / overnight',
              'No campsite security is included unless contracted separately.',
            ],
            [
              'Intelligence and triggers',
              'No previous incident data supplied. Planning uses BBC EMP v5, Showsec CSMP v1 and Site Overview V5. Likely risks are queues, refusals, intoxication, welfare and route protection.',
            ],
            [
              'Peak periods',
              'Pre-opening checks, afternoon build-up, artist changeovers, headline approach, post-show close-down and final bar closure.',
            ],
          ]
        )
      }

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
      if (radioOne) {
        return labeledParagraph('Site layout summary', getValue(fieldValues, 'site_layout_summary'))
          .concat(buildEventSiteMapBlocks(fieldValues))
          .concat(buildImageBlocks(documents, ['site_map'], 'Site layout'))
          .concat(maybeMultiTable(['Included within KSS scope', 'Excluded unless separately tasked'], radioOneIncludedExcludedRows(), { keepTogether: true, startOnNewPage: true }))
          .concat(maybeBullets(getValue(fieldValues, 'key_zones')))
          .concat(labeledParagraph('KSS-allocated areas', getValue(fieldValues, 'controlled_areas')))
          .concat(maybeMultiTable(['Area', 'Likely risk', 'KSS control'], radioOneBarRiskRows(), { compact: true, keepTogether: true }))
          .concat(maybeMultiTable(['Bar', 'Grid/location', 'Staffing', 'Queue / key risk', 'Supervisor notes'], radioOneBarOperatingMatrixRows(), { compact: true, avoidRowSplit: true, rowUnitScale: 0.55 }))
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
            ],
            { compact: true, startOnNewPage: true }
          ))
      }

      return labeledParagraph('Site layout summary', getValue(fieldValues, 'site_layout_summary'))
        .concat(buildEventSiteMapBlocks(fieldValues))
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
        } as EmpPreviewBlock])
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
      if (radioOne) {
        return ([{
          type: 'image',
          title: 'RAMP Analysis - Radio 1 Bars',
          caption: 'Routes, Arrival, Movement and Profile controls for Radio 1 bar queue and service-area operations.',
          imageUrl: '/emp-assets/ramp-analysis-radio1-bars.png',
          alt: 'RAMP analysis for Radio 1 bars showing routes, arrival, movement and profile controls',
        }] as EmpPreviewBlock[])
          .concat(maybeMultiTable(
          ['RAMP Element', 'Assessment Summary'],
          [
            ['Routes', getValue(fieldValues, 'ramp_routes')],
            ['Arrival', getValue(fieldValues, 'ramp_arrival')],
            ['Movement', getValue(fieldValues, 'ramp_movement')],
            ['Profile', getValue(fieldValues, 'ramp_profile')],
          ],
          { keepTogether: true, startOnNewPage: true }
        ))
          .concat(maybeParagraph('During artist changeovers, KSS supervisors will monitor the end of each bar queue, lateral movement through queue lanes, queue jumping, refusal pressure and crowd compression around high-volume bars. Where queue integrity is compromised, supervisors may shorten lanes, hold new entry, request response support, redirect customers to alternative bars where authorised, or request Event Control/Peppermint support.'))
      }

      return ([{
        type: 'diagram',
        variant: 'ramp',
        items: [
          { title: 'Routes', value: summarizeText(getValue(fieldValues, 'ramp_routes'), 92) },
          { title: 'Arrival', value: summarizeText(getValue(fieldValues, 'ramp_arrival'), 92) },
          { title: 'Movement', value: summarizeText(getValue(fieldValues, 'ramp_movement'), 92) },
          { title: 'Profile', value: summarizeText(getValue(fieldValues, 'ramp_profile'), 92) },
        ],
      } as EmpPreviewBlock] as EmpPreviewBlock[])
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
      if (/Radio 1|Big Weekend|KSS NW LTD Bar Security/i.test(`${getValue(fieldValues, 'event_name')} ${getValue(fieldValues, 'plan_title')}`)) {
        return maybeMultiTable(
          ['Queue Planning Factor', 'Operational Summary'],
          [
            ['Licensed capacity', 'Event capacity is 39,999 including guests, artists, staff and crew.'],
            ['Queue capacity status', 'Individual bar queue capacities remain subject to final bar layout and queue drawings.'],
            ['Bar references', 'CSMP references include Bar 1 R5, Bar 2 V4, Bar 3 U6, Bar 4 U7 and Bar 5 O6.'],
            ['Excluded areas', 'KSS does not own stage, ingress/search, egress routes, traffic, Zone Ex, backstage, CCTV, patrols, lost persons or non-bar zones.'],
            ['Density assumptions', 'KSS uses live visual queue monitoring, intervening before compression, lane collapse, obstruction or conflict.'],
            ['Ingress interface', 'Public ingress is Showsec/general security scope; KSS begins at bar queue entries and service-area access.'],
            ['Egress interface', 'Bar close-down must support event egress, avoid obstructive queues and follow Event Control/Peppermint direction.'],
            ['Emergency and weather', 'If directed, KSS clears bar queues and opens barriers. Weather or damaged barriers may require shortened or reshaped lanes.'],
          ]
        )
          .concat(maybeParagraph('Queue systems must never obstruct emergency routes, accessible routes, stock/service routes or public circulation routes.'))
          .concat(maybeMultiTable(['Queue type', 'Where used', 'Description', 'KSS controls'], radioOneQueueTypeRows(), { compact: true, keepTogether: true, startOnNewPage: true }))
      }

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
      if (radioOne) {
        return labeledParagraph('Command structure', getValue(fieldValues, 'command_structure'))
          .concat(maybeMultiTable(['Role', 'Name', 'Function'], radioOneCommandRows()))
          .concat(
            parseTwoColumnLines(getValue(fieldValues, 'radio_channels_callsigns')).length
              ? maybeMultiTable(['Channel / Call Sign', 'Use'], parseTwoColumnLines(getValue(fieldValues, 'radio_channels_callsigns')))
              : labeledParagraph('Radio channels and call signs', getValue(fieldValues, 'radio_channels_callsigns'))
          )
          .concat(labeledParagraph('Reporting lines', getValue(fieldValues, 'reporting_lines')))
          .concat(maybeBullets(getValue(fieldValues, 'external_interfaces')))
          .concat(maybeMultiTable(['Role', 'Name', 'Contact / Function'], radioOneContactRows(), { startOnNewPage: true, avoidRowSplit: true, rowUnitScale: 0.7 }))
          .concat(labeledParagraph('Control room structure', getValue(fieldValues, 'control_room_structure')))
          .concat(labeledParagraph('Briefings, inductions and live observation', 'KSS bar staff complete site induction and bar-specific briefing covering Site Overview V5, mapped bar references, Challenge 25, Peppermint procedures, Event Control escalation, ejection/welfare process, emergency route integrity, medical/welfare locations and staff welfare. Live monitoring uses supervisor observation, queue length, bar operator feedback, Event Control updates and incident/refusal/ejection logs.'))
      }

      return ([{
        type: 'diagram',
        variant: 'command',
        lead: splitThreeColumnLinesToLabels(getValue(fieldValues, 'named_command_roles'))[0] || summarizeText(getValue(fieldValues, 'command_structure'), 40),
        control: splitThreeColumnLinesToLabels(getValue(fieldValues, 'named_command_roles'))[1] || 'Event Control',
        supervisors: splitThreeColumnLinesToLabels(getValue(fieldValues, 'named_command_roles')).slice(2, 6),
        interfaces: splitList(getValue(fieldValues, 'external_interfaces')).slice(0, 4),
      } as EmpPreviewBlock] as EmpPreviewBlock[])
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
        .concat(
          selectedAnnexes.includes('bar_operations') || /bar/i.test(getValue(fieldValues, 'plan_title'))
            ? labeledParagraph(
                'Briefings, inductions and live observation',
                'KSS bar staff complete site induction and bar-specific briefing covering Site Overview V5, bar grid references, Challenge 25, Peppermint procedures, Event Control escalation, ejection/welfare process, emergency route integrity, medical/welfare locations and staff welfare. Live monitoring uses supervisor observation, queue length, bar operator feedback, Event Control updates and incident/refusal/ejection logs.'
              )
            : labeledParagraph('Briefings and inductions', getValue(fieldValues, 'briefing_and_induction'))
                .concat(labeledParagraph('Monitoring technology and live observation', getValue(fieldValues, 'monitoring_and_density_tools')))
        )

    case 'deployment_strategy':
      return labeledParagraph('Service directory and operational scope', getValue(fieldValues, 'service_delivery_scope'))
        .concat(labeledParagraph('Build and break operations', getValue(fieldValues, 'build_break_operations')))
        .concat(labeledParagraph('Specialist teams and assets', getValue(fieldValues, 'specialist_teams_and_assets')))
        .concat(radioOne ? maybeMultiTable(['Role', 'Core responsibilities'], radioOneOfficerRoleRows(), { compact: true, keepTogether: true, startOnNewPage: true, rowUnitScale: 0.8 }) : [])
        .concat(
          maybeMultiTable(
            ['Selected Annex', 'Roles and Duties'],
            buildSelectedAnnexRoleRows(fieldValues, selectedAnnexes)
          )
        )
        .concat(buildDeploymentScheduleBlocks(getValue(fieldValues, 'staffing_by_zone_and_time'), radioOne))
        .concat(radioOne ? maybeMultiTable(['Function', 'Call sign', 'Channel'], radioOneCallSignRows(), { compact: true, keepTogether: true, avoidRowSplit: true, rowUnitScale: 0.8 }) : [])
        .concat(radioOne ? maybeParagraph('Final call signs and radio channels will be inserted from the approved event radio plan and final Event Control/security briefing before issue.') : [])
        .concat(
          parseThreeColumnLines(getValue(fieldValues, 'response_teams')).length
            ? maybeMultiTable(
                ['Team', 'Resourcing', 'Purpose'],
                parseThreeColumnLines(getValue(fieldValues, 'response_teams')),
                { compact: true, avoidRowSplit: true, rowUnitScale: 0.55 }
              )
            : labeledParagraph('Response teams', getValue(fieldValues, 'response_teams'))
        )
        .concat(
          /Radio 1|Big Weekend|KSS NW LTD Bar Security/i.test(`${getValue(fieldValues, 'event_name')} ${getValue(fieldValues, 'plan_title')}`)
            ? labeledParagraph(
                'Relief, contingency and escalation',
                'Relief cover protects fixed bar posts and queue lanes during breaks. Escalate for queue obstruction, repeated refusals, intoxication, welfare/ejection demand, reduced queue capacity or Event Control/Peppermint requests.'
              )
            : labeledParagraph('Relief and contingency', getValue(fieldValues, 'relief_and_contingency'))
                .concat(labeledParagraph('Escalation staffing', getValue(fieldValues, 'escalation_staffing')))
        )

    case 'ingress_operations':
      return ([{
        type: 'diagram',
        variant: 'bar_queue_flow',
        lanes: [
          'Accessible / priority lane',
          'Managed feeder lane A',
          'Managed feeder lane B',
          'Managed feeder lane C',
          'Managed feeder lane D',
        ],
        controls: [
          'Visible entry point',
          'One-way lane flow',
          'Refusal support point',
          'Two managed exits',
          'Supervisor sightline',
        ],
      } as EmpPreviewBlock] as EmpPreviewBlock[])
        .concat(maybeMultiTable(
          ['Queue Control', 'Operational Detail'],
          [
            ['Queue areas and access points', getValue(fieldValues, 'ingress_routes_holding_areas')],
            ['Event search interface', getValue(fieldValues, 'search_policy')],
            ['Queue design', getValue(fieldValues, 'queue_design')],
            ['Overspill controls', getValue(fieldValues, 'overspill_controls')],
            ['Accessible queue arrangements', getValue(fieldValues, 'accessible_entry_arrangements')],
            ['Opening checks', getValue(fieldValues, 'ingress_operations')],
            ...(radioOne ? [['How KSS work the queue', 'Supervisor checks queue footprint/signage/routes; entry officer controls first engagement; queue marshal monitors tail; SIA supports refusals/intoxication near service; supervisor calls response and may shorten, reshape, pause entry or request redirection; route obstruction is reported immediately.']] : []),
          ]
        ))
        .concat(buildImageBlocks(documents, ['ingress_map'], 'Bar queue operations'))

    case 'circulation_internal':
      return maybeMultiTable(
        ['Bar Operations Control', 'Operational Detail'],
        radioOne
          ? radioOneBarOperationsRows()
          : [
              ['Circulation controls', getValue(fieldValues, 'circulation_controls')],
              ['High-density controls', getValue(fieldValues, 'high_density_controls')],
              ['Internal queue controls', getValue(fieldValues, 'internal_queue_controls')],
            ]
      )

    case 'egress_dispersal':
      if (radioOne) {
        return maybeMultiTable(['Step', 'Close-down sequence'], radioOneCloseDownRows())
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
      }

      return ([{
        type: 'diagram',
        variant: 'crowd_flow',
        stages: [
          { label: 'Venue Release', note: summarizeText(getValue(fieldValues, 'egress_operations'), 58) },
          { label: 'Route Split', note: summarizeText(getValue(fieldValues, 'dispersal_routes'), 58) },
          { label: 'Transport Interface', note: summarizeText(getValue(fieldValues, 'transport_interface'), 58) },
          { label: 'Re-entry / Return', note: summarizeText(getValue(fieldValues, 'reentry_policy'), 58) },
        ],
      } as EmpPreviewBlock] as EmpPreviewBlock[])
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
          ...(radioOne ? [['Ask for Angela / personal safety disclosure', 'Ask for Angela or personal safety disclosures at bars will be handled discreetly. The person will be moved away from public queue pressure where safe, the bar supervisor will be notified, Event Control/welfare requested, and the person will not be ejected or left alone unless welfare, police or Event Control confirms a safe handover.']] : []),
          ...(radioOne ? [['Lone or vulnerable person after refusal', 'Treat as a welfare trigger where the person is under 18, separated, distressed, injured, intoxicated to incapacity or otherwise vulnerable.']] : []),
          ['Safe spaces / welfare locations', getValue(fieldValues, 'safe_spaces')],
          ['Lost child / vulnerable person process', getValue(fieldValues, 'lost_vulnerable_person_process')],
          ...(radioOne ? [] : [['Disclosure route', getValue(fieldValues, 'ask_for_angela_process')]]),
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
              ...(radioOne ? [['Accepted ID', 'Passport, photocard driving licence or PASS-accredited proof-of-age card.']] : []),
              ...(radioOne ? [['Proxy purchasing', 'Monitor adults attempting to buy alcohol for under-18s and escalate concerns to supervisor/Peppermint.']] : []),
              ...(radioOne ? [['Intoxication refusal', 'Bar staff/Peppermint decision supported by KSS where conflict arises.']] : []),
              ...(radioOne ? [['False ID', 'Do not argue; escalate to supervisor/Peppermint/Event Control according to policy.']] : []),
              ...(radioOne ? [['Refusal log fields', 'Time, bar, reason, staff involved, customer behaviour, action taken and Event Control notification where required.']] : []),
              ['Venue rules', getValue(fieldValues, 'venue_rules')],
              ['Prohibited items', getValue(fieldValues, 'prohibited_items')],
            ]
          )
        )

    case 'incident_management':
      return maybeParagraph(getValue(fieldValues, 'incident_management'))
        .concat(
          radioOne
            ? maybeMultiTable(['Incident type', 'KSS first action', 'Escalation'], radioOneIncidentRows(), {
                keepTogether: true,
                avoidRowSplit: true,
                rowUnitScale: 0.45,
              })
            : maybeMultiTable(
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
        .concat(radioOne && !/Radio call format|Control, this is/i.test(getValue(fieldValues, 'incident_management')) ? maybeParagraph('Radio call format: Control, this is [Bar/Call Sign]. Incident type [refusal/welfare/disorder/medical]. Location [bar number/grid]. Assistance required [response/medical/welfare/police].') : [])

    case 'risk_assessment':
      if (selectedAnnexes.includes('bar_operations') || /bar/i.test(getValue(fieldValues, 'plan_title'))) {
        return (radioOne ? maybeMultiTable(['Rating', 'Meaning'], radioOneRiskRatingRows(), { compact: true }) : [])
          .concat(maybeMultiTable(
            ['Activity / Position', 'Hazard', 'Who may be harmed', 'Controls in this EMP', 'Residual position'],
            buildOperationalRiskRows(fieldValues, selectedAnnexes)
          ))
      }

      return maybeParagraph(getValue(fieldValues, 'risk_assessment_methodology'))
        .concat(labeledParagraph('Risk assessment scope and KSS responsibilities', getValue(fieldValues, 'risk_assessment_scope')))
        .concat(labeledParagraph('Source RA notes, key hazards, and trigger points', getValue(fieldValues, 'risk_assessment_source_notes')))
        .concat(
          maybeMultiTable(
            ['Activity / Position', 'Hazard', 'Who may be harmed', 'Controls in this EMP', 'Residual position'],
            buildOperationalRiskRows(fieldValues, selectedAnnexes)
          )
        )

    case 'emergency_procedures':
      return (radioOne ? [] : [{
        type: 'image',
        title: 'Emergency Procedures Overview',
        caption: 'Operational emergency actions: part evacuation, full evacuation, invacuation / lockdown, and shelter.',
        imageUrl: EMP_SECTION_VISUALS.emergency,
        alt: 'Emergency procedures operational visual',
      } as EmpPreviewBlock] as EmpPreviewBlock[])
        .concat(radioOne ? maybeParagraph('KSS will follow the alert states, radio codes and emergency terminology confirmed in the BBC/FAB Major Incident and Emergency Management Plan and Event Control briefing. Pending final confirmation, KSS staff will be briefed using the following working model.') : [])
        .concat(radioOne ? maybeMultiTable(['Alert state', 'Meaning', 'KSS bar action'], radioOneEmergencyAlertRows(), { compact: true }) : [])
        .concat(radioOne ? subheading('JESIP Interface') : [])
        .concat(radioOne ? maybeParagraph('KSS applies JESIP principles as an interface into the event command structure. This supports shared operational awareness for bar areas only and does not give KSS ownership of whole-event emergency command, public ingress, public egress, stage operations, traffic or non-bar zones.') : [])
        .concat(radioOne ? maybeMultiTable(['JESIP principle', 'KSS bar-security application'], radioOneJesipRows(), { keepTogether: true, avoidRowSplit: true, rowUnitScale: 0.8 }) : [])
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
              ...(radioOne ? [['Supervisor route knowledge', 'Each supervisor must know the nearest emergency route, secondary route if the primary route is blocked, and must not self-deploy beyond bar areas unless instructed. Muster/RV points remain as per Major Incident Plan and Event Control direction.']] : []),
              ...(radioOne ? [['Pre-event briefing/tabletop', 'KSS lead/supervisors should attend relevant emergency briefing or tabletop exercise where invited and brief bar teams on confirmed procedures.']] : []),
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
            imageUrl: EMP_SECTION_VISUALS.runHideTell,
            alt: 'Run Hide Tell counter-terrorism poster',
          },
          {
            title: 'Remove Remove Remove',
            caption: 'Initial Operational Response guidance for hazardous substance exposure.',
            imageUrl: EMP_SECTION_VISUALS.iorRemove,
            alt: 'Remove Remove Remove hazardous substance response poster',
          },
        ],
      } as EmpPreviewBlock] as EmpPreviewBlock[])
        .concat(radioOne ? maybeParagraph('CT and security concerns identified from bar areas are escalated through Event Control using JESIP-style shared situational awareness. KSS reports the exact bar/grid, behaviour or item of concern, immediate action taken and assistance required, and does not self-deploy outside allocated bar areas unless instructed.') : [])
        .concat(
          maybeMultiTable(
            radioOne ? ['Concern', 'KSS action'] : ['CT / Protect Duty Control', 'Operational Detail'],
            radioOne
              ? radioOneCtRows()
              : [
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
        .concat(radioOne ? maybeMultiTable(['Welfare Control', 'Operational Detail'], radioOneWelfareRows()) : [])

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
        ['Refusal / Ejection / Confiscation Control', 'Operational Detail'],
        [
          ['Communications plan', getValue(fieldValues, 'communications_plan')],
          ['SITREP and decision logging', getValue(fieldValues, 'sitrep_decision_logging')],
          ['Refusal and false ID protocol', getValue(fieldValues, 'refusal_false_id_protocol')],
          ['Ejection protocol', getValue(fieldValues, 'ejection_protocol')],
          ['Confiscation process', getValue(fieldValues, 'confiscation_process')],
          ['Safeguarding within ejections', getValue(fieldValues, 'ejection_safeguarding')],
          ...(radioOne ? radioOneRefusalLogRows() : []),
        ]
      )

    case 'post_event_reporting':
      return maybeMultiTable(
        ['Close Down / Debrief Control', 'Operational Detail'],
        [
          ['Close-down operations', getValue(fieldValues, 'close_down_operations')],
          ['End-of-shift and end-of-event reporting', getValue(fieldValues, 'end_of_shift_reporting')],
          ['Post-event reporting and debrief', getValue(fieldValues, 'debrief_reporting')],
          ['Asset security and demobilisation', getValue(fieldValues, 'asset_security_demobilisation')],
          ['Health and safety overview', getValue(fieldValues, 'health_safety_overview')],
          ['Risk assessment methodology', getValue(fieldValues, 'risk_assessment_methodology')],
        ]
      )
        .concat(radioOne ? maybeMultiTable(['Daily supervisor debrief item', 'Required detail'], radioOneDebriefRows()) : [])

    case 'appendices':
      return (radioOne ? maybeMultiTable(['Appendix', 'Title', 'Purpose'], radioOneAppendixRows()) : [])
        .concat(labeledParagraph('Site maps and route diagrams', getValue(fieldValues, 'site_maps_and_route_diagrams')))
        .concat(maybeBullets(getValue(fieldValues, 'appendix_notes')))
        .concat(radioOne ? maybeMultiTable(['Role', 'Name', 'Contact / Function'], radioOneContactRows()) : labeledParagraph('Contact directory', getValue(fieldValues, 'contact_directory')))

    default:
      return []
  }
}

function buildAnnexBlocks(
  annexKey: EmpAnnexKey,
  fieldValues: Record<string, EmpResolvedFieldValue>,
  documents: EmpPreviewSourceDocument[]
): EmpPreviewBlock[] {
  const roleFieldKey = EMP_ANNEX_ROLE_FIELD_KEYS[annexKey]
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
        .concat(labeledParagraph('High-demand bar controls', getValue(fieldValues, 'high_density_controls')))
        .concat(labeledParagraph('Response teams', getValue(fieldValues, 'response_teams')))
        .concat(labeledParagraph('Emergency escalation', getValue(fieldValues, 'command_escalation')))

    case 'traffic_pedestrian_routes':
      return roleBlocks
        .concat(labeledParagraph('Routes', getValue(fieldValues, 'ramp_routes')))
        .concat(labeledParagraph('Service / pedestrian interface', getValue(fieldValues, 'transport_interface')))
        .concat(labeledParagraph('Close-down / stock movement routes', getValue(fieldValues, 'dispersal_routes')))
        .concat(buildImageBlocks(documents, ['route_map', 'egress_map'], 'Service and pedestrian routes'))

    case 'camping_security':
      return roleBlocks
        .concat(labeledParagraph('Overnight asset profile', getValue(fieldValues, 'camping_profile')))
        .concat(labeledParagraph('Staffing by zone and time', getValue(fieldValues, 'staffing_by_zone_and_time')))
        .concat(labeledParagraph('Safeguarding process', getValue(fieldValues, 'safeguarding_process')))

    case 'vip_backstage_security':
      return roleBlocks
        .concat(labeledParagraph('Controlled areas', getValue(fieldValues, 'controlled_areas')))
        .concat(labeledParagraph('Named command roles', getValue(fieldValues, 'named_command_roles')))
        .concat(labeledParagraph('Venue rules and accreditation controls', getValue(fieldValues, 'venue_rules')))

    case 'stewarding_deployment':
      return roleBlocks
        .concat(buildDeploymentScheduleBlocks(getValue(fieldValues, 'staffing_by_zone_and_time')))
        .concat(
          parseThreeColumnLines(getValue(fieldValues, 'response_teams')).length
            ? maybeMultiTable(
                ['Team', 'Resourcing', 'Purpose'],
                parseThreeColumnLines(getValue(fieldValues, 'response_teams')),
                { compact: true, avoidRowSplit: true, rowUnitScale: 0.55 }
              )
            : labeledParagraph('Response teams', getValue(fieldValues, 'response_teams'))
        )
        .concat(
          /Radio 1|Big Weekend|KSS NW LTD Bar Security/i.test(`${getValue(fieldValues, 'event_name')} ${getValue(fieldValues, 'plan_title')}`)
            ? labeledParagraph(
                'Relief, contingency and escalation',
                'Relief cover protects fixed bar posts and queue lanes during breaks. Escalate for queue obstruction, repeated refusals, intoxication, welfare/ejection demand, reduced queue capacity or Event Control/Peppermint requests.'
              )
            : labeledParagraph('Relief and contingency', getValue(fieldValues, 'relief_and_contingency'))
                .concat(labeledParagraph('Escalation staffing', getValue(fieldValues, 'escalation_staffing')))
        )

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

function buildRadioOneCustomAnnexes(fieldValues: Record<string, EmpResolvedFieldValue>): EmpPreviewAnnex[] {
  return [
    {
      key: 'radio_one_queue_layouts',
      title: 'Queue Layouts and Queue Types',
      description: 'Bar-specific queue methods for BBC Radio 1 Big Weekend Sunderland 2026.',
      blocks: ([{
        type: 'diagram',
        variant: 'bar_queue_flow',
        lanes: [
          'Accessible / priority service route',
          'Entry marshal point',
          'Serpentine feeder lanes',
          'Queue-tail marshal point',
          'Exit and refusal support route',
        ],
        controls: [
          'Keep accessible route clear',
          'Confirm Challenge 25 and signage',
          'Maintain emergency route clear',
          'Monitor tail and prevent spillback',
          'Move refusals away from service pressure',
        ],
      } as EmpPreviewBlock] as EmpPreviewBlock[])
        .concat(maybeMultiTable(['Queue type', 'Where used', 'Description', 'KSS controls'], radioOneQueueTypeRows(), { compact: true, keepTogether: true, startOnNewPage: true }))
        .concat(maybeParagraph('Queue systems must never obstruct emergency routes, accessible routes, stock/service routes or public circulation routes.')),
    },
    {
      key: 'radio_one_officer_role_cards',
      title: 'Officer Role Cards',
      description: 'Quick-reference role cards for KSS bar deployment.',
      blocks: maybeMultiTable(['Role', 'Core responsibilities'], radioOneOfficerRoleRows(), { compact: true, keepTogether: true, rowUnitScale: 0.8 })
        .concat(maybeMultiTable(['Role', 'Name', 'Function'], radioOneCommandRows(), { keepTogether: true, startOnNewPage: true })),
    },
    {
      key: 'radio_one_bar_emergency_cards',
      title: 'Bar Emergency Action Cards',
      description: 'Bar-specific emergency interface actions. These do not replace the BBC/FAB Major Incident and Emergency Management Plan.',
      blocks: maybeMultiTable(['Alert state', 'Meaning', 'KSS bar action'], radioOneEmergencyAlertRows(), { compact: true })
        .concat(maybeMultiTable(['Concern', 'KSS action'], radioOneCtRows()))
        .concat(maybeMultiTable(
          ['Emergency arrangement', 'KSS bar action'],
          [
            ['Part evacuation', 'Clear affected bar queue/service point, prevent new entry, protect responder access and update KSS control.'],
            ['Full evacuation', 'Stop bar activity, open/remove queue barriers where instructed, direct customers to event routes and report bar clear.'],
            ['Invacuation / lockdown', 'Secure bar access points, move customers away from exposed queue lanes where directed and await Event Control/police instruction.'],
            ['Shelter', 'Avoid unmanaged shelter clusters around bars and direct vulnerable customers to welfare/medical or Event Control-directed safe areas.'],
          ]
        )),
    },
    {
      key: 'radio_one_contact_callsigns',
      title: 'Contact Directory and Call Signs',
      description: 'Live contacts and call signs to be completed before issue.',
      blocks: maybeMultiTable(['Role', 'Name', 'Contact / Function'], radioOneContactRows())
        .concat(maybeMultiTable(
          ['Function', 'Call sign', 'Channel'],
          parseTwoColumnLines(getValue(fieldValues, 'radio_channels_callsigns')).length
            ? parseTwoColumnLines(getValue(fieldValues, 'radio_channels_callsigns')).map(([callSign, use]) => [use, callSign, 'TBC'])
            : radioOneCallSignRows(),
          { compact: true }
        )),
    },
    {
      key: 'radio_one_log_template',
      title: 'Incident / Refusal / Welfare Log Template',
      description: 'Minimum information KSS control/loggist should capture for bar incidents.',
      blocks: maybeMultiTable(
        ['Log field', 'Required detail'],
        [
          ['Time and date', 'Exact time and show day.'],
          ['Bar / location', 'Bar number, grid reference if known and queue/service/BOH point.'],
          ['Incident type', 'Refusal, welfare, disorder, medical, ejection, prohibited item, route obstruction or other.'],
          ['Reason / trigger', 'ID issue, intoxication, proxy purchase, aggression, safeguarding concern, suspicious item or route issue.'],
          ['Staff involved', 'Supervisor, SIA/steward and Peppermint/bar manager where relevant.'],
          ['Action taken', 'De-escalation, response attendance, welfare/medical handover, Event Control notification or police/security escalation.'],
          ['Outcome', 'Resolved, refused, ejected, handed to welfare/medical, escalated, pending follow-up.'],
        ]
      ),
    },
    {
      key: 'radio_one_close_down_checklist',
      title: 'Close-Down Checklist',
      description: 'End-of-trading and post-show close-down controls for KSS bar teams.',
      blocks: maybeMultiTable(['Step', 'Close-down sequence'], radioOneCloseDownRows())
        .concat(maybeMultiTable(['Daily supervisor debrief item', 'Required detail'], radioOneDebriefRows())),
    },
    {
      key: 'radio_one_staff_briefing_signoff',
      title: 'Staff Briefing and Sign-Off Record',
      description: 'Briefing record to be completed before deployment and retained with event logs.',
      blocks: maybeMultiTable(['Record field', 'Required entry'], radioOneBriefingSignOffRows())
        .concat(maybeParagraph('Final live briefing sheet should confirm the approved radio plan, emergency route allocation, welfare/medical route and any bar-specific changes issued by Peppermint/FAB/Event Control.')),
    },
  ]
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function blockToHtml(block: EmpPreviewBlock) {
  switch (block.type) {
    case 'paragraph':
      return `<p>${escapeHtml(block.text)}</p>`
    case 'subheading':
      return `<h3>${escapeHtml(block.text)}</h3>`
    case 'bullet_list':
      return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    case 'table':
      return `<table class="emp-key-value-table"><tbody>${block.rows
        .map(
          (row) =>
            `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`
        )
        .join('')}</tbody></table>`
    case 'multi_table':
      return `<table class="emp-matrix-table"><thead><tr>${block.headers
        .map((header) => `<th>${escapeHtml(header)}</th>`)
        .join('')}</tr></thead><tbody>${block.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
        )
        .join('')}</tbody></table>`
    case 'metric_grid':
      return `<table class="emp-key-value-table"><tbody>${block.items
        .map(
          (item) =>
            `<tr><th>${escapeHtml(item.label)}</th><td>${escapeHtml(item.value)}</td></tr>`
        )
        .join('')}</tbody></table>`
    case 'toc_columns':
      return `<div class="emp-toc-columns">${block.items
        .map(
          (item) =>
            `<div class="emp-toc-item"><span class="emp-toc-ref">${escapeHtml(item.ref)}</span><span class="emp-toc-title">${escapeHtml(item.title)}</span>${typeof item.page === 'number' ? `<span class="emp-toc-page">${item.page}</span>` : ''}</div>`
        )
        .join('')}</div>`
    case 'image':
      return `<figure class="emp-image-panel"><div class="emp-image-title">${escapeHtml(block.title)}</div><img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.alt)}" />${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}</figure>`
    case 'image_grid':
      return `<section class="emp-image-grid-panel"><div class="emp-image-title">${escapeHtml(block.title)}</div>${block.caption ? `<p class="emp-image-grid-caption">${escapeHtml(block.caption)}</p>` : ''}<div class="emp-image-grid">${block.items
        .map(
          (item) =>
            `<figure class="emp-image-panel"><div class="emp-image-title">${escapeHtml(item.title)}</div><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.alt)}" />${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}</figure>`
        )
        .join('')}</div></section>`
    case 'diagram':
      switch (block.variant) {
        case 'ramp':
          return `<table class="emp-matrix-table"><thead><tr><th>RAMP Element</th><th>Assessment Summary</th></tr></thead><tbody>${block.items
            .map(
              (item) =>
                `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.value)}</td></tr>`
            )
            .join('')}</tbody></table>`
        case 'crowd_flow':
          return `<table class="emp-matrix-table"><thead><tr><th>Flow Stage</th><th>Operational Note</th></tr></thead><tbody>${block.stages
            .map(
              (stage) =>
                `<tr><td>${escapeHtml(stage.label)}</td><td>${escapeHtml(stage.note)}</td></tr>`
            )
            .join('')}</tbody></table>`
        case 'bar_queue_flow': {
          const rows = block.lanes.map((lane, index) => [
            lane,
            block.controls[index] || block.controls[index % Math.max(block.controls.length, 1)] || 'Active queue management',
          ])
          return `<table class="emp-matrix-table"><thead><tr><th>Queue Element</th><th>Operational Requirement</th></tr></thead><tbody>${rows
            .map(
              ([element, requirement]) =>
                `<tr><td>${escapeHtml(element)}</td><td>${escapeHtml(requirement)}</td></tr>`
            )
            .join('')}</tbody></table>`
        }
        case 'command':
          return `<table class="emp-key-value-table"><tbody>${[
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
          return `<table class="emp-matrix-table"><thead><tr><th>Action</th><th>Operational Detail</th></tr></thead><tbody>${block.cards
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

export function buildEmpPreviewModel(input: {
  fieldValues: Record<string, EmpResolvedFieldValue>
  selectedAnnexes: string[]
  includeKssProfileAppendix?: boolean
  documents?: EmpPreviewSourceDocument[]
}) {
  const isRadioOneInput = isRadioOnePlan(input.fieldValues, input.selectedAnnexes)
  const title =
    isRadioOneInput
      ? RADIO_ONE_PLAN_TITLE
      : getValue(input.fieldValues, 'plan_title') ||
        getValue(input.fieldValues, 'event_name') ||
        'Bar Security Operations Plan'
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
    {
      label: 'Status',
      value: isRadioOneInput ? 'Draft - final confirmations required' : getValue(input.fieldValues, 'document_status'),
    },
    { label: 'Issue date', value: getValue(input.fieldValues, 'issue_date') },
    { label: 'Review date', value: getValue(input.fieldValues, 'review_date') },
    { label: 'Author', value: getValue(input.fieldValues, 'author_name') },
    { label: 'Approver', value: isRadioOneInput ? 'TBC before issue' : getValue(input.fieldValues, 'approver_name') },
    { label: 'Organiser', value: getValue(input.fieldValues, 'organiser_name') },
    ...(isRadioOneInput ? [] : [{ label: 'Client', value: getValue(input.fieldValues, 'client_name') }]),
  ].filter((row) => clean(row.value))

  const documents = input.documents || []
  const selectedAnnexes = getEffectiveSelectedAnnexes(input.fieldValues, input.selectedAnnexes)
  const isBarFocusedPlan = selectedAnnexes.includes('bar_operations') || /bar/i.test(title)
  const rawBaseSections: EmpPreviewSection[] = EMP_MASTER_TEMPLATE_SECTIONS.map((section) => {
    const description = section.key === 'risk_assessment' && isBarFocusedPlan
      ? ''
      : clean(section.description)
    return {
      key: section.key,
      title: SECTION_TITLES[section.key] || section.title,
      description,
      blocks: buildSectionBlocks(section.key, input.fieldValues, selectedAnnexes, documents),
    }
  }).filter((section) => section.blocks.length > 0 || clean(section.description))

  const staffWelfareSection = rawBaseSections.find((section) => section.key === 'staff_welfare')
  const accessibilitySection = rawBaseSections.find((section) => section.key === 'accessibility')
  const baseSections: EmpPreviewSection[] = rawBaseSections.flatMap((section) => {
    if (section.key === 'accessibility' && staffWelfareSection) return []
    if (section.key !== 'staff_welfare' || !accessibilitySection) return [section]

    return [{
      key: 'staff_welfare_accessibility',
      title: 'Staff Welfare and Accessibility',
      description: 'Staff welfare and accessibility arrangements that support safe bar operations and accessible customer service.',
      blocks: [
        ...subheading('Staff Welfare'),
        ...section.blocks,
        ...subheading('Accessibility'),
        ...accessibilitySection.blocks,
      ],
    }]
  })

  const annexes: EmpPreviewAnnex[] = EMP_ANNEX_DEFINITIONS
    .filter((annex) => selectedAnnexes.includes(annex.key))
    .map((annex) => ({
      key: annex.key,
      title: annex.label,
      description: annex.description,
      blocks: buildAnnexBlocks(annex.key, input.fieldValues, documents),
    }))
    .filter((annex) => annex.blocks.length > 0 || clean(annex.description))

  if (isRadioOneInput) {
    annexes.push(...buildRadioOneCustomAnnexes(input.fieldValues))
  }

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

  const tocSection: EmpPreviewSection = {
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
  } satisfies EmpPreviewModel
}

export function renderEmpPreviewHtml(model: EmpPreviewModel) {
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
      .emp-image-panel { margin: 0 0 14px; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; background: #fff; }
      .emp-image-title { font-weight: 700; margin: 0 0 8px; }
      .emp-image-panel img { width: 100%; max-height: 420px; object-fit: contain; border: 1px solid #e2e8f0; background: #f8fafc; }
      .emp-image-panel figcaption { color: #64748b; font-size: 12px; margin-top: 6px; }
      .emp-image-grid-panel { margin: 0 0 14px; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; background: #fff; }
      .emp-image-grid-caption { color: #475569; margin: 0 0 10px; }
      .emp-image-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .emp-image-grid .emp-image-panel { margin: 0; }
      .emp-toc-columns { column-count: 2; column-gap: 20px; margin: 0 0 12px; }
      .emp-toc-item { break-inside: avoid; display: flex; gap: 10px; margin: 0 0 8px; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
      .emp-toc-ref { min-width: 54px; font-weight: 700; color: #475569; }
      .emp-toc-title { color: #0f172a; flex: 1; }
      .emp-toc-page { font-weight: 700; color: #475569; }
      .emp-key-value-table tbody th { width: 32%; }
      .emp-matrix-table thead th { font-weight: 700; }
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

export function resolveEmpFieldValueMap(
  fields: Array<
    Pick<EmpMasterTemplateField, 'key' | 'label'> & {
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
        } satisfies EmpResolvedFieldValue,
      ]
    })
  ) as Record<string, EmpResolvedFieldValue>
}
