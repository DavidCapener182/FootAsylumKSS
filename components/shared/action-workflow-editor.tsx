'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function ActionWorkflowEditor({ action, onSaved }: { action: any; onSaved?: () => void }) {
  const [form, setForm] = useState({ dueDate: action.due_date || '', evidenceRequired: Boolean(action.evidence_required), blockedReason: action.blocked_reason || '', verificationStatus: action.verification_status || 'not_required', recurrenceRule: action.recurrence_rule || '' })
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))
  const save = () => startTransition(async () => {
    setMessage(null)
    const response = await fetch('/api/actions/workflow', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceType: action.source_type, actionId: action.id, ...form }) })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) return setMessage(body.error || 'Unable to update action workflow')
    setMessage('Workflow controls saved.')
    onSaved?.()
  })
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck className="h-4 w-4 text-indigo-600" />Workflow controls</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs font-semibold text-slate-600">Due date<Input type="date" value={form.dueDate} onChange={(event) => update('dueDate', event.target.value)} /></label><label className="space-y-1 text-xs font-semibold text-slate-600">Verification<select value={form.verificationStatus} onChange={(event) => update('verificationStatus', event.target.value)} className="min-h-[40px] w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="not_required">Not required</option><option value="awaiting_evidence">Awaiting evidence</option><option value="awaiting_verification">Awaiting verification</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></label><label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.evidenceRequired} onChange={(event) => update('evidenceRequired', event.target.checked)} />Evidence required</label><label className="space-y-1 text-xs font-semibold text-slate-600">Recurrence<Input value={form.recurrenceRule} onChange={(event) => update('recurrenceRule', event.target.value)} placeholder="e.g. monthly until closed" /></label></div><label className="mt-3 block space-y-1 text-xs font-semibold text-slate-600">Blocked reason<Textarea value={form.blockedReason} onChange={(event) => update('blockedReason', event.target.value)} placeholder="Leave blank when work is not blocked" /></label><Button type="button" onClick={save} disabled={pending || !form.dueDate} className="mt-3 min-h-[44px] w-full sm:w-auto">Save workflow</Button>{message ? <p role="status" className="mt-2 text-xs text-slate-600">{message}</p> : null}</div>
}
