'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookmarkPlus, Trash2 } from 'lucide-react'

import type { SavedView, SavedViewFeature } from '@/features/saved-views/query-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SavedViewBar({ feature, initialViews, currentFilters }: { feature: SavedViewFeature; initialViews: SavedView[]; currentFilters: Record<string, unknown> }) {
  const [views, setViews] = useState(initialViews)
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const openView = (view: SavedView) => {
    const search = new URLSearchParams()
    Object.entries(view.filters).forEach(([key, value]) => {
      if (typeof value === 'string' && value) search.set(key, value)
      if (typeof value === 'boolean' && value) search.set(key, 'true')
    })
    router.push(`/${feature === 'audits' ? 'audit-tracker' : feature}?${search.toString()}`)
  }

  const save = () => startTransition(async () => {
    setMessage(null)
    const response = await fetch('/api/saved-views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature, name, filters: currentFilters }) })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) return setMessage(body.error || 'Unable to save this view')
    setViews((current) => [...current.filter((view) => view.id !== body.view.id), body.view].sort((a, b) => a.name.localeCompare(b.name)))
    setName('')
    setMessage('View saved.')
  })

  const remove = (id: string) => startTransition(async () => {
    const response = await fetch(`/api/saved-views?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!response.ok) return setMessage('Unable to delete this view')
    setViews((current) => current.filter((view) => view.id !== id))
  })

  return <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex flex-col gap-2 lg:flex-row lg:items-center"><div className="flex flex-1 gap-2 overflow-x-auto pb-1 lg:pb-0">{views.length === 0 ? <span className="px-2 py-2 text-xs text-slate-500">No personal views saved.</span> : views.map((view) => <div key={view.id} className="flex shrink-0 items-center rounded-xl border border-slate-200"><button type="button" onClick={() => openView(view)} className="min-h-[42px] px-3 text-sm font-semibold text-slate-700">{view.name}</button><button type="button" onClick={() => remove(view.id)} aria-label={`Delete ${view.name}`} className="min-h-[42px] border-l border-slate-200 px-2 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div><div className="flex gap-2"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name this view" className="min-h-[44px]" /><Button type="button" variant="outline" onClick={save} disabled={pending || !name.trim()} className="min-h-[44px]"><BookmarkPlus className="mr-2 h-4 w-4" />Save</Button></div></div>{message ? <p role="status" className="mt-2 text-xs text-slate-600">{message}</p> : null}</div>
}
