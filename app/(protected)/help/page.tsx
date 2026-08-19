import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  CheckSquare2,
  ClipboardCheck,
  FileWarning,
  Flame,
  LifeBuoy,
  Map,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { PageHeader } from '@/components/product'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type HelpGuide = {
  id: string
  title: string
  summary: string
  icon: LucideIcon
  audience: string
  steps: string[]
  links: Array<{ label: string; href: string }>
}

const HELP_GUIDES: HelpGuide[] = [
  {
    id: 'getting-started',
    title: 'Getting started by role',
    summary: 'Understand what Admin, Ops, Readonly and Client access allows before you begin.',
    icon: ShieldCheck,
    audience: 'All users',
    steps: [
      'Use Today for the work that needs attention now.',
      'Admin users manage invitations and access; Ops users complete operational work.',
      'Readonly and Client accounts can view only the records permitted by their role.',
      'If a page is unavailable, ask an administrator to verify your account status and role.',
    ],
    links: [{ label: 'Open Today', href: '/dashboard' }],
  },
  {
    id: 'audits',
    title: 'Conducting an audit',
    summary: 'Start or resume a SafeHub audit, add evidence and complete required questions.',
    icon: ClipboardCheck,
    audience: 'Admin and Ops',
    steps: [
      'Confirm the correct store and audit template before starting.',
      'Answer every required question and add factual notes where a check fails.',
      'Attach the required evidence and review missing requirements before submission.',
      'Use Audit Tracker to review history, follow-up actions and exported SafeHub history.',
    ],
    links: [
      { label: 'Open SafeHub', href: '/audit-lab' },
      { label: 'Open Audit Tracker', href: '/audit-tracker' },
    ],
  },
  {
    id: 'fra',
    title: 'Completing a fire risk assessment',
    summary: 'Capture premises facts, findings, evidence, actions and sign-off in the FRA workspace.',
    icon: Flame,
    audience: 'Admin and Ops',
    steps: [
      'Verify the premises, responsible person and occupancy details.',
      'Work through hazards, escape, detection, lighting, equipment and management controls.',
      'Create a finding and corrective action for every unresolved risk.',
      'Review mandatory fields and the document preview before final sign-off.',
    ],
    links: [{ label: 'Open FRA workspace', href: '/fire-risk-assessment' }],
  },
  {
    id: 'incidents',
    title: 'Reporting an incident',
    summary: 'Create a factual record, complete RIDDOR screening and add evidence without duplication.',
    icon: AlertTriangle,
    audience: 'Admin and Ops',
    steps: [
      'For immediate danger, follow the emergency procedure first; do not rely on this platform for emergency response.',
      'Confirm where and when the incident occurred and select the correct category and severity.',
      'Record facts only, complete the RIDDOR screening outcome and review the submission.',
      'Open the case after submission to assign an investigator, add evidence and track the next action.',
    ],
    links: [
      { label: 'Report an incident', href: '/incidents/new' },
      { label: 'Open incident queue', href: '/incidents' },
    ],
  },
  {
    id: 'actions',
    title: 'Managing corrective actions',
    summary: 'Prioritise assigned work, add evidence and record completion accurately.',
    icon: CheckSquare2,
    audience: 'Admin and Ops',
    steps: [
      'Start with overdue and high-priority work assigned to you.',
      'Read the required correction and store context before changing status.',
      'Add completion evidence and a concise factual note.',
      'Only mark work complete when the correction has actually been carried out.',
    ],
    links: [{ label: 'Open Actions', href: '/actions' }],
  },
  {
    id: 'routes',
    title: 'Planning and completing a route',
    summary: 'Build a feasible visit sequence on desktop and use the published route in the field.',
    icon: Map,
    audience: 'Admin and Ops',
    steps: [
      'Filter eligible stores by manager, area, risk and due date.',
      'Check travel time, visit duration and working-day constraints before publishing.',
      'On mobile, use Today and Routes for the day’s stops and navigation.',
      'Record delays, skipped stops and completion reasons rather than silently changing the route.',
    ],
    links: [
      { label: 'Open Routes', href: '/route-planning' },
      { label: 'Open Calendar', href: '/calendar' },
    ],
  },
  {
    id: 'event-day',
    title: 'Event-day controls',
    summary: 'Use the live event workspace and kiosk without exposing unnecessary staff information.',
    icon: FileWarning,
    audience: 'Administrators and event controllers',
    steps: [
      'Confirm the event, operational date and named controller before opening access.',
      'Generate a time-limited kiosk token and distribute its PIN separately.',
      'Use the control log for timestamped decisions, incidents and handovers.',
      'Revoke kiosk access at close or immediately if the token or PIN may be compromised.',
    ],
    links: [{ label: 'Open Event Day', href: '/admin/event-day' }],
  },
  {
    id: 'uploads',
    title: 'Troubleshooting uploads',
    summary: 'Recover from an interrupted evidence upload without creating duplicate records.',
    icon: Upload,
    audience: 'All operational users',
    steps: [
      'Keep the record open until the upload shows as saved to the platform.',
      'If offline, retain the original file and wait for a clear synchronisation confirmation.',
      'Retry once after reconnecting; check the evidence list before selecting the file again.',
      'If the failure continues, record the route, time, file type and error message in a bug report.',
    ],
    links: [{ label: 'Open incident queue', href: '/incidents' }],
  },
]

