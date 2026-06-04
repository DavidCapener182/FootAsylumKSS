import Link from 'next/link'
import { Store } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import type { PriorityStore } from './dashboard-types'
import { getStatusTone } from './dashboard-utils'
import { Panel } from './panel'

export function PriorityStoresPanel({ stores }: { stores: PriorityStore[] }) {
  return (
    <Panel title="Priority Stores" icon={Store} actionLabel={`${stores.length} shown`}>
      {stores.length === 0 ? (
        <EmptyState icon={Store} title="No priority stores" description="No stores currently need follow-up attention." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 md:hidden">
            {stores.map((store) => (
              <PriorityStoreCard key={store.id} store={store} />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="pb-3 pr-3">Store</th>
                  <th className="pb-3 pr-3">Audit Status</th>
                  <th className="pb-3 pr-3">FRA Status</th>
                  <th className="pb-3 text-right">Open Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.map((store) => (
                  <tr key={store.id} className="align-middle">
                    <td className="py-3 pr-3">
                      <Link href={store.href || '/stores'} prefetch={false} className="font-semibold text-slate-900 hover:text-blue-700">
                        {store.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-3"><StatusBadge label={store.auditStatus} tone={getStatusTone(store.auditStatus)} /></td>
                    <td className="py-3 pr-3"><StatusBadge label={store.fraStatus} tone={getStatusTone(store.fraStatus)} /></td>
                    <td className="py-3 text-right">
                      <Link href={store.href || '/actions'} prefetch={false} className="font-semibold text-red-600 hover:text-red-700">
                        {store.openActions} Open Actions
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  )
}

function PriorityStoreCard({ store }: { store: PriorityStore }) {
  return (
    <Link href={store.href || '/stores'} prefetch={false} className="block min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:rounded-2xl sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold text-slate-900 sm:text-base">{store.name}</p>
        <span className="flex-shrink-0 text-xs font-bold text-red-600 sm:text-sm">{store.openActions}</span>
      </div>
      <div className="mt-2 flex min-w-0 flex-col gap-1 sm:mt-3 sm:flex-row sm:flex-wrap sm:gap-2">
        <StatusBadge label={store.auditStatus} tone={getStatusTone(store.auditStatus)} className="max-w-full truncate px-1.5 text-[9px] sm:px-2 sm:text-[11px]" />
        <StatusBadge label={store.fraStatus} tone={getStatusTone(store.fraStatus)} className="max-w-full truncate px-1.5 text-[9px] sm:px-2 sm:text-[11px]" />
      </div>
    </Link>
  )
}
