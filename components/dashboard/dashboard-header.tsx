import { ArrowUpRight, Download } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function DashboardHeader({ onGenerateReport, reportLoading }: {
  onGenerateReport: () => void
  reportLoading: boolean
}) {
  return (
    <div className="dashboard-heading flex flex-wrap items-end justify-between gap-5  px-6 py-7 lg:px-8">
      <div className="max-w-2xl">
        <p className="workspace-eyebrow">KSS × FOOTASYLUM / OPERATIONS</p>
        <h1 className="workspace-title mt-2 text-3xl font-bold text-slate-950">Store overview.</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Every store. Every standard. One clear view.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline"><Link href="/reports">Reports <ArrowUpRight className="h-4 w-4" /></Link></Button>
        <Button onClick={onGenerateReport} disabled={reportLoading}>
          <Download className="h-4 w-4" />{reportLoading ? 'Generating…' : 'Generate Summary'}
        </Button>
      </div>
    </div>
  )
}
