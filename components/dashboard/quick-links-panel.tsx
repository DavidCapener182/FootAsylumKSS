import Link from 'next/link'
import { CheckSquare, ChevronRight, ClipboardList, Flame, Route } from 'lucide-react'

import { Panel } from './panel'

export function QuickLinksPanel() {
  const links = [
    { href: '/audit-tracker', title: 'Compliance Audits', description: 'Manage store audits', icon: ClipboardList },
    { href: '/fire-risk-assessment', title: 'Fire Risk Assessments', description: 'Manage FRAs', icon: Flame },
    { href: '/actions', title: 'Actions', description: 'View and manage actions', icon: CheckSquare },
    { href: '/route-planning', title: 'Route Planning', description: 'Plan and manage visits', icon: Route },
  ]

  return (
    <Panel title="Quick Links" icon={ChevronRight}>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} prefetch={false} className="group rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-lime-300 hover:bg-lime-50/40">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-50 text-lime-700 transition-colors group-hover:bg-lime-100">
                  <Icon className="h-5 w-5" />
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-lime-700" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-900">{link.title}</p>
              <p className="mt-1 text-xs text-slate-500">{link.description}</p>
            </Link>
          )
        })}
      </div>
    </Panel>
  )
}
