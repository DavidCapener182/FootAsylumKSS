import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getClientDocumentPath } from '@/lib/client-documents'
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
  if (isSharePointFraPdf(path)) return NextResponse.redirect(path, { headers: { 'Cache-Control': 'private, no-store' } })
  if (!/^(?:fra|store)\/[A-Za-z0-9/_-]+\.pdf$/.test(path)) return new NextResponse(null, { status: 404 })
  const { data, error } = await createAdminSupabaseClient().storage.from('fa-attachments').download(path)
  if (error || !data) return new NextResponse(null, { status: 404 })
  return new NextResponse(Buffer.from(await data.arrayBuffer()), { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  } })
}
