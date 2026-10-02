import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getClientDocumentPath, getClientDocuments } from '@/lib/client-documents'
import { recordDocumentOpened } from '@/lib/user-view-context'
import { isSharePointFraPdf } from '@/lib/fra/sharepoint-pdf'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { profile } = await requireRole(['client_admin'])
  const storeId = request.nextUrl.searchParams.get('storeId') || ''
  const documentId = request.nextUrl.searchParams.get('documentId') || ''
  const path = await getClientDocumentPath(profile, storeId, documentId)
  if (!path) return new NextResponse(null, { status: 404 })
  const recordOpen = async () => {
    try {
      const document = (await getClientDocuments(profile)).find(row => row.id === documentId && row.storeId === storeId)
      if (document) await recordDocumentOpened(profile.id,
        `${document.storeCode} · ${document.storeName} · ${document.kind === 'FRA' ? 'Fire Risk Assessment' : `H&S Audit ${document.auditNumber || ''}`} · ${document.visitDate || 'Undated'}`)
    } catch { console.warn('Unable to record client document view') }
  }
  if (isSharePointFraPdf(path)) {
    await recordOpen()
    return NextResponse.redirect(path, { headers: { 'Cache-Control': 'private, no-store' } })
  }
  if (!/^(?:fra|store)\/[A-Za-z0-9/_-]+\.pdf$/.test(path)) return new NextResponse(null, { status: 404 })
  const { data, error } = await createAdminSupabaseClient().storage.from('fa-attachments').download(path)
  if (error || !data) return new NextResponse(null, { status: 404 })
  await recordOpen()
  return new NextResponse(Buffer.from(await data.arrayBuffer()), { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  } })
}
