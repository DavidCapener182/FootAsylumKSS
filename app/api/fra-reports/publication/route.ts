import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isPermissionError } from '@/lib/permissions'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { fraSourceSnapshot, pdfHash } from '@/lib/fra/publication'
import { GET as generatePdf } from '../generate-pdf/route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requirePermission('viewEvidence')
    const instanceId = request.nextUrl.searchParams.get('instanceId')
    const { data, error } = await supabase.from('fa_fra_publications').select('id,pdf_path,confirmed_at,archive_status')
      .eq('instance_id', instanceId).not('confirmed_at', 'is', null).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ publication: null })
    const { data: signed, error: signError } = await createAdminSupabaseClient().storage.from('fa-attachments').createSignedUrl(data.pdf_path, 3600)
    if (signError || !signed) throw new Error('Unable to open the saved PDF')
    return NextResponse.json({ publication: { ...data, url: signed.signedUrl } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load publication' }, { status: isPermissionError(error) ? error.status : 500 })
  }
}

export async function POST(request: NextRequest) {
  let uploadedPath: string | null = null
  const admin = createAdminSupabaseClient()
  try {
    const { supabase, userId } = await requirePermission('manageFRA')
    const { instanceId } = await request.json()
    if (typeof instanceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(instanceId)) throw new Error('Valid FRA instance ID required')
    const { data: existing, error: existingError } = await supabase.from('fa_fra_publications').select('id').eq('instance_id', instanceId).not('confirmed_at', 'is', null).maybeSingle()
    if (existingError) throw existingError
    if (existing) throw new Error('This FRA already has a confirmed PDF.')
    const before = await fraSourceSnapshot(supabase, instanceId)
    const url = new URL('/api/fra-reports/generate-pdf', request.url)
    url.searchParams.set('instanceId', instanceId)
    const renderHeaders = new Headers(request.headers)
    renderHeaders.set('x-fra-expected-images', JSON.stringify(before.images.map(image => image.path)))
    const generated = await generatePdf(new NextRequest(url, { headers: renderHeaders }))
    if (!generated.ok) throw new Error((await generated.json()).details || 'PDF generation failed')
    const bytes = Buffer.from(await generated.arrayBuffer())
    if (bytes.subarray(0,5).toString() !== '%PDF-' || bytes.length < 1000) throw new Error('Generated PDF is invalid')
    const after = await fraSourceSnapshot(supabase, instanceId)
    if (before.fingerprint !== after.fingerprint) throw new Error('The report changed during generation. Please try again.')
    const id = randomUUID()
    const path = `fra/${instanceId}/published/${id}.pdf`
    const bucket = admin.storage.from('fa-attachments')
    const { error: uploadError } = await bucket.upload(path, bytes, { contentType: 'application/pdf', upsert: false })
    if (uploadError) throw uploadError
    uploadedPath = path
    const { data: readback, error: readError } = await bucket.download(path)
    if (readError || !readback || pdfHash(Buffer.from(await readback.arrayBuffer())) !== pdfHash(bytes)) throw new Error('PDF readback verification failed')
    const { data: signed, error: signedError } = await bucket.createSignedUrl(path, 3600)
    if (signedError || !signed) throw new Error('Unable to open PDF for review')
    const { error: saveError } = await admin.from('fa_fra_publications').insert({ id, instance_id: instanceId, store_id: before.instance.store_id,
      pdf_path: path, pdf_sha256: pdfHash(bytes), pdf_bytes: bytes.length, source_fingerprint: after.fingerprint, source_images: after.images, created_by: userId })
    if (saveError) throw saveError
    uploadedPath = null
    return NextResponse.json({ id, url: signed.signedUrl, bytes: bytes.length, sourceImages: after.images.length })
  } catch (error) {
    if (uploadedPath) await admin.storage.from('fa-attachments').remove([uploadedPath])
    return NextResponse.json({ error: error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Unable to prepare FRA PDF' }, { status: isPermissionError(error) ? error.status : 400 })
  }
}
