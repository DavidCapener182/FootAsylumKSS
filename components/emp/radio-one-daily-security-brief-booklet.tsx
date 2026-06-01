/* eslint-disable @next/next/no-img-element */
import React, { type ReactNode } from 'react'

type RadioOneBriefDay = {
  key: string
  dayName: string
  dateLabel: string
  shortLabel: string
  lineUp: Array<{
    stage: string
    acts: string
  }>
}

type SecurityBriefLogo = {
  src: string
  alt: string
}

type SecurityBriefPack = {
  pageCount: 4 | 8
  documentHeading: string
  kicker: string
  eventTitle: string
  eventWeekLabel: string
  eventWeekShortLabel: string
  subtitleLabel: string
  venueFull: string
  headerLogo?: SecurityBriefLogo
  headerBrandText?: string
  eventPoster?: SecurityBriefLogo
  eventFacts: string[][]
  programmeTitle: string
  programmeColumns: string[]
  programmeRows: string[][]
  programmeWarning: string
  supervisorScript: string
  riskStrip: Array<{ title: string; body: string }>
  mapTitle: string
  mapImage: SecurityBriefLogo
  mapCallouts: Array<{ label: string; className: string }>
  mapNote: string
  queueTitle: string
  queueIntro: string
  queueImage: SecurityBriefLogo
  queuePoints: Array<{ label: string; body: string }>
  deploymentTitle: string
  deploymentRows: string[][]
  profileBullets: string[]
  rampRows: string[][]
  queueControlItems: string[]
  licensingTitle: string
  licensingItems: string[]
  incidentCallFormat: string
  incidentItems: string[]
  safeguardingIntro: string
  safeguardingSteps: string[]
  ctRows: string[][]
  alertRows: string[][]
  closeDownChecklist: string[]
  debriefRows: string[][]
  notesPrompt: string
}

const CONTROL_FOOTER =
  'KSS NW LTD | Staff Briefing Use Only | Controlled Operational Brief | Not for Public Distribution'

const DOCUMENT_HEADING = 'Radio One Event Week Security Brief'
const EVENT_TITLE = "BBC Radio 1's Big Weekend Sunderland 2026"
const EVENT_WEEK_LABEL = 'Friday 22 May - Sunday 24 May 2026'
const EVENT_WEEK_SHORT_LABEL = '22-24 May 2026'
const VENUE_FULL = 'Herrington Country Park, Chester Road, Penshaw, Houghton le Spring, DH4 7EL'

const BRIEF_DAYS: RadioOneBriefDay[] = [
  {
    key: 'friday',
    dayName: 'Friday',
    dateLabel: 'Friday 22 May 2026',
    shortLabel: 'Fri 22/05/2026',
    lineUp: [
      {
        stage: 'Main Stage',
        acts: 'Fatboy Slim, Clementine Douglas, FISHER, Sonny Fodera, MK',
      },
      {
        stage: 'New Music Stage',
        acts: 'Ahadadream B2B Arthi, horsegiirL, L.P. Rhythm, Ewan McVicar, NOTION, Marlon Hoffstadt',
      },
      {
        stage: 'BBC Introducing',
        acts: 'Jaguar, Max Jones, Anish Kumar, Mia Lily, Niamh, Ellie Scougall, Sorley',
      },
    ],
  },
  {
    key: 'saturday',
    dayName: 'Saturday',
    dateLabel: 'Saturday 23 May 2026',
    shortLabel: 'Sat 23/05/2026',
    lineUp: [
      {
        stage: 'Main Stage',
        acts: 'Zara Larsson, Ellie Goulding, Skye Newman, Louis Tomlinson, Lola Young, Nothing But Thieves',
      },
      {
        stage: 'New Music Stage',
        acts: 'James Blake, Rachel Chinouriri, Florence Road, Erin LeCount, Wasia Project, MUNA, Mitski',
      },
      {
        stage: 'BBC Introducing',
        acts: 'Bella Barbe, BombayMami, Heidi Curtis, LeoStayTrill, Aaron Rowe, Tom A Smith, Swindled',
      },
    ],
  },
  {
    key: 'sunday',
    dayName: 'Sunday',
    dateLabel: 'Sunday 24 May 2026',
    shortLabel: 'Sun 24/05/2026',
    lineUp: [
      {
        stage: 'Main Stage',
        acts: 'Olivia Dean, CMAT, Niall Horan, Kehlani, Dermot Kennedy, Myles Smith',
      },
      {
        stage: 'New Music Stage',
        acts: 'Ezra Collective, FLO, Holly Humberstone, Maisie Peters, Alessi Rose, Odeal, Jorja Smith',
      },
      {
        stage: 'BBC Introducing',
        acts: 'Able Jack, DC3, Finn Forster, Imogen and the Knife, RUBII, Venus Grrrls, Wohdee',
      },
    ],
  },
]

const EVENT_WEEK_LINE_UP_ROWS = BRIEF_DAYS.flatMap((day) =>
  day.lineUp.map((row) => [day.dateLabel, row.stage, row.acts])
)

const EVENT_FACTS = [
  ['Event', EVENT_TITLE],
  ['Venue', 'Herrington Country Park, Sunderland'],
  ['Organiser', 'BBC / Far and Beyond'],
  ['Bar operator', 'Peppermint Bars'],
  ['KSS role', 'Bar security, queue management, refusal support, safeguarding escalation and bar close-down support'],
  ['Capacity', '39,999 total: GA 31,000, VIP 3,000, invited guests 2,000, staff/crew/artists 3,999'],
  ['Public opening', 'Friday 14:00; Saturday/Sunday 11:00'],
  ['Main stage starts', 'Friday 16:00; Saturday/Sunday 12:30'],
  ['Music ends', '22:00 each show day'],
  ['KSS readiness', 'Staff briefed, deployed, radio-checked and in position before public opening'],
  ['KSS scope', 'Bar areas only. Not ingress, search, stages, traffic, CCTV, lost persons ownership or general patrols unless tasked.'],
]

const BAR_DEPLOYMENT_ROWS = [
  ['Bar 1', 'R5', 'Supervisor x1, SIA x5, Steward x2', 'Early demand, entrance/access route conflict'],
  ['Bar 2', 'V4', 'Supervisor x1, SIA x5, Steward x2', 'High-volume queue demand'],
  ['Bar 3', 'U6', 'Supervisor x1, SIA x5, Steward x2', 'Changeover demand, lateral movement'],
  ['Bar 4', 'U7', 'Supervisor x1, SIA x5, Steward x2', 'Challenge 25 demand, route protection'],
  ['Bar 5', 'O6', 'SIA x1', 'Limited holding space, overspill'],
  ['Bar 6', 'Guest/VIP', 'SIA x1', 'Accreditation/service disputes, refusal conflict'],
]

const RAMP_ROWS = [
  ['Routes', 'Keep emergency, stock, accessible and circulation routes clear.'],
  ['Areas', 'Check bar footprints, holding space, service lanes and nearby public routes.'],
  ['Movement', 'Watch lateral movement, queue jumping, counterflow and blocked exits.'],
  ['Profile', 'Young audience, alcohol demand, accessibility needs and welfare triggers.'],
]

