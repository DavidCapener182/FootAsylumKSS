import { requireRole } from '@/lib/auth'
import { BugTable } from '@/components/BugTable'

export default async function AdminBugsPage() {
  await requireRole(['admin'])

  return (
    <div className="space-y-3 md:px-6 md:py-5 lg:px-8 sm:space-y-6">
      <div className="workspace-feature rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
        <h1 className="workspace-title text-xl font-bold tracking-tight sm:text-3xl">Bug Tracking</h1>
        <p className="mt-2 hidden text-sm text-muted-foreground sm:block sm:text-base">
          View and manage user-submitted bug reports, feature requests, and feedback.
        </p>
      </div>
      <BugTable />
    </div>
  )
}
