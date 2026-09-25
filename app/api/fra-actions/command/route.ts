import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getFraActionReadScope } from '@/lib/fra/action-access'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Command = 'acknowledge' | 'approach' | 'close'
type Input = { actionId?: unknown; expectedVersion?: unknown; command?: unknown; approach?: unknown; bookedDate?: unknown; contractor?: unknown; note?: unknown }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const { profile } = await requireRole(['admin', 'ops', 'area_manager'])
  const input = await request.json().catch(() => null) as Input | null
  if (!input || typeof input.actionId !== 'string' || !uuid.test(input.actionId)
    || !Number.isInteger(input.expectedVersion) || (input.expectedVersion as number) < 1
    || !['acknowledge', 'approach', 'close'].includes(String(input.command))) {
    return NextResponse.json({ error: 'Invalid action command' }, { status: 400 })
  }
  const command = input.command as Command
  if (profile.role === 'area_manager' && command === 'close') return NextResponse.json({ error: 'KSS verification required' }, { status: 403 })
  if (profile.role !== 'area_manager' && command !== 'close') return NextResponse.json({ error: 'Area Manager action required' }, { status: 403 })

  const admin = createAdminSupabaseClient()
  const { data: action, error: lookupError } = await admin.from('fa_fra_actions').select('store_id').eq('id', input.actionId).maybeSingle()
  if (lookupError || !action) return NextResponse.json({ error: 'Action unavailable' }, { status: 404 })
  if (profile.role === 'area_manager') {
    const scope = await getFraActionReadScope(profile)
    if (scope.kind !== 'client_stores' || scope.role !== 'area_manager' || !scope.storeIds.includes(action.store_id)) {
      return NextResponse.json({ error: 'Action unavailable' }, { status: 404 })
    }
  }

  const expectedVersion = input.expectedVersion as number
  let result: { data: unknown; error: { message: string } | null }
  if (command === 'acknowledge') {
    result = await admin.rpc('fa_fra_acknowledge_action', { p_actor: profile.id, p_action_id: input.actionId, p_expected_version: expectedVersion })
  } else if (command === 'approach') {
    if (!['repair', 'make_safe', 'management', 'other'].includes(String(input.approach))) return NextResponse.json({ error: 'Choose an approach' }, { status: 400 })
    const date = typeof input.bookedDate === 'string' ? input.bookedDate : null
    const contractor = typeof input.contractor === 'string' ? input.contractor.trim().slice(0, 200) : null
    const note = typeof input.note === 'string' ? input.note.trim().slice(0, 2000) : null
    if (input.approach === 'repair' && (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !contractor)) return NextResponse.json({ error: 'Booking date and contractor required' }, { status: 400 })
    if (input.approach !== 'repair' && !note) return NextResponse.json({ error: 'Describe what was done' }, { status: 400 })
    result = await admin.rpc('fa_fra_set_action_approach', { p_actor: profile.id, p_action_id: input.actionId, p_expected_version: expectedVersion, p_approach: input.approach, p_booked_date: date, p_contractor: contractor, p_note: note })
  } else {
    const note = typeof input.note === 'string' ? input.note.trim().slice(0, 2000) : ''
    if (!note) return NextResponse.json({ error: 'Verification note required' }, { status: 400 })
    result = await admin.rpc('fa_fra_verify_close_action', { p_actor: profile.id, p_action_id: input.actionId, p_expected_version: expectedVersion, p_verification_note: note })
  }
  if (result.error) return NextResponse.json({ error: 'Action could not be updated. Refresh the board and try again.' }, { status: 409 })
  return NextResponse.json({ result: Array.isArray(result.data) ? result.data[0] : result.data })
}