const MAP_CALLOUTS = [
  { label: 'Event Control AA7/8', className: 'emp-map-label--control' },
  { label: 'Bar 1 R5', className: 'emp-map-label--bar1' },
  { label: 'Bar 2 V4', className: 'emp-map-label--bar2' },
  { label: 'Bar 3 U6', className: 'emp-map-label--bar3' },
  { label: 'Bar 4 U7', className: 'emp-map-label--bar4' },
  { label: 'Bar 5 O6', className: 'emp-map-label--bar5' },
  { label: 'Guest / VIP', className: 'emp-map-label--vip' },
  { label: 'Medical / Welfare', className: 'emp-map-label--medical' },
  { label: 'Emergency exits / accessible routes', className: 'emp-map-label--routes' },
]

const RADIO_ONE_SECURITY_BRIEF_PACK: SecurityBriefPack = {
  pageCount: 4,
  documentHeading: DOCUMENT_HEADING,
  kicker: 'Controlled Bar Security Briefing',
  eventTitle: EVENT_TITLE,
  eventWeekLabel: EVENT_WEEK_LABEL,
  eventWeekShortLabel: EVENT_WEEK_SHORT_LABEL,
  subtitleLabel: 'Event Week KSS Bar Security Brief',
  venueFull: VENUE_FULL,
  headerLogo: {
    src: '/emp-assets/bbc-radio-1-big-weekend-sunderland-2026-logo.png',
    alt: 'BBC Radio 1 Big Weekend Sunderland 2026 logo',
  },
  eventFacts: EVENT_FACTS,
  programmeTitle: 'Event Week Line-up',
  programmeColumns: ['Day', 'Stage', 'Key acts / presenters'],
  programmeRows: EVENT_WEEK_LINE_UP_ROWS,
  programmeWarning: 'Final line-up and set times must be checked against the approved Event Control day sheet before issue.',
  supervisorScript:
    'Across this event week our job is to keep the bar areas safe, calm and compliant. We control queues, protect emergency and accessible routes, support Peppermint with refusals and Challenge 25, spot welfare concerns early, and escalate anything serious through the supervisor and Event Control. We do not own entrances, search, stages, traffic, CCTV or general arena patrols unless specifically tasked.',
  riskStrip: [
    {
      title: 'Queue demand',
      body: 'Pre-opening, artist changeovers, headline approach and close-down.',
    },
    {
      title: 'Licensing',
      body: 'Challenge 25, intoxication, proxy purchasing and refusal conflict.',
    },
    {
      title: 'Welfare and safeguarding',
      body: 'Separated young people, vulnerable adults, Ask for Angela, spiking concerns and medical escalation.',
    },
  ],
  mapTitle: 'Event Map - Bar Locations and Route Awareness',
  mapImage: {
    src: '/emp-assets/r1bw26-site-overview-map-bars-crop.png',
    alt: 'Radio 1 Big Weekend 2026 site overview map focused on bar locations',
  },
  mapCallouts: MAP_CALLOUTS,
  mapNote:
    'Confirm live medical/welfare route, emergency exits and accessible route changes against the current Event Control day sheet before deployment.',
  queueTitle: 'Bar Queue Management',
  queueIntro:
    'Customer flow, queue dividers, crowd-control barriers, accessible service area, staff access and managed exits must be maintained during trading periods.',
  queueImage: {
    src: '/emp-assets/bar-queue-flow.jpg',
    alt: 'Radio 1 bar queue management plan',
  },
  queuePoints: [
    {
      label: 'Lanes',
      body: 'Accessible / priority lane, managed feeder lane A and managed feeder lane B.',
    },
    {
      label: 'Controls',
      body: 'Visible entry point, one-way lane flow, clear exits and refusal support point.',
    },
  ],
  deploymentTitle: 'Bar Deployment',
  deploymentRows: BAR_DEPLOYMENT_ROWS,
  profileBullets: [
    'BBC Radio 1 target demographic: 15-24.',
    'Friday and VIP are 18+.',
    'GA under-16s require adult supervision.',
    'Likely bar profile: young adults, VIP/guest customers and mixed-age weekend attendees.',
    'Watch intoxication, proxy purchase, vulnerable persons, separated young people and group behaviour.',
  ],
  rampRows: RAMP_ROWS,
  queueControlItems: [
    'Keep queue lanes tidy and visible.',
    'Keep accessible, stock and service routes clear.',
    'Monitor queue tail and overspill.',
    'Report route obstruction immediately.',
    'Do not allow unmanaged spillback into public circulation routes.',
    'Supervisor may shorten, reshape or pause entry and request response/Event Control/Peppermint support.',
  ],
  licensingTitle: '2. Licensing / Challenge 25',
  licensingItems: [
    'Accepted ID: passport, photocard driving licence, PASS-accredited proof-of-age card.',
    'Support Challenge 25, intoxication refusals and refusal logging.',
    'Monitor proxy purchase, false ID and refusal conflict.',
    'Do not argue over ID. Do not make it personal. Support Peppermint, de-escalate and record.',
  ],
  incidentCallFormat:
    'Control, this is [Bar / Call Sign]. Incident type [refusal / welfare / disorder / medical / suspicious item]. Location [bar number and grid]. Assistance required [response / medical / welfare / police].',
  incidentItems: [
    'Exact location first.',
    'Use plain language and keep radio messages clear.',
    'Serious incidents go through supervisor to Event Control.',
  ],
  safeguardingIntro:
    'Triggers: under-18 concern, distressed or separated person, intoxicated to incapacity, harassment or disclosure, Ask for Angela, drink spiking concern, injury or medical concern.',
  safeguardingSteps: [
    'Move away from queue congestion where safe.',
    'Keep supervised and inform supervisor.',
    'Request welfare/medical through Event Control.',
    'Do not eject vulnerable persons without Event Control/welfare/police direction.',
  ],
  ctRows: [
    ['Suspicious item', 'Do not touch. Clear immediate area if safe. Report exact bar/grid.'],
    ['Hostile reconnaissance', 'Report person, behaviour, location and direction of travel.'],
    ['Weapons attack', 'Run / Hide / Tell. Do not pursue.'],
    ['Hazardous substance', 'Remove, Remove, Remove. Report when safe.'],
  ],
  alertRows: [
    ['Green', 'Normal operations', 'Maintain queue, licensing, welfare and route monitoring.'],
    ['Amber', 'Raised vigilance', 'Supervisor checks routes, briefs staff and prepares to pause queue/service.'],
    ['Red', 'Confirmed incident / possible evacuation, lockdown or Show Stop', 'Stop non-essential activity, await Event Control instruction, prepare to clear queues.'],
    ['Black', 'Major incident / emergency services command', 'Follow Event Control/police instruction, protect life safety, report bar status.'],
  ],
  closeDownChecklist: [
    'Peppermint/Event Control confirmed last service or bar close.',
    'Queue tail closed; no new customers added.',
    'Existing queue served or dispersed as directed.',
    'Refusals/ejections escalated before wider egress peak.',
    'Queue barriers opened/removed only when safe and authorised.',
    'Bar front cleared; no gathering point left.',
    'Stock/service area secure or handed over.',
    'Bar clear reported to KSS Control.',
    'Incidents/refusals/welfare cases logged.',
    'Staff welfare check completed.',
  ],
  debriefRows: [
    ['Queue performance', ''],
    ['Challenge 25 / refusals', ''],
    ['Intoxication / proxy purchase', ''],
    ['Welfare / safeguarding', ''],
    ['Ejections / disorder', ''],
    ['Prohibited items', ''],
    ['Route or barrier issues', ''],
    ['Staff welfare / breaks', ''],
    ['Actions for next show day / event', ''],
  ],
  notesPrompt: 'Return to supervisor/control if used for incident, refusal, welfare or operational notes.',
}

