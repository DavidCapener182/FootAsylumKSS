import { requireRole } from '@/lib/auth'
import { AdminClient } from '@/components/admin/admin-client'

export default async function AdminPage() {
  await requireRole(['admin'])

  return (
    <div className="space-y-3 md:px-6 md:py-5 lg:px-8 sm:space-y-6">
      <div className="workspace-intro rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h1 className="workspace-title text-xl font-bold tracking-tight sm:text-3xl">User Management</h1>
        <p className="mt-1 hidden text-sm text-muted-foreground sm:mt-2 sm:block sm:text-base">
          Manage user roles and permissions. Only accessible to administrators.
        </p>
      </div>

      {/* Admin Tools */}
      <div className="workspace-tool-grid grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="workspace-feature rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-lg sm:border-blue-200 sm:bg-blue-50 sm:p-4 sm:shadow-none">
          <h2 className="mb-1 text-sm font-semibold text-slate-900 sm:mb-2 sm:text-lg sm:text-blue-900">SafeHub</h2>
          <p className="mb-3 text-sm text-slate-600 sm:block sm:text-blue-700">
            Safety Culture-style audit pages for templates, execution, and compliance tracking.
          </p>
          <a
            href="/audit-lab"
            className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 sm:min-h-0 sm:w-auto sm:rounded-md sm:bg-blue-600 sm:px-4 sm:text-sm sm:hover:bg-blue-700"
          >
            Open SafeHub
          </a>
        </div>

        <div className="workspace-feature workspace-feature-lime rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-lg sm:border-emerald-200 sm:bg-emerald-50 sm:p-4 sm:shadow-none">
          <h2 className="mb-1 text-sm font-semibold text-slate-900 sm:mb-2 sm:text-lg sm:text-emerald-900">Event Management Plans</h2>
          <p className="mb-3 text-sm text-slate-600 sm:block sm:text-emerald-700">
            Admin-only KSS workspace for site-specific event operations plans.
          </p>
          <a
            href="/admin/event-management-plans"
            className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 sm:min-h-0 sm:w-auto sm:rounded-md sm:bg-emerald-600 sm:px-4 sm:text-sm sm:hover:bg-emerald-700"
          >
            Open EMP Workspace
          </a>
        </div>

      </div>

      <AdminClient />
    </div>
  )
}
