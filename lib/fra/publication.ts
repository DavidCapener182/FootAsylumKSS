import 'server-only'
import { createHash } from 'node:crypto'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const pdfHash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

export async function fraSourceSnapshot(supabase: any, instanceId: string) {
  const { data: instance, error } = await supabase.from('fa_audit_instances').select('*, fa_audit_templates(category)').eq('id', instanceId).single()
  if (error || !instance || instance.fa_audit_templates?.category !== 'fire_risk_assessment') throw new Error('FRA instance not found')
  const { data: responses, error: responseError } = await supabase.from('fa_audit_responses').select('*').eq('audit_instance_id', instanceId).order('id')
  if (responseError) throw new Error('Unable to verify FRA responses')
  const { data: store, error: storeError } = await supabase.from('fa_stores').select('*').eq('id', instance.store_id).single()
  if (storeError || !store) throw new Error('Store not found')
  const bucket = createAdminSupabaseClient().storage.from('fa-attachments')
  const images: Array<{ path: string; bytes: number; updated_at: string; sha256: string }> = []
  async function walk(prefix: string) {
    for (let offset = 0; ; offset += 100) {
      const { data, error: listError } = await bucket.list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
      if (listError || !data) throw new Error('Unable to inspect source images')
      for (const entry of data) {
        const path = `${prefix}/${entry.name}`
        if (!entry.id) { await walk(path); continue }
        if (!String(entry.metadata?.mimetype).startsWith('image/')) continue
        const { data: blob, error: downloadError } = await bucket.download(path)
        if (downloadError || !blob) throw new Error('Unable to verify source image')
        const bytes = Buffer.from(await blob.arrayBuffer())
        images.push({ path, bytes: bytes.length, updated_at: entry.updated_at, sha256: pdfHash(bytes) })
      }
      if (data.length < 100) break
    }
  }
  await walk(`fra/${instanceId}/photos`)
  images.sort((a,b) => a.path.localeCompare(b.path))
  const fingerprint = pdfHash(Buffer.from(JSON.stringify({ instance, responses, store, images })))
  return { fingerprint, images, instance, store }
}

export async function verifiedPublication(supabase: any, instanceId: string, publicationId: string) {
  const { data, error } = await supabase.from('fa_fra_publications').select('*').eq('id', publicationId).eq('instance_id', instanceId).single()
  if (error || !data) throw new Error('Reviewed PDF not found. Prepare the review again.')
  if (data.confirmed_at) return data
  const snapshot = await fraSourceSnapshot(supabase, instanceId)
  if (snapshot.fingerprint !== data.source_fingerprint) throw new Error('The FRA changed after the PDF was prepared. Review a fresh PDF before confirming.')
  const { data: blob, error: downloadError } = await createAdminSupabaseClient().storage.from('fa-attachments').download(data.pdf_path)
  if (downloadError || !blob || pdfHash(Buffer.from(await blob.arrayBuffer())) !== data.pdf_sha256) throw new Error('Saved PDF verification failed. Source images have been preserved.')
  return data
}
