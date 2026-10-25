'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { EvidenceUploader } from '@/components/product/evidence-uploader'
import { Button } from '@/components/ui/button'

type Original = { id: string; audit_number: number | null; visit_date: string; percentage: number | null }
type Revisit = { id: string; original_history_id: string; revisit_date: string; notes: string; file_name: string; created_at: string; file_sha256: string }
type History = { originals: Original[]; revisits: Revisit[] }
const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })

export function AuditRevisits({ storeId, canUpload }: { storeId: string; canUpload: boolean }) {
  const formId = useId()
  const [history, setHistory] = useState<History | null>(null)
  const [historyId, setHistoryId] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const requestId = useRef<string | null>(null)
  const load = async () => {
    try {
      const response = await fetch(`/api/audit-revisits?storeId=${encodeURIComponent(storeId)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'History unavailable')
      setHistory(data); setLoadError('')
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'History unavailable') }
  }
  useEffect(() => { void load() }, [storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !file) return
    requestId.current ||= crypto.randomUUID()
    setBusy(true); setPending(true); setMessage('')
    const form = new FormData()
    Object.entries({ storeId, historyId, visitDate, notes, requestId: requestId.current }).forEach(([key, value]) => form.set(key, value))
    form.set('file', file)
    try {
      const response = await fetch('/api/audit-revisits', { method: 'POST', body: form })
      const result = await response.json()
      if (!response.ok) {
        // Validation/conflict responses are definitive. Unknown server/network results keep
        // the same frozen submission so the next click cannot accidentally change its identity.
        if (response.status < 500) { setPending(false); requestId.current = null }
        throw new Error(result.error || 'Unable to save revisit')
      }
      setMessage(`Revisit evidence recorded. Original audit and findings remain unchanged.${result.cleanupWarning ? ` ${result.cleanupWarning}` : ''}`)
      setPending(false); requestId.current = null; setFile(null); setNotes(''); setVisitDate('')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Connection interrupted. Retry this same submission.') }
    finally { setBusy(false) }
  }

  return <section aria-labelledby="revisit-heading" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 lg:col-span-2">
    <h3 id="revisit-heading" className="text-lg font-bold">Original audits &amp; revisit evidence</h3>
    <p className="mt-2 text-sm text-slate-600">Revisits supplement the selected original audit. Uploading evidence does not change its score, close findings or sign off outstanding work.</p>
    {loadError ? <p role="alert" className="mt-3 text-sm text-red-700">{loadError} <button type="button" className="underline" onClick={() => void load()}>Reload history</button></p>
      : !history ? <p role="status">Loading revisit history…</p>
      : history.originals.length === 0 ? <p className="mt-3 text-sm">No preserved original H&amp;S audit is available to attach a revisit. Ask an administrator to check the audit archive.</p>
      : <>
        <div className="mt-4 space-y-4">{history.originals.map(original => <article key={original.id} className="rounded-lg border border-slate-200 p-4">
          <h4 className="font-semibold">Original Audit {original.audit_number ?? '—'} · {dateLabel(original.visit_date)} · {original.percentage == null ? 'Score not recorded' : `${Number(original.percentage).toFixed(2)}%`}</h4>
          <p className="text-xs text-slate-500">Original visit and score retained</p>
          <ul className="mt-3 space-y-3">{history.revisits.filter(row => row.original_history_id === original.id).map(row => <li key={row.id} className="border-l-2 border-blue-300 pl-3 text-sm">
            <p className="font-semibold">Revisit evidence · {dateLabel(row.revisit_date)}</p>
            {row.notes && <p className="whitespace-pre-wrap">{row.notes}</p>}
            <a href={`/api/audit-revisits?storeId=${encodeURIComponent(storeId)}&evidenceId=${row.id}`} className="inline-flex min-h-11 items-center underline">Download {row.file_name}</a>
            <p className="text-xs text-slate-500">Recorded {new Date(row.created_at).toLocaleString('en-GB')} · Evidence uploaded; no signoff</p>
          </li>)}</ul>
          {!history.revisits.some(row => row.original_history_id === original.id) && <p className="mt-2 text-sm text-slate-500">No revisit evidence recorded.</p>}
        </article>)}</div>
        {canUpload && <form onSubmit={submit} className="mt-6 space-y-3">
          <h4 className="font-semibold">Add revisit evidence</h4>
          <fieldset disabled={busy || pending} className="space-y-3 disabled:opacity-60">
            <div className="text-sm"><label htmlFor={`${formId}-original`}>Original audit</label>
              <select id={`${formId}-original`} required value={historyId} onChange={event => setHistoryId(event.target.value)} className="mt-1 block min-h-11 w-full rounded border p-2">
                <option value="">Select the original audit</option>
                {history.originals.map(original => <option key={original.id} value={original.id}>Audit {original.audit_number} · {dateLabel(original.visit_date)} · {original.percentage == null ? 'No score' : `${Number(original.percentage).toFixed(2)}%`} · {original.id.slice(0, 8)}</option>)}
              </select>
            </div>
            <div className="text-sm"><label htmlFor={`${formId}-date`}>Revisit date</label><input id={`${formId}-date`} required type="date" value={visitDate} min={history.originals.find(row => row.id === historyId)?.visit_date} onChange={event => setVisitDate(event.target.value)} className="mt-1 block min-h-11 rounded border p-2" /></div>
            <div className="text-sm"><label htmlFor={`${formId}-notes`}>Revisit notes</label><textarea id={`${formId}-notes`} maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} className="mt-1 block min-h-24 w-full rounded border p-2" /></div>
            <EvidenceUploader label="Choose revisit document or photo" accept=".pdf,.docx,.jpg,.jpeg,.png,.webp" multiple={false} disabled={busy || pending} hint="PDF, Word (.docx), JPG, PNG or WebP. Maximum 4 MB. Each submission adds evidence to the selected original audit." onFilesSelected={files => setFile(files[0] || null)} />
            {file && <p className="text-sm">Selected: {file.name}</p>}
          </fieldset>
          {pending && !busy && <p className="text-sm">Submission details are held for a safe retry. Retry to confirm whether the evidence was recorded.</p>}
          <Button type="submit" disabled={busy || !file || !historyId || !visitDate}>{busy ? 'Saving evidence…' : pending ? 'Retry same submission' : 'Add revisit evidence'}</Button>
        </form>}
      </>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>
}
