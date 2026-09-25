import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getFraActionReadScope } from '@/lib/fra/action-access'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { actionId: string } }) {
  const { profile } = await requireRole(['admin', 'ops', 'area_manager'])
  if (!/^[0-9a-f-]{36}$/i.test(params.actionId)) return new NextResponse(null, { status: 400 })
  const admin = createAdminSupabaseClient()
  const { data: action } = await admin.from('fa_fra_actions').select('store_id').eq('id', params.actionId).maybeSingle()
  if (!action) return new NextResponse(null, { status: 404 })
  if (profile.role === 'area_manager') {
    const scope = await getFraActionReadScope(profile)
    if (scope.kind !== 'client_stores' || scope.role !== 'area_manager' || !scope.storeIds.includes(action.store_id)) return new NextResponse(null, { status: 404 })
  }
  const { data: evidence } = await admin.from('fa_fra_action_evidence').select('storage_path')
    .eq('action_id', params.actionId).order('submitted_at', { ascending: false }).limit(1).maybeSingle()
  if (!evidence?.storage_path || !evidence.storage_path.startsWith(`${params.actionId}/`)) return new NextResponse(null, { status: 404 })
  const { data: file, error } = await admin.storage.from('fa-fra-action-evidence').download(evidence.storage_path)
  if (error || !file) return new NextResponse(null, { status: 404 })
  const contentType = file.type
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(contentType)) return new NextResponse(null, { status: 415 })
  return new NextResponse(Buffer.from(await file.arrayBuffer()), { headers: {
    'Content-Type': contentType, 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  } })
}
