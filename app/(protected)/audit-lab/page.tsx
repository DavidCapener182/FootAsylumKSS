import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AuditLabClient } from '@/components/admin/audit-lab-client'
import { Sparkles } from 'lucide-react'

export default async function AuditLabPage() {
  const { profile } = await requireRole(['admin', 'ops'])
  if (!profile) redirect('/')

  return (
    <div className="min-h-[calc(100dvh-var(--mobile-header-height,0px))] max-w-full overflow-x-hidden bg-slate-50 md:min-h-screen">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 sm:h-10 sm:w-10">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">SafeHub</h1>
          </div>
          <p className="hidden max-w-2xl text-sm text-slate-500 sm:block md:ml-12">
            Create custom audit templates, conduct audits, and track compliance across stores.
          </p>
        </div>
      </div>

      <div className="max-w-full overflow-x-hidden px-3 py-3 pb-28 sm:px-6 sm:py-5 sm:pb-5 lg:px-8">
        <AuditLabClient />
      </div>
    </div>
  )
}