const DOWNLOAD_FESTIVAL_SECURITY_BRIEF_PACK: SecurityBriefPack = {
  pageCount: 8,
  documentHeading: 'Download Festival Security Brief',
  kicker: 'Controlled Event Security Briefing',
  eventTitle: 'Download Festival 2026',
  eventWeekLabel: 'Wednesday 10 June - Monday 15 June 2026',
  eventWeekShortLabel: '10-15 June 2026',
  subtitleLabel: 'Event Week KSS Security Brief',
  venueFull: 'Donington Park, Castle Donington, Derby, DE74 2RP',
  headerLogo: {
    src: '/emp-assets/download-festival-logo.png',
    alt: 'Download Festival logo',
  },
  eventPoster: {
    src: '/emp-assets/download-2026-event-poster.jpg',
    alt: 'Download Festival 2026 line-up poster',
  },
  headerBrandText: 'Download Festival 2026',
  eventFacts: [
    ['Event', 'Download Festival 2026'],
    ['Venue', 'Donington Park, Castle Donington'],
    ['Organiser', 'Live Nation (Music) UK Ltd / Far and Beyond Events Ltd'],
    ['KSS role', 'Bars, Co-Op shop, Paddock, accessibility campsite/search, queue, welfare and emergency interface support'],
    ['Capacity', 'Expected 95,000 public plus approximately 5,000 staff, contractors and performers'],
    ['Show dates', 'Wednesday 10 June to Monday 15 June 2026'],
    ['Arena live days', 'Friday 12 June to Sunday 14 June 2026'],
    ['Event Control', 'Pit Lane Suites - Garage 39; live Event Control instructions supersede this brief'],
    ['KSS readiness', 'Staff briefed, deployed, radio-checked and in position before public opening or assigned post start'],
    ['KSS scope', 'Allocated KSS areas only. Not whole-site ownership, traffic, CCTV, stages or public messaging unless tasked.'],
  ],
  programmeTitle: 'Event Week Operating Pattern',
  programmeColumns: ['Period', 'Operational focus', 'KSS emphasis'],
  programmeRows: [
    ['Wed 10 Jun', 'Campsite arrivals, accessibility search and Paddock activity', 'Calm search support, accessible routes, welfare recognition and route protection'],
    ['Thu 11 Jun', 'Build into full campsite occupancy and early bar/Co-Op demand', 'Queue layout checks, overnight cover, Co-Op support and supervisor SITREPs'],
    ['Fri 12 - Sun 14 Jun', 'Arena live days, bars, Co-Op shop, headline periods and nightly return', 'Challenge 21, refusals, peak queue demand, safeguarding, Ask for Angela and egress support'],
    ['Mon 15 Jun', 'Campsite clearance and demobilisation', 'Lost/found escalation, welfare checks, asset handover and staff fatigue management'],
  ],
  programmeWarning: 'Final opening times, running order, bar hours and route changes must be checked against the approved Event Control day sheet before issue.',
  supervisorScript:
    'Across Download Festival our job is to keep KSS assigned areas safe, calm and compliant. We protect accessible and emergency routes, manage bar and Co-Op queues, support Challenge 21 and refusals, identify welfare or safeguarding concerns early, and escalate serious matters through the supervisor and Event Control. We do not own the whole festival site unless specifically tasked.',
  riskStrip: [
    {
      title: 'Queue demand',
      body: 'Arena bars, Co-Op shop, accessibility search, campsite arrivals, headline periods and Monday clearance.',
    },
    {
      title: 'Licensing',
      body: 'Challenge 21, intoxication, proxy purchasing, refusal conflict and fake or altered ID escalation.',
    },
    {
      title: 'Welfare and safeguarding',
      body: 'Under-18s, accessibility needs, Ask for Angela, spiking concerns, lost/found persons and vulnerable ejections.',
    },
  ],
  mapTitle: 'Event Map - KSS Areas and Route Awareness',
  mapImage: {
    src: '/emp-assets/download-2026-site-plan-v5.png',
    alt: 'Download Festival 2026 site plan',
  },
  mapCallouts: [],
  mapNote:
    'Confirm live KSS posts, accessible routes, medical/welfare locations, emergency routes and any campsite or arena changes against the current Event Control day sheet before deployment.',
  queueTitle: 'Bars, Co-Op and Accessibility Queue Management',
  queueIntro:
    'Customer flow, queue lanes, stock/service routes, accessible routes, staff access, refusal points and managed exits must be maintained throughout trading and campsite activity.',
  queueImage: {
    src: '/emp-assets/bar-queue-flow-template.png',
    alt: 'Download Festival queue management plan template',
  },
  queuePoints: [
    {
      label: 'Lanes',
      body: 'Accessible or priority route, managed feeder lanes, clear queue tail and safe refusal/support point.',
    },
    {
      label: 'Controls',
      body: 'Visible entry, route protection, barrier checks, welfare observation and immediate Event Control escalation.',
    },
  ],
  deploymentTitle: 'KSS Deployment Snapshot',
  deploymentRows: [
    ['Bars', 'Arena, campsite and guest bar areas', 'Bar supervisor, SIA, steward/queue support as scheduled', 'Queue congestion, Challenge 21, refusal conflict, route obstruction'],
    ['Co-Op shop', 'Sponsorship / campsite retail area', 'Co-Op supervisor and SIA support as scheduled', 'Shop surge, asset protection, welfare and exit conflict'],
    ['Accessibility search', 'Accessible campsite entrance/search points', 'Accessibility supervisor, SIA search and queue support', 'Search dignity, medication/equipment sensitivity, route delays'],
    ['Accessible Campsite A4 / D', 'Accessible campsite grids and response areas', 'Accessibility manager, response teams and access control', '24-hour welfare, lost/found, route protection'],
    ['Paddock', 'Paddock and Event Control interfaces', 'Access control and gate support as scheduled', 'Accreditation, vehicle/route interface and escalation'],
    ['Response', 'KSS assigned areas', 'Supervisor-led response pair/team where scheduled', 'Refusals, welfare escort, route compromise and incident support'],
  ],
  profileBullets: [
    'Large mixed-age rock and metal audience with around 70,000 camping and guest tickets.',
    'Under-16s require adult supervision and anyone aged 17 or under is treated as a child for safeguarding.',
    'Accessibility campsite guests may need additional time, privacy, medication/equipment support and route assistance.',
    'Demand peaks at campsite arrival, arena opening, headline approach, Co-Op peaks, nightly return and Monday clearance.',
    'Watch intoxication, proxy purchase, harassment disclosure, lost/found persons, disabled guest distress and group separation.',
  ],
  rampRows: [
    ['Routes', 'Keep emergency, stock, accessible, welfare/medical and campsite circulation routes clear.'],
    ['Areas', 'Check bars, Co-Op, accessibility search, Paddock and campsite areas against peak demand.'],
    ['Movement', 'Watch queue spillback, barrier loading, counterflow, route loss, vehicle interfaces and blocked exits.'],
    ['Profile', 'Mixed-age audience, camping fatigue, accessibility needs, alcohol demand and safeguarding triggers.'],
  ],
  queueControlItems: [
    'Keep bar, Co-Op and accessibility queue lanes tidy and visible.',
    'Keep accessible, stock, welfare, medical and emergency routes clear.',
    'Monitor queue tail, overspill, barrier loading, customer distress and overheating.',
    'Report route obstruction, shop surge, search delay or barrier failure immediately.',
    'Do not allow unmanaged spillback into campsite, arena or accessible circulation routes.',
    'Supervisor may shorten, reshape or pause entry and request response/Event Control/operator support.',
  ],
  licensingTitle: '2. Licensing / Challenge 21',
  licensingItems: [
    'Support Challenge 21 at bars and any age-restricted product point.',
    'Accepted ID is controlled by the event/operator policy and must be checked against the live briefing.',
    'Monitor proxy purchase, fake or altered ID, intoxication and refusal conflict.',
    'Do not argue over ID. Support the operator, de-escalate, welfare-check and record refusals.',
  ],
  incidentCallFormat:
    'Control, this is [Area / Call Sign]. Incident type [refusal / welfare / disorder / medical / safeguarding / suspicious item]. Location [post, landmark and grid if known]. Assistance required [response / medical / welfare / police / Event Control].',
  incidentItems: [
    'Exact location first: bar, Co-Op, campsite, Paddock, gate, landmark and grid if known.',
    'Use plain language and keep radio messages clear.',
    'Serious incidents go through supervisor to Event Control.',
  ],
  safeguardingIntro:
    'Triggers: under-18 concern, distressed or separated person, intoxicated to incapacity, harassment or disclosure, Ask for Angela, drink spiking concern, accessibility distress, injury or medical concern.',
  safeguardingSteps: [
    'Move away from queue congestion where safe.',
    'Keep supervised and inform supervisor.',
    'Request welfare, medical, safeguarding or police support through Event Control.',
    'Do not eject or evict vulnerable persons without Event Control, welfare, safeguarding or police direction.',
  ],
  ctRows: [
    ['Suspicious item', 'Do not touch. Clear immediate area if safe. Report exact post, landmark and grid.'],
    ['Hostile reconnaissance', 'Report person, behaviour, location, direction of travel and any vehicle detail.'],
    ['Weapons attack', 'Run / Hide / Tell. Do not pursue. Protect life and report when safe.'],
    ['Hazardous substance', 'Remove, Remove, Remove. Report when safe and preserve information.'],
  ],
  alertRows: [
    ['Green', 'Normal operations', 'Maintain queue, licensing, welfare, accessibility and route monitoring.'],
    ['Amber', 'Raised vigilance', 'Supervisor checks routes, briefs staff and prepares to pause queues/search/service.'],
    ['Red', 'Confirmed incident / possible evacuation, lockdown or Show Stop', 'Stop non-essential activity, await Event Control instruction, prepare to clear queues.'],
    ['Black', 'Major incident / emergency services command', 'Follow Event Control/police instruction, protect life safety, report area status.'],
  ],
  closeDownChecklist: [
    'Event Control/operator confirmed bar, Co-Op, search lane or post close.',
    'Queue tail closed; no new customers added.',
    'Existing queue served, redirected or dispersed as directed.',
    'Refusals, ejections, welfare and safeguarding cases escalated before stand-down.',
    'Queue barriers opened, removed or handed over only when safe and authorised.',
    'Accessible, stock, welfare/medical and emergency routes clear.',
    'Assets, search items, stock/service area or post equipment secure or handed over.',
    'Area clear reported to KSS Control/Event Control.',
    'Incidents, refusals, searches, lost/found and welfare cases logged.',
    'Staff welfare check completed before release.',
  ],
  debriefRows: [
    ['Queue / route performance', ''],
    ['Challenge 21 / refusals', ''],
    ['Co-Op / bar demand', ''],
    ['Accessibility search / routes', ''],
    ['Welfare / safeguarding', ''],
    ['Ejections / disorder', ''],
    ['Prohibited items / search issues', ''],
    ['Staff welfare / breaks', ''],
    ['Actions for next show day / event', ''],
  ],
  notesPrompt: 'Return to supervisor/control if used for incident, refusal, welfare, search, accessibility or operational notes.',
}

