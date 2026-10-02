import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getClientDocuments, getClientDocumentStores } from '@/lib/client-documents'

export const dynamic = 'force-dynamic'

export default async function ClientStoresPage() {
  const { profile } = await requireRole(['client_admin'])
  const [stores, documents] = await Promise.all([getClientDocumentStores(profile), getClientDocuments(profile)])
  const countByStore = new Map<string, { hs: number; fra: number }>()
  for (const row of documents) {
    const counts = countByStore.get(row.storeId) || { hs: 0, fra: 0 }
    if (row.kind === 'FRA') counts.fra++
    else counts.hs++
    countByStore.set(row.storeId, counts)
  }

  return <main className="min-h-full bg-[#f5f7f8] px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Footasylum</p>
    <h1 className="mt-2 text-3xl font-bold text-slate-950">Store Directory</h1>
    <p className="mt-2 text-sm text-slate-600">Your stores and their saved assessments.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stores.map(store => {
      const counts = countByStore.get(store.id) || { hs: 0, fra: 0 }
      return <section key={store.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">{store.store_name || store.store_code || 'Store'}</h2>
        <p className="text-sm text-slate-500">{store.store_code}</p>
        <p className="mt-3 text-sm text-slate-700">{counts.hs} H&S audits · {counts.fra} FRAs</p>
        <div className="mt-4 flex gap-4 text-sm font-semibold text-indigo-700">
          <Link href={`/client-documents?kind=hs&store=${encodeURIComponent(store.id)}`}>H&S audits</Link>
          <Link href={`/client-documents?kind=fra&store=${encodeURIComponent(store.id)}`}>FRAs</Link>
        </div>
      </section>
    })}</div>
  </div></main>
}
