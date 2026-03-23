'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface IncidentBreadcrumbProps {
  referenceNo: string
}

export function IncidentBreadcrumb({ referenceNo }: IncidentBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 overflow-x-auto text-sm text-slate-400">
      <Link
        href="/incidents"
        aria-label="Back to incidents list"
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 font-medium transition-colors hover:bg-slate-100 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
      >
        <ChevronLeft size={14} />
        <span>Back to incidents</span>
      </Link>
      <ChevronRight size={14} />
      <span className="font-medium text-slate-900">{referenceNo}</span>
    </nav>
  )
}
