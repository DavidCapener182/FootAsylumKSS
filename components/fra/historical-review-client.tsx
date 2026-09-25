'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DECISION_LABELS,
  HISTORICAL_DECISIONS,
  blankCandidateReview,
  candidateQueue,
  candidateReviewErrors,
  isCandidateReviewShape,
  isLegacyInvestigationShape,
  legacyInvestigationErrors,
  legacyQueue,
  type CandidateReview,
  type HistoricalCandidate,
  type HistoricalReviewInventory,
  type HistoricalStore,
  type LegacyInvestigation,
} from './historical-review-model'

type Queue = 'candidates' | 'legacy'
type CandidateFilter = 'all' | 'confirmed' | 'unconfirmed' | 'recorded' | 'unrecorded'

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
const labelClass = 'block text-sm font-medium text-slate-700'

function downloadDraft(inventory: HistoricalReviewInventory, candidateReviews: Record<string, CandidateReview>, legacyInvestigations: Record<string, LegacyInvestigation>) {
  const contents = JSON.stringify({
    kind: 'fra_historical_review_draft_v1',
    sourceGeneratedAt: inventory.generatedAt,
    projectId: inventory.projectId,
    exportedAt: new Date().toISOString(),
    candidateReviews,
    legacyInvestigations,
  }, null, 2)
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `fra-history-review-draft-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function badge(text: string, tone: 'blue' | 'amber' | 'green' | 'slate' = 'slate') {
  const tones = {
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-900',
    green: 'bg-emerald-100 text-emerald-800',
    slate: 'bg-slate-100 text-slate-700',
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{text}</span>
}

export function HistoricalReviewClient({ inventory, reviewerId }: { inventory: HistoricalReviewInventory; reviewerId: string }) {
  const candidates = useMemo(() => candidateQueue(inventory), [inventory])
  const legacyStores = useMemo(() => legacyQueue(inventory), [inventory])
  const stores = useMemo(() => new Map(inventory.storeInventory.map(store => [store.storeId, store])), [inventory])
  const assessments = useMemo(() => new Map(inventory.assessmentInventory.map(assessment => [assessment.instanceId, assessment])), [inventory])
  const [queue, setQueue] = useState<Queue>('candidates')
  const [filter, setFilter] = useState<CandidateFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedCandidateKey, setSelectedCandidateKey] = useState(candidates[0]?.stagingKey || '')
  const [selectedStoreId, setSelectedStoreId] = useState(legacyStores[0]?.storeId || '')
  const [selectedCandidateStoreId, setSelectedCandidateStoreId] = useState(candidates[0]?.storeId || '')
  const [candidateReviews, setCandidateReviews] = useState<Record<string, CandidateReview>>({})
  const [legacyInvestigations, setLegacyInvestigations] = useState<Record<string, LegacyInvestigation>>({})
  const [importMessage, setImportMessage] = useState('')

  const lowerSearch = search.trim().toLowerCase()
  const visibleCandidates = candidates.filter(candidate => {
    const store = stores.get(candidate.storeId)
    const matchesSearch = !lowerSearch || [store?.storeName, candidate.storeCode, candidate.recommendation]
      .some(value => value?.toLowerCase().includes(lowerSearch))
    const recorded = Boolean(candidateReviews[candidate.stagingKey])
    const matchesFilter = filter === 'all'
      || (filter === 'confirmed' && Boolean(candidate.publicationId))
      || (filter === 'unconfirmed' && !candidate.publicationId)
      || (filter === 'recorded' && recorded)
      || (filter === 'unrecorded' && !recorded)
    return matchesSearch && matchesFilter
  })
  const visibleLegacy = legacyStores.filter(store => !lowerSearch
    || [store.storeCode, store.storeName].some(value => value?.toLowerCase().includes(lowerSearch)))
  const candidateStores = [...new Set(visibleCandidates.map(candidate => candidate.storeId))]
    .map(id => stores.get(id)).filter((store): store is HistoricalStore => Boolean(store))
    .sort((left, right) => left.storeName.localeCompare(right.storeName))
  const activeCandidateStoreId = candidateStores.some(store => store.storeId === selectedCandidateStoreId)
    ? selectedCandidateStoreId : candidateStores[0]?.storeId
  const storeCandidates = visibleCandidates.filter(candidate => candidate.storeId === activeCandidateStoreId)
  const selectedCandidate = storeCandidates.find(candidate => candidate.stagingKey === selectedCandidateKey) || storeCandidates[0]
  const selectedStore = visibleLegacy.find(store => store.storeId === selectedStoreId) || visibleLegacy[0]

  async function importDraft(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 2_000_000) throw new Error('Review draft exceeds the 2 MB local import limit.')
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>
      if (parsed.kind !== 'fra_historical_review_draft_v1'
        || parsed.sourceGeneratedAt !== inventory.generatedAt
        || parsed.projectId !== inventory.projectId) {
        throw new Error('This draft belongs to a different inventory snapshot or project.')
      }
      const rawReviews = parsed.candidateReviews
      const rawLegacy = parsed.legacyInvestigations
      if (!rawReviews || typeof rawReviews !== 'object' || Array.isArray(rawReviews)
        || !rawLegacy || typeof rawLegacy !== 'object' || Array.isArray(rawLegacy)) {
        throw new Error('The review draft has an invalid shape.')
      }
      const byKey = new Map(candidates.map(candidate => [candidate.stagingKey, candidate]))
      const byStore = new Map(legacyStores.map(store => [store.storeId, store]))
      const reviews: Record<string, CandidateReview> = {}
      const investigations: Record<string, LegacyInvestigation> = {}
      for (const [key, value] of Object.entries(rawReviews)) {
        const candidate = byKey.get(key)
        if (!candidate || !isCandidateReviewShape(value) || value.reviewerId !== reviewerId
          || candidateReviewErrors(value, candidate).length) {
          throw new Error(`Candidate review ${key} needs fresh local verification.`)
        }
        reviews[key] = value
      }
      for (const [key, value] of Object.entries(rawLegacy)) {
        const store = byStore.get(key)
        if (!store || !isLegacyInvestigationShape(value) || value.reviewerId !== reviewerId
          || legacyInvestigationErrors(value, store).length) {
          throw new Error(`Store investigation ${key} needs fresh local verification.`)
        }
        investigations[key] = value
      }
      setCandidateReviews(reviews)
      setLegacyInvestigations(investigations)
      setImportMessage(`Loaded ${Object.keys(reviews).length} candidate decisions and ${Object.keys(investigations).length} store investigations. These remain local drafts.`)
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Unable to load review draft.')
    }
  }

  return (
    <div className="min-h-full bg-[#0d1927] p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-[1560px] space-y-5">
        <header className="rounded-2xl border border-slate-700 bg-[#14243a] p-5 text-white shadow-xl sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">Local KSS review · no database writes</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Historical FRA action review</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Stored recommendations are candidates, not verified open actions. Compare each item with the exact issued PDF and current completion evidence before recording a decision.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadDraft(inventory, candidateReviews, legacyInvestigations)} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">Download local draft</button>
              <label htmlFor="fra-review-import" className="cursor-pointer rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Load local draft</label>
              <input id="fra-review-import" type="file" accept="application/json,.json" className="sr-only" onChange={event => {
                void importDraft(event.currentTarget.files?.[0]); event.currentTarget.value = ''
              }} />
            </div>
          </div>
          <p className="mt-5 text-xs text-slate-400">Review draft stays in this browser tab until you download it.</p>
          {importMessage && <p role="status" className="mt-3 rounded-lg bg-slate-700 px-3 py-2 text-sm text-white">{importMessage}</p>}
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(320px,390px)_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-200 p-4">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={queue === 'candidates'} onClick={() => setQueue('candidates')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${queue === 'candidates' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'}`}>Stores with actions · {candidateStores.length}</button>
                <button type="button" aria-pressed={queue === 'legacy'} onClick={() => setQueue('legacy')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${queue === 'legacy' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'}`}>FRA to find · {legacyStores.length}</button>
              </div>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor="fra-history-search">Search store or recommendation</label>
              <input id="fra-history-search" type="search" value={search} onChange={event => setSearch(event.target.value)} className={inputClass} placeholder="Store code, name or finding" />
              {queue === 'candidates' && <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-600">Filter
                <select value={filter} onChange={event => setFilter(event.target.value as CandidateFilter)} className={inputClass}>
                  <option value="all">All candidates</option><option value="confirmed">Confirmed publication linked</option>
                  <option value="unconfirmed">No confirmed publication</option><option value="recorded">Local decision recorded</option>
                  <option value="unrecorded">Awaiting local decision</option>
                </select>
              </label>}
            </div>
            <div className="max-h-[68vh] space-y-1 overflow-y-auto p-2" aria-label={queue === 'candidates' ? 'Stores with candidate actions' : 'Stores needing an FRA source'}>
              {queue === 'candidates' ? candidateStores.map(store => {
                const actions = visibleCandidates.filter(candidate => candidate.storeId === store.storeId)
                const chosen = activeCandidateStoreId === store.storeId
                const reviewed = actions.filter(candidate => candidateReviews[candidate.stagingKey]).length
                return <button key={store.storeId} type="button" onClick={() => { setSelectedCandidateStoreId(store.storeId); setSelectedCandidateKey(actions[0]?.stagingKey || '') }} aria-current={chosen ? 'true' : undefined} className={`w-full rounded-xl border p-4 text-left transition-colors ${chosen ? 'border-indigo-400 bg-indigo-50' : 'border-transparent hover:bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-2"><span className="text-sm font-bold text-slate-900">{store.storeCode ? `${store.storeCode} · ` : ''}{store.storeName}</span><span className="shrink-0 text-xs font-semibold text-slate-600">{actions.length} actions</span></div>
                  <p className="mt-1 text-xs text-slate-600">{reviewed} reviewed · {store.latestFraDate ? `FRA ${store.latestFraDate}` : 'FRA date unknown'}</p>
                </button>
              }) : visibleLegacy.map(store => {
                const chosen = selectedStore?.storeId === store.storeId
                const saved = legacyInvestigations[store.storeId]
                return <button key={store.storeId} type="button" onClick={() => setSelectedStoreId(store.storeId)} aria-current={chosen ? 'true' : undefined} className={`w-full rounded-xl border p-3 text-left transition-colors ${chosen ? 'border-indigo-400 bg-indigo-50' : 'border-transparent hover:bg-slate-50'}`}>
                  <div className="text-sm font-semibold">{store.storeCode ? `${store.storeCode} · ` : ''}{store.storeName}</div>
                  <p className="mt-1 text-xs text-slate-600">FRA date {store.latestFraDate || 'unknown'} · {store.currentFraPdfReference ? 'Current PDF reference exists' : 'No current PDF reference'}</p>
                  <div className="mt-2">{saved ? badge(`Local status: ${saved.status.replaceAll('_', ' ')}`, 'green') : badge('Source investigation needed', 'amber')}</div>
                </button>
              })}
              {(queue === 'candidates' ? candidateStores.length === 0 : visibleLegacy.length === 0) && <p className="p-4 text-sm text-slate-500">No stores match this search or filter.</p>}
            </div>
          </aside>

          <section aria-label="Selected historical review" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6">
            {queue === 'candidates' && selectedCandidate && <>
              <div className="mb-6 border-b border-slate-200 pb-5">
                <h2 className="text-xl font-bold">{stores.get(selectedCandidate.storeId)?.storeName}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {stores.get(selectedCandidate.storeId)?.currentFraPdfReference && <Link href={`/api/fra-action-history/pdf?storeId=${encodeURIComponent(selectedCandidate.storeId)}&kind=current`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">Open current FRA PDF ↗</Link>}
                  <span className="text-xs text-slate-600">{storeCandidates.length} stored recommendations · review before treating any as an open action</span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">{storeCandidates.map((candidate, index) => <button key={candidate.stagingKey} type="button" onClick={() => setSelectedCandidateKey(candidate.stagingKey)} className={`rounded-lg border p-3 text-left text-sm ${selectedCandidate.stagingKey === candidate.stagingKey ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}><span className="mb-1 block text-xs font-bold text-slate-500">Action {index + 1} · {candidateReviews[candidate.stagingKey] ? 'Reviewed' : 'Needs review'}</span><span className="line-clamp-2">{candidate.recommendation || 'Wording missing'}</span></button>)}</div>
              </div>
              <CandidateEditor
              key={`${selectedCandidate.stagingKey}:${candidateReviews[selectedCandidate.stagingKey]?.reviewedAt || ''}`}
              candidate={selectedCandidate}
              store={stores.get(selectedCandidate.storeId)}
              assessmentDate={assessments.get(selectedCandidate.assessmentInstanceId)?.conductedAt || null}
              reviewerId={reviewerId}
              saved={candidateReviews[selectedCandidate.stagingKey]}
              onRecord={review => setCandidateReviews(current => ({ ...current, [review.stagingKey]: review }))}
            /></>}
            {queue === 'legacy' && selectedStore && <LegacyEditor
              key={`${selectedStore.storeId}:${legacyInvestigations[selectedStore.storeId]?.reviewedAt || ''}`}
              store={selectedStore}
              reviewerId={reviewerId}
              saved={legacyInvestigations[selectedStore.storeId]}
              onRecord={review => setLegacyInvestigations(current => ({ ...current, [review.storeId]: review }))}
            />}
            {(queue === 'candidates' && !selectedCandidate || queue === 'legacy' && !selectedStore) && <p className="text-sm text-slate-500">Select a row to review.</p>}
          </section>
        </div>
      </div>
    </div>
  )
}

function CandidateEditor({ candidate, store, assessmentDate, reviewerId, saved, onRecord }: {
  candidate: HistoricalCandidate
  store: HistoricalStore | undefined
  assessmentDate: string | null
  reviewerId: string
  saved: CandidateReview | undefined
  onRecord: (review: CandidateReview) => void
}) {
  const [form, setForm] = useState<CandidateReview>(saved || blankCandidateReview(candidate, reviewerId))
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const set = <K extends keyof CandidateReview>(key: K, value: CandidateReview[K]) => setForm(current => ({ ...current, [key]: value }))

  function record() {
    const review = { ...form, reviewerId, reviewedAt: new Date().toISOString() }
    const problems = candidateReviewErrors(review, candidate)
    setErrors(problems)
    if (problems.length) { setMessage(''); return }
    onRecord(review)
    setMessage('Decision recorded in this local draft. Download the draft to keep it.')
  }

  return <div className="space-y-6">
    <div className="border-b border-slate-200 pb-5">
      <div className="flex flex-wrap items-center gap-2">{badge('Stored recommendation', 'blue')}{candidate.publicationId ? badge('Issued FRA available', 'blue') : badge('Issued FRA not confirmed', 'amber')}{saved && badge('Local decision recorded', 'green')}</div>
      <h2 className="mt-3 text-xl font-bold text-slate-900">{store?.storeCode ? `${store.storeCode} · ` : ''}{store?.storeName || 'Unknown store'}</h2>
      <p className="mt-1 text-sm text-slate-600">Assessment {assessmentDate ? assessmentDate.slice(0, 10) : 'date unknown'} · source row {candidate.sourceOrdinal} · current completion unknown</p>
      <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">Stored wording · not yet checked against issued PDF</p>
        <p className="mt-2 text-sm leading-6 text-slate-900">{candidate.recommendation || 'No wording stored'}</p>
        <p className="mt-2 text-xs text-slate-600">Stored priority {candidate.priority || 'unknown'}{candidate.dueNote ? ` · Due note: ${candidate.dueNote}` : ''}</p>
      </div>
      {candidate.publicationId && <Link href={`/api/fra-action-history/pdf?storeId=${encodeURIComponent(candidate.storeId)}&kind=issued&instanceId=${encodeURIComponent(candidate.assessmentInstanceId)}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-lg border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-50">Open issued FRA PDF ↗</Link>}
      <details className="mt-4 rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-800">Source provenance and review flags</summary>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div><dt className="font-semibold">Store ID</dt><dd className="break-all">{candidate.storeId}</dd></div>
          <div><dt className="font-semibold">FRA instance</dt><dd className="break-all">{candidate.assessmentInstanceId}</dd></div>
          <div><dt className="font-semibold">Response / JSON path</dt><dd className="break-all">{candidate.responseId} · {candidate.sourceJsonPath}</dd></div>
          <div><dt className="font-semibold">Source item SHA-256</dt><dd className="break-all">{candidate.sourceItemSha256}</dd></div>
          <div><dt className="font-semibold">Publication ID</dt><dd className="break-all">{candidate.publicationId || 'Not confirmed'}</dd></div>
          <div><dt className="font-semibold">Publication PDF</dt><dd className="break-all">{candidate.confirmedPdfPath || 'Not confirmed'}</dd></div>
          <div className="sm:col-span-2"><dt className="font-semibold">Publication PDF SHA-256</dt><dd className="break-all">{candidate.confirmedPdfSha256 || 'Not confirmed'}</dd></div>
          <div className="sm:col-span-2"><dt className="font-semibold">Review flags</dt><dd>{candidate.reviewFlags.join(' · ')}</dd></div>
        </dl>
      </details>
      {!candidate.publicationId && store?.currentFraPdfReference && <p className="mt-3 text-xs text-amber-800">The current store FRA is available above. Check whether it is the issued source for this action before recording a decision.</p>}
    </div>

    <section className="space-y-4">
      <h3 className="text-base font-bold text-slate-900">1. Decision and provenance</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Decision
          <select value={form.decision} onChange={event => set('decision', event.target.value as CandidateReview['decision'])} className={inputClass}>
            {HISTORICAL_DECISIONS.map(decision => <option key={decision} value={decision}>{DECISION_LABELS[decision]}</option>)}
          </select>
        </label>
        <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">This decision is recorded under your signed-in KSS account in the local draft.</div>
      </div>
      <label className={labelClass}>Reason for decision
        <textarea value={form.comment} onChange={event => set('comment', event.target.value)} rows={3} className={inputClass} placeholder="What did you check, and why is this decision justified?" />
      </label>
      <label className={labelClass}>Missing evidence or next check
        <textarea value={form.missingEvidenceReason} onChange={event => set('missingEvidenceReason', event.target.value)} rows={2} className={inputClass} placeholder="Required for Unable to verify; name the specific missing PDF, record or person to check." />
      </label>
    </section>

    <section className="space-y-4 border-t border-slate-200 pt-5">
      <h3 className="text-base font-bold text-slate-900">2. Check the issued FRA</h3>
      <p className="text-xs text-slate-600">Open the PDF above, then check the page and exact action wording.</p>
      <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">PDF record details for KSS</summary>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Issued PDF storage path
          <input value={form.issuedPdfPath} onChange={event => set('issuedPdfPath', event.target.value)} className={inputClass} placeholder="fra/.../published/...pdf" />
        </label>
        <label className={labelClass}>Issued PDF SHA-256
          <input value={form.issuedPdfSha256} onChange={event => set('issuedPdfSha256', event.target.value)} className={inputClass} placeholder="64 hexadecimal characters" />
        </label>
      </div></details>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>PDF page number
          <input inputMode="numeric" value={form.issuedPdfPage} onChange={event => set('issuedPdfPage', event.target.value)} className={inputClass} placeholder="Page containing the action plan" />
        </label>
        <label className={labelClass}>PDF action row number
          <input inputMode="numeric" value={form.issuedPdfRow} onChange={event => set('issuedPdfRow', event.target.value)} className={inputClass} placeholder="Required row in issued action plan" />
        </label>
      </div>
      <label className={labelClass}>Exact wording in issued PDF
        <textarea value={form.issuedActionText} onChange={event => set('issuedActionText', event.target.value)} rows={3} className={inputClass} placeholder="Transcribe the issued recommendation; do not assume the stored text matches." />
      </label>
      <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <label className="flex items-start gap-2"><input type="checkbox" checked={form.pdfIdentityChecked} onChange={event => set('pdfIdentityChecked', event.target.checked)} className="mt-1" />I checked store, FRA date and PDF identity.</label>
        <label className="flex items-start gap-2"><input type="checkbox" checked={form.actionTextMatched} onChange={event => set('actionTextMatched', event.target.checked)} className="mt-1" />I found this exact action on the issued PDF page.</label>
      </div>
    </section>

    <section className="space-y-4 border-t border-slate-200 pt-5">
      <h3 className="text-base font-bold text-slate-900">3. Action classification and completion</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelClass}>Origin
          <select value={form.fraOrigin} onChange={event => set('fraOrigin', event.target.value as CandidateReview['fraOrigin'])} className={inputClass}><option value="unknown">Unknown</option><option value="confirmed">Confirmed FRA origin</option><option value="not_fra">Not an FRA action</option></select>
        </label>
        <label className={labelClass}>Kind
          <select value={form.actionKind} onChange={event => set('actionKind', event.target.value as CandidateReview['actionKind'])} className={inputClass}><option value="unknown">Unknown</option><option value="remedial">Remedial action</option><option value="routine">Routine advice</option></select>
        </label>
        <label className={labelClass}>Current completion
          <select value={form.completion} onChange={event => set('completion', event.target.value as CandidateReview['completion'])} className={inputClass}><option value="unknown">Unknown</option><option value="open">Evidence supports still open</option><option value="closed">Evidence supports completed</option></select>
        </label>
      </div>
      <label className={labelClass}>Completion or origin evidence reference
        <input value={form.completionEvidenceRef} onChange={event => set('completionEvidenceRef', event.target.value)} className={inputClass} placeholder="Certificate, work order, photo, email, H&S source or dated record" />
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.completionEvidenceChecked} onChange={event => set('completionEvidenceChecked', event.target.checked)} className="mt-1" />I checked the current completion evidence rather than inferring status from the FRA date.</label>
    </section>

    <section className="space-y-4 border-t border-slate-200 pt-5">
      <h3 className="text-base font-bold text-slate-900">4. Priority, target and duplicate check</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelClass}>Confirmed priority
          <select value={form.priority} onChange={event => set('priority', event.target.value as CandidateReview['priority'])} className={inputClass}><option value="">Unknown</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select>
        </label>
        <label className={labelClass}>Target date, if evidenced
          <input type="date" value={form.targetDate} onChange={event => set('targetDate', event.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>Duplicate disposition
          <select value={form.duplicateDisposition} onChange={event => set('duplicateDisposition', event.target.value as CandidateReview['duplicateDisposition'])} className={inputClass}><option value="unknown">Unknown</option><option value="new">No existing FRA action</option><option value="link_existing">Link existing action</option></select>
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.priorityAndTargetChecked} onChange={event => set('priorityAndTargetChecked', event.target.checked)} className="mt-1" />I checked priority and entered a target date only if evidenced.</label>
      <label className={labelClass}>Target date evidence reference, if a date is entered
        <input value={form.targetDateEvidenceRef} onChange={event => set('targetDateEvidenceRef', event.target.value)} className={inputClass} placeholder="Issued FRA page, approved programme or manager record" />
      </label>
      <label className={labelClass}>Existing FRA action ID if linking a duplicate
        <input value={form.linkedActionId} onChange={event => set('linkedActionId', event.target.value)} className={inputClass} placeholder="UUID of existing FRA action" />
      </label>
    </section>

    {errors.length > 0 && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900"><p className="font-semibold">Complete these checks to record the decision:</p><ul className="mt-2 list-disc space-y-1 pl-5">{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
    {message && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
      <button type="button" onClick={record} className="rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800">Record local decision</button>
      <span className="text-xs text-slate-500">No action or migration record is created in the database.</span>
    </div>
  </div>
}

function LegacyEditor({ store, reviewerId, saved, onRecord }: {
  store: HistoricalStore
  reviewerId: string
  saved: LegacyInvestigation | undefined
  onRecord: (review: LegacyInvestigation) => void
}) {
  const [form, setForm] = useState<LegacyInvestigation>(saved || {
    storeId: store.storeId, status: 'needs_source', reviewerId, reviewedAt: '', pdfPath: '', pdfSha256: '', issuedPdfVerified: false, evidenceRef: '', notes: '',
  })
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const set = <K extends keyof LegacyInvestigation>(key: K, value: LegacyInvestigation[K]) => setForm(current => ({ ...current, [key]: value }))

  function record() {
    const investigation = { ...form, reviewerId, reviewedAt: new Date().toISOString() }
    const problems = legacyInvestigationErrors(investigation, store)
    setErrors(problems)
    if (problems.length) { setMessage(''); return }
    onRecord(investigation)
    setMessage('Source investigation recorded in this local draft. No action row was created.')
  }

  return <div className="space-y-6">
    <div className="border-b border-slate-200 pb-5">
      <div className="flex flex-wrap gap-2">{badge('Queue B · legacy source investigation', 'amber')}{saved && badge('Local investigation recorded', 'green')}</div>
      <h2 className="mt-3 text-xl font-bold">{store.storeCode ? `${store.storeCode} · ` : ''}{store.storeName}</h2>
      <p className="mt-1 text-sm text-slate-600">Store FRA date {store.latestFraDate || 'unknown'} · no SafeHub FRA instance · action list and completion unknown</p>
      {store.currentFraPdfReference ? <Link href={`/api/fra-action-history/pdf?storeId=${encodeURIComponent(store.storeId)}&kind=current`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-lg border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-50">Open current FRA PDF ↗</Link> : <p className="mt-3 text-sm text-amber-800">No current FRA PDF recorded for this store.</p>}
      <details className="mt-3 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Historical FRA references</summary><ul className="mt-2 space-y-1">{store.historicalFraReferences.map((reference, index) => <li key={index}>{reference.visitDate || 'Date unknown'} · {reference.pdfPath || 'No PDF path'}</li>)}</ul></details>
    </div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This queue establishes the correct historical FRA source. It never invents action rows. Extract and review any action plan only after the issued PDF and store identity are verified.</div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={labelClass}>Source investigation status
        <select value={form.status} onChange={event => set('status', event.target.value as LegacyInvestigation['status'])} className={inputClass}><option value="needs_source">Source needed</option><option value="pdf_located">PDF located, identity pending</option><option value="source_verified">Source identity reviewed locally</option></select>
      </label>
      <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">This investigation is recorded under your signed-in KSS account in the local draft.</div>
      <details className="sm:col-span-2 rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">PDF record details for KSS</summary><div className="mt-3 grid gap-4 sm:grid-cols-2">
      <label className={labelClass}>Exact PDF path
        <input value={form.pdfPath} onChange={event => set('pdfPath', event.target.value)} className={inputClass} placeholder="Leave blank while source remains missing" />
      </label>
      <label className={labelClass}>PDF SHA-256
        <input value={form.pdfSha256} onChange={event => set('pdfSha256', event.target.value)} className={inputClass} placeholder="Required once PDF is located" />
      </label>
      </div></details>
    </div>
    <label className={labelClass}>Evidence reference or specific missing source
      <input value={form.evidenceRef} onChange={event => set('evidenceRef', event.target.value)} className={inputClass} placeholder="Document reference, archive folder or source request" />
    </label>
    <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.issuedPdfVerified} onChange={event => set('issuedPdfVerified', event.target.checked)} className="mt-1" />I checked the exact PDF against this store and FRA date.</label>
    <label className={labelClass}>Investigation notes
      <textarea value={form.notes} onChange={event => set('notes', event.target.value)} rows={4} className={inputClass} placeholder="State what was checked, identity/date match, and unresolved gaps." />
    </label>
    {errors.length > 0 && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900"><ul className="list-disc space-y-1 pl-5">{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
    {message && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={record} className="rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800">Record local investigation</button><span className="text-xs text-slate-500">No historical actions are generated from this store entry.</span></div>
  </div>
}
