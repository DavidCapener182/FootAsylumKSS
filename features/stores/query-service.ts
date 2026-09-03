import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { buildStoreMergeContext, getCanonicalStoreId, getStoreIdsIncludingAliases, shouldHideStore } from '@/lib/store-normalization'
import type { StoreDirectoryAction, StoreDirectoryIncident, StoreDirectoryResult, StoreDirectoryRow } from './types'

const storeSchema = z.object({
  id: z.string().uuid(), store_name: z.string(), store_code: z.string().nullable(), is_active: z.boolean(),
  region: z.string().nullable(), city: z.string().nullable(), address_line_1: z.string().nullable(), postcode: z.string().nullable(),
}).passthrough()
const incidentSchema = z.object({ id: z.string().uuid(), reference_no: z.string(), summary: z.string(), status: z.string(), closed_at: z.string().nullable(), occurred_at: z.string(), store_id: z.string().uuid() })
const storeActionSchema = z.object({ id: z.string().uuid(), title: z.string(), source_flagged_item: z.string().nullable(), description: z.string().nullable(), priority: z.string(), status: z.string(), due_date: z.string(), created_at: z.string(), store_id: z.string().uuid() }).passthrough()
const incidentActionSchema = z.object({ id: z.string().uuid(), title: z.string(), status: z.string(), due_date: z.string(), completed_at: z.string().nullable(), incident_id: z.string().uuid(), incident: z.object({ reference_no: z.string() }).nullable() }).passthrough()

const POSTGREST_IN_FILTER_CHUNK_SIZE = 100

function chunkIds(ids: string[]): string[][] {
  const chunks: string[][] = []
  for (let index = 0; index < ids.length; index += POSTGREST_IN_FILTER_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + POSTGREST_IN_FILTER_CHUNK_SIZE))
  }
  return chunks
}

export async function getStoreDirectoryData(): Promise<StoreDirectoryResult> {
  const supabase = createClient()
  const storesResult = await supabase.from('fa_stores').select('*').order('store_name', { ascending: true })
  if (storesResult.error) throw new Error(`Unable to load stores: ${storesResult.error.message}`)
  const allStores = z.array(storeSchema).parse(storesResult.data || [])
  const mergeContext = buildStoreMergeContext(allStores)
  const stores = allStores.filter((store) => !shouldHideStore(store))
  const canonicalIds = new Set(stores.map((store) => store.id))
  const relatedIds = Array.from(new Set(stores.flatMap((store) => getStoreIdsIncludingAliases(store.id, mergeContext))))

  const [incidentsResult, storeActionsResult] = relatedIds.length ? await Promise.all([
    supabase.from('fa_incidents').select('id, reference_no, summary, status, closed_at, occurred_at, store_id').in('store_id', relatedIds),
    supabase.from('fa_store_actions').select('id, title, source_flagged_item, description, priority, status, due_date, created_at, store_id').in('store_id', relatedIds),
  ]) : [{ data: [], error: null }, { data: [], error: null }]
  if (incidentsResult.error) throw new Error(`Unable to load store incidents: ${incidentsResult.error.message}`)
  if (storeActionsResult.error) throw new Error(`Unable to load store actions: ${storeActionsResult.error.message}`)

  const incidents = z.array(incidentSchema).parse(incidentsResult.data || [])
  const storeActions = z.array(storeActionSchema).parse(storeActionsResult.data || [])
  const incidentStore = new Map<string, string>()
  const incidentsByStore = new Map<string, StoreDirectoryIncident[]>()
  for (const incident of incidents) {
    const storeId = getCanonicalStoreId(incident.store_id, mergeContext)
    if (!storeId || !canonicalIds.has(storeId)) continue
    incidentStore.set(incident.id, storeId)
    const bucket = incidentsByStore.get(storeId) || []
    bucket.push(incident)
    incidentsByStore.set(storeId, bucket)
  }

  const incidentIds = Array.from(incidentStore.keys())
  const incidentActionResults = await Promise.all(
    chunkIds(incidentIds).map((ids) =>
      supabase
        .from('fa_actions')
        .select('id, title, status, due_date, completed_at, incident_id, incident:fa_incidents!fa_actions_incident_id_fkey(reference_no)')
        .in('incident_id', ids)
    )
  )
  const incidentActionRows = incidentActionResults.flatMap((result) => {
    if (result.error) throw new Error(`Unable to load incident actions: ${result.error.message}`)
    return result.data || []
  })
  const incidentActions = z.array(incidentActionSchema).parse(incidentActionRows)

  const actionsByStore = new Map<string, StoreDirectoryAction[]>()
  for (const action of storeActions) {
    const storeId = getCanonicalStoreId(action.store_id, mergeContext)
    if (!storeId || !canonicalIds.has(storeId)) continue
    const bucket = actionsByStore.get(storeId) || []
    bucket.push({ ...action, source_type: 'store' })
    actionsByStore.set(storeId, bucket)
  }
  for (const action of incidentActions) {
    const storeId = incidentStore.get(action.incident_id)
    if (!storeId) continue
    const bucket = actionsByStore.get(storeId) || []
    bucket.push({ ...action, source_type: 'incident' })
    actionsByStore.set(storeId, bucket)
  }

  const directoryRows = stores.map((store): StoreDirectoryRow => ({
    ...store,
    incidents: (incidentsByStore.get(store.id) || []).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    actions: (actionsByStore.get(store.id) || []).sort((a, b) => a.due_date.localeCompare(b.due_date)),
  }))
  const activeStores = directoryRows.filter((store) => store.is_active).length
  return {
    stores: directoryRows,
    totalStores: directoryRows.length,
    activeStores,
    inactiveStores: directoryRows.length - activeStores,
    activeRate: directoryRows.length ? Math.round((activeStores / directoryRows.length) * 100) : 0,
  }
}
