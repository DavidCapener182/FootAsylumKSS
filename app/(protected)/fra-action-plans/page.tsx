import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { requireRole } from '@/lib/auth'
import { getFraActionReadScope } from '@/lib/fra/action-access'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { FraActionPlansClient, type FraPreviewAction } from '@/components/fra/fra-action-plans-client'
import type { HistoricalReviewInventory } from '@/components/fra/historical-review-model'

export const dynamic = 'force-dynamic'

type StoreRow = { id: string; store_code: string | null; store_name: string | null; reporting_area: string | null; reporting_area_manager_name: string | null; fire_risk_assessment_pdf_path: string | null }
type ActionRow = { id: string; store_id: string; recommendation: string; priority: string; status: string; source_origin: string; version: number; pdf_page?: number | null }
type PdfActionRow = { storeId: string; storeCode: string; storeName: string; pdfSha256: string; page: number; sourceOrdinal: number; recommendation: string; priority: string }

export default async function FraActionPlansPage({ searchParams }: { searchParams?: { preview?: string; view?: string } }) {
  const { profile } = await requireRole(['admin', 'ops', 'client_admin', 'area_manager'])
  const supabase = createClient()
  const scope = await getFraActionReadScope(profile)
  const isPreview = process.env.NODE_ENV === 'development' && scope.kind === 'kss_all' && searchParams?.preview === 'history'
  const isPdfReview = process.env.NODE_ENV === 'development' && scope.kind === 'kss_all' && searchParams?.preview === 'pdf'
  if (isPdfReview) {
    const raw = await readFile(join(process.cwd(), 'output', 'fra-issued-pdf-review-2026-09-25', 'pdf-action-rows.json'), 'utf8').catch(() => null)
    if (!raw) notFound()
    const rows = JSON.parse(raw) as PdfActionRow[]
    const storeIds = [...new Set(rows.map(row => row.storeId))]
    const { data: storeData } = await supabase.from('fa_stores').select('id, reporting_area, reporting_area_manager_name').in('id', storeIds)
    const stores = new Map((storeData || []).map(store => [store.id, store]))
    const actions: FraPreviewAction[] = rows.map(row => ({ id: `${row.storeId}:${row.pdfSha256}:${row.page}:${row.sourceOrdinal}`, storeId: row.storeId, store: row.storeName, code: row.storeCode, area: stores.get(row.storeId)?.reporting_area || 'Area not confirmed', areaManager: stores.get(row.storeId)?.reporting_area_manager_name || 'Not confirmed', fraAvailable: true, pdfPage: row.page, title: row.recommendation, detail: `FRA PDF page ${row.page}, row ${row.sourceOrdinal}.`, priority: row.priority === 'High' ? 'High' : row.priority === 'Low' ? 'Low' : 'Medium', workflow: null, stage: 'new' }))
    return <FraActionPlansClient sourceActions={actions} sourceLabel="Select a store to view its FRA actions." readOnlyRole="pdf_review" />
  }
  if (isPreview) {
    const raw = await readFile(join(process.cwd(), 'output', 'fra-action-migration-inventory-2026-09-25.json'), 'utf8').catch(() => null)
    if (!raw) notFound()
    const inventory = JSON.parse(raw) as HistoricalReviewInventory
    if (inventory.projectId !== 'fwnzpafwfaiynrclwtnh') notFound()
    const stores = new Map(inventory.storeInventory.map(store => [store.storeId, store]))
    const { data: managerRows } = await supabase.from('fa_stores').select('id, reporting_area, reporting_area_manager_name').in('id', inventory.storeInventory.map(store => store.storeId))
    const managers = new Map((managerRows || []).map(store => [store.id, store]))
    const actions: FraPreviewAction[] = inventory.candidateActions.filter(candidate => stores.has(candidate.storeId)).map(candidate => {
      const store = stores.get(candidate.storeId)!
      const manager = managers.get(store.storeId)
      return { id: candidate.stagingKey, storeId: store.storeId, store: store.storeName, code: store.storeCode || '', area: manager?.reporting_area || 'Area not confirmed', areaManager: manager?.reporting_area_manager_name || 'Not confirmed', fraAvailable: Boolean(store.currentFraPdfReference), title: candidate.recommendation, detail: `Stored recommendation ${candidate.sourceOrdinal}. Exact issued PDF wording and current completion still need KSS verification.`, priority: candidate.priority === 'High' ? 'High' : 'Medium', workflow: null, stage: 'new' }
    })
    return <FraActionPlansClient sourceActions={actions} sourceLabel="Historical review preview · recommendations have not been verified as live actions." />
  }

  // The live board reads only approved rows in the dedicated action register.
  if (scope.kind === 'denied' || (scope.kind === 'client_stores' && scope.storeIds.length === 0)) return <div className="p-8"><h1 className="text-2xl font-bold">FRA Action Plans</h1><p className="mt-3">Your store access has not been assigned yet.</p></div>
  // Scoped roles never query the raw tables directly. The service client is
  // used only after the server resolves explicit store assignments, and both
  // queries below are restricted to that allowlist.
  const boardClient = scope.kind === 'kss_all' ? supabase : createAdminSupabaseClient()
  const actionQuery = boardClient.from('fa_fra_actions').select('id, store_id, recommendation, priority, status, source_origin, version, pdf_page').order('created_at', { ascending: false })
  const storeQuery = scope.kind === 'kss_all'
    ? boardClient.from('fa_stores').select('id, store_code, store_name, reporting_area, reporting_area_manager_name, fire_risk_assessment_pdf_path').order('store_name')
    : boardClient.from('fa_stores').select('id, store_code, store_name, reporting_area, reporting_area_manager_name').order('store_name')
  const [{ data: actionData, error: actionError }, { data: storeData, error: storeError }] = await Promise.all([
    scope.kind === 'client_stores' ? actionQuery.in('store_id', scope.storeIds) : actionQuery,
    scope.kind === 'client_stores' ? storeQuery.in('id', scope.storeIds) : storeQuery,
  ])
  if (storeError) throw new Error('Unable to load the store roster')
  const stores = new Map(((storeData || []) as StoreRow[]).map(store => [store.id, store]))
  const rows = actionError ? [] : (actionData || []) as ActionRow[]
  const publicationStoreIds = new Set<string>()
  if (scope.kind === 'client_stores' && rows.length > 0) {
    const { data: publications } = await createAdminSupabaseClient().from('fa_fra_publications').select('store_id')
      .in('store_id', [...new Set(rows.map(row => row.store_id))]).not('confirmed_at', 'is', null)
    for (const publication of publications || []) publicationStoreIds.add(publication.store_id)
  }
  const actions: FraPreviewAction[] = rows.filter(row => stores.has(row.store_id)).map(row => {
    const store = stores.get(row.store_id)!
    return { id: row.id, storeId: row.store_id, store: store.store_name || store.store_code || 'Store', code: store.store_code || '', area: store.reporting_area || 'Area not confirmed', areaManager: store.reporting_area_manager_name || 'Not confirmed', fraAvailable: scope.kind === 'kss_all' ? Boolean(store.fire_risk_assessment_pdf_path) : publicationStoreIds.has(row.store_id), pdfPage: row.pdf_page || undefined, title: row.recommendation, detail: row.pdf_page ? `FRA PDF page ${row.pdf_page}.` : 'FRA action', priority: row.priority === 'High' ? 'High' : row.priority === 'Low' ? 'Low' : 'Medium', workflow: null, version: row.version, stage: row.status === 'verified_closed' ? 'closed' : row.status === 'awaiting_verification' ? 'review' : row.status === 'visit_booked' || row.status === 'work_ordered' ? 'booked' : row.status === 'work_completed' ? 'made_safe' : row.status === 'acknowledged' ? 'seen' : 'new' }
  })

  if (actions.length === 0 && process.env.NODE_ENV === 'development' && scope.kind === 'kss_all' && !searchParams?.view) redirect('/fra-action-plans?preview=pdf')
  if (actions.length === 0) return <div className="min-h-full bg-[#f5f7f8] px-6 py-10"><div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Fire Risk Assessments</p><h1 className="mt-2 text-3xl font-bold">FRA Action Plans</h1><p className="mt-4 text-slate-700">There are no verified live FRA actions in the register yet. Historical recommendations need their issued PDF, classification and completion checked before they can appear here.</p><p className="mt-3 text-sm text-slate-600">{stores.size} stores are in the current roster. Once a reviewed action is recorded, it will appear against its store on this board.</p>{actionError && <p className="mt-3 text-sm text-amber-800">The FRA action register has not been deployed yet.</p>}{process.env.NODE_ENV === 'development' && scope.kind === 'kss_all' && <Link href="/fra-action-plans?preview=pdf" className="mt-6 inline-block rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">View actions extracted from FRA PDFs</Link>}</div></div>
  return <FraActionPlansClient sourceActions={actions} sourceLabel="Select a store to view its FRA actions." readOnlyRole={profile.role} liveMode />
}
