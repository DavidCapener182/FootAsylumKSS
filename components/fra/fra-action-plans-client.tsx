'use client'

import { useState, type FormEvent } from 'react'
import { Check, ChevronRight, FileUp, CalendarDays, Eye, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { SavedFraPdfViewer } from '@/components/fra/saved-fra-pdf-viewer'

type Stage = 'new' | 'seen' | 'booked' | 'made_safe' | 'review' | 'closed'
export type FraPreviewAction = {
  id: string
  storeId?: string
  store: string
  code: string
  area: string
  areaManager?: string
  fraAvailable?: boolean
  pdfPage?: number
  version?: number
  title: string
  detail: string
  priority: 'High' | 'Medium' | 'Low'
  classification?: 'remedial' | 'routine' | 'needs_kss_review'
  workflow: 'repair' | 'make_safe' | 'management' | 'other' | null
  stage: Stage
  bookedDate?: string
  contractor?: string
  evidenceName?: string
  resolution?: string
}

const exampleActions: FraPreviewAction[] = [
  { id: 'example-1', store: 'Example Store One', code: 'S0001', area: 'Area 1', title: 'Stop the fire door being propped open', detail: 'The stockroom fire door was found held open. Remove the obstruction and show that it closes properly.', priority: 'High', workflow: 'make_safe', stage: 'new' },
  { id: 'example-2', store: 'Example Store One', code: 'S0001', area: 'Area 1', title: 'Clear the blocked gangway', detail: 'Stock is obstructing the route through the stockroom. Clear it and show the full route is open.', priority: 'High', workflow: 'make_safe', stage: 'seen' },
  { id: 'example-3', store: 'Example Store Two', code: 'S0002', area: 'Area 1', title: 'Clear the rear entrance', detail: 'Items are blocking the rear entrance. Clear the area and provide a photo of the unobstructed entrance.', priority: 'High', workflow: 'make_safe', stage: 'new' },
  { id: 'example-4', store: 'Example Store Two', code: 'S0002', area: 'Area 1', title: 'Repair the fire door closer', detail: 'The fire door to the stockroom does not close fully.', priority: 'High', workflow: 'repair', stage: 'seen' },
]

function stageLabel(action: FraPreviewAction) {
  return action.stage === 'new' ? 'New'
    : action.stage === 'seen' ? 'Seen'
    : action.stage === 'booked' || action.stage === 'made_safe' ? 'Addressed · add evidence'
    : action.stage === 'review' ? 'Awaiting KSS review' : 'Closed'
}

function statusLabelForBoard(action: FraPreviewAction) {
  return stageLabel(action)
}

const actionThemes = [
  { label: 'propped fire doors', matches: /\b(?:propp?ed?|held open|wedged open)\b.{0,45}\b(?:fire )?doors?\b|\b(?:fire )?doors?\b.{0,45}\b(?:propp?ed?|held open|wedged open)\b/i },
  { label: 'blocked routes or entrances', matches: /\b(?:block(?:ed|ing)?|obstruct(?:ed|ing|ion)?|clear)\b.{0,55}\b(?:gangways?|routes?|exits?|entrances?|escape|access)\b|\b(?:gangways?|routes?|exits?|entrances?|escape)\b.{0,55}\b(?:block(?:ed|ing)?|obstruct(?:ed|ing|ion)?)\b/i },
  { label: 'fire door repairs', matches: /\b(?:fire )?doors?\b.{0,65}\b(?:repair|replace|closer|seal|intumescent|damage|defect)\b|\b(?:repair|replace|closer|seal|intumescent)\b.{0,65}\b(?:fire )?doors?\b/i },
  { label: 'fire alarm actions', matches: /\b(?:fire )?alarms?\b/i },
  { label: 'fire drill actions', matches: /\bfire drills?\b/i },
  { label: 'storage issues', matches: /\b(?:storage|stacked|stockroom|consumables)\b/i },
  { label: 'emergency lighting actions', matches: /\b(?:emergency|escape) lighting\b/i },
]

function AreaActionSummary({ actions, manager }: { actions: FraPreviewAction[]; manager: string }) {
  const open = actions.filter(action => action.stage !== 'closed')
  const storeCount = new Set(open.map(action => action.storeId || action.code)).size
  const themes = actionThemes.map(theme => ({
    label: theme.label,
    stores: new Set(open.filter(action => theme.matches.test(action.title)).map(action => action.storeId || action.code)).size,
  })).filter(theme => theme.stores > 0).sort((a, b) => b.stores - a.stores).slice(0, 4)

  return <section aria-label={`${manager} action summary`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="text-base font-bold">{manager}&apos;s area</h3>
    <p className="mt-1 text-sm text-slate-600">{open.length} FRA {open.length === 1 ? 'action' : 'actions'} across {storeCount} {storeCount === 1 ? 'store' : 'stores'}</p>
    {themes.length > 0 && <ul className="mt-4 grid gap-2 sm:grid-cols-2">
      {themes.map(theme => <li key={theme.label} className="rounded-xl bg-slate-50 px-4 py-3 text-sm"><strong>{theme.stores} {theme.stores === 1 ? 'store' : 'stores'}</strong> {theme.stores === 1 ? 'has' : 'have'} {theme.label}</li>)}
    </ul>}
  </section>
}

export function FraActionPlansClient({ sourceActions = exampleActions, fraHref, sourceLabel, readOnlyRole, liveMode = false }: { sourceActions?: FraPreviewAction[]; fraHref?: string; sourceLabel?: string; readOnlyRole?: string; liveMode?: boolean }) {
  const [actions, setActions] = useState(sourceActions)
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [actionPdfOpen, setActionPdfOpen] = useState(false)
  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(sourceActions[0].id)
  const [view, setView] = useState<'board' | 'detail'>('board')
  const [audience, setAudience] = useState<'kss' | 'client_admin' | 'area_manager'>(readOnlyRole === 'area_manager' ? 'area_manager' : readOnlyRole === 'client_admin' ? 'client_admin' : 'kss')
  const [selectedArea, setSelectedArea] = useState(sourceActions[0].area)
  const [storeFilter, setStoreFilter] = useState('all')
  const [boardSearch, setBoardSearch] = useState('')
  const [verificationNote, setVerificationNote] = useState('')
  const [bookedDate, setBookedDate] = useState('')
  const [contractor, setContractor] = useState('')
  const [evidence, setEvidence] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [resolution, setResolution] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'review'>('all')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const selected = actions.find((action) => action.id === selectedId) || actions[0]
  const scopedActions = actions.filter(action => (audience !== 'area_manager' || action.area === selectedArea)
    && (storeFilter === 'all' || action.storeId === storeFilter)
    && (!boardSearch.trim() || `${action.store} ${action.code} ${action.title}`.toLowerCase().includes(boardSearch.trim().toLowerCase())))
  const visibleActions = scopedActions.filter((action) => filter === 'all' || (filter === 'open' ? action.stage !== 'review' && action.stage !== 'closed' : action.stage === 'review'))
  const areas = [...new Set(actions.map(action => action.area))].sort()
  const storeChoices = [...new Map(actions.map(action => [action.storeId || action.code, { id: action.storeId || action.code, name: action.store }])).values()].sort((a, b) => a.name.localeCompare(b.name))
  const boardColumns: Array<{ label: string; stages: Stage[] }> = readOnlyRole === 'pdf_review' ? [
    { label: 'PDF rows for review', stages: ['new'] },
  ] : [
    { label: 'New', stages: ['new'] },
    { label: 'Seen', stages: ['seen'] },
    { label: 'Addressed · add evidence', stages: ['booked', 'made_safe'] },
    { label: 'KSS review', stages: ['review'] },
    { label: 'Closed', stages: ['closed'] },
  ]
  const update = (id: string, change: Partial<FraPreviewAction>) => setActions((current) => current.map((action) => action.id === id ? { ...action, ...change } : action))

  async function sendLiveCommand(command: 'acknowledge' | 'approach' | 'close', extra: Record<string, string> = {}) {
    setSaving(true)
    setSaveError('')
    try {
      const response = await fetch('/api/fra-actions/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actionId: selected.id, expectedVersion: selected.version, command, ...extra }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to save action')
      const status = payload.result?.status as string
      const stage: Stage = status === 'acknowledged' ? 'seen' : status === 'visit_booked' ? 'booked' : status === 'work_completed' ? 'made_safe' : status === 'awaiting_verification' ? 'review' : status === 'verified_closed' ? 'closed' : 'new'
      update(selected.id, { stage, version: payload.result?.version, workflow: command === 'approach' ? extra.approach as FraPreviewAction['workflow'] : selected.workflow })
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Unable to save action') }
    finally { setSaving(false) }
  }

  async function submitLiveEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!evidence) return
    setSaving(true)
    setSaveError('')
    try {
      const form = new FormData()
      form.set('actionId', selected.id)
      form.set('expectedVersion', String(selected.version))
      form.set('file', evidence)
      form.set('note', note)
      const response = await fetch('/api/fra-actions/evidence', { method: 'POST', body: form })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to save evidence')
      update(selected.id, { stage: 'review', version: payload.result?.version, evidenceName: evidence.name })
      setEvidence(null)
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Unable to save evidence') }
    finally { setSaving(false) }
  }

  if (readOnlyRole === 'pdf_review' || liveMode) {
    const query = boardSearch.trim().toLowerCase()
    const stores = [...new Map(actions.map(action => [action.storeId || action.code, {
      id: action.storeId || action.code,
      name: action.store,
      code: action.code,
      area: action.area,
      manager: action.areaManager,
    }])).values()].sort((a, b) => a.name.localeCompare(b.name))
    const matchingStores = stores.filter(store => !query || `${store.name} ${store.code}`.toLowerCase().includes(query)
      || actions.some(action => (action.storeId || action.code) === store.id && action.title.toLowerCase().includes(query)))
    const openedStore = stores.find(store => store.id === storeFilter)
    const storeActions = actions.filter(action => (action.storeId || action.code) === storeFilter)
    const managerGroups = [...new Set(stores.map(store => `${store.area}\u0000${store.manager || 'Not confirmed'}`))].sort().map(key => {
      const [area, manager] = key.split('\u0000')
      return { key, area, manager, stores: matchingStores.filter(store => store.area === area && (store.manager || 'Not confirmed') === manager), actions: actions.filter(action => action.area === area && (action.areaManager || 'Not confirmed') === manager) }
    }).filter(group => group.stores.length > 0)

    return <main className="min-h-full bg-[#f5f7f8] px-4 py-7 text-slate-900 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Fire Risk Assessments</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">FRA Action Plans</h1>
        <p className="mt-2 text-sm text-slate-600">{sourceLabel}</p>

        {!openedStore ? <>
          <label className="mt-6 block max-w-md text-sm font-semibold">Find a store
            <input type="search" value={boardSearch} onChange={event => setBoardSearch(event.target.value)} placeholder="Store name, code or action" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal" />
          </label>
          <div className="mt-6 space-y-8">{managerGroups.map(group => <section key={group.key} aria-label={`${group.area} stores`}>
            <AreaActionSummary actions={group.actions} manager={group.manager} />
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{group.stores.map(store => {
              const count = actions.filter(action => (action.storeId || action.code) === store.id).length
              return <button key={store.id} type="button" onClick={() => { setActionModalOpen(false); setStoreFilter(store.id) }} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-indigo-400 hover:shadow-md">
                <span className="block text-lg font-bold">{store.name}</span>
                <span className="mt-1 block text-sm text-slate-600">{store.code} · {store.area}</span>
                <span className="mt-5 block text-sm font-semibold text-indigo-700">{count} FRA {count === 1 ? 'action' : 'actions'} →</span>
                <span className="mt-2 block text-xs text-slate-500">Area Manager: {store.manager || 'Not confirmed'}</span>
              </button>
            })}</div>
          </section>)}</div>
        </> : <>
          <button type="button" onClick={() => { setActionModalOpen(false); setStoreFilter('all') }} className="mt-6 text-sm font-semibold text-indigo-700 hover:underline">← All stores</button>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div><h2 className="text-2xl font-bold">{openedStore.name}</h2><p className="mt-1 text-sm text-slate-600">{openedStore.code} · {openedStore.area} · Area Manager: {openedStore.manager || 'Not confirmed'}</p><p className="mt-3 font-semibold">{storeActions.length} actions from the FRA</p></div>
            {(!liveMode || storeActions.some(action => action.fraAvailable)) && <button type="button" onClick={() => setPdfModalOpen(true)} className="rounded-xl border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-50">Open current FRA PDF</button>}
          </div>
          <div className="mt-4"><AreaActionSummary actions={actions.filter(action => action.area === openedStore.area && (action.areaManager || 'Not confirmed') === (openedStore.manager || 'Not confirmed'))} manager={openedStore.manager || 'Not confirmed'} /></div>
          <Dialog open={pdfModalOpen} onOpenChange={setPdfModalOpen}>
            <DialogContent className="md:top-[3dvh] md:h-[94dvh] md:max-h-[94dvh] md:max-w-[min(96vw,1200px)] md:p-4">
              <DialogTitle className="pr-12 text-lg">{openedStore.name} · Current FRA</DialogTitle>
              <DialogDescription>Review the saved fire risk assessment without leaving the action board.</DialogDescription>
              {pdfModalOpen && <SavedFraPdfViewer key={openedStore.id} url={liveMode ? `/api/fra-actions/pdf?storeId=${encodeURIComponent(openedStore.id)}` : `/api/fra-action-history/pdf?storeId=${encodeURIComponent(openedStore.id)}&kind=current&inline=1`} label={`${openedStore.name} current FRA PDF`} />}
            </DialogContent>
          </Dialog>
          <section aria-label={`${openedStore.name} FRA action board`} className="mt-5 overflow-x-auto pb-3">
            <div className="grid min-w-[1050px] grid-cols-5 gap-3">{[
              { name: 'New', stages: ['new'] }, { name: 'Seen', stages: ['seen'] }, { name: 'Addressed · add evidence', stages: ['booked', 'made_safe'] }, { name: 'KSS review', stages: ['review'] }, { name: 'Closed', stages: ['closed'] },
            ].map(column => {
              const cards = storeActions.filter(action => column.stages.includes(action.stage))
              return <div key={column.name} className="min-h-64 rounded-2xl border border-slate-200 bg-slate-100/80 p-3"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">{column.name}</h3><span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold">{cards.length}</span></div>{cards.map(action => <button key={action.id} type="button" onClick={() => { setSelectedId(action.id); setEvidence(null); setActionPdfOpen(false); setActionModalOpen(true) }} className={`mb-2 w-full rounded-xl border bg-white p-3 text-left shadow-sm hover:border-indigo-400 ${selectedId === action.id ? 'border-indigo-500' : 'border-slate-200'}`}><span className="text-xs font-bold text-indigo-700">{action.priority} priority</span><p className="mt-2 text-sm font-semibold leading-5">{action.title}</p><p className="mt-2 text-xs text-slate-500">{action.detail}</p></button>)}</div>
            })}</div>
          </section>
          <Dialog open={actionModalOpen && storeActions.some(action => action.id === selectedId)} onOpenChange={open => { setActionModalOpen(open); if (!open) setActionPdfOpen(false) }}>
            <DialogContent className={actionPdfOpen ? 'md:top-[3dvh] md:h-[94dvh] md:max-h-[94dvh] md:max-w-[min(96vw,1200px)] md:p-4' : 'md:max-w-xl'}>
            <DialogTitle className="pr-10 text-xl leading-snug">{actionPdfOpen ? `${openedStore.name} · FRA page ${selected.pdfPage}` : selected.title}</DialogTitle>
            <DialogDescription>{actionPdfOpen ? selected.title : `${openedStore.name} · ${selected.priority} priority`}</DialogDescription>
            {actionPdfOpen ? <>
              <button type="button" onClick={() => setActionPdfOpen(false)} className="w-fit text-sm font-semibold text-indigo-700 hover:underline">← Back to action</button>
              <SavedFraPdfViewer key={`${selected.storeId}:${selected.pdfPage}`} url={liveMode ? `/api/fra-actions/pdf?actionId=${encodeURIComponent(selected.id)}` : `/api/fra-action-history/pdf?storeId=${encodeURIComponent(openedStore.id)}&kind=current&inline=1`} label={`${openedStore.name} FRA page ${selected.pdfPage}`} initialPage={selected.pdfPage || 1} />
            </> : <>
            {selected.pdfPage && <button type="button" onClick={() => setActionPdfOpen(true)} className="w-fit text-sm font-semibold text-indigo-700 hover:underline">Open FRA at page {selected.pdfPage} ↗</button>}
            <p className="text-sm font-semibold text-indigo-700">{stageLabel(selected)}</p>
            {selected.stage === 'new' && (!liveMode || readOnlyRole === 'area_manager') && <button type="button" disabled={saving} onClick={() => liveMode ? void sendLiveCommand('acknowledge') : update(selected.id, { stage: 'seen' })} className="mt-5 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">I’ve seen this action</button>}
            {selected.stage === 'seen' && (!liveMode || readOnlyRole === 'area_manager') && <form onSubmit={event => { event.preventDefault(); if (!resolution.trim()) return; if (liveMode) void sendLiveCommand('approach', { approach: 'make_safe', note: resolution.trim() }); else update(selected.id, { workflow: 'make_safe', stage: 'made_safe', resolution: resolution.trim() }) }} className="mt-5 space-y-3"><label className="block text-sm font-semibold">How did you address this action?<textarea required value={resolution} onChange={event => setResolution(event.target.value)} rows={3} placeholder="Briefly describe what you did" className="mt-2 block w-full rounded-lg border border-slate-300 p-2 font-normal" /></label><button type="submit" disabled={saving} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">I&apos;ve addressed this action</button></form>}
            {['booked', 'made_safe'].includes(selected.stage) && (!liveMode || readOnlyRole === 'area_manager') && <form onSubmit={liveMode ? event => { void submitLiveEvidence(event) } : event => { event.preventDefault(); if (evidence) update(selected.id, { stage: 'review', evidenceName: evidence.name }); setEvidence(null) }} className="mt-5"><label className="block text-sm font-semibold">Completion evidence<input required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => setEvidence(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm font-normal" /></label><button type="submit" disabled={saving} className="mt-4 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{liveMode ? 'Send evidence to KSS' : 'Preview evidence submission'}</button></form>}
            {selected.stage === 'review' && <div className="mt-5"><p className="text-sm text-slate-600">{liveMode ? 'Evidence submitted. Awaiting KSS verification.' : `Evidence selected: ${selected.evidenceName}. KSS verifies and closes.`}</p>{liveMode && <a href={`/api/fra-actions/evidence/${encodeURIComponent(selected.id)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-indigo-700 hover:underline">View submitted evidence ↗</a>}{(!liveMode || readOnlyRole === 'admin' || readOnlyRole === 'ops') && (liveMode ? <form onSubmit={event => { event.preventDefault(); void sendLiveCommand('close', { note: verificationNote }) }} className="mt-3"><label className="block text-sm">Verification note<textarea required value={verificationNote} onChange={event => setVerificationNote(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label><button type="submit" disabled={saving} className="mt-3 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Verify and close</button></form> : <button type="button" onClick={() => update(selected.id, { stage: 'closed' })} className="mt-4 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white">Preview KSS closure</button>)}</div>}
            {selected.stage === 'closed' && <p className="mt-5 font-semibold text-emerald-700">Closed by KSS</p>}
            {!liveMode && selected.stage !== 'new' && <button type="button" onClick={() => { update(selected.id, { stage: 'new', workflow: null, evidenceName: undefined, bookedDate: undefined, contractor: undefined, resolution: undefined }); setEvidence(null) }} className="mt-5 w-fit text-sm font-semibold text-slate-600 hover:text-indigo-700 hover:underline">Move back to New</button>}
            {saveError && <p role="alert" className="mt-4 text-sm text-red-700">{saveError}</p>}
            {!liveMode && <p className="mt-5 text-xs text-slate-500">Changes in this preview are not saved.</p>}
            </>}
            </DialogContent>
          </Dialog>
        </>}
      </div>
    </main>
  }

  return (
    <div className="min-h-full bg-[#f5f7f8] px-4 py-7 text-slate-900 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Fire Risk Assessments</p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">FRA Action Plans</h1>
            <p className="mt-2 text-sm text-slate-600">{sourceLabel || 'See what needs doing across your stores and update each action as work progresses.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">{(selected.fraAvailable || fraHref) && <a href={selected.storeId ? `/api/fra-action-history/pdf?storeId=${encodeURIComponent(selected.storeId)}&kind=current` : fraHref} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-50">Open current FRA PDF ↗</a>}<div className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">Local preview · unverified candidates</div></div>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><button type="button" onClick={() => setView('board')} aria-pressed={view === 'board'} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === 'board' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Board</button><button type="button" onClick={() => setView('detail')} aria-pressed={view === 'detail'} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === 'detail' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Action detail</button></div>{!readOnlyRole && <div className="flex flex-wrap items-center gap-2"><label htmlFor="fra-board-view" className="text-xs font-semibold text-slate-600">Preview as</label><select id="fra-board-view" value={audience} onChange={event => { setAudience(event.target.value as typeof audience); setView('board'); setStoreFilter('all') }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="kss">KSS admin · all stores</option><option value="client_admin">Footasylum client admin · all stores</option><option value="area_manager">Area Manager · selected area</option></select>{audience === 'area_manager' && <select aria-label="Preview area" value={selectedArea} onChange={event => { setSelectedArea(event.target.value); setStoreFilter('all'); setSelectedId(actions.find(action => action.area === event.target.value)?.id || selectedId) }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{areas.map(area => <option key={area} value={area}>{area}</option>)}</select>}</div>}</div>
          <div className="mt-4 flex flex-wrap gap-3"><label className="min-w-[210px] flex-1 text-xs font-semibold text-slate-600">Store<select value={storeFilter} onChange={event => { setStoreFilter(event.target.value); setSelectedId(actions.find(action => event.target.value === 'all' || action.storeId === event.target.value)?.id || selectedId) }} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"><option value="all">All stores</option>{storeChoices.filter(store => audience !== 'area_manager' || actions.some(action => action.storeId === store.id && action.area === selectedArea)).map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label><label className="min-w-[210px] flex-1 text-xs font-semibold text-slate-600">Find action<input type="search" value={boardSearch} onChange={event => setBoardSearch(event.target.value)} placeholder="Store or action wording" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label></div>
          <p className="mt-3 text-xs text-slate-600">{readOnlyRole === 'pdf_review' ? 'These are exact rows extracted from FRA PDFs. They are awaiting review and cannot be progressed here.' : readOnlyRole ? 'Action progress is read only until the scoped workflow is deployed.' : 'This is a role preview inside a KSS admin session. It does not grant client or manager access. Open a card and complete its steps to move it across the board in this browser only.'}</p>
        </div>

        {audience === 'area_manager' && <div className="mb-5"><AreaActionSummary actions={actions.filter(action => action.area === selectedArea)} manager={actions.find(action => action.area === selectedArea)?.areaManager || selectedArea} /></div>}

        {view === 'board' && <section aria-label="FRA action board" className="overflow-x-auto pb-3"><div className={readOnlyRole === 'pdf_review' ? 'grid grid-cols-1 gap-3' : 'grid min-w-[1100px] grid-cols-5 gap-3'}>{boardColumns.map(column => {
          const cards = scopedActions.filter(action => column.stages.includes(action.stage))
          return <div key={column.label} className="rounded-2xl border border-slate-200 bg-slate-100/70 p-3"><div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-bold">{column.label}</h2><span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold">{cards.length}</span></div><div className={readOnlyRole === 'pdf_review' ? 'grid max-h-[65vh] gap-2 overflow-y-auto md:grid-cols-2 xl:grid-cols-3' : 'max-h-[65vh] space-y-2 overflow-y-auto'}>{cards.map(action => <button key={action.id} type="button" onClick={() => { setSelectedId(action.id); setView('detail'); setEvidence(null); setNote(''); setResolution('') }} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-indigo-400 hover:shadow-md"><span className="block text-xs font-bold text-indigo-700">{action.store} · {action.code}</span><span className="mt-2 line-clamp-4 block text-sm font-semibold leading-5">{action.title}</span><span className="mt-2 block text-xs text-slate-600">{readOnlyRole === 'pdf_review' ? 'PDF row · current status unverified' : statusLabelForBoard(action)}</span><span className="mt-3 block border-t border-slate-100 pt-2 text-xs text-slate-500">Area Manager: {action.areaManager || 'Not confirmed'}</span></button>)}{cards.length === 0 && <p className="px-2 py-5 text-center text-xs text-slate-500">No cards</p>}</div></div>
        })}</div></section>}

        {view === 'detail' && <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section aria-label="Store actions" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5">
              <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{sourceLabel ? 'Stored recommendations' : 'Your store actions'}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{scopedActions.length}</span></div>
              <div className="mt-4 flex gap-2" role="group" aria-label="Filter actions">
                {(['all', 'open', 'review'] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{value === 'all' ? 'All' : value === 'open' ? 'To do' : 'KSS review'}</button>)}
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {visibleActions.map((action, index) => <div key={action.id}>
                {(index === 0 || visibleActions[index - 1].code !== action.code) && <h3 className="bg-slate-50 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600">{action.store} · {action.code}</h3>}
                <button type="button" onClick={() => { setSelectedId(action.id); setBookedDate(''); setContractor(''); setEvidence(null); setNote(''); setResolution('') }} className={`flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-slate-50 ${selectedId === action.id ? 'bg-indigo-50/60' : ''}`}>
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${action.priority === 'High' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                <span className="min-w-0 flex-1"><span className="block font-semibold leading-snug">{action.title}</span><span className="mt-2 block text-xs text-slate-600">{stageLabel(action)}</span></span>
                <ChevronRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </div>)}
              {visibleActions.length === 0 && <p className="px-5 py-8 text-sm text-slate-500">No actions in this view.</p>}
            </div>
          </section>

          <section aria-label="Selected action" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500"><span>{selected.area}</span><span>·</span><span>{selected.store}</span><span>·</span><span>{selected.code}</span></div>
            <p className="mt-2 text-xs text-slate-500">Area Manager: {selected.areaManager || 'Not confirmed'}</p>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3"><h2 className="max-w-xl text-2xl font-bold leading-tight">{selected.title}</h2><span className={`rounded-full px-3 py-1 text-xs font-bold ${selected.priority === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{selected.priority} priority</span></div>
            <p className="mt-3 max-w-2xl text-slate-600">{selected.detail}</p>

            <div className="mt-8 grid grid-cols-3 gap-2 border-b border-slate-200 pb-7 text-center text-xs font-semibold sm:gap-4 sm:text-sm">
              {[{ name: 'Seen', icon: Eye, done: selected.stage !== 'new' }, { name: selected.workflow === 'repair' ? 'Works booked' : 'Action recorded', icon: CalendarDays, done: ['booked', 'made_safe', 'review', 'closed'].includes(selected.stage) }, { name: 'Evidence sent', icon: FileUp, done: ['review', 'closed'].includes(selected.stage) }].map((step, index) => <div key={step.name} className="flex flex-col items-center gap-2"><div className={`flex h-10 w-10 items-center justify-center rounded-full ${step.done ? 'bg-emerald-100 text-emerald-700' : index === 0 && selected.stage === 'new' || index === 1 && selected.stage === 'seen' || index === 2 && ['booked', 'made_safe'].includes(selected.stage) ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-400'}`}>{step.done ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}</div><span>{step.name}</span></div>)}
            </div>

            <div className="mt-7 max-w-xl">
              {selected.stage === 'new' && audience === 'area_manager' && !readOnlyRole && <><h3 className="text-lg font-bold">Have you seen this action?</h3><p className="mt-2 text-sm text-slate-600">Acknowledge it, then choose how you would address it.</p><button type="button" onClick={() => update(selected.id, { stage: 'seen' })} className="mt-5 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800">I’ve seen this action</button></>}
              {selected.stage === 'seen' && audience === 'area_manager' && !readOnlyRole && <div className="mb-5"><h3 className="text-lg font-bold">How will you address this?</h3><p className="mt-2 text-sm text-slate-600">Choose the route that fits the action. KSS checks the evidence before closure.</p><div className="mt-4 flex flex-wrap gap-2">{([['make_safe','Completed now'],['repair','Work to book'],['management','Management control'],['other','Another approach']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => update(selected.id, { workflow: value })} aria-pressed={selected.workflow === value} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${selected.workflow === value ? 'border-indigo-700 bg-indigo-50 text-indigo-800' : 'border-slate-300 text-slate-600'}`}>{label}</button>)}</div></div>}
              {selected.stage === 'seen' && audience === 'area_manager' && !readOnlyRole && selected.workflow !== null && selected.workflow !== 'repair' && <form onSubmit={(event) => { event.preventDefault(); if (resolution.trim()) update(selected.id, { stage: 'made_safe', resolution: resolution.trim() }) }}><h4 className="font-bold">What have you done?</h4><p className="mt-2 text-sm text-slate-600">Describe the action taken and how it addresses this recommendation.</p><label className="mt-5 block text-sm font-semibold">Action taken<textarea required value={resolution} onChange={(event) => setResolution(event.target.value)} rows={3} placeholder="Describe what was done, by whom, and the result" className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label><button type="submit" className="mt-5 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800">Record action taken</button></form>}
              {selected.stage === 'seen' && audience === 'area_manager' && !readOnlyRole && selected.workflow === 'repair' && <form onSubmit={(event) => { event.preventDefault(); if (bookedDate && contractor.trim()) update(selected.id, { stage: 'booked', bookedDate, contractor: contractor.trim() }) }}><h3 className="text-lg font-bold">When are the works booked?</h3><p className="mt-2 text-sm text-slate-600">Add the booking details so everyone can see the next step.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Works date<input required type="date" value={bookedDate} onChange={(event) => setBookedDate(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-semibold">Who is doing the work?<input required value={contractor} onChange={(event) => setContractor(event.target.value)} placeholder="Contractor or maintenance team" className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label></div><button type="submit" className="mt-5 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800">Save works booking</button></form>}
              {['booked', 'made_safe'].includes(selected.stage) && audience === 'area_manager' && !readOnlyRole && <form onSubmit={(event) => { event.preventDefault(); if (evidence) update(selected.id, { stage: 'review', evidenceName: evidence.name }) }}><h3 className="text-lg font-bold">Show the completed action</h3><p className="mt-2 text-sm text-slate-600">{selected.workflow === 'repair' ? `Works booked for ${selected.bookedDate} with ${selected.contractor}. Select a photo or document when the work is done.` : `${selected.resolution} Select a photo or document showing the outcome.`}</p><label className="mt-5 block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold">Completion evidence<input required type="file" accept="image/*,.pdf" onChange={(event) => setEvidence(event.target.files?.[0] || null)} className="mt-3 block w-full text-sm font-normal" /></label><label className="mt-4 block text-sm font-semibold">Note for KSS <span className="font-normal text-slate-500">(optional)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="What was done?" className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label><button type="submit" className="mt-5 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800">Preview evidence submission</button></form>}
              {selected.stage === 'review' && <div className="rounded-xl bg-emerald-50 p-5"><ShieldCheck className="h-7 w-7 text-emerald-700" /><h3 className="mt-3 text-lg font-bold">Awaiting KSS review</h3><p className="mt-2 text-sm text-slate-700">{selected.evidenceName} was selected for this preview. KSS would verify the evidence before closing a live action.</p></div>}
              {selected.stage === 'review' && audience === 'kss' && !readOnlyRole && <form onSubmit={event => { event.preventDefault(); if (verificationNote.trim()) update(selected.id, { stage: 'closed' }) }} className="mt-4"><label className="block text-sm font-semibold">KSS verification note<textarea required value={verificationNote} onChange={event => setVerificationNote(event.target.value)} rows={3} className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label><button type="submit" className="mt-4 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white">Preview KSS closure</button></form>}
              {selected.stage === 'closed' && <div className="rounded-xl bg-emerald-50 p-5"><ShieldCheck className="h-7 w-7 text-emerald-700" /><h3 className="mt-3 text-lg font-bold">Closed by KSS</h3></div>}
              {audience !== 'area_manager' && selected.stage !== 'review' && selected.stage !== 'closed' && <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">{readOnlyRole === 'pdf_review' ? 'KSS must check whether this PDF row is a remedial action and whether work has already been completed.' : audience === 'client_admin' ? 'Client Admin can view estate progress. Area Managers record progress on their assigned stores.' : readOnlyRole ? 'Action progress is read only here.' : 'Switch to Area Manager preview to move this card through the remediation steps.'}</p>}
            </div>
          </section>
        </div>}
        <p className="mt-5 text-xs text-slate-500">{readOnlyRole === 'pdf_review' ? 'These rows were extracted from the PDF action-plan pages. Remedial classification, current completion and publication provenance need review before any row becomes a live action.' : 'These are stored FRA recommendations awaiting KSS classification and a check against the issued PDF. They are not confirmed open actions. Preview changes and selected files are not saved or sent.'}</p>
      </div>
    </div>
  )
}
