import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Mark FRA as complete: set audit instance to completed and set store's
 * fire_risk_assessment_date to today so it shows as done for 12 months.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const instanceId = body?.instanceId

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
    }

    // Get the audit instance and ensure it's an FRA
    const { data: instance, error: instanceError } = await supabase
      .from('fa_audit_instances')
      .select(`
        id,
        store_id,
        fa_audit_templates ( category )
      `)
      .eq('id', instanceId)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json({ error: 'FRA instance not found' }, { status: 404 })
    }

    const template = instance.fa_audit_templates as { category?: string } | null
    if (template?.category !== 'fire_risk_assessment') {
      return NextResponse.json({ error: 'Not a Fire Risk Assessment instance' }, { status: 400 })
    }

    const storeId = instance.store_id
    const now = new Date()
    const today = now.toISOString().slice(0, 10) // YYYY-MM-DD

    // 1. Mark audit instance as completed
    const { error: updateInstanceError } = await supabase
      .from('fa_audit_instances')
      .update({
        status: 'completed',
        conducted_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', instanceId)

    if (updateInstanceError) {
      console.error('Error updating FRA instance:', updateInstanceError)
      return NextResponse.json(
        { error: 'Failed to mark FRA as completed', details: updateInstanceError.message },
        { status: 500 }
      )
    }

    // 2. Set store's fire_risk_assessment_date so FRA tracker shows "up to date" for 12 months
    const { error: updateStoreError } = await supabase
      .from('fa_stores')
      .update({ fire_risk_assessment_date: today })
      .eq('id', storeId)

    if (updateStoreError) {
      console.error('Error updating store FRA date:', updateStoreError)
      // Instance is already updated; log but don't fail the request
    }

    return NextResponse.json({ success: true, fire_risk_assessment_date: today })
  } catch (error: any) {
    console.error('Error completing FRA:', error)
    return NextResponse.json(
      { error: 'Failed to save FRA', details: error.message },
      { status: 500 }
    )
  }
}
