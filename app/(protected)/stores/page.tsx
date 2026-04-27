import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Plus, ArrowUpRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { StoreDirectory } from '@/components/stores/store-directory'
import {
  buildStoreMergeContext,
  getCanonicalStoreId,
  getStoreIdsIncludingAliases,
  shouldHideStore,
  type StoreMergeContext,
} from '@/lib/store-normalization'

async function getStores() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fa_stores')
    .select('*')
    .order('store_name', { ascending: true })

  if (error) {
    console.error('Error fetching stores:', error)
    return []
  }

  return data || []
}

type StoreRelations = {
  incidents: any[]
  actions: any[]
}

async function getStoreRelationsForStores(stores: any[], mergeContext: StoreMergeContext) {
  if (stores.length === 0) return new Map<string, StoreRelations>()

  const canonicalStoreIds = new Set(stores.map((store) => String(store.id)))
  const relatedStoreIds = Array.from(
    new Set(
      stores.flatMap((store) => getStoreIdsIncludingAliases(String(store.id), mergeContext))
    )
  )

  if (relatedStoreIds.length === 0) return new Map<string, StoreRelations>()

  const supabase = createClient()

  const [incidentsResult, storeActionsResult] = await Promise.all([
    supabase
      .from('fa_incidents')
      .select('id, reference_no, summary, status, closed_at, occurred_at, store_id')
      .in('store_id', relatedStoreIds),
    supabase
      .from('fa_store_actions')
      .select('id, title, source_flagged_item, description, priority, status, due_date, created_at, store_id')
      .in('store_id', relatedStoreIds),
  ])

  if (incidentsResult.error) {
    console.error('Error fetching store incidents:', incidentsResult.error)
  }
  if (storeActionsResult.error) {
    console.error('Error fetching store actions:', storeActionsResult.error)
  }

  const incidentRows = incidentsResult.data || []
  const storeActionRows = storeActionsResult.data || []

  const incidentsByStoreId = new Map<string, any[]>()
  const incidentStoreIdByIncidentId = new Map<string, string>()

  for (const incident of incidentRows) {
    const canonicalStoreId = getCanonicalStoreId(incident.store_id, mergeContext)
    if (!canonicalStoreId || !canonicalStoreIds.has(canonicalStoreId)) continue

    incidentStoreIdByIncidentId.set(String(incident.id), canonicalStoreId)
    const bucket = incidentsByStoreId.get(canonicalStoreId) || []
    bucket.push(incident)
    incidentsByStoreId.set(canonicalStoreId, bucket)
  }

  const incidentIds = Array.from(incidentStoreIdByIncidentId.keys())
  let incidentActions: any[] = []

  if (incidentIds.length > 0) {
    const { data, error } = await supabase
      .from('fa_actions')
      .select(`
        id,
        title,
        status,
        due_date,
        completed_at,
        incident_id,
        incident:fa_incidents!fa_actions_incident_id_fkey(reference_no)
      `)
      .in('incident_id', incidentIds)

    if (error) {
      console.error('Error fetching incident-linked store actions:', error)
    } else {
      incidentActions = data || []
    }
  }

  const actionsByStoreId = new Map<string, any[]>()

  for (const action of storeActionRows) {
    const canonicalStoreId = getCanonicalStoreId(action.store_id, mergeContext)
    if (!canonicalStoreId || !canonicalStoreIds.has(canonicalStoreId)) continue

    const bucket = actionsByStoreId.get(canonicalStoreId) || []
    bucket.push({
      ...action,
      incident_id: null,
      incident: null,
      completed_at: null,
      source_type: 'store' as const,
    })
    actionsByStoreId.set(canonicalStoreId, bucket)
  }

  for (const action of incidentActions) {
    const canonicalStoreId = incidentStoreIdByIncidentId.get(String(action.incident_id))
    if (!canonicalStoreId || !canonicalStoreIds.has(canonicalStoreId)) continue

    const bucket = actionsByStoreId.get(canonicalStoreId) || []
    bucket.push({
      ...action,
      source_type: 'incident' as const,
    })
    actionsByStoreId.set(canonicalStoreId, bucket)
  }

  for (const [storeId, incidents] of incidentsByStoreId.entries()) {
    incidents.sort((a, b) => {
      const aTime = a?.occurred_at ? new Date(a.occurred_at).getTime() : 0
      const bTime = b?.occurred_at ? new Date(b.occurred_at).getTime() : 0
      return bTime - aTime
    })
    incidentsByStoreId.set(storeId, incidents)
  }

  for (const [storeId, actions] of actionsByStoreId.entries()) {
    actions.sort((a, b) => {
      const aTime = a?.due_date ? new Date(a.due_date).getTime() : 0
      const bTime = b?.due_date ? new Date(b.due_date).getTime() : 0
      return bTime - aTime
    })
    actionsByStoreId.set(storeId, actions)
  }

  const relationsByStoreId = new Map<string, StoreRelations>()
  for (const store of stores) {
    const storeId = String(store.id)
    relationsByStoreId.set(storeId, {
      incidents: incidentsByStoreId.get(storeId) || [],
      actions: actionsByStoreId.get(storeId) || [],
    })
  }

  return relationsByStoreId
}

export default async function StoresPage() {
  const { profile } = await requireRole(['admin', 'ops', 'client', 'readonly'])
  const allStores = await getStores()
  const mergeContext = buildStoreMergeContext(allStores)
  const stores = allStores.filter((store) => !shouldHideStore(store))

  const relationsByStoreId = await getStoreRelationsForStores(stores, mergeContext)
  const storesWithData = stores.map((store) => {
    const storeId = String(store.id)
    const relations = relationsByStoreId.get(storeId)
    return {
      ...store,
      incidents: relations?.incidents || [],
      actions: relations?.actions || [],
    }
  })

  // Calculate stats
  const totalStores = storesWithData.length
  const activeStores = storesWithData.filter((s: any) => s.is_active).length
  const inactiveStores = totalStores - activeStores
  const activeRate = totalStores > 0 ? Math.round((activeStores / totalStores) * 100) : 0

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-lime-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              Store Network
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Store Directory</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Review store compliance profiles, audit progress, FRA status and follow-up actions across the estate.
            </p>
          </div>

          {profile.role === 'admin' && (
            <div className="w-full flex-shrink-0 md:w-auto">
              <Link href="/stores/new" prefetch={false}>
                <Button className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 md:w-auto">
                  <Plus className="h-4 w-4 text-lime-300" />
                  <span>Add New Store</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-300" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Stores</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{totalStores}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Active</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{activeStores}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inactive</p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{inactiveStores}</p>
          </div>
          <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Active Rate</p>
            <p className="mt-1 text-2xl font-bold text-teal-700">{activeRate}%</p>
          </div>
        </div>
      </div>

      {/* Store Directory with Search */}
      <StoreDirectory stores={storesWithData} />
    </div>
  )
}
