import { Bell, CalendarDays, Download, Search } from 'lucide-react'

export function DashboardHeader({
  onGenerateReport,
  reportLoading,
}: {
  onGenerateReport: () => void
  reportLoading: boolean
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Main Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Live view of audit progress, fire risk assessment status, actions and planned compliance visits.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
        <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          This Month
        </button>

        <label className="relative min-w-0 sm:w-64">
          <span className="sr-only">Search dashboard</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-lime-300 focus:ring-2 focus:ring-lime-100"
          />
        </label>

        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-lime-400 ring-2 ring-white" />
        </button>

        <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 shadow-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-100 text-xs font-bold text-lime-700">DC</span>
          <span className="hidden text-sm font-semibold text-slate-700 sm:inline">David Capener</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Ops</span>
        </div>

        <button
          type="button"
          onClick={onGenerateReport}
          disabled={reportLoading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Download className="h-4 w-4" />
          {reportLoading ? 'Generating...' : 'Generate Summary'}
        </button>
      </div>
    </div>
  )
}
