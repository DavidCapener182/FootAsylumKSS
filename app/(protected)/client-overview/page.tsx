import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getClientDocuments, getClientDocumentStores } from '@/lib/client-documents'

export const dynamic = 'force-dynamic'

export default async function ClientOverviewPage() {
  const { profile } = await requireRole(['client_admin'])
  const [stores, documents] = await Promise.all([getClientDocumentStores(profile), getClientDocuments(profile)])
  const hs = documents.filter(row => row.kind === 'H&S').length
  const fra = documents.filter(row => row.kind === 'FRA').length
  const destinations = [
    { href: '/client-stores', label: 'Stores', detail: `${stores.length} stores` },
    { href: '/client-documents?kind=hs', label: 'H&S Audits', detail: `${hs} saved reports` },
    { href: '/client-documents?kind=fra', label: 'Fire Risk Assessments', detail: `${fra} saved reports` },
    { href: '/client-calendar', label: 'Calendar', detail: 'Completed assessments' },
    { href: '/fra-action-plans', label: 'FRA Action Plans', detail: 'Actions across your stores' },
  ]

  return <main className="min-h-full bg-[#f5f7f8] px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Footasylum</p>
    <h1 className="mt-2 text-3xl font-bold text-slate-950">Today</h1>
    <p className="mt-2 text-sm text-slate-600">Your stores, reports and FRA action plans.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{destinations.map(item => <Link key={item.href} href={item.href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300">
      <h2 className="font-bold text-slate-950">{item.label}</h2><p className="mt-2 text-sm text-slate-600">{item.detail}</p>
    </Link>)}</div>
  </div></main>
}
