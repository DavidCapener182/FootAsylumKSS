'use client'

import { useState, useTransition } from 'react'
import { CalendarPlus, Clock3 } from 'lucide-react'
import type { AuditScheduleData } from '@/features/audits/schedule-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function relation<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] || null : value }

export function AuditSchedulePanel({ initialData }: { initialData: AuditScheduleData }) {
  const [data, setData] = useState(initialData)
  const [form, setForm] = useState({ storeId: '', templateId: '', auditorId: '', scheduledAt: '', dueAt: '' })
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const submit = () => startTransition(async () => {
    setMessage(null)
    const response = await fetch('/api/audits/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) return setMessage(body.error || 'Unable to schedule audit')
    setData((current) => ({ ...current, schedules: [body.schedule, ...current.schedules] }))
    setForm({ storeId: '', templateId: '', auditorId: '', scheduledAt: '', dueAt: '' })
    setMessage('Audit scheduled.')
  })
  return <Card className="mb-4 border-violet-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarPlus className="h-4 w-4 text-violet-700" />Schedule and assign audits</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-2 md:grid-cols-5">{[['storeId', 'Store', data.stores], ['templateId', 'Template', data.templates], ['auditorId', 'Auditor', data.auditors]].map(([key, label, options]) => <select key={key as string} aria-label={label as string} value={form[key as 'storeId' | 'templateId' | 'auditorId']} onChange={(event) => update(key as keyof typeof form, event.target.value)} className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">{label as string}</option>{(options as AuditScheduleData['stores']).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>)}<Input aria-label="Scheduled at" type="datetime-local" value={form.scheduledAt} onChange={(event) => update('scheduledAt', event.target.value)} className="min-h-[44px]" /><Input aria-label="Due at" type="datetime-local" value={form.dueAt} onChange={(event) => update('dueAt', event.target.value)} className="min-h-[44px]" /></div><Button onClick={submit} disabled={pending || Object.values(form).some((value) => !value)} className="min-h-[44px]">Schedule audit</Button>{message ? <p role="status" className="text-sm text-slate-600">{message}</p> : null}<div className="grid gap-2 lg:grid-cols-2">{data.schedules.slice(0, 8).map((schedule) => { const store = relation(schedule.store); const template = relation(schedule.template); const auditor = relation(schedule.auditor); return <div key={schedule.id} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-3"><p className="font-semibold text-slate-900">{store?.store_name || 'Store'} · {template?.title || 'Audit'}</p><span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">{schedule.status}</span></div><p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{schedule.scheduled_at ? new Date(schedule.scheduled_at).toLocaleString() : 'Not scheduled'} · {auditor?.full_name || 'Unassigned'}</p></div> })}</div></CardContent></Card>
}
