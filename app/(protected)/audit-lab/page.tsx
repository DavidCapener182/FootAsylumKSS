import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AuditLabClient } from '@/components/admin/audit-lab-client'
import { Sparkles } from 'lucide-react'

const ADMIN_EMAIL = 'david.capener@kssnwltd.co.uk'

export default async function AuditLabPage() {
  const session = await requireAuth()

  // Check if user is the admin email
  if (session.user.email !== ADMIN_EMAIL) {
    redirect('/')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-sm flex-shrink-0">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">SafeHub</h1>
          </div>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl ml-9 sm:ml-11">
            Create custom audit templates, conduct audits, and track compliance across stores.
          </p>
        </div>
      </div>

      <AuditLabClient />
    </div>
  )
}
