import 'server-only'

import type { UserProfile } from '@/lib/auth'
import { getFraActionReadScope } from '@/lib/fra/action-access'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export type ClientDocumentKind = 'H&S' | 'FRA'
export type ClientDocument = {
  id: string
  storeId: string
  storeCode: string
  storeName: string
  kind: ClientDocumentKind
  auditNumber: number | null
  visitDate: string | null
}

type StoreRow = {
  id: string
  store_code: string | null
  store_name: string | null
}

type HistoryRow = {
  id: string
  store_id: string
  kind: ClientDocumentKind
  audit_number: number | null
  visit_date: string
  pdf_path: string | null
}

export async function getClientDocumentStores(profile: UserProfile) {
  if (profile.role !== 'client_admin') return []
  const scope = await getFraActionReadScope(profile)
  if (scope.kind !== 'client_stores' || scope.role !== 'client_admin' || !scope.storeIds.length) return []
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.from('fa_stores')
    .select('id,store_code,store_name')
    .in('id', scope.storeIds).order('store_name')
  if (error) throw new Error('Unable to load client documents')
  return (data || []) as StoreRow[]
}

export async function getClientDocuments(profile: UserProfile): Promise<ClientDocument[]> {
  const stores = await getClientDocumentStores(profile)
  if (!stores.length) return []
  const storeById = new Map(stores.map(store => [store.id, store]))
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.from('fa_store_audit_history')
    .select('id,store_id,kind,audit_number,visit_date,pdf_path')
    .in('store_id', stores.map(store => store.id)).not('pdf_path', 'is', null)
    .order('visit_date', { ascending: false })
  if (error) throw new Error('Unable to load document history')
  const history = (data || []) as HistoryRow[]
  return history.filter(row => storeById.has(row.store_id) && (row.kind === 'H&S' || row.kind === 'FRA'))
    .map(row => {
      const store = storeById.get(row.store_id)!
      return { id: row.id, storeId: row.store_id, storeCode: store.store_code || '', storeName: store.store_name || store.store_code || 'Store', kind: row.kind, auditNumber: row.audit_number, visitDate: row.visit_date }
    }).sort((a, b) => a.storeName.localeCompare(b.storeName) || (b.visitDate || '').localeCompare(a.visitDate || ''))
}

export async function getClientDocumentPath(profile: UserProfile, storeId: string, documentId: string): Promise<string | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(storeId)) return null
  const stores = await getClientDocumentStores(profile)
  if (!stores.some(row => row.id === storeId)) return null
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(documentId)) return null
  const { data, error } = await createAdminSupabaseClient().from('fa_store_audit_history')
    .select('pdf_path,kind').eq('id', documentId).eq('store_id', storeId).maybeSingle()
  if (error || !data || !['H&S', 'FRA'].includes(data.kind)) return null
  return data.pdf_path || null
}
