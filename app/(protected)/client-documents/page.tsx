import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getClientDocuments, type ClientDocumentKind } from '@/lib/client-documents'

export const dynamic = 'force-dynamic'

export default async function ClientDocumentsPage({ searchParams }: { searchParams?: { kind?: string; store?: string } }) {
  const { profile } = await requireRole(['client_admin'])
  const kind: ClientDocumentKind = searchParams?.kind === 'fra' ? 'FRA' : 'H&S'
  const documents = (await getClientDocuments(profile)).filter(document => document.kind === kind && (!searchParams?.store || document.storeId === searchParams.store))
  const stores = new Map<string, typeof documents>()
  for (const document of documents) {
    const rows = stores.get(document.storeId) || []
    rows.push(document)
    stores.set(document.storeId, rows)
  }

  return <main className="min-h-full bg-[#f5f7f8] px-4 py-8 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Footasylum documents</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">{kind === 'FRA' ? 'Fire Risk Assessments' : 'H&S Audits'}</h1>
      <p className="mt-2 text-sm text-slate-600">Open the saved reports for your stores.</p>
      <nav aria-label="Document type" className="mt-6 flex gap-2">
        <Link href="/client-documents?kind=hs" aria-current={kind === 'H&S' ? 'page' : undefined} className={`rounded-lg px-4 py-2 text-sm font-semibold ${kind === 'H&S' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>H&S Audits</Link>
        <Link href="/client-documents?kind=fra" aria-current={kind === 'FRA' ? 'page' : undefined} className={`rounded-lg px-4 py-2 text-sm font-semibold ${kind === 'FRA' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>Fire Risk Assessments</Link>
      </nav>
      {stores.size === 0 ? <p className="mt-8 rounded-xl bg-white p-6 text-slate-700">No saved {kind === 'FRA' ? 'FRA' : 'H&S audit'} PDFs are available for your stores yet.</p>
        : <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[...stores.entries()].map(([storeId, rows]) => <section key={storeId} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">{rows[0].storeName}</h2>
            <p className="text-sm text-slate-500">{rows[0].storeCode}</p>
            <ul className="mt-4 divide-y divide-slate-100">
              {rows.map(document => <li key={`${storeId}:${document.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="text-slate-700">{document.kind === 'FRA' ? 'Fire Risk Assessment' : `H&S Audit ${document.auditNumber || ''}`}{document.visitDate ? ` · ${new Date(`${document.visitDate}T12:00:00Z`).toLocaleDateString('en-GB')}` : ''}</span>
                <a href={`/api/client-documents/pdf?storeId=${encodeURIComponent(storeId)}&documentId=${encodeURIComponent(document.id)}`} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg border border-indigo-300 px-3 py-2 font-semibold text-indigo-700 hover:bg-indigo-50">Open PDF</a>
              </li>)}
            </ul>
          </section>)}
        </div>}
    </div>
  </main>
}
