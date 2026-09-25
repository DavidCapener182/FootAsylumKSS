import { createHash, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getFraActionReadScope } from '@/lib/fra/action-access'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const allowedTypes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const { profile } = await requireRole(['area_manager'])
  const form = await request.formData().catch(() => null)
  const actionId = form?.get('actionId')
  const version = Number(form?.get('expectedVersion'))
  const file = form?.get('file')
  const note = String(form?.get('note') || '').trim().slice(0, 2000)
  if (typeof actionId !== 'string' || !uuid.test(actionId) || !Number.isInteger(version) || version < 1
    || !(file instanceof File) || !allowedTypes[file.type] || file.size < 1 || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Select a JPG, PNG, WebP or PDF under 10 MB' }, { status: 400 })
  }
  const admin = createAdminSupabaseClient()
  const { data: action, error: lookupError } = await admin.from('fa_fra_actions').select('store_id').eq('id', actionId).maybeSingle()
  if (lookupError || !action) return NextResponse.json({ error: 'Action unavailable' }, { status: 404 })
  const scope = await getFraActionReadScope(profile)
  if (scope.kind !== 'client_stores' || scope.role !== 'area_manager' || !scope.storeIds.includes(action.store_id)) {
    return NextResponse.json({ error: 'Action unavailable' }, { status: 404 })
  }

  const path = `${actionId}/${randomUUID()}.${allowedTypes[file.type]}`
  const bucket = admin.storage.from('fa-fra-action-evidence')
  const bytes = Buffer.from(await file.arrayBuffer())
  const validFile = file.type === 'application/pdf' ? bytes.subarray(0, 5).toString() === '%PDF-'
    : file.type === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : file.type === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'
  if (!validFile) return NextResponse.json({ error: 'File content does not match its type' }, { status: 400 })
  const { error: uploadError } = await bucket.upload(path, bytes, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: 'Unable to save evidence' }, { status: 500 })
  const { data: saved, error: readError } = await bucket.download(path)
  if (readError || !saved || createHash('sha256').update(Buffer.from(await saved.arrayBuffer())).digest('hex') !== createHash('sha256').update(bytes).digest('hex')) {
    await bucket.remove([path])
    return NextResponse.json({ error: 'Evidence verification failed' }, { status: 500 })
  }
  const { data, error } = await admin.rpc('fa_fra_submit_action_evidence', { p_actor: profile.id, p_action_id: actionId, p_expected_version: version, p_storage_path: path, p_note: note || null })
  if (error) {
    await bucket.remove([path])
    return NextResponse.json({ error: 'Evidence could not be submitted. Refresh the board and try again.' }, { status: 409 })
  }
  return NextResponse.json({ result: Array.isArray(data) ? data[0] : data })
}
