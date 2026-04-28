import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AuditLabClient } from '@/components/admin/audit-lab-client'
import { Sparkles } from 'lucide-react'

export default async function AuditLabPage() {
  const { profile } = await requireRole(['admin', 'ops'])
  if (!profile) redirect('/')

  return (
    <div className="min-h-[calc(100dvh-var(--mobile-header-height,0px))] bg-slate-50 md:min-h-screen">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">SafeHub</h1>
          </div>
          <p className="max-w-2xl text-sm text-slate-500 md:ml-12">
            Create custom audit templates, conduct audits, and track compliance across stores.
          </p>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6 lg:px-8">
        <AuditLabClient />
      </div>
    </div>
  )
}
