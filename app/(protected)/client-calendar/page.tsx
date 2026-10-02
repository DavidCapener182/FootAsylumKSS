import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getClientDocuments } from '@/lib/client-documents'

export const dynamic = 'force-dynamic'

export default async function ClientCalendarPage({ searchParams }: { searchParams?: { month?: string } }) {
  const { profile } = await requireRole(['client_admin'])
  const requested = searchParams?.month
  const month = requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : new Date().toISOString().slice(0, 7)
  const [year, monthNumber] = month.split('-').map(Number)
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7)
  const next = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 7)
  const documents = (await getClientDocuments(profile)).filter(row => row.visitDate?.startsWith(month))
  const days = new Map<string, typeof documents>()
  for (const document of documents) {
    const date = document.visitDate!
    days.set(date, [...(days.get(date) || []), document])
  }

  return <main className="min-h-full bg-[#f5f7f8] px-4 py-8 sm:px-8">
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Footasylum</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Calendar</h1>
      <p className="mt-2 text-sm text-slate-600">Completed H&S audits and fire risk assessments for your stores.</p>
      <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
        <Link href={`/client-calendar?month=${previous}`} aria-label="Previous month" className="rounded-lg px-3 py-2 font-semibold text-indigo-700">← Previous</Link>
        <h2 className="font-bold text-slate-950">{new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h2>
        <Link href={`/client-calendar?month=${next}`} aria-label="Next month" className="rounded-lg px-3 py-2 font-semibold text-indigo-700">Next →</Link>
      </div>
      {days.size === 0 ? <p className="mt-6 rounded-xl bg-white p-6 text-slate-600">No completed assessments are recorded this month.</p> :
        <div className="mt-6 space-y-4">{[...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) =>
          <section key={date} className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-slate-950">{new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</h3>
            <ul className="mt-3 divide-y divide-slate-100">{rows.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span>{row.storeName} · {row.kind === 'FRA' ? 'Fire Risk Assessment' : `H&S Audit ${row.auditNumber || ''}`}</span>
              <a href={`/api/client-documents/pdf?storeId=${encodeURIComponent(row.storeId)}&documentId=${encodeURIComponent(row.id)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700">Open PDF ↗</a>
            </li>)}</ul>
          </section>)}</div>}
    </div>
  </main>
}
