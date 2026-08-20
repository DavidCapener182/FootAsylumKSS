import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requirePermission } from '@/lib/permissions'

const schema = z.object({ sourceType: z.enum(['incident', 'store']), actionId: z.string().uuid(), dueDate: z.string().date(), evidenceRequired: z.boolean(), blockedReason: z.string().trim().max(2000), verificationStatus: z.enum(['not_required', 'awaiting_evidence', 'awaiting_verification', 'verified', 'rejected']), recurrenceRule: z.string().trim().max(500) })

export async function PATCH(request: Request) {
  const { supabase, userId } = await requirePermission('manageActions')
  const body = schema.parse(await request.json())
  if (body.verificationStatus === 'verified' && !body.evidenceRequired) return NextResponse.json({ error: 'Evidence must be required before an action can be verified' }, { status: 400 })
  const table = body.sourceType === 'incident' ? 'fa_actions' : 'fa_store_actions'
  const payload: Record<string, unknown> = { due_date: body.dueDate, evidence_required: body.evidenceRequired, blocked_reason: body.blockedReason || null, verification_status: body.verificationStatus, recurrence_rule: body.recurrenceRule || null }
  if (body.verificationStatus === 'verified') { payload.verified_by_user_id = userId; payload.verified_at = new Date().toISOString() }
  else { payload.verified_by_user_id = null; payload.verified_at = null }
  const { error } = await supabase.from(table).update(payload).eq('id', body.actionId)
  if (error) return NextResponse.json({ error: 'Unable to update action workflow' }, { status: 500 })
  revalidatePath('/actions')
  return NextResponse.json({ success: true })
}
