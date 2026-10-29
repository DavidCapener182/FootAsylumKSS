import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

export const REVISIT_BUCKET = 'fa-audit-revisit-evidence'
export const MAX_REVISIT_BYTES = 4 * 1024 * 1024
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const types: Record<string, string> = {
  'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}
export class RevisitError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
export async function assertStoreAccess(supabase: SupabaseClient, storeId: string) {
  if (!uuid.test(storeId)) throw new RevisitError('Store unavailable', 404)
  // Use the caller's authenticated client and existing store RLS before any service-role read.
  const { data, error } = await supabase.from('fa_stores').select('id').eq('id', storeId).maybeSingle()
  if (error || !data) throw new RevisitError('Store unavailable', 404)
}

export async function appendRevisit({ supabase, admin, actorId, storeId, historyId, requestId, visitDate, notes, file, replacesId = '' }: {
  supabase: SupabaseClient; admin: SupabaseClient; actorId: string; storeId: string;
  historyId: string; requestId: string; visitDate: string; notes: string; file: File; replacesId?: string;
}) {
  if ((replacesId && !uuid.test(replacesId)) || !uuid.test(historyId) || !uuid.test(requestId) || !/^\d{4}-\d{2}-\d{2}$/.test(visitDate)
    || Number.isNaN(Date.parse(visitDate)) || new Date(visitDate).toISOString().slice(0, 10) !== visitDate
    || notes.length > 2000 || !(file instanceof File) || !types[file.type]
    || file.size < 1 || file.size > MAX_REVISIT_BYTES) {
    throw new RevisitError('Choose a date, notes up to 2,000 characters and a PDF, DOCX, JPG, PNG or WebP up to 4 MB')
  }
  await assertStoreAccess(supabase, storeId)
  const { data: original, error } = await admin.from('fa_store_audit_history')
    .select('id,visit_date').eq('id', historyId).eq('store_id', storeId).eq('kind', 'H&S').maybeSingle()
  if (error || !original) throw new RevisitError('Original audit unavailable', 404)
  if (visitDate < original.visit_date) throw new RevisitError('Revisit date must be on or after the original audit')
  if (replacesId) {
    const target = await admin.from('fa_audit_revisits').select('id,revisit_date')
      .eq('id', replacesId).eq('original_history_id', historyId).maybeSingle()
    if (target.error || !target.data) throw new RevisitError('Revisit evidence unavailable', 404)
    if (target.data.revisit_date !== visitDate) throw new RevisitError('A replacement must keep the original revisit date')
  }
  const bytes = Buffer.from(await file.arrayBuffer())
  const extension = types[file.type]
  const valid = extension === 'pdf' ? bytes.subarray(0, 5).toString() === '%PDF-'
    : extension === 'jpg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : extension === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : extension === 'webp' ? bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'
    : await JSZip.loadAsync(bytes).then(zip => !!zip.file('[Content_Types].xml') && !!zip.file('word/document.xml')).catch(() => false)
  if (!valid) throw new RevisitError('File content does not match its type')
  const hash = createHash('sha256').update(bytes).digest('hex')
  // Each attempt owns a new object. A losing concurrent retry can only remove its own object.
  const path = `${historyId}/${randomUUID()}.${extension}`
  const bucket = admin.storage.from(REVISIT_BUCKET)
  const cleanup = async () => {
    try { const result = await bucket.remove([path]); return result.error ? 'Unused evidence needs storage cleanup review.' : null }
    catch { return 'Unused evidence needs storage cleanup review.' }
  }
  const uploaded = await bucket.upload(path, bytes, { contentType: file.type, upsert: false })
  if (uploaded.error) throw new RevisitError('Evidence upload failed; retry with the same submission', 503)
  try {
    const saved = await bucket.download(path)
    if (saved.error || !saved.data || createHash('sha256').update(Buffer.from(await saved.data.arrayBuffer())).digest('hex') !== hash) {
      throw new Error('readback failed')
    }
  } catch {
    const warning = await cleanup()
    throw new RevisitError(`Evidence verification failed. ${warning || 'Retry this submission.'}`, 503)
  }
  // SQL is the atomic commit boundary. No store, audit, action or publication updates occur.
  const result = await admin.rpc(replacesId ? 'fa_replace_audit_revisit' : 'fa_append_audit_revisit', {
    ...(replacesId ? { p_replaces: replacesId } : {}),
    p_id: requestId, p_actor: actorId, p_history: historyId, p_date: visitDate,
    p_notes: notes.trim(), p_path: path, p_sha256: hash, p_type: file.type,
    p_size: bytes.length, p_name: file.name.replace(/[\r\n\x00-\x1f]/g, '').slice(0, 200),
  })
  if (result.error) {
    // Only definitive transaction errors can roll back the owned upload safely.
    // A network/unknown result may already have committed: retain the object and retry idempotently.
    const definitive = /^(22|23|P0001)/.test(result.error.code || '')
    const warning = definitive ? await cleanup() : 'Submission outcome is uncertain; keep the same submission and retry.'
    throw new RevisitError(`Unable to record revisit. ${warning || (replacesId ? 'Reload history and select the current version before trying again.' : 'Refresh and check the original audit and submission details.')}`, definitive ? 409 : 503)
  }
  const row = Array.isArray(result.data) ? result.data[0] : result.data
  if (!row?.id || !row?.storage_path) throw new RevisitError('Submission outcome is uncertain; retry the same submission', 503)
  const cleanupWarning = row.storage_path !== path ? await cleanup() : null
  return { id: row.id as string, cleanupWarning }
}
