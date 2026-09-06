import { requireRole } from '@/lib/auth'
import { ReleaseEditor } from '@/components/ReleaseEditor'

export default async function AdminReleasesPage() {
  await requireRole(['admin'])

  return (
    <div className="space-y-3 md:px-6 md:py-5 lg:px-8 sm:space-y-6">
      <div className="workspace-feature rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
        <h1 className="workspace-title text-xl font-bold tracking-tight sm:text-3xl">Release Notes</h1>
        <p className="mt-2 hidden text-sm text-muted-foreground sm:block sm:text-base">
          Create, edit, and publish release notes. Users see the latest active release on login.
        </p>
      </div>
      <ReleaseEditor />
    </div>
  )
}
