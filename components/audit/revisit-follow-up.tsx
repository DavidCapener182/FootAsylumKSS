import { EvidencePreviewButton } from '@/components/shared/evidence-preview-button'
import { completedAuditRevisit, revisitEvidenceHref, revisitHistoryHref, type AuditRevisitFollowUp, type RevisitAuditStore } from '@/lib/audit/revisit-follow-up'
const date = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })

export function hasRevisitFollowUp(summary?: AuditRevisitFollowUp) {
  return summary?.status === 'unavailable' || !!summary?.originals.length
}

export function RevisitFollowUp({ store }: { store: RevisitAuditStore & { id: string; store_name?: string } }) {
  const summary = store.audit_revisit_follow_up
  if (!summary) return null
  if (summary.status === 'unavailable') return <div className="space-y-1 text-xs text-slate-600"><p>Revisit history unavailable</p><a className="inline-flex min-h-11 items-center underline" href={revisitHistoryHref(store.id)}>Check evidence history</a></div>
  if (!summary.originals.length) return null
  const completed = completedAuditRevisit(store)
  return <div className="min-w-0 space-y-3 text-xs" aria-label={`Revisit evidence for ${store.store_name || 'store'}`}>
    {summary.originals.map(original => <div key={original.id} className="min-w-0 border-l-2 border-blue-300 pl-2">
      <p className="font-semibold text-blue-800">Revisited {date(original.latestRevisitDate)}</p>
      <p className="mt-1 text-slate-600">Original Audit {original.auditNumber ?? '—'} · {date(original.visitDate)}</p>
      {completed?.id === original.id && <p className="mt-1 font-semibold text-blue-800">Revisit complete</p>}
      <EvidencePreviewButton className="inline-flex min-h-11 items-center text-left font-semibold text-blue-800 underline underline-offset-2" href={revisitEvidenceHref(store.id, original.latestEvidenceId)} title={`Revisit evidence · ${store.store_name || 'Store'}`}>{original.documentCount === 1 ? 'View evidence' : 'View latest evidence'}<span className="sr-only"> for original Audit {original.auditNumber}, {date(original.visitDate)}</span></EvidencePreviewButton>
      <a className="flex min-h-11 items-center break-words text-slate-600 underline underline-offset-2" href={revisitHistoryHref(store.id)}>{original.documentCount} document{original.documentCount === 1 ? '' : 's'} · All evidence</a>
      <p className="mt-1 text-[10px] text-slate-500">Audit score and open actions unchanged</p>
    </div>)}
  </div>
}
