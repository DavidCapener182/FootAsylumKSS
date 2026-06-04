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
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} prefetch={false} className="group min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 transition-colors hover:border-lime-300 hover:bg-lime-50/40 sm:rounded-2xl sm:p-4">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lime-50 text-lime-700 transition-colors group-hover:bg-lime-100 sm:h-10 sm:w-10">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-lime-700 sm:h-4 sm:w-4" />
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-bold leading-tight text-slate-900 sm:mt-3 sm:text-sm">{link.title}</p>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block">{link.description}</p>
            </Link>
          )
        })}
      </div>
    </Panel>
  )
}
