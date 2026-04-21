import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('fa_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const userIds = Array.isArray(body?.userIds)
      ? body.userIds.filter(isUuid)
      : []

    if (userIds.length === 0) {
      return NextResponse.json({ latestByUser: {} })
    }

    const { data, error } = await supabase
      .from('fa_activity_log')
      .select('performed_by_user_id, entity_type, entity_id, action, created_at, details')
      .in('performed_by_user_id', userIds)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Failed to load latest admin activity:', error)
      return NextResponse.json({ error: 'Failed to load latest activity' }, { status: 500 })
    }

    const latestByUser: Record<string, unknown> = {}
    for (const row of data || []) {
      const userId = String(row.performed_by_user_id || '')
      if (!userId || latestByUser[userId]) continue

      latestByUser[userId] = {
        action: String(row.action || ''),
        entityType: String(row.entity_type || ''),
        entityId: row.entity_id ? String(row.entity_id) : null,
        createdAt: String(row.created_at || ''),
        details: row.details && typeof row.details === 'object' ? row.details : null,
      }
    }

    return NextResponse.json({ latestByUser })
  } catch (error) {
    console.error('Unexpected latest-activity API error:', error)
    return NextResponse.json({ error: 'Failed to load latest activity' }, { status: 500 })
  }
}
