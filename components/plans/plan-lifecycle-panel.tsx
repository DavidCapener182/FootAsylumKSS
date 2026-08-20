'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Clock3, GitCompareArrows, MessageSquareText, Send } from 'lucide-react'

import type { PlanLifecycleData, PlanType } from '@/features/plans/query-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const nextStatus: Record<string, string | null> = { draft: 'review', review: 'approved', approved: 'published', published: 'archived', archived: 'draft' }

export function PlanLifecyclePanel({ planType, initialData, completedRequired, totalRequired }: { planType: PlanType; initialData: PlanLifecycleData; completedRequired: number; totalRequired: number }) {
  const [data, setData] = useState(initialData)
  const [notes, setNotes] = useState('')
  const [comment, setComment] = useState('')
  const [sectionKey, setSectionKey] = useState('general')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const target = nextStatus[data.plan.status]
  const complete = totalRequired === 0 || completedRequired === totalRequired

  const transition = () => startTransition(async () => {
    if (!target) return
    setMessage(null)
    const response = await fetch('/api/plans/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'transition', planType, planId: data.plan.id, status: target, changeNotes: notes }) })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) return setMessage(body.error || 'Unable to update plan status')
    setData((current) => ({ ...current, plan: { ...current.plan, status: body.status, version_number: body.versionNumber }, versions: [{ id: crypto.randomUUID(), version_number: body.versionNumber, status: body.status, change_notes: notes || null, created_at: new Date().toISOString() }, ...current.versions] }))
    setNotes('')
    setMessage(`Plan moved to ${body.status}. Version ${body.versionNumber} is now recorded.`)
  })

  const addComment = () => startTransition(async () => {
    const response = await fetch('/api/plans/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'comment', planType, planId: data.plan.id, sectionKey, comment }) })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) return setMessage(body.error || 'Unable to add review comment')
    setData((current) => ({ ...current, comments: [body.comment, ...current.comments] }))
    setComment('')
    setMessage('Review comment added.')
  })

  return <Card className="mb-4 border-slate-200 shadow-sm"><CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2 text-base"><GitCompareArrows className="h-4 w-4" />Plan control</CardTitle><span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold uppercase text-lime-300">v{data.plan.version_number} · {data.plan.status}</span></div></CardHeader><CardContent className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
    <div className="space-y-3"><div className={`rounded-xl border p-3 ${complete ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><p className="flex items-center gap-2 text-sm font-bold text-slate-900">{complete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4 text-amber-600" />}Required-field completeness: {completedRequired}/{totalRequired}</p><p className="mt-1 text-xs text-slate-600">Review comments and every lifecycle transition are retained against the exact plan version.</p></div>
      <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={target === 'archived' || target === 'draft' ? 'Change reason required' : 'Change note for this version'} className="min-h-20" />
      <Button onClick={transition} disabled={pending || !target || (!complete && target === 'review')} className="min-h-[44px] w-full">{target ? `Move to ${target}` : 'No transition available'}<Send className="ml-2 h-4 w-4" /></Button>
      {message ? <p role="status" className="rounded-lg bg-slate-100 p-2 text-sm text-slate-700">{message}</p> : null}
      <div className="space-y-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Version history</p>{data.versions.slice(0, 4).map((version) => <div key={version.id} className="rounded-lg border border-slate-200 p-2 text-sm"><span className="font-semibold">v{version.version_number} · {version.status}</span><span className="ml-2 text-xs text-slate-500">{new Date(version.created_at).toLocaleString()}</span>{version.change_notes ? <p className="mt-1 text-xs text-slate-600">{version.change_notes}</p> : null}</div>)}</div>
    </div>
    <div className="space-y-3"><p className="flex items-center gap-2 text-sm font-bold text-slate-900"><MessageSquareText className="h-4 w-4" />Review comments</p><Input value={sectionKey} onChange={(event) => setSectionKey(event.target.value)} placeholder="Section key" /><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a precise review comment" /><Button variant="outline" onClick={addComment} disabled={pending || !comment.trim()} className="min-h-[44px] w-full">Add comment</Button><div className="max-h-64 space-y-2 overflow-auto">{data.comments.length === 0 ? <p className="text-sm text-slate-500">No review comments.</p> : data.comments.map((item) => <div key={item.id} className="rounded-lg bg-slate-50 p-2"><p className="text-xs font-bold text-slate-500">{item.section_key || 'General'} · {item.status}</p><p className="mt-1 text-sm text-slate-700">{item.comment}</p></div>)}</div></div>
  </CardContent></Card>
}
