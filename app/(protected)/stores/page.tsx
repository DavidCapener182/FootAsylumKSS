import Link from 'next/link'
import { ArrowUpRight, Plus, ShieldCheck } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { StoreDirectory } from '@/components/stores/store-directory'
import { getStoreDirectoryData } from '@/features/stores/query-service'

export default async function StoresPage() {
  const { profile } = await requireRole(['admin', 'ops', 'client', 'readonly'])
  const data = await getStoreDirectoryData()

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-slate-50 sm:gap-6 sm:px-6 sm:py-5 lg:px-8">
      <header className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-lime-600"><ShieldCheck className="h-3.5 w-3.5" />Store network</div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:mt-2 sm:text-3xl">Store Directory</h1>
            <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-slate-500 sm:block">Review compliance, audit progress, FRA status and follow-up work across the estate.</p>
          </div>
          {profile.role === 'admin' ? <Button asChild className="min-h-[44px] rounded-xl bg-slate-950"><Link href="/stores/new" prefetch={false}><Plus className="mr-2 h-4 w-4 text-lime-300" />Add new store<ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Link></Button> : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3 md:grid-cols-4">
          <Stat label="Total stores" value={data.totalStores} />
          <Stat label="Active" value={data.activeStores} tone="emerald" />
          <Stat label="Inactive" value={data.inactiveStores} />
          <Stat label="Active rate" value={`${data.activeRate}%`} tone="teal" />
        </div>
      </header>
      <StoreDirectory stores={data.stores} />
    </div>
  )
}

function Stat({ label, value, tone = 'slate' }: { label: string; value: number | string; tone?: 'slate' | 'emerald' | 'teal' }) {
  const classes = tone === 'emerald' ? 'border-emerald-100 bg-emerald-50/50 text-emerald-700' : tone === 'teal' ? 'border-teal-100 bg-teal-50/50 text-teal-700' : 'border-slate-200 bg-slate-50 text-slate-700'
  return <div className={`rounded-xl border p-3 sm:rounded-2xl sm:p-4 ${classes}`}><p className="text-[10px] font-bold uppercase tracking-wider">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
}
