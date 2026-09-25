import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { requireRole } from '@/lib/auth'
import { getFraActionReadScope } from '@/lib/fra/action-access'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { profile } = await requireRole(['admin', 'ops', 'client_admin', 'area_manager'])
  const storeId = request.nextUrl.searchParams.get('storeId')
  const actionId = request.nextUrl.searchParams.get('actionId')
  if ((!storeId && !actionId) || (storeId && !/^[0-9a-f-]{36}$/i.test(storeId)) || (actionId && !/^[0-9a-f-]{36}$/i.test(actionId))) return new NextResponse(null, { status: 400 })
  const scope = await getFraActionReadScope(profile)
  if (scope.kind === 'denied') return new NextResponse(null, { status: 404 })

  const admin = createAdminSupabaseClient()
  let path: string | null | undefined
  let expectedHash: string | null | undefined
  if (actionId) {
    const { data: action } = await admin.from('fa_fra_actions').select('store_id,pdf_path,pdf_sha256').eq('id', actionId).maybeSingle()
    if (!action || (storeId && action.store_id !== storeId)
      || (scope.kind === 'client_stores' && !scope.storeIds.includes(action.store_id))) return new NextResponse(null, { status: 404 })
    path = action.pdf_path
    expectedHash = action.pdf_sha256
  } else {
    if (!storeId || (scope.kind === 'client_stores' && !scope.storeIds.includes(storeId))) return new NextResponse(null, { status: 404 })
    const { data: publication, error: publicationError } = await admin.from('fa_fra_publications')
      .select('pdf_path').eq('store_id', storeId).not('confirmed_at', 'is', null)
      .order('confirmed_at', { ascending: false }).limit(1).maybeSingle()
    if (publicationError) return new NextResponse(null, { status: 404 })
    path = publication?.pdf_path
    if (!path && scope.kind === 'kss_all') {
      const { data: store } = await admin.from('fa_stores').select('fire_risk_assessment_pdf_path').eq('id', storeId).maybeSingle()
      path = store?.fire_risk_assessment_pdf_path
    }
  }
  if (!path || !/^(fra|store)\/[A-Za-z0-9/_-]+\.pdf$/.test(path)) return new NextResponse(null, { status: 404 })
  const { data: pdf, error: downloadError } = await admin.storage.from('fa-attachments').download(path)
  if (downloadError || !pdf) return new NextResponse(null, { status: 404 })
  const bytes = Buffer.from(await pdf.arrayBuffer())
  if (expectedHash && createHash('sha256').update(bytes).digest('hex') !== expectedHash) return new NextResponse(null, { status: 409 })
  return new NextResponse(bytes, { headers: {
    'Content-Type': 'application/pdf', 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  } })
}
