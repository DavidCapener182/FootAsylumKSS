import { NextRequest, NextResponse } from 'next/server'
import { CmpAccessError, getCmpUserContext } from '@/lib/cmp/access'
import { CmpSetupRequiredError } from '@/lib/cmp/data'

export const dynamic = 'force-dynamic'

function normalizeEventName(value: unknown) {
  return String(value || '').trim()
}

function normalizeEventDate(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return null
  return raw
}

export async function GET() {
  try {
    const { supabase } = await getCmpUserContext()
    const { data, error } = await (supabase as any)
      .from('cmp_master_template_events')
      .select('id, event_name, event_date, prefill_data, created_at, updated_at')
      .order('updated_at', { ascending: false })

    if (error) {
      const message = String(error?.message || '')
      if (message.toLowerCase().includes('cmp_') && message.toLowerCase().includes('does not exist')) {
        throw new CmpSetupRequiredError(
          'CMP database setup required. Apply supabase/migrations/042_add_cmp_master_template_events.sql, then refresh.'
        )
      }
      throw new Error(message || 'Failed to load CMP template events')
    }

    return NextResponse.json({ events: data || [] })
  } catch (error: any) {
    if (error instanceof CmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof CmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error loading CMP master template events:', error)
    return NextResponse.json(
      { error: 'Failed to load CMP master template events', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile } = await getCmpUserContext()
    const body = await request.json().catch(() => ({}))
    const id = String(body?.id || '').trim()
    const eventName = normalizeEventName(body?.eventName)
    const eventDate = normalizeEventDate(body?.eventDate)
    const prefillData = body?.prefillData && typeof body.prefillData === 'object' ? body.prefillData : {}

    if (!eventName) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
    }

    const payload = {
      event_name: eventName,
      event_date: eventDate,
      prefill_data: prefillData,
      updated_by_user_id: profile.id,
    }

    if (id) {
      const { data, error } = await (supabase as any)
        .from('cmp_master_template_events')
        .update(payload)
        .eq('id', id)
        .select('id, event_name, event_date, prefill_data, created_at, updated_at')
        .single()

      if (error) {
        throw new Error(error?.message || 'Failed to update CMP template event')
      }

      return NextResponse.json({ event: data })
    }

    const { data, error } = await (supabase as any)
      .from('cmp_master_template_events')
      .insert({
        ...payload,
        created_by_user_id: profile.id,
      })
      .select('id, event_name, event_date, prefill_data, created_at, updated_at')
      .single()

    if (error) {
      throw new Error(error?.message || 'Failed to create CMP template event')
    }

    return NextResponse.json({ event: data })
  } catch (error: any) {
    if (error instanceof CmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('Error saving CMP master template event:', error)
    return NextResponse.json(
      { error: 'Failed to save CMP master template event', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase } = await getCmpUserContext()
    const id = String(request.nextUrl.searchParams.get('id') || '').trim()

    if (!id) {
      return NextResponse.json({ error: 'Event id is required' }, { status: 400 })
    }

    const { error } = await (supabase as any).from('cmp_master_template_events').delete().eq('id', id)

    if (error) {
      throw new Error(error?.message || 'Failed to delete CMP template event')
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error instanceof CmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('Error deleting CMP master template event:', error)
    return NextResponse.json(
      { error: 'Failed to delete CMP master template event', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
