import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isPermissionError } from '@/lib/permissions'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { approveFraActionDraft, buildFraActionPublicationSnapshot, validateFraActionDraft } from '@/lib/fra/fra-action-draft'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('manageFRA')
    const required = process.env.FRA_ACTION_PLAN_REQUIRED === 'true'
    if (!required) return NextResponse.json({ required: false, approved: null })
    const instanceId = request.nextUrl.searchParams.get('instanceId')
    if (!instanceId) throw new Error('instanceId is required')
    const { data, error } = await createAdminSupabaseClient().from('fa_fra_approved_action_plans')
      .select('snapshot').eq('instance_id', instanceId).maybeSingle()
    if (error) throw error
    return NextResponse.json({ required: true, approved: data?.snapshot ?? null })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load action plan' },
      { status: isPermissionError(error) ? error.status : 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await requirePermission('manageFRA')
    if (process.env.FRA_ACTION_PLAN_REQUIRED !== 'true') throw new Error('Approved action plan publication is not enabled')
    const pending = validateFraActionDraft((await request.json())?.draft)
    if (pending.approval !== 'pending') throw new Error('Submit a pending action plan for assessor approval')
    const { data: instance, error } = await supabase.from('fa_audit_instances')
      .select('id,store_id,fa_audit_templates(category)')
      .eq('id', pending.instanceId).single()
    if (error || !instance || instance.store_id !== pending.storeId
      || (instance.fa_audit_templates as { category?: string } | null)?.category !== 'fire_risk_assessment') {
      throw new Error('Action plan must belong to this Fire Risk Assessment and store')
    }
    const admin = createAdminSupabaseClient()
    const { data: confirmed, error: publicationError } = await admin.from('fa_fra_publications')
      .select('id').eq('instance_id', pending.instanceId).not('confirmed_at', 'is', null).maybeSingle()
    if (publicationError) throw publicationError
    if (confirmed) throw new Error('This FRA has already been issued')
    const approved = approveFraActionDraft(pending, userId)
    const snapshot = await buildFraActionPublicationSnapshot(approved)
    const { data: saved, error: saveError } = await admin.from('fa_fra_approved_action_plans')
      .insert({ instance_id: pending.instanceId, store_id: pending.storeId, snapshot,
        fingerprint: snapshot.fingerprint, approved_by: userId, approved_at: snapshot.approvedAt })
      .select('fingerprint').single()
    if (saveError || !saved) throw saveError || new Error('Unable to save approved action plan')
    return NextResponse.json({ fingerprint: saved.fingerprint, approvedAt: snapshot.approvedAt,
      pdfRows: snapshot.pdfRows.length, trackedActions: snapshot.trackingRows.length })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to approve FRA action plan' },
      { status: isPermissionError(error) ? error.status : 400 })
  }
}
