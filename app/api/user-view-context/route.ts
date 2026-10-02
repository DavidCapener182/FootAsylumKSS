import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { canViewUserActivity } from '@/lib/user-view-access'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canViewUserActivity(profile)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const ids = request.nextUrl.searchParams.getAll('userId').filter(id => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 50)
  if (!ids.length) return NextResponse.json({ views: [] })
  const { data, error } = await createAdminSupabaseClient().from('fa_user_view_context')
    .select('user_id,page_path,page_title,viewing_document,page_seen_at,document_title,document_opened_at')
    .in('user_id', ids)
  if (error) return NextResponse.json({ error: 'Unable to load views' }, { status: 500 })
  return NextResponse.json({ views: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Only same-origin browser observations. The actor always comes from auth.
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  if (!body || typeof body.path !== 'string' || !/^\/(?!\/)[^?#]{0,299}$/.test(body.path)
    || typeof body.title !== 'string' || body.title.length > 300
    || (body.document !== null && (typeof body.document !== 'string' || body.document.length > 300))) {
    return NextResponse.json({ error: 'Invalid view' }, { status: 400 })
  }
  const { error } = await createAdminSupabaseClient().from('fa_user_view_context').upsert({
    user_id: profile.id, page_path: body.path, page_title: body.title.trim(),
    viewing_document: body.document, page_seen_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: 'Unable to record view' }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
