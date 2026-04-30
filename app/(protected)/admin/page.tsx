import { requireRole } from '@/lib/auth'
import { AdminClient } from '@/components/admin/admin-client'

export default async function AdminPage() {
  await requireRole(['admin'])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Manage user roles and permissions. Only accessible to administrators.
        </p>
      </div>

      {/* Admin Tools */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-lg sm:border-red-200 sm:bg-red-50 sm:p-4 sm:shadow-none">
          <h2 className="mb-2 text-base font-semibold text-slate-900 sm:text-lg sm:text-red-900">Bug Tracking</h2>
          <p className="mb-4 text-sm text-slate-600 sm:mb-3 sm:text-red-700">
            View and manage user-submitted bug reports, feature requests, and feedback.
          </p>
          <a
            href="/admin/bugs"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:min-h-0 sm:w-auto sm:rounded-md sm:bg-red-600 sm:px-4 sm:py-2 sm:hover:bg-red-700"
          >
            Open Bug Tracker
          </a>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-lg sm:border-purple-200 sm:bg-purple-50 sm:p-4 sm:shadow-none">
          <h2 className="mb-2 text-base font-semibold text-slate-900 sm:text-lg sm:text-purple-900">Release Notes</h2>
          <p className="mb-4 text-sm text-slate-600 sm:mb-3 sm:text-purple-700">
            Create, edit, and publish release notes. Users see the latest active release on login.
          </p>
          <a
            href="/admin/releases"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:min-h-0 sm:w-auto sm:rounded-md sm:bg-purple-600 sm:px-4 sm:py-2 sm:hover:bg-purple-700"
          >
            Manage Releases
          </a>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-lg sm:border-blue-200 sm:bg-blue-50 sm:p-4 sm:shadow-none">
          <h2 className="mb-2 text-base font-semibold text-slate-900 sm:text-lg sm:text-blue-900">SafeHub</h2>
          <p className="mb-4 text-sm text-slate-600 sm:mb-3 sm:text-blue-700">
            Safety Culture-style audit pages for templates, execution, and compliance tracking.
          </p>
          <a
            href="/audit-lab"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:min-h-0 sm:w-auto sm:rounded-md sm:bg-blue-600 sm:px-4 sm:py-2 sm:hover:bg-blue-700"
          >
            Open SafeHub
          </a>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-lg sm:border-emerald-200 sm:bg-emerald-50 sm:p-4 sm:shadow-none">
          <h2 className="mb-2 text-base font-semibold text-slate-900 sm:text-lg sm:text-emerald-900">Crowd Management Plans</h2>
          <p className="mb-4 text-sm text-slate-600 sm:mb-3 sm:text-emerald-700">
            Admin-only KSS workspace for crowd management and security operations plans.
          </p>
          <a
            href="/admin/crowd-management-plans"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:min-h-0 sm:w-auto sm:rounded-md sm:bg-emerald-600 sm:px-4 sm:py-2 sm:hover:bg-emerald-700"
          >
            Open CMP Workspace
          </a>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-lg sm:border-emerald-200 sm:bg-emerald-50 sm:p-4 sm:shadow-none">
          <h2 className="mb-2 text-base font-semibold text-slate-900 sm:text-lg sm:text-emerald-900">Event Management Plans</h2>
          <p className="mb-4 text-sm text-slate-600 sm:mb-3 sm:text-emerald-700">
            Admin-only KSS workspace for site-specific event operations plans.
          </p>
          <a
            href="/admin/event-management-plans"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:min-h-0 sm:w-auto sm:rounded-md sm:bg-emerald-600 sm:px-4 sm:py-2 sm:hover:bg-emerald-700"
          >
            Open EMP Workspace
          </a>
        </div>
      </div>

      <AdminClient />
    </div>
  )
}
