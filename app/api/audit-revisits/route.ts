import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isPermissionError } from '@/lib/permissions'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { appendRevisit, assertStoreAccess, REVISIT_BUCKET, RevisitError, uuid } from '@/lib/audit/revisit-evidence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const fields = 'id,original_history_id,revisit_date,notes,file_name,file_sha256,file_size,created_at,created_by'
function failure(error: unknown) {
  if (isPermissionError(error) || error instanceof RevisitError) return NextResponse.json({ error: error.message }, { status: error.status })
  return NextResponse.json({ error: 'Revisit evidence unavailable. Check the history before retrying.' }, { status: 503 })
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requirePermission('viewEvidence')
    const storeId = request.nextUrl.searchParams.get('storeId') || ''
    await assertStoreAccess(supabase, storeId)
    const admin = createAdminSupabaseClient()
    const evidenceId = request.nextUrl.searchParams.get('evidenceId')
    if (evidenceId) {
      if (!uuid.test(evidenceId)) throw new RevisitError('Evidence unavailable', 404)
      const { data: evidence, error } = await admin.from('fa_audit_revisits')
        .select('original_history_id,storage_path,file_name,mime_type,file_sha256,file_size').eq('id', evidenceId).maybeSingle()
      if (error || !evidence) throw new RevisitError('Evidence unavailable', 404)
      const original = await admin.from('fa_store_audit_history').select('id')
        .eq('id', evidence.original_history_id).eq('store_id', storeId).eq('kind', 'H&S').maybeSingle()
      if (original.error || !original.data) throw new RevisitError('Evidence unavailable', 404)
      const { data, error: downloadError } = await admin.storage.from(REVISIT_BUCKET).download(evidence.storage_path)
      if (downloadError || !data) throw new RevisitError('Evidence could not be retrieved. Please retry.', 503)
      const bytes = new Uint8Array(await data.arrayBuffer())
      const hash = createHash('sha256').update(bytes).digest('hex')
      if (bytes.byteLength !== evidence.file_size || hash !== evidence.file_sha256) throw new RevisitError('Evidence verification failed. Please retry.', 503)
      const name = evidence.file_name.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200) || 'revisit-evidence'
      const asciiName = name.replace(/[^\x20-\x7e]|["\\;]/g, '_')
      const encodedName = encodeURIComponent(name).replace(/['()*]/g, value => '%' + value.charCodeAt(0).toString(16).toUpperCase())
      return new Response(bytes, { headers: {
        'Content-Type': evidence.mime_type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        'Content-Length': String(bytes.byteLength), 'X-Content-SHA256': hash,
      } })
    }
    const history = await admin.from('fa_store_audit_history').select('id,audit_number,visit_date,percentage')
      .eq('store_id', storeId).eq('kind', 'H&S').order('visit_date', { ascending: false })
    if (history.error) throw new RevisitError('Original audit history unavailable', 503)
    const originals = history.data || []
    if (!originals.length) return NextResponse.json({ originals, revisits: [] }, { headers: { 'Cache-Control': 'private, no-store' } })
    const revisits = await admin.from('fa_audit_revisits').select(fields).in('original_history_id', originals.map(row => row.id))
      .order('revisit_date', { ascending: false }).order('created_at', { ascending: false })
    if (revisits.error) throw new RevisitError('Revisit history unavailable', 503)
    return NextResponse.json({ originals, revisits: revisits.data || [] }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return failure(error) }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== request.nextUrl.origin) throw new RevisitError('Invalid origin', 403)
    const { supabase, userId } = await requirePermission('manageAudits')
    const form = await request.formData().catch(() => null)
    if (!form) throw new RevisitError('Invalid submission')
    const result = await appendRevisit({ supabase, admin: createAdminSupabaseClient(), actorId: userId,
      storeId: String(form.get('storeId') || ''), historyId: String(form.get('historyId') || ''),
      requestId: String(form.get('requestId') || ''), visitDate: String(form.get('visitDate') || ''),
      notes: String(form.get('notes') || ''), file: form.get('file') as File,
    })
    for (const path of ['/audit-tracker', '/route-planning', '/dashboard', `/stores/${String(form.get('storeId') || '')}`]) revalidatePath(path)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return failure(error) }
}
