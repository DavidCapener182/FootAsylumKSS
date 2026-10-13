import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getClientAuditActions } from '@/lib/client-audit-actions'

export const dynamic = 'force-dynamic'

export default async function ClientActionsPage() {
  const { profile } = await requireRole(['area_manager'])
  const actions = await getClientAuditActions(profile)
  return <main className="min-h-full bg-slate-50 px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl">
    <h1 className="text-3xl font-bold text-slate-950">H&S Audit Actions</h1>
    <p className="mt-2 text-sm text-slate-600">Recorded audit actions for your assigned stores. Contact KSS to update these actions.</p>
    <Link href="/fra-action-plans" className="mt-4 inline-block font-semibold text-indigo-700">Open FRA action plans</Link>
    {!actions.length ? <p className="mt-6 rounded-xl bg-white p-6">No recorded audit actions for your stores.</p> :
      <div className="mt-6 grid gap-4 md:grid-cols-2">{actions.map(action => <article key={action.id} className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-indigo-700">{action.storeCode} · {action.storeName}</p>
        <h2 className="mt-2 font-bold text-slate-950">{action.title}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{action.description}</p>
        <p className="mt-3 text-sm text-slate-600">{action.priority} priority · {String(action.status).replaceAll('_', ' ')}{action.due_date ? ` · Due ${action.due_date}` : ''}</p>
        {action.source_audit_number ? <p className="mt-1 text-xs text-slate-500">Audit {action.source_audit_number}{action.source_audit_date ? ` · ${action.source_audit_date}` : ''}</p> : null}
      </article>)}</div>}
  </div></main>
}
