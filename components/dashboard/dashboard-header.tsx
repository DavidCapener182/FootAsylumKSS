import { Bell, CalendarDays, Download, Search } from 'lucide-react'

export function DashboardHeader({
  onGenerateReport,
  reportLoading,
}: {
  onGenerateReport: () => void
  reportLoading: boolean
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Main Dashboard</h1>
        <p className="mt-1 hidden text-sm text-slate-500 sm:block">
          Live view of audit progress, fire risk assessment status, actions and planned compliance visits.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-3">
        <label className="relative col-span-2 min-w-0 sm:col-span-1 sm:w-64">
          <span className="sr-only">Search dashboard</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-lime-300 focus:ring-2 focus:ring-lime-100"
          />
        </label>

        <button type="button" className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:text-sm">
          <CalendarDays className="h-4 w-4 flex-shrink-0 text-slate-500" />
          <span className="truncate">This Month</span>
        </button>

        <button
          type="button"
          onClick={onGenerateReport}
          disabled={reportLoading}
          className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
        >
          <Download className="h-4 w-4 flex-shrink-0" />
          <span className="truncate sm:hidden">{reportLoading ? 'Generating...' : 'Summary'}</span>
          <span className="hidden sm:inline">{reportLoading ? 'Generating...' : 'Generate Summary'}</span>
        </button>

        <button
          type="button"
          className="relative hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 sm:inline-flex"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-lime-400 ring-2 ring-white" />
        </button>

        <div className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 shadow-sm sm:inline-flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-100 text-xs font-bold text-lime-700">DC</span>
          <span className="hidden text-sm font-semibold text-slate-700 sm:inline">David Capener</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Ops</span>
        </div>
      </div>
    </div>
  )
}
