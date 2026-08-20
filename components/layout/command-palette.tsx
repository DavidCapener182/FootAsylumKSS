'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Clock3, Command, Search } from 'lucide-react'
import type { UserRole } from '@/lib/auth'
import { navItems } from './nav-items'

type RecentRecord = { href: string; label: string; visitedAt: string }
const RECENT_KEY = 'fa-recent-records-v1'

function canSeeItem(item: (typeof navItems)[number], role: UserRole) {
  if (item.action) return false
  if (item.adminOnly && role !== 'admin') return false
  if (item.clientHidden && role === 'client') return false
  return !item.allowedRoles || item.allowedRoles.includes(role)
}

function pathLabel(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  const id = parts.at(-1)
  const section = parts.at(-2)
  if (!id || !section) return pathname
  const sectionLabel = section === 'incidents' ? 'Incident' : section === 'stores' ? 'Store' : section.replace(/-/g, ' ')
  return `${sectionLabel}: ${id.slice(0, 8)}`
}

export function CommandPalette({ role }: { role: UserRole }) {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<RecentRecord[]>([])

  useEffect(() => {
    const records = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]') as RecentRecord[]
    const isRecordPath = /^\/(stores|incidents)\/[0-9a-f-]{8,}/i.test(pathname)
    const next = isRecordPath
      ? [{ href: pathname, label: pathLabel(pathname), visitedAt: new Date().toISOString() }, ...records.filter((record) => record.href !== pathname)].slice(0, 6)
      : records.slice(0, 6)
    setRecent(next)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  }, [pathname])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (open) window.requestAnimationFrame(() => inputRef.current?.focus())
    else setQuery('')
  }, [open])

  const destinations = useMemo(() => navItems.filter((item) => canSeeItem(item, role)), [role])
  const normalizedQuery = query.trim().toLowerCase()
  const results = destinations.filter((item) => !normalizedQuery || `${item.label} ${item.section}`.toLowerCase().includes(normalizedQuery))
  const recentResults = recent.filter((item) => !normalizedQuery || item.label.toLowerCase().includes(normalizedQuery))

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hidden min-h-[42px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-sm font-medium text-white/80 transition hover:bg-white/10 lg:flex" aria-label="Open command palette">
        <Search className="h-4 w-4" aria-hidden="true" />
        <span>Find anything</span>
        <kbd className="ml-3 rounded border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/55">⌘K</kbd>
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/55 px-3 pt-[max(5rem,env(safe-area-inset-top))] backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-label="Command palette" className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
            <label className="flex items-center gap-3 border-b border-slate-200 px-4">
              <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
              <span className="sr-only">Search destinations and recent records</span>
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages and recent records…" className="h-14 min-w-0 flex-1 border-0 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400" />
              <button type="button" onClick={() => setOpen(false)} className="min-h-[44px] rounded-lg px-2 text-xs font-semibold text-slate-500">Esc</button>
            </label>
            <div className="max-h-[min(70vh,560px)] overflow-y-auto p-3">
              {recentResults.length ? <PaletteGroup title="Recent records" icon={Clock3} items={recentResults.map((item) => ({ ...item, section: 'Recent' }))} onSelect={navigate} /> : null}
              <PaletteGroup title="Go to" icon={Command} items={results.map((item) => ({ href: item.href, label: item.label, section: item.section || 'Workspace' }))} onSelect={navigate} />
              {!recentResults.length && !results.length ? <p className="p-8 text-center text-sm text-slate-500">No matching destination.</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

function PaletteGroup({ title, icon: Icon, items, onSelect }: { title: string; icon: typeof Search; items: Array<{ href: string; label: string; section: string }>; onSelect: (href: string) => void }) {
  if (!items.length) return null
  return <div className="mb-3 last:mb-0"><p className="flex items-center gap-2 px-2 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500"><Icon className="h-3.5 w-3.5" />{title}</p><div className="space-y-1">{items.map((item) => <button key={item.href} type="button" onClick={() => onSelect(item.href)} className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl px-3 text-left hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"><span className="font-semibold text-slate-900">{item.label}</span><span className="text-xs text-slate-500">{item.section}</span></button>)}</div></div>
}