function BriefPage({
  pageNumber,
  children,
  pack,
}: {
  pageNumber: number
  children: ReactNode
  pack: SecurityBriefPack
}) {
  return (
    <article className={`emp-master-template-page emp-radio-one-brief-page ${pack.pageCount === 8 ? 'emp-radio-one-brief-page--download' : ''}`}>
      <div className="emp-radio-one-brief-inner">
        <header className="emp-radio-one-brief-header">
          <div className="emp-radio-one-brand-lockup">
            <div className="emp-radio-one-kss-mark" aria-label="KSS NW LTD">
              <img src="/kss-logo.png" alt="KSS NW LTD logo" />
            </div>
          </div>
          <div className="emp-radio-one-brief-title-block">
            <div className="emp-radio-one-kicker">{pack.kicker}</div>
            <h1>{pack.documentHeading}</h1>
            <p className="emp-radio-one-event-title">{pack.eventTitle}</p>
            <p className="emp-radio-one-subtitle">{pack.subtitleLabel} - {pack.eventWeekLabel}</p>
            <p>Venue: {pack.venueFull}</p>
          </div>
          <div className="emp-radio-one-bbc-logo-card">
            {pack.headerLogo ? (
              <img src={pack.headerLogo.src} alt={pack.headerLogo.alt} />
            ) : (
              <strong className="emp-radio-one-event-brand-text">{pack.headerBrandText || pack.eventTitle}</strong>
            )}
            <span>Event week {pack.eventWeekShortLabel} | Page {pageNumber} of {pack.pageCount}</span>
          </div>
        </header>
        <main className="emp-radio-one-brief-body">{children}</main>
        <footer className="emp-radio-one-brief-footer">
          <span>{CONTROL_FOOTER}</span>
        </footer>
      </div>
    </article>
  )
}

function Panel({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`emp-radio-one-panel ${className}`}>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  )
}

