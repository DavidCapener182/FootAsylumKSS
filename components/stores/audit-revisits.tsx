'use client'

import { currentRevisitEvidence, previousRevisitVersions } from '@/lib/audit/revisit-versions'
import { EvidencePreviewButton } from '@/components/shared/evidence-preview-button'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { EvidenceUploader } from '@/components/product/evidence-uploader'
import { Button } from '@/components/ui/button'

type Original = { id: string; audit_number: number | null; visit_date: string; percentage: number | null }
type Revisit = { replaces_id?: string | null; id: string; original_history_id: string; revisit_date: string; notes: string; file_name: string; created_at: string; file_sha256: string }
type History = { originals: Original[]; revisits: Revisit[] }
const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })

export function AuditRevisits({ storeId, canUpload }: { storeId: string; canUpload: boolean }) {
  const router = useRouter()
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
  const [replacement, setReplacement] = useState<Revisit | null>(null)
  const [stale, setStale] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  function chooseReplacement(row: Revisit | null) {
    setReplacement(row); setHistoryId(row?.original_history_id || ''); setVisitDate(row?.revisit_date || '')
    setNotes(row?.notes || ''); setFile(null); setMessage(''); setStale(false); requestId.current = null
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
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
    if (busy || stale || !file) return
    requestId.current ||= crypto.randomUUID()
    setBusy(true); setPending(true); setMessage('')
    const form = new FormData()
    Object.entries({ storeId, historyId, visitDate, notes, requestId: requestId.current }).forEach(([key, value]) => form.set(key, value))
    form.set('file', file)
    if (replacement) form.set('replacesId', replacement.id)
    try {
      const response = await fetch('/api/audit-revisits', { method: 'POST', body: form })
      const result = await response.json()
      if (!response.ok) {
        // Validation/conflict responses are definitive. Unknown server/network results keep
        // the same frozen submission so the next click cannot accidentally change its identity.
        if (response.status < 500) { setPending(false); requestId.current = null }
        if (replacement && response.status === 409) { setStale(true); await load() }
        throw new Error(result.error || 'Unable to save revisit')
      }
      setMessage(`${replacement ? 'Revisit report replaced. The earlier file is in Previous versions.' : 'Revisit evidence recorded.'} Original audit and findings remain unchanged.${result.cleanupWarning ? ` ${result.cleanupWarning}` : ''}`)
      setPending(false); requestId.current = null; setFile(null); setNotes(''); setVisitDate(''); setReplacement(null); setStale(false)
      await load()
      router.refresh()
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
          <ul className="mt-3 space-y-3">{currentRevisitEvidence(history.revisits).filter(row => row.original_history_id === original.id).map(row => <li key={row.id} className="border-l-2 border-blue-300 pl-3 text-sm">
            <p className="font-semibold">Current revisit report · {dateLabel(row.revisit_date)}</p>
            {row.notes && <p className="whitespace-pre-wrap">{row.notes}</p>}
            <EvidencePreviewButton href={`/api/audit-revisits?storeId=${encodeURIComponent(storeId)}&evidenceId=${row.id}`} filename={row.file_name} title={row.file_name} className="inline-flex min-h-11 items-center text-left underline">View {row.file_name}</EvidencePreviewButton>
            <p className="text-xs text-slate-500">Recorded {new Date(row.created_at).toLocaleString('en-GB')} · Evidence uploaded; no signoff</p>
            {canUpload && <Button type="button" variant="outline" disabled={busy || pending} onClick={() => chooseReplacement(row)}>Replace report</Button>}
            {row.replaces_id && <details className="mt-2">
              <summary className="min-h-11 cursor-pointer py-2 underline">Previous versions</summary>
              <ul className="space-y-2">{previousRevisitVersions(row, history.revisits).map(previous => <li key={previous.id}>
                <p>Previous report · Recorded {new Date(previous.created_at).toLocaleString('en-GB')}</p>
                {previous.notes && <p className="whitespace-pre-wrap">{previous.notes}</p>}
                <EvidencePreviewButton href={`/api/audit-revisits?storeId=${encodeURIComponent(storeId)}&evidenceId=${previous.id}`} filename={previous.file_name} title={previous.file_name} className="inline-flex min-h-11 items-center underline">View {previous.file_name}</EvidencePreviewButton>
              </li>)}</ul>
            </details>}
          </li>)}</ul>
          {!history.revisits.some(row => row.original_history_id === original.id) && <p className="mt-2 text-sm text-slate-500">No revisit evidence recorded.</p>}
        </article>)}</div>
        {canUpload && <form ref={formRef} onSubmit={submit} className="mt-6 space-y-3">
          <h4 className="font-semibold">{replacement ? 'Replace revisit report' : 'Add revisit evidence'}</h4>
          {replacement && <p className="text-sm">Replacing {replacement.file_name}. The earlier file will remain in Previous versions. The audit and revisit date stay the same.</p>}
          <fieldset disabled={busy || pending || stale} className="space-y-3 disabled:opacity-60">
            <div className="text-sm"><label htmlFor={`${formId}-original`}>Original audit</label>
              <select id={`${formId}-original`} required disabled={!!replacement} value={historyId} onChange={event => setHistoryId(event.target.value)} className="mt-1 block min-h-11 w-full rounded border p-2">
                <option value="">Select the original audit</option>
                {history.originals.map(original => <option key={original.id} value={original.id}>Audit {original.audit_number} · {dateLabel(original.visit_date)} · {original.percentage == null ? 'No score' : `${Number(original.percentage).toFixed(2)}%`} · {original.id.slice(0, 8)}</option>)}
              </select>
            </div>
            <div className="text-sm"><label htmlFor={`${formId}-date`}>Revisit date</label><input id={`${formId}-date`} required disabled={!!replacement} type="date" value={visitDate} min={history.originals.find(row => row.id === historyId)?.visit_date} onChange={event => setVisitDate(event.target.value)} className="mt-1 block min-h-11 rounded border p-2" /></div>
            <div className="text-sm"><label htmlFor={`${formId}-notes`}>Revisit notes</label><textarea id={`${formId}-notes`} maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} className="mt-1 block min-h-24 w-full rounded border p-2" /></div>
            <EvidenceUploader label="Choose revisit document or photo" accept=".pdf,.docx,.jpg,.jpeg,.png,.webp" multiple={false} disabled={busy || pending} hint={replacement ? 'PDF, Word (.docx), JPG, PNG or WebP. Maximum 4 MB. Save a new version of this report.' : 'PDF, Word (.docx), JPG, PNG or WebP. Maximum 4 MB. Each submission adds evidence to the selected original audit.'} onFilesSelected={files => setFile(files[0] || null)} />
            {file && <p className="text-sm">Selected: {file.name}</p>}
          </fieldset>
          {pending && !busy && <p className="text-sm">Submission details are held for a safe retry. Retry to confirm whether the evidence was recorded.</p>}
          <Button type="submit" disabled={busy || stale || !file || !historyId || !visitDate}>{busy ? 'Saving evidence…' : pending ? 'Retry same submission' : replacement ? 'Save replacement' : 'Add revisit evidence'}</Button>
          {replacement && <Button type="button" variant="outline" disabled={busy || pending} onClick={() => chooseReplacement(null)}>Cancel replacement</Button>}
          {stale && <p role="alert" className="text-sm">This replacement could not be saved. Cancel it and select the current report from the refreshed history.</p>}
        </form>}
      </>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>
}
