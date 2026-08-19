import Link from 'next/link'
import { CalendarClock, FileCheck2, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { PageHeader } from '@/components/product'
import { Button } from '@/components/ui/button'

const governance = [
  { label: 'Policy owner', value: 'To be confirmed', icon: UserRoundCheck },
  { label: 'Approval status', value: 'Pending formal approval', icon: FileCheck2 },
  { label: 'Current draft date', value: '5 March 2026', icon: CalendarClock },
  { label: 'Next review date', value: 'To be confirmed on approval', icon: CalendarClock },
]

export default async function PrivacyPage() {
  await requireAuth()
  return (
    <div className="space-y-4 pb-8 sm:space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Privacy and data protection"
        description="How personal and operational data is used, controlled and retained in the KSS x Footasylum platform."
        breadcrumbs={[{ label: 'Today', href: '/dashboard' }, { label: 'Privacy' }]}
        primaryAction={<Button asChild className="min-h-[44px]"><Link href="/privacy/gdpr">Read detailed GDPR policy</Link></Button>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Policy governance status">
        {governance.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Icon className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
            </article>
          )
        })}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-amber-950">Draft governance status</h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">The detailed policy exists as working platform guidance, but the repository does not identify a formally approved owner, approval date, next review date or downloadable approved copy. Those fields remain explicitly unconfirmed rather than being guessed.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {[
          ['Use only what is needed', 'Keep free text factual, relevant and proportionate to the operational purpose.'],
          ['Share by role and need', 'Confirm the recipient and export scope before downloading or sharing a report.'],
          ['Escalate concerns promptly', 'Report suspected unauthorised access or personal-data disclosure through the incident and admin process.'],
        ].map(([title, description]) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
