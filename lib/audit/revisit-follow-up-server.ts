import 'server-only'
import { requirePermission } from '@/lib/permissions'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { AuditRevisitFollowUp, AuditRevisitOriginal } from './revisit-follow-up'

type OriginalRow = { id: string; store_id: string; audit_number: number | null; visit_date: string; percentage: number | null; pdf_path: string | null }
type EvidenceRow = { id: string; original_history_id: string; revisit_date: string; file_sha256: string; file_size: number; storage_path: string; mime_type: string; created_at: string }
const mimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])

export function summariseRevisitEvidence(storeIds: string[], originals: OriginalRow[], evidence: EvidenceRow[], today = new Date().toISOString().slice(0, 10)): Record<string, AuditRevisitFollowUp> {
  const result: Record<string, AuditRevisitFollowUp> = Object.fromEntries(storeIds.map(id => [id, { status: 'available', originals: [] }]))
  const originalById = new Map(originals.filter(row => result[row.store_id]).map(row => [row.id, row]))
  const groups = new Map<string, EvidenceRow[]>()
  const seen = new Set<string>()
  for (const row of evidence) {
    const original = originalById.get(row.original_history_id)
    if (!original || seen.has(row.id) || !/^[0-9a-f]{64}$/.test(row.file_sha256)
      || row.file_size < 1 || row.file_size > 4194304 || !mimeTypes.has(row.mime_type)
      || !row.storage_path.startsWith(`${original.id}/`)
      || row.revisit_date < original.visit_date || row.revisit_date > today) continue
    seen.add(row.id)
    groups.set(original.id, [...(groups.get(original.id) || []), row])
  }
  for (const [id, rows] of groups) {
    const original = originalById.get(id)!
    rows.sort((a, b) => b.revisit_date.localeCompare(a.revisit_date) || b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
    const summary: AuditRevisitOriginal = { id, auditNumber: original.audit_number, visitDate: original.visit_date,
      percentage: original.percentage == null ? null : Number(original.percentage), pdfPath: original.pdf_path,
      documentCount: rows.length, latestRevisitDate: rows[0].revisit_date, latestEvidenceId: rows[0].id }
    result[original.store_id].originals.push(summary)
  }
  for (const summary of Object.values(result)) summary.originals.sort((a, b) => b.visitDate.localeCompare(a.visitDate) || b.id.localeCompare(a.id))
  return result
}

/** Recheck authenticated role + store RLS before service-role history access; errors never imply completion. */
export async function loadAuditRevisitFollowUps(stores: Array<{ id: string }>): Promise<Record<string, AuditRevisitFollowUp>> {
  const ids = [...new Set(stores.map(store => store.id))]
  if (!ids.length) return {}
  const unavailable = () => Object.fromEntries(ids.map(id => [id, { status: 'unavailable' as const, originals: [] }]))
  try {
    const { supabase } = await requirePermission('viewEvidence')
    const visible = await supabase.from('fa_stores').select('id').in('id', ids)
    if (visible.error || !visible.data) return unavailable()
    const allowed = visible.data.map(row => row.id as string)
    if (!allowed.length) return unavailable()
    const admin = createAdminSupabaseClient()
    const history = await admin.from('fa_store_audit_history').select('id,store_id,audit_number,visit_date,percentage,pdf_path')
      .in('store_id', allowed).eq('kind', 'H&S')
    if (history.error) return unavailable()
    const originals = (history.data || []) as OriginalRow[]
    let evidence: EvidenceRow[] = []
    if (originals.length) {
      const response = await admin.from('fa_audit_revisits').select('id,original_history_id,revisit_date,file_sha256,file_size,storage_path,mime_type,created_at')
        .in('original_history_id', originals.map(row => row.id))
      if (response.error) return unavailable()
      evidence = response.data || []
    }
    return { ...unavailable(), ...summariseRevisitEvidence(allowed, originals, evidence) }
  } catch { return unavailable() }
}
