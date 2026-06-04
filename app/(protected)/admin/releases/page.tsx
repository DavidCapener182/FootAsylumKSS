import { requireRole } from '@/lib/auth'
import { ReleaseEditor } from '@/components/ReleaseEditor'

export default async function AdminReleasesPage() {
  await requireRole(['admin'])

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
        <h1 className="text-xl font-bold tracking-tight sm:text-3xl">Release Notes</h1>
        <p className="mt-2 hidden text-sm text-muted-foreground sm:block sm:text-base">
          Create, edit, and publish release notes. Users see the latest active release on login.
        </p>
      </div>
      <ReleaseEditor />
    </div>
  )
}
