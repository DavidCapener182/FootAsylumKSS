import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { HistoricalReviewInventory } from '@/components/fra/historical-review-model'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return new NextResponse(null, { status: 404 })
  await requireRole(['admin', 'ops'])
  const storeId = request.nextUrl.searchParams.get('storeId')
  const kind = request.nextUrl.searchParams.get('kind')
  const instanceId = request.nextUrl.searchParams.get('instanceId')
  if (!storeId || !['current', 'issued'].includes(kind || '')) return new NextResponse(null, { status: 400 })

  const raw = await readFile(join(process.cwd(), 'output', 'fra-action-migration-inventory-2026-09-25.json'), 'utf8').catch(() => null)
  if (!raw) return new NextResponse(null, { status: 404 })
  const inventory = JSON.parse(raw) as HistoricalReviewInventory
  if (inventory.projectId !== 'fwnzpafwfaiynrclwtnh') return new NextResponse(null, { status: 404 })
  const store = inventory.storeInventory.find(row => row.storeId === storeId)
  const path = kind === 'current' ? store?.currentFraPdfReference
    : inventory.candidateActions.find(row => row.storeId === storeId && row.assessmentInstanceId === instanceId && row.publicationId && row.confirmedPdfPath)?.confirmedPdfPath
  if (!path || !/^(fra|store)\/[A-Za-z0-9/_-]+\.pdf$/.test(path)) return new NextResponse(null, { status: 404 })
  if (request.nextUrl.searchParams.get('inline') === '1') {
    const { data: pdf, error: downloadError } = await createAdminSupabaseClient().storage.from('fa-attachments').download(path)
    if (downloadError || !pdf) return new NextResponse('FRA PDF could not be loaded.', { status: 404 })
    return new NextResponse(Buffer.from(await pdf.arrayBuffer()), { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } })
  }
  const { data, error } = await createAdminSupabaseClient().storage.from('fa-attachments').createSignedUrl(path, 300)
  if (error || !data?.signedUrl) return new NextResponse('FRA PDF could not be opened.', { status: 404 })
  return NextResponse.redirect(data.signedUrl, { headers: { 'Cache-Control': 'no-store' } })
}
