import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { AuditLabClient, type AuditLabInitialTab, type AuditLabInitialView } from '@/components/admin/audit-lab-client'

const sections = [
  ['/audit-lab/templates', 'Templates'], ['/audit-lab/conduct', 'Conduct'], ['/audit-lab/active', 'Active'],
  ['/audit-lab/review', 'Review'], ['/audit-lab/insights', 'Insights'], ['/audit-lab/import', 'Import'],
] as const

export async function AuditLabWorkspace({ initialTab, initialView = 'templates', activeHref }: { initialTab: AuditLabInitialTab; initialView?: AuditLabInitialView; activeHref: string }) {
  await requireRole(['admin', 'ops'])
  return <div className="min-h-[calc(100dvh-var(--mobile-header-height,0px))] max-w-full overflow-x-hidden bg-slate-50 md:min-h-screen"><header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4"><div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Sparkles className="h-5 w-5" /></div><div><h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">SafeHub</h1><p className="hidden text-sm text-slate-500 sm:block">Build, conduct, review and improve assurance audits.</p></div></div><nav aria-label="SafeHub workspaces" className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1">{sections.map(([href, label]) => <Link key={href} href={href} className={`min-h-[44px] whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold ${activeHref === href ? 'bg-violet-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</Link>)}</nav></header><div className="max-w-full overflow-x-hidden px-3 py-3 pb-28 sm:px-6 sm:py-5 sm:pb-5 lg:px-8"><AuditLabClient initialTab={initialTab} initialView={initialView} /></div></div>
}
