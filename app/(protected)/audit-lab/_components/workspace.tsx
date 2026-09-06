import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { AuditLabClient, type AuditLabInitialTab, type AuditLabInitialView } from '@/components/admin/audit-lab-client'

const sections = [
  ['/audit-lab/templates', 'Templates'], ['/audit-lab/conduct', 'Conduct'], ['/audit-lab/active', 'Active'],
  ['/audit-lab/review', 'Review'], ['/audit-lab/insights', 'Insights'], ['/audit-lab/import', 'Import'],
] as const

const introductions: Record<string, [string, string]> = {
  '/audit-lab/templates': ['Better checks. Clearer evidence.', 'Create and maintain the templates your team uses to check each store.'],
  '/audit-lab/conduct': ['Ready for the next check.', 'Choose a template and record the findings, evidence and follow-up work.'],
  '/audit-lab/active': ['Keep each audit moving.', 'Pick up audits in progress and continue the work already recorded.'],
  '/audit-lab/review': ['Turn findings into follow-up.', 'Review completed audits and the evidence behind each result.'],
  '/audit-lab/insights': ['See the bigger picture.', 'Explore audit performance and identify where to focus next.'],
  '/audit-lab/import': ['Bring your records together.', 'Import existing audit records using the supported formats below.'],
}

export async function AuditLabWorkspace({ initialTab, initialView = 'templates', activeHref }: { initialTab: AuditLabInitialTab; initialView?: AuditLabInitialView; activeHref: string }) {
  await requireRole(['admin', 'ops'])
  const [title, description] = introductions[activeHref] || introductions['/audit-lab/templates']
  return (
    <div className="workspace-safehub space-y-6 md:px-6 md:py-5 lg:px-8">
      <header className="workspace-intro"><p className="workspace-eyebrow">ASSURANCE WORKSPACE</p><h1 className="workspace-title mt-2">SafeHub</h1></header>
      <section className="workspace-feature flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center md:p-8">
        <div><h2>{title}</h2><p className="mt-3 max-w-2xl text-sm leading-6">{description}</p></div>
        <Link href="/audit-tracker" className="inline-flex min-h-[44px] shrink-0 items-center gap-3 text-sm font-semibold text-lime-300">Audit tracker <ArrowUpRight size={16} /></Link>
      </section>
      <nav aria-label="SafeHub workspaces" className="workspace-route-tabs flex gap-2 overflow-x-auto pb-1">
        {sections.map(([href, label]) => <Link key={href} href={href} aria-current={activeHref === href ? 'page' : undefined} className="min-h-[44px] whitespace-nowrap rounded-lg px-4 py-3 text-sm font-semibold">{label}</Link>)}
      </nav>
      <AuditLabClient initialTab={initialTab} initialView={initialView} embedded />
    </div>
  )
}
