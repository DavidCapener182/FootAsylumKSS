'use client'

import { useEffect, useState } from 'react'

type Row = { sourceActionId: string; kind: '' | 'remedial' | 'routine'; recommendation: string; priority: 'Low' | 'Medium' | 'High'; dueNote?: string }
type Approved = { fingerprint: string; pdfRows: Row[]; trackingRows: Row[] }

export function FraActionApproval({ instanceId, storeId, recommendations, onStateChange, onApproved }: {
  instanceId: string
  storeId: string
  recommendations: Array<{ recommendation: string; priority: 'Low' | 'Medium' | 'High'; dueNote?: string }>
  onStateChange: (required: boolean, approved: boolean) => void
  onApproved: () => void
}) {
  const [required, setRequired] = useState(false)
  const [approved, setApproved] = useState<Approved | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/fra-reports/action-plan/approve?instanceId=${encodeURIComponent(instanceId)}`)
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load action approval')
        if (cancelled) return
        setRequired(result.required)
        setApproved(result.approved)
        onStateChange(result.required, Boolean(result.approved))
        if (result.required && !result.approved) {
          const saved = window.localStorage.getItem(`fra:action-draft:${instanceId}`)
          if (saved) {
            try { setRows(JSON.parse(saved) as Row[]) } catch { /* regenerate below */ }
          } else {
            setRows(recommendations.map(item => ({ ...item, sourceActionId: crypto.randomUUID(), kind: '' })))
          }
        }
      })
      .catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Unable to load action approval') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [instanceId, storeId, recommendations, onStateChange])

  useEffect(() => {
    if (required && !approved && rows.length) window.localStorage.setItem(`fra:action-draft:${instanceId}`, JSON.stringify(rows))
  }, [approved, instanceId, required, rows])

  if (loading || !required) return null

  async function approve() {
    setError('')
    if (rows.some(row => !row.kind || !row.recommendation.trim())) {
      setError('Choose Remedial or Routine and check the wording for every row.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/fra-reports/action-plan/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: { version: 1, instanceId, storeId, approval: 'pending', items: rows } }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to approve action plan')
      const next = { fingerprint: result.fingerprint, pdfRows: rows, trackingRows: rows.filter(row => row.kind === 'remedial') }
      setApproved(next)
      onStateChange(true, true)
      onApproved()
      window.localStorage.removeItem(`fra:action-draft:${instanceId}`)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to approve action plan') }
    finally { setSaving(false) }
  }

  return <section className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-slate-900">
    <h2 className="text-lg font-bold">Approve FRA action plan</h2>
    {approved ? <p className="mt-2 text-sm">Approved: {approved.pdfRows.length} PDF rows, {approved.trackingRows.length} remedial actions to track. This approved list is frozen for the issued PDF.</p> : <>
      <p className="mt-1 text-sm">Mark each recommendation as remedial work or routine advice. Only remedial work becomes a tracked action. You can approve an empty plan.</p>
      <div className="mt-3 space-y-3">{rows.map((row, index) => <div key={row.sourceActionId} className="rounded-lg border bg-white p-3">
        <label className="block text-xs font-semibold">Action {index + 1}</label>
        <textarea className="mt-1 min-h-16 w-full rounded border p-2 text-sm" value={row.recommendation} onChange={event => setRows(current => current.map(item => item.sourceActionId === row.sourceActionId ? { ...item, recommendation: event.target.value } : item))} />
        <div className="mt-2 flex flex-wrap gap-2">
          <select aria-label={`Action ${index + 1} type`} className="rounded border bg-white p-2 text-sm" value={row.kind} onChange={event => setRows(current => current.map(item => item.sourceActionId === row.sourceActionId ? { ...item, kind: event.target.value as Row['kind'] } : item))}>
            <option value="">Choose type</option><option value="remedial">Remedial work</option><option value="routine">Routine advice</option>
          </select>
          <select aria-label={`Action ${index + 1} priority`} className="rounded border bg-white p-2 text-sm" value={row.priority} onChange={event => setRows(current => current.map(item => item.sourceActionId === row.sourceActionId ? { ...item, priority: event.target.value as Row['priority'] } : item))}>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
          <button type="button" className="rounded border px-3 text-sm" onClick={() => setRows(current => current.filter(item => item.sourceActionId !== row.sourceActionId))}>Remove</button>
        </div>
      </div>)}</div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="rounded border border-indigo-300 bg-white px-3 py-2 text-sm font-semibold" onClick={() => setRows(current => [...current, { sourceActionId: crypto.randomUUID(), kind: '', recommendation: '', priority: 'Medium' }])}>Add row</button>
        <button type="button" className="rounded bg-indigo-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={saving} onClick={approve}>{saving ? 'Approving…' : 'Approve action plan'}</button>
      </div>
    </>}
    {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
  </section>
}
