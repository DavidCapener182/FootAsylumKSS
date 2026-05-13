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
  ['Bar 2', 'V4', 'Supervisor x1, SIA x5, Steward x2', 'High-volume queue pressure'],
  ['Bar 3', 'U6', 'Supervisor x1, SIA x5, Steward x2', 'Changeover pressure, lateral movement'],
  ['Bar 4', 'U7', 'Supervisor x1, SIA x5, Steward x2', 'Challenge 25 pressure, route protection'],
  ['Bar 5', 'O6', 'SIA x1', 'Limited holding space, overspill'],
  ['Bar 6', 'Guest/VIP', 'SIA x1', 'Accreditation/service disputes, refusal conflict'],
]

const RAMP_ROWS = [
  ['Routes', 'Keep emergency, stock, accessible and circulation routes clear.'],
  ['Arrival', 'Demand builds at opening, programme changes and main-stage interest.'],
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

function BriefPage({
  pageNumber,
  children,
}: {
  pageNumber: number
  children: ReactNode
}) {
  return (
    <article className="emp-master-template-page emp-radio-one-brief-page">
      <div className="emp-radio-one-brief-inner">
        <header className="emp-radio-one-brief-header">
          <div className="emp-radio-one-brand-lockup">
            <div className="emp-radio-one-kss-mark" aria-label="KSS NW LTD">
              <img src="/kss-logo.png" alt="KSS NW LTD logo" />
            </div>
          </div>
          <div className="emp-radio-one-brief-title-block">
            <div className="emp-radio-one-kicker">Controlled Bar Security Briefing</div>
            <h1>{DOCUMENT_HEADING}</h1>
            <p className="emp-radio-one-event-title">{EVENT_TITLE}</p>
            <p className="emp-radio-one-subtitle">Event Week KSS Bar Security Brief - {EVENT_WEEK_LABEL}</p>
            <p>Venue: {VENUE_FULL}</p>
          </div>
          <div className="emp-radio-one-bbc-logo-card">
            <img
              src="/emp-assets/bbc-radio-1-big-weekend-sunderland-2026-logo.png"
              alt="BBC Radio 1 Big Weekend Sunderland 2026 logo"
            />
            <span>Event week {EVENT_WEEK_SHORT_LABEL} | Page {pageNumber} of 4</span>
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

function PageOne() {
  return (
    <BriefPage pageNumber={1}>
      <Panel title="Event Week Snapshot">
        <MiniTable columns={['Item', 'Detail']} rows={EVENT_FACTS} dense />
      </Panel>

      <Panel title="Event Week Line-up" className="emp-radio-one-lineup-panel">
        <MiniTable columns={['Day', 'Stage', 'Key acts / presenters']} rows={EVENT_WEEK_LINE_UP_ROWS} dense />
        <p className="emp-radio-one-warning-line">
          Final line-up and set times must be checked against the approved Event Control day sheet before issue.
        </p>
      </Panel>

      <Panel title="Supervisor Opening Script" className="emp-radio-one-script-panel">
        <p>
          &ldquo;Across this event week our job is to keep the bar areas safe, calm and compliant. We control queues,
          protect emergency and accessible routes, support Peppermint with refusals and Challenge 25, spot welfare
          concerns early, and escalate anything serious through the supervisor and Event Control. We do not own
          entrances, search, stages, traffic, CCTV or general arena patrols unless specifically tasked.&rdquo;
        </p>
      </Panel>

      <div className="emp-radio-one-risk-strip">
        <div>
          <strong>Queue pressure</strong>
          <span>Pre-opening, artist changeovers, headline approach and close-down.</span>
        </div>
        <div>
          <strong>Licensing</strong>
          <span>Challenge 25, intoxication, proxy purchasing and refusal conflict.</span>
        </div>
        <div>
          <strong>Welfare and safeguarding</strong>
          <span>Separated young people, vulnerable adults, Ask for Angela, spiking concerns and medical escalation.</span>
        </div>
      </div>
    </BriefPage>
  )
}

function PageTwo() {
  return (
    <BriefPage pageNumber={2}>
      <Panel title="Event Map - Bar Locations and Route Awareness" className="emp-radio-one-map-panel">
        <div className="emp-radio-one-map-frame">
          <img
            src="/emp-assets/r1bw26-site-overview-map-bars-crop.png"
            alt="Radio 1 Big Weekend 2026 site overview map focused on bar locations"
          />
          {MAP_CALLOUTS.map((callout) => (
            <span key={callout.label} className={`emp-map-label ${callout.className}`}>
              {callout.label}
            </span>
          ))}
        </div>
        <p className="emp-radio-one-map-note">
          Confirm live medical/welfare route, emergency exits and accessible route changes against the current Event
          Control day sheet before deployment.
        </p>
      </Panel>

      <Panel title="Bar Queue Management" className="emp-radio-one-queue-panel">
        <p>
          Customer flow, queue dividers, crowd-control barriers, accessible service area, staff access and managed exits
          must be maintained during trading periods.
        </p>
        <div className="emp-radio-one-queue-image">
          <img src="/emp-assets/bar-queue-flow.jpg" alt="Radio 1 bar queue management plan" />
        </div>
        <div className="emp-radio-one-queue-points">
          <span><strong>Lanes:</strong> Accessible / priority lane, managed feeder lane A and managed feeder lane B.</span>
          <span><strong>Controls:</strong> Visible entry point, one-way lane flow, clear exits and refusal support point.</span>
        </div>
      </Panel>

      <Panel title="Bar Deployment" className="emp-radio-one-deployment-panel">
        <MiniTable columns={['Bar', 'Location', 'Staffing model', 'Main risk']} rows={BAR_DEPLOYMENT_ROWS} dense />
      </Panel>

      <div className="emp-radio-one-two-col">
        <Panel title="Crowd Profile and Movement Dynamic">
          <BulletList
            items={[
              'BBC Radio 1 target demographic: 15-24.',
              'Friday and VIP are 18+.',
              'GA under-16s require adult supervision.',
              'Likely bar profile: young adults, VIP/guest customers and mixed-age weekend attendees.',
              'Watch intoxication, proxy purchase, vulnerable persons, separated young people and group behaviour.',
            ]}
          />
        </Panel>
        <Panel title="RAMP Briefing">
          <MiniTable columns={['RAMP', 'Supervisor message']} rows={RAMP_ROWS} dense />
        </Panel>
      </div>
    </BriefPage>
  )
}

function PageThree() {
  return (
    <BriefPage pageNumber={3}>
      <div className="emp-radio-one-action-grid">
        <ActionCard title="1. Queue Control">
          <BulletList
            items={[
              'Keep queue lanes tidy and visible.',
              'Keep accessible, stock and service routes clear.',
              'Monitor queue tail and overspill.',
              'Report route obstruction immediately.',
              'Do not allow unmanaged spillback into public circulation routes.',
              'Supervisor may shorten, reshape or pause entry and request response/Event Control/Peppermint support.',
            ]}
          />
        </ActionCard>

        <ActionCard title="2. Licensing / Challenge 25">
          <BulletList
            items={[
              'Accepted ID: passport, photocard driving licence, PASS-accredited proof-of-age card.',
              'Support Challenge 25, intoxication refusals and refusal logging.',
              'Monitor proxy purchase, false ID and refusal conflict.',
              'Do not argue over ID. Do not make it personal. Support Peppermint, de-escalate and record.',
            ]}
          />
        </ActionCard>

        <ActionCard title="3. Incident Call Format">
          <p className="emp-radio-one-radio-call">
            Control, this is [Bar / Call Sign]. Incident type [refusal / welfare / disorder / medical / suspicious
            item]. Location [bar number and grid]. Assistance required [response / medical / welfare / police].
          </p>
          <BulletList
            items={[
              'Exact location first.',
              'Use plain language and keep radio messages clear.',
              'Serious incidents go through supervisor to Event Control.',
            ]}
          />
        </ActionCard>

        <ActionCard title="4. Safeguarding and Welfare">
          <p>
            Triggers: under-18 concern, distressed or separated person, intoxicated to incapacity, harassment or
            disclosure, Ask for Angela, drink spiking concern, injury or medical concern.
          </p>
          <ol className="emp-radio-one-numbered">
            <li>Move away from queue pressure where safe.</li>
            <li>Keep supervised and inform supervisor.</li>
            <li>Request welfare/medical through Event Control.</li>
            <li>Do not eject vulnerable persons without Event Control/welfare/police direction.</li>
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
            rows={[
              ['Suspicious item', 'Do not touch. Clear immediate area if safe. Report exact bar/grid.'],
              ['Hostile reconnaissance', 'Report person, behaviour, location and direction of travel.'],
              ['Weapons attack', 'Run / Hide / Tell. Do not pursue.'],
              ['Hazardous substance', 'Remove, Remove, Remove. Report when safe.'],
            ]}
            dense
          />
        </ActionCard>

        <ActionCard title="6. Emergency Alert States" className="emp-radio-one-alert-card">
          <MiniTable
            columns={['State', 'Meaning', 'KSS bar action']}
            rows={[
              ['Green', 'Normal operations', 'Maintain queue, licensing, welfare and route monitoring.'],
              ['Amber', 'Raised vigilance', 'Supervisor checks routes, briefs staff and prepares to pause queue/service.'],
              ['Red', 'Confirmed incident / possible evacuation, lockdown or show stop', 'Stop non-essential activity, await Event Control instruction, prepare to clear queues.'],
              ['Black', 'Major incident / emergency services command', 'Follow Event Control/police instruction, protect life safety, report bar status.'],
            ]}
            dense
          />
        </ActionCard>
      </div>
    </BriefPage>
  )
}

function PageFour() {
  return (
    <BriefPage pageNumber={4}>
      <Panel title="Daily Close-down Checklist">
        <CheckList
          items={[
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
          ]}
        />
      </Panel>

      <Panel title="Supervisor Debrief Capture">
        <MiniTable
          columns={['Debrief item', 'Notes']}
          rows={[
            ['Queue performance', ''],
            ['Challenge 25 / refusals', ''],
            ['Intoxication / proxy purchase', ''],
            ['Welfare / safeguarding', ''],
            ['Ejections / disorder', ''],
            ['Prohibited items', ''],
            ['Route or barrier issues', ''],
            ['Staff welfare / breaks', ''],
            ['Actions for next show day / event', ''],
          ]}
          dense
        />
      </Panel>

      <Panel title="Supervisor / Staff Notes" className="emp-radio-one-notes-panel">
        <div className="emp-radio-one-note-lines">
          {Array.from({ length: 7 }).map((_, index) => (
            <span key={`note-line-${index}`} />
          ))}
        </div>
        <p>Return to supervisor/control if used for incident, refusal, welfare or operational notes.</p>
      </Panel>
    </BriefPage>
  )
}

export function RadioOneDailySecurityBriefBooklet() {
  return (
    <>
      <PageOne />
      <PageTwo />
      <PageThree />
      <PageFour />
    </>
  )
}