function MiniTable({
  columns,
  rows,
  dense = false,
}: {
  columns: string[]
  rows: string[][]
  dense?: boolean
}) {
  return (
    <table className={`emp-radio-one-table ${dense ? 'emp-radio-one-table--dense' : ''}`}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`${row.join('-')}-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <td key={`${cell}-${cellIndex}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="emp-radio-one-bullets">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function ActionCard({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`emp-radio-one-action-card ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function CheckList({ items }: { items: string[] }) {
  return (
    <div className="emp-radio-one-checklist">
      {items.map((item) => (
        <div key={item} className="emp-radio-one-check">
          <span />
          <p>{item}</p>
        </div>
      ))}
    </div>
  )
}

type RadioOneBriefLayout = 'pages' | 'booklet'

type SecurityBriefPageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

function PageOne({ pack }: { pack: SecurityBriefPack }) {
  return (
    <BriefPage pageNumber={1} pack={pack}>
      <Panel title="Event Week Snapshot">
        <MiniTable columns={['Item', 'Detail']} rows={pack.eventFacts} dense />
      </Panel>

      <Panel title={pack.programmeTitle} className="emp-radio-one-lineup-panel">
        <MiniTable columns={pack.programmeColumns} rows={pack.programmeRows} dense />
        <p className="emp-radio-one-warning-line">
          {pack.programmeWarning}
        </p>
      </Panel>

      <Panel title="Supervisor Opening Script" className="emp-radio-one-script-panel">
        <p>
          &ldquo;{pack.supervisorScript}&rdquo;
        </p>
      </Panel>

      <div className="emp-radio-one-risk-strip">
        {pack.riskStrip.map((risk) => (
          <div key={risk.title}>
            <strong>{risk.title}</strong>
            <span>{risk.body}</span>
          </div>
        ))}
      </div>

      {pack.eventPoster ? (
        <section className="emp-radio-one-poster-panel">
          <h2>Download 2026 Line-up Poster</h2>
          <div className="emp-radio-one-poster-frame">
            <img src={pack.eventPoster.src} alt={pack.eventPoster.alt} />
          </div>
        </section>
      ) : null}
    </BriefPage>
  )
}

function PageTwo({ pack }: { pack: SecurityBriefPack }) {
  return (
    <BriefPage pageNumber={2} pack={pack}>
      <Panel title={pack.mapTitle} className="emp-radio-one-map-panel">
        <div className="emp-radio-one-map-frame">
          <img
            src={pack.mapImage.src}
            alt={pack.mapImage.alt}
          />
          {pack.mapCallouts.map((callout) => (
            <span key={callout.label} className={`emp-map-label ${callout.className}`}>
              {callout.label}
            </span>
          ))}
        </div>
        <p className="emp-radio-one-map-note">
          {pack.mapNote}
        </p>
      </Panel>

      <Panel title={pack.queueTitle} className="emp-radio-one-queue-panel">
        <p>
          {pack.queueIntro}
        </p>
        <div className="emp-radio-one-queue-image">
          <img src={pack.queueImage.src} alt={pack.queueImage.alt} />
        </div>
        <div className="emp-radio-one-queue-points">
          {pack.queuePoints.map((point) => (
            <span key={point.label}><strong>{point.label}:</strong> {point.body}</span>
          ))}
        </div>
      </Panel>

      <Panel title={pack.deploymentTitle} className="emp-radio-one-deployment-panel">
        <MiniTable columns={['Area', 'Location', 'Staffing model', 'Main risk']} rows={pack.deploymentRows} dense />
      </Panel>

      <div className="emp-radio-one-two-col">
        <Panel title="Crowd Profile and Movement Dynamic">
          <BulletList
            items={pack.profileBullets}
          />
        </Panel>
        <Panel title="RAMP Briefing">
          <MiniTable columns={['RAMP', 'Supervisor message']} rows={pack.rampRows} dense />
        </Panel>
      </div>
    </BriefPage>
  )
}

function DownloadAccessibilitySearchPage({ pack }: { pack: SecurityBriefPack }) {
  return (
    <BriefPage pageNumber={3} pack={pack}>
      <Panel title="Accessibility Search and Access-First Standard">
        <MiniTable
          columns={['Point', 'Supervisor message']}
          rows={[
            ['Briefing standard', 'Be calm, believe the access need, check wristband or approval where required, explain clearly, offer the correct route or escalation, and record anything unusual.'],
            ['Reasonable adjustment', 'Enforce rules lawfully and consistently. Do not let ground-level staff freestyle final access decisions when adjustment or discrimination is raised.'],
            ['Search approach', 'Search must be respectful, consensual, explained before it happens, proportionate, policy-led and adjusted where disability creates difficulty.'],
            ['Immediate escalation', 'Call supervisor or Accessibility Team for discrimination complaints, pain, urgent toilet need, medication issues, distress, or inability to keep queuing safely.'],
          ]}
          dense
        />
      </Panel>

      <div className="emp-radio-one-two-col">
        <Panel title="Staff Must Do">
          <BulletList
            items={[
              'Speak to the customer, not only to the companion.',
              'Use plain, calm language and avoid demanding diagnosis details.',
              'Ask: What do you need from us to make this easier or safer?',
              'Give clear options rather than arguments, including Accessibility Team escalation.',
              'Record key access incidents factually: time, location, issue, action and supervisor called.',
            ]}
          />
        </Panel>
        <Panel title="Staff Must Not Say">
          <BulletList
            items={[
              'You do not look disabled.',
              'Everyone has to queue.',
              'That is not my problem.',
              'The rules are the rules without considering reasonable adjustment.',
              'You cannot bring that medication in without checking policy, supervisor or medical support.',
            ]}
          />
        </Panel>
      </div>

      <div className="emp-radio-one-action-grid emp-radio-one-action-grid--auto">
        <ActionCard title="Search Script">
          <BulletList
            items={[
              "Hello. For everyone's safety we need to carry out a search as a condition of entry.",
              'This may include your bag, mobility aid and person.',
              'Do you need any adjustment before we start, such as sitting down, a slower search, privacy, or a male/female searcher?',
            ]}
          />
        </ActionCard>
        <ActionCard title="Mobility Aids, Bags and Medication">
          <BulletList
            items={[
              'Ask before touching wheelchairs, scooters, rollators, crutches or medical bags.',
              'Keep mobility aids within reach unless there is a safe alternative and supervisor agreement.',
              'Do not confiscate medication because staff do not understand it; check packaging or prescription evidence and escalate uncertainty.',
              'Access customers may have one larger accessibility bag; search it, do not refuse it just because it is larger.',
            ]}
          />
        </ActionCard>
      </div>

      <Panel title="Common Search Answers">
        <MiniTable
          columns={['Question / issue', 'Best staff answer']}
          rows={[
            ['Male or female searcher requested', 'Yes. I will arrange that for you and keep the lane calm while we do it.'],
            ['Do not touch my wheelchair', 'Understood. I will not touch it without explaining first. I still need to complete the check, so I will talk you through it safely.'],
            ['Loose medication or medical cannabis', 'Pause the lane, check packaging, prescription evidence and matching ID where required, and call a supervisor if there is any doubt.'],
            ['Food or drink claimed for medical need', 'Do not dismiss it. Ask calmly what it is needed for and escalate rather than refuse where there is a medical or disability basis.'],
            ['Customer is overwhelmed or Deaf / hard of hearing', 'Slow down, write it down if needed, use simple steps, offer privacy or quieter space and let the companion assist.'],
          ]}
          dense
        />
      </Panel>

      <Panel title="Search Complaint Controls">
        <MiniTable
          columns={['Risk factor', 'Control measure']}
          rows={[
            ['Mobility aids touched without consent', 'Ask before touching, explain each check, keep aids within reach and avoid separating the customer from essential equipment.'],
            ['Different lane answers', 'Use the supervisor briefing for larger access bags, medication, food/drink exceptions and male/female search requests.'],
            ['Pain, toilet urgency or discrimination raised', 'Stop debating the lane decision, call supervisor or Accessibility Team and make a short factual note.'],
            ['Search refusal or safety concern', 'Stay inside Assignment Instructions, keep tone calm, protect privacy and escalate before refusal becomes confrontation.'],
          ]}
          dense
        />
      </Panel>

      <Panel title="What to Record at Search">
        <MiniTable
          columns={['Record', 'Include']}
          rows={[
            ['Time and place', 'Post, lane, landmark, grid if known and whether the customer was at accessibility search, box office or campsite access.'],
            ['Access status', 'Wristband, JCW, platform, campsite or approval evidence shown, without writing unnecessary medical detail.'],
            ['Adjustment made', 'Seated search, privacy, slower process, male/female searcher, companion support, medication check or Accessibility Team call.'],
            ['Outcome', 'Search completed, entry allowed, item decision, refusal escalated, medical/welfare called or supervisor informed.'],
          ]}
          dense
        />
      </Panel>
    </BriefPage>
  )
}

function DownloadCampsiteSupportPage({ pack }: { pack: SecurityBriefPack }) {
  return (
    <BriefPage pageNumber={4} pack={pack}>
      <Panel title="Accessible Campsites, Toilets and Queues">
        <MiniTable
          columns={['Topic', 'Staff message', 'Escalate when']}
          rows={[
            ['Campsite allocation', 'Campsite team allocates pitches. Do not promise specific pitches, campsite swaps or extra group access.', 'Customer is at wrong campsite, has approval dispute or cannot safely reach pitch.'],
            ['Group size / gazebos', 'Accessible campsite space is limited; layouts must not block access routes or other disabled customers.', 'Gazebo, tent or equipment blocks space, trackway, fire lane or emergency movement.'],
            ['Toilets / JCW', 'Treat toilet access as urgent, dignified and private. Prioritise urgent need where JCW wristband or distress is shown.', 'Distress, misuse conflict, blocked/dirty toilet, no supplies or medical/welfare concern.'],
            ['Changing Places', 'Keep access routes clear. Do not use as overflow and do not attempt hoist/manual handling unless trained and authorised.', 'Customer needs support beyond stewarding or facility access is blocked.'],
          ]}
          dense
        />
      </Panel>

      <div className="emp-radio-one-two-col">
        <Panel title="Campsite Route Controls">
          <BulletList
            items={[
              'Accessible Campsite A is next to the arena with dedicated entrance arrangements; Campsite B is by West Entrance next to Black Campsite.',
              'Customers approved for one accessible campsite must not be moved into the other without Accessibility Team authority.',
              'Trackway is not spare space: it is for wheelchair users, scooters, emergency access and site operations.',
              'Keep fire lanes, hard standing, accessible walkways and buggy routes clear at all times.',
            ]}
          />
        </Panel>
        <Panel title="Queues and Waiting">
          <BulletList
            items={[
              'Identify customers who cannot safely stand; offer seating or Accessibility Team escalation where available.',
              'Give honest wait-time information and do not promise what you cannot deliver.',
              'Watch for distress, overheating, panic, faintness, pain, seizure risk, diabetic issue or breathing difficulty.',
              'Call medics for health deterioration and call welfare or Accessibility Team for access-related distress.',
            ]}
          />
        </Panel>
      </div>

      <Panel title="Useful Ground Scripts">
        <MiniTable
          columns={['Situation', 'Script']}
          rows={[
            ['Wristband / approval issue', 'I cannot issue or change access approval here. I will direct you to the accessible box office or Accessibility Team to check your approval.'],
            ['Trackway or fire lane blocked', 'This route must stay clear for access and emergency movement. I need you to move the item now.'],
            ['Toilet complaint', 'Some customers have urgent or non-visible access needs. We manage this facility under the festival accessibility policy.'],
            ['Transport frustration', 'The vehicle curfew is for pedestrian safety. I can direct you to the shuttle stop or call Accessibility Team if there is a welfare issue.'],
          ]}
          dense
        />
      </Panel>

      <Panel title="Medical, Welfare and Sensory Escalation">
        <MiniTable
          columns={['Trigger', 'Immediate action']}
          rows={[
            ['Medical', 'Call medics for chest pain, breathing difficulty, seizure, collapse, severe allergic reaction, diabetic emergency, heat illness, confusion or significant injury.'],
            ['Welfare', 'Call welfare for panic, overwhelm, lost vulnerable person, harassment, discrimination, domestic abuse or sexual safety concern.'],
            ['Sensory overload', 'Reduce verbal load, move away from crowd/noise if safe, ask yes/no questions, avoid touching unless needed for immediate safety and offer calm tent or welfare.'],
            ['Safeguarding', 'Keep the person supervised, preserve dignity, do not eject vulnerable persons without Event Control, welfare, safeguarding or police direction.'],
          ]}
          dense
        />
      </Panel>

      <Panel title="Viewing, Assistance Dogs and Transport">
        <MiniTable
          columns={['Area', 'Staff reminder']}
          rows={[
            ['Viewing platforms / ground viewing', 'Check correct wristband, protect capacity and one-in-one-out, keep ramps clear and call Accessibility Team if the customer cannot safely queue.'],
            ['Assistance dogs', 'Do not distract, stroke or feed the dog. Keep other customers away if needed and direct the handler to the nearest spending area.'],
            ['Internal transport / buggies', 'Do not say just walk or it is not far. Explain vehicle curfews honestly and direct to shuttle, buggy point or Accessibility Team support.'],
          ]}
          dense
        />
      </Panel>
    </BriefPage>
  )
}

function DownloadAreaTaskCardsPage({ pack }: { pack: SecurityBriefPack }) {
  return (
    <BriefPage pageNumber={5} pack={pack}>
      <div className="emp-radio-one-action-grid emp-radio-one-action-grid--auto">
        <ActionCard title="1. Co-Op Shop">
          <BulletList
            items={[
              'Protect shop ingress, egress, queue lanes, perimeter and asset area.',
              'Prevent queue spillback into accessible, welfare, medical or emergency routes.',
              'Escalate shop surge, staff safety, theft, disorder, vulnerable persons and route compromise early.',
            ]}
          />
        </ActionCard>
        <ActionCard title="2. Bars">
          <BulletList
            items={[
              'Support Challenge 21, refusals, queue control, stock/service routes and close-down.',
              'Watch intoxication, proxy purchasing, conflict after refusal, harassment disclosure and spiking concerns.',
              'Do not make refusal personal; support operator decision, de-escalate and record.',
            ]}
          />
        </ActionCard>
        <ActionCard title="3. Paddock">
          <BulletList
            items={[
              'Maintain access control, accreditation checks and Event Control interface duties.',
              'Keep routes clear for authorised vehicles, emergency movement and operational access.',
              'Report unknown access attempts, route obstruction, staff welfare concerns and conflict.',
            ]}
          />
        </ActionCard>
        <ActionCard title="4. Response Support">
          <BulletList
            items={[
              'Respond through supervisor tasking; give exact location and current risk before moving.',
              'Support refusals, welfare escort, route compromise, search escalation and incident containment.',
              'Preserve evidence and privacy; do not turn welfare incidents into public confrontations.',
            ]}
          />
        </ActionCard>
        <ActionCard title="5. Route Protection" className="emp-radio-one-alert-card">
          <MiniTable
            columns={['Route', 'Keep clear for']}
            rows={[
              ['Accessible routes', 'Wheelchair users, mobility aids, buggy movement, carers and welfare/medical access.'],
              ['Emergency routes', 'Emergency services, Event Control instructions, evacuation or incident response.'],
              ['Stock/service routes', 'Bar and shop replenishment, staff access and vehicle/plant controls.'],
            ]}
            dense
          />
        </ActionCard>
      </div>

      <Panel title="Viewing, Transport and Assistance Dog Reminders">
        <MiniTable
          columns={['Topic', 'Operational note']}
          rows={[
            ['Raised viewing platforms', 'Ramped access, wheelchair-accessible toilets and charging points are managed by wristband and one-in-one-out when full.'],
            ['Ground viewing areas', 'For customers needing a less crowded area or short seated rest; only the customer and approved companion/friend should access.'],
            ['Assistance dogs', 'Spending areas are available in Accessible Campsites, behind Apex Accessible Viewing Area and in District X. Do not distract or feed the dog.'],
            ['Vehicle curfew', 'Curfews protect people leaving the arena and may affect internal transport. Escalate welfare issues instead of telling customers to walk.'],
            ['Harassment / discrimination', 'Download has a zero-tolerance approach. Preserve privacy, call supervisor or welfare and record the factual complaint.'],
          ]}
          dense
        />
      </Panel>

      <div className="emp-radio-one-two-col">
        <Panel title="Supervisor Watch Points">
          <BulletList
            items={[
              'Queue walks: check pain, fatigue, overheating, panic, faintness and water/seating visibility.',
              'Toilets: monitor misuse, sanitation faults, JCW wristband demand and companion access needs.',
              'Campsites: keep fire lanes, trackway, hard standing and buggy routes clear.',
              'Search lanes: chair available, clear male/female process and supervisor route for medication issues.',
            ]}
          />
        </Panel>
        <Panel title="After-Shift Handover">
          <BulletList
            items={[
              'Unresolved access issues or repeated complaint themes.',
              'Toilet, sanitation, trackway, transport or signage faults.',
              'Medication, food/drink, search refusal or prohibited-item disputes.',
              'Any discrimination allegation, safeguarding concern or customer requiring continued support.',
            ]}
          />
        </Panel>
      </div>

      <Panel title="Record and Escalate">
        <MiniTable
          columns={['Issue', 'Record / escalation point']}
          rows={[
            ['Discrimination or harassment allegation', 'Call supervisor or welfare, preserve privacy, record the stated concern and avoid debating the allegation at the post.'],
            ['Medication, food/drink or larger access bag dispute', 'Record the item, evidence checked, supervisor decision and whether Accessibility Team or medical was consulted.'],
            ['Transport, route or toilet failure', 'Log exact location, time reported, who was called and the alternative route or facility offered.'],
            ['Customer unable to safely queue', 'Record seating, privacy, slower process, welfare/medical call or Accessibility Team escalation offered.'],
          ]}
          dense
        />
      </Panel>
    </BriefPage>
  )
}

function DownloadAccessibilityDosDontsPage({ pack }: { pack: SecurityBriefPack }) {
  return (
    <BriefPage pageNumber={6} pack={pack}>
      <Panel title="Accessibility Do's and Don'ts - Quick Reference">
        <p className="emp-radio-one-warning-line">
          Enforce rules lawfully, consistently and with reasonable adjustment. Staff should stay inside policy, document and escalate.
        </p>
      </Panel>

      <div className="emp-radio-one-two-col">
        <Panel title="Do">
          <BulletList
            items={[
              'Use person-first, calm language and ask what support is needed.',
              'Offer privacy, time, a quieter space and supervisor support before the queue becomes congested.',
              'Protect accessible routes as operational routes, not optional convenience routes.',
              'Let customers explain medication, equipment, sensory needs or hidden disability without public challenge.',
              'Escalate uncertainty rather than guessing or refusing.',
            ]}
          />
        </Panel>
        <Panel title="Don't">
          <BulletList
            items={[
              'Do not assume visible mobility is the only accessibility need.',
              'Do not move wheelchairs, mobility aids, medication or assistance equipment without permission.',
              'Do not separate a vulnerable guest from their support person unless directed for safety.',
              'Do not promise outcomes that Event Control, welfare, medical or accessibility must decide.',
              'Do not allow banter, impatience or queue demand to affect dignity.',
            ]}
          />
        </Panel>
      </div>

      <Panel title="Supervisor Briefing Prompts">
        <MiniTable
          columns={['Prompt', 'Local note']}
          rows={[
            ['Search privacy point confirmed', ''],
            ['Accessible route width and buggy path checked', ''],
            ['Medication / medical-equipment escalation route confirmed', ''],
            ['Welfare, medical, safeguarding and accessibility radio route confirmed', ''],
            ['Staff reminded: pause, protect dignity, escalate uncertainty', ''],
          ]}
          dense
        />
      </Panel>

      <Panel title="Complaint Handling Model - LISTEN">
        <MiniTable
          columns={['Step', 'Staff action']}
          rows={[
            ['Listen', 'Let the person explain without interrupting and keep tone calm.'],
            ['Identify', 'Ask what support is needed right now, not for private diagnosis details.'],
            ['State', 'Explain what you can do: supervisor, Accessibility Team, medic, welfare, seating or privacy.'],
            ['Tell the truth', 'Do not promise an outcome, wait time, pitch, platform space or access decision you cannot authorise.'],
            ['Escalate', 'Call supervisor or Accessibility Team for discrimination, urgent access, medical, welfare or safety issues.'],
            ['Note it', 'Record time, location, wristband type if relevant, issue, action, supervisor called and outcome.'],
          ]}
          dense
        />
      </Panel>

      <Panel title="Frequently Asked Best Answers">
        <MiniTable
          columns={['Customer says', 'Best answer']}
          rows={[
            ['I do not look disabled', 'I am not questioning your disability. I only need to check the correct wristband or approval for this facility, then I will help you through.'],
            ['Everyone else is queuing', 'Some customers have urgent access needs, including non-visible conditions. We manage this facility under the festival accessibility policy.'],
            ['My bag is bigger than A4', 'Access customers may have one larger accessibility bag. I still need to search it, but I will not refuse it just because it is larger.'],
            ['I need medication in the arena', 'Prescription medication may be permitted when it meets festival requirements. I will check evidence and call a supervisor if needed.'],
            ['I am being discriminated against', 'I am going to call a supervisor or Accessibility Team now so this can be dealt with properly, and I will make a note of what you have told me.'],
          ]}
          dense
        />
      </Panel>

      <Panel title="Quick Staff Briefing Script">
        <BulletList
          items={[
            'Many disabilities are not visible. Check the relevant wristband, approval or route, then help.',
            'Searches still apply, but they can be seated, slower, private, explained step by step or completed by a requested male/female searcher.',
            'Medication, medical equipment, food/drink for medical reasons and larger accessibility bags must be checked through policy, not guessed at lane level.',
            'Toilet access is a high-risk complaint area: respect JCW wristbands, urgent needs, essential companions and sanitation faults.',
            'If someone mentions pain, overwhelm, discrimination, urgent toilet access, medication, welfare or inability to queue, escalate early and log it.',
          ]}
        />
      </Panel>
    </BriefPage>
  )
}

function ActionSummaryPage({ pack, pageNumber }: { pack: SecurityBriefPack; pageNumber: number }) {
  return (
    <BriefPage pageNumber={pageNumber} pack={pack}>
      <div className="emp-radio-one-action-grid">
        <ActionCard title="1. Queue Control">
          <BulletList
            items={pack.queueControlItems}
          />
        </ActionCard>

        <ActionCard title={pack.licensingTitle}>
          <BulletList
            items={pack.licensingItems}
          />
        </ActionCard>

        <ActionCard title="3. Incident Call Format">
          <p className="emp-radio-one-radio-call">
            {pack.incidentCallFormat}
          </p>
          <BulletList
            items={pack.incidentItems}
          />
        </ActionCard>

        <ActionCard title="4. Safeguarding and Welfare">
          <p>
            {pack.safeguardingIntro}
          </p>
          <ol className="emp-radio-one-numbered">
            {pack.safeguardingSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </ActionCard>

        <ActionCard title="5. Counter-Terrorism / ACT / SCaN" className="emp-radio-one-ct-card">
          <div className="emp-radio-one-ct-visual-grid">
            <div className="emp-radio-one-ct-visual emp-radio-one-rht-poster">
              <img
                src="/emp-assets/run-hide-tell-poster.png"
                alt="Run Hide Tell counter terrorism poster"
              />
            </div>
            <div className="emp-radio-one-ct-visual emp-radio-one-remove-poster">
              <img
                src="/emp-assets/ior-remove-poster.jpg"
                alt="Remove Remove Remove hazardous substance poster"
              />
            </div>
          </div>
          <MiniTable
            columns={['Concern', 'Action']}
            rows={pack.ctRows}
            dense
          />
        </ActionCard>

        <ActionCard title="6. Emergency Alert States" className="emp-radio-one-alert-card">
          <MiniTable
            columns={['State', 'Meaning', 'KSS action']}
            rows={pack.alertRows}
            dense
          />
        </ActionCard>
      </div>
    </BriefPage>
  )
}

function CloseDownPage({ pack, pageNumber }: { pack: SecurityBriefPack; pageNumber: number }) {
  return (
    <BriefPage pageNumber={pageNumber} pack={pack}>
      <Panel title="Daily Close-down Checklist">
        <CheckList
          items={pack.closeDownChecklist}
        />
      </Panel>

      <Panel title="Supervisor Debrief Capture">
        <MiniTable
          columns={['Debrief item', 'Notes']}
          rows={pack.debriefRows}
          dense
        />
      </Panel>

      <Panel title="Supervisor / Staff Notes" className="emp-radio-one-notes-panel">
        <div className="emp-radio-one-note-lines">
          {Array.from({ length: 7 }).map((_, index) => (
            <span key={`note-line-${index}`} />
          ))}
        </div>
        <p>{pack.notesPrompt}</p>
      </Panel>
    </BriefPage>
  )
}

function renderBriefPage(pageNumber: SecurityBriefPageNumber, pack: SecurityBriefPack) {
  if (pack.pageCount === 8) {
    switch (pageNumber) {
      case 1:
        return <PageOne pack={pack} />
      case 2:
        return <PageTwo pack={pack} />
      case 3:
        return <DownloadAccessibilitySearchPage pack={pack} />
      case 4:
        return <DownloadCampsiteSupportPage pack={pack} />
      case 5:
        return <DownloadAreaTaskCardsPage pack={pack} />
      case 6:
        return <DownloadAccessibilityDosDontsPage pack={pack} />
      case 7:
        return <ActionSummaryPage pack={pack} pageNumber={7} />
      case 8:
        return <CloseDownPage pack={pack} pageNumber={8} />
    }
  }

  switch (pageNumber) {
    case 1:
      return <PageOne pack={pack} />
    case 2:
      return <PageTwo pack={pack} />
    case 3:
      return <ActionSummaryPage pack={pack} pageNumber={3} />
    default:
      return <CloseDownPage pack={pack} pageNumber={4} />
  }
}

function BookletSheet({
  sideLabel,
  leftPage,
  rightPage,
  pack,
}: {
  sideLabel: string
  leftPage: SecurityBriefPageNumber
  rightPage: SecurityBriefPageNumber
  pack: SecurityBriefPack
}) {
  return (
    <section className="emp-radio-one-booklet-sheet" aria-label={sideLabel}>
      <div className="emp-radio-one-booklet-slot emp-radio-one-booklet-slot--left">
        {renderBriefPage(leftPage, pack)}
      </div>
      <div className="emp-radio-one-booklet-slot emp-radio-one-booklet-slot--right">
        {renderBriefPage(rightPage, pack)}
      </div>
    </section>
  )
}

function EventWeekSecurityBriefBooklet({
  layout = 'booklet',
  pack,
}: {
  layout?: RadioOneBriefLayout
  pack: SecurityBriefPack
}) {
  if (layout === 'booklet') {
    if (pack.pageCount === 8) {
      return (
        <div className="emp-radio-one-booklet-content">
          <BookletSheet sideLabel="Outer booklet spread one" leftPage={8} rightPage={1} pack={pack} />
          <BookletSheet sideLabel="Inner booklet spread one" leftPage={2} rightPage={7} pack={pack} />
          <BookletSheet sideLabel="Outer booklet spread two" leftPage={6} rightPage={3} pack={pack} />
          <BookletSheet sideLabel="Inner booklet spread two" leftPage={4} rightPage={5} pack={pack} />
        </div>
      )
    }

    return (
      <div className="emp-radio-one-booklet-content">
        <BookletSheet sideLabel="Outside booklet spread" leftPage={4} rightPage={1} pack={pack} />
        <BookletSheet sideLabel="Inside booklet spread" leftPage={2} rightPage={3} pack={pack} />
      </div>
    )
  }

  return (
    <>
      {Array.from({ length: pack.pageCount }).map((_, pageIndex) =>
        renderBriefPage((pageIndex + 1) as SecurityBriefPageNumber, pack)
      )}
    </>
  )
}

export function RadioOneDailySecurityBriefBooklet({
  layout = 'booklet',
}: {
  layout?: RadioOneBriefLayout
}) {
  return <EventWeekSecurityBriefBooklet layout={layout} pack={RADIO_ONE_SECURITY_BRIEF_PACK} />
}

export function DownloadFestivalSecurityBriefBooklet({
  layout = 'booklet',
}: {
  layout?: RadioOneBriefLayout
}) {
  return <EventWeekSecurityBriefBooklet layout={layout} pack={DOWNLOAD_FESTIVAL_SECURITY_BRIEF_PACK} />
}