function normalizedQuery(value: string | string[] | undefined) {
  return String(Array.isArray(value) ? value[0] : value || '').trim().toLowerCase()
}

export default async function HelpPage({ searchParams }: { searchParams?: { q?: string | string[] } }) {
  await requireAuth()
  const query = normalizedQuery(searchParams?.q)
  const guides = query
    ? HELP_GUIDES.filter((guide) => `${guide.title} ${guide.summary} ${guide.audience} ${guide.steps.join(' ')}`.toLowerCase().includes(query))
    : HELP_GUIDES

  return (
    <div className="space-y-4 pb-8 sm:space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Help Centre"
        description="Task-focused guidance for audits, FRAs, incidents, actions, routes and event-day work."
        breadcrumbs={[{ label: 'Today', href: '/dashboard' }, { label: 'Help Centre' }]}
      />

      <form action="/help" method="get" role="search" className="border-y border-slate-200 bg-white p-4 sm:rounded-2xl sm:border">
        <label htmlFor="help-search" className="text-sm font-semibold text-slate-900">Search help</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input id="help-search" name="q" type="search" defaultValue={query} placeholder="Try incident, upload, route…" className="min-h-[44px] pl-9" />
          </div>
          <Button type="submit" className="min-h-[44px]">Search</Button>
          {query ? <Button asChild type="button" variant="outline" className="min-h-[44px]"><Link href="/help">Clear</Link></Button> : null}
        </div>
      </form>

      {guides.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {guides.map((guide) => {
            const Icon = guide.icon
            return (
              <details id={guide.id} key={guide.id} className="group scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm open:ring-2 open:ring-slate-200">
                <summary className="flex min-h-[88px] cursor-pointer list-none items-start gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-slate-950">{guide.title}</span>
                    <span className="mt-1 block text-sm leading-5 text-slate-600">{guide.summary}</span>
                    <span className="mt-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{guide.audience}</span>
                  </span>
                  <span className="mt-1 text-xl leading-none text-slate-400 group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <div className="border-t border-slate-100 px-4 pb-4 pt-4">
                  <ol className="space-y-3">
                    {guide.steps.map((step, index) => (
                      <li key={step} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2 text-sm leading-6 text-slate-700">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{index + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {guide.links.map((link) => <Button key={link.href} asChild variant="outline" className="min-h-[44px]"><Link href={link.href}>{link.label}</Link></Button>)}
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Search className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-slate-900">No guide matched “{query}”</h2>
          <p className="mt-1 text-sm text-slate-600">Try a task name such as audit, incident, route or upload.</p>
        </div>
      )}

      <section id="product-feedback" className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold"><LifeBuoy className="h-5 w-5" aria-hidden="true" /> Still need help?</div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Contact your platform administrator for access or data questions. For a reproducible product issue, use “Report a Bug” in the navigation and include the route, device, time and exact error.</p>
          </div>
          <Button asChild variant="outline" className="min-h-[44px] border-white/30 bg-white text-slate-900 hover:bg-slate-100"><Link href="/privacy">Privacy information</Link></Button>
        </div>
      </section>
    </div>
  )
}
