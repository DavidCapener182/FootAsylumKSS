import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/permissions'

const schema = z.object({ storeId: z.string().uuid(), templateId: z.string().uuid(), auditorId: z.string().uuid(), scheduledAt: z.string().datetime({ offset: true }).or(z.string().datetime({ local: true })), dueAt: z.string().datetime({ offset: true }).or(z.string().datetime({ local: true })) })

export async function POST(request: Request) {
  const { supabase } = await requirePermission('manageAudits')
  const body = schema.parse(await request.json())
  const scheduledAt = new Date(body.scheduledAt).toISOString()
  const dueAt = new Date(body.dueAt).toISOString()
  if (dueAt <= scheduledAt) return NextResponse.json({ error: 'Due time must be after the scheduled time' }, { status: 400 })
  const { data, error } = await supabase.from('fa_audit_instances').insert({ template_id: body.templateId, store_id: body.storeId, conducted_by_user_id: body.auditorId, assigned_auditor_user_id: body.auditorId, scheduled_at: scheduledAt, due_at: dueAt, status: 'draft' }).select(`id, status, scheduled_at, due_at, evidence_complete, store:fa_stores!fa_audit_instances_store_id_fkey(store_name, store_code), template:fa_audit_templates!fa_audit_instances_template_id_fkey(title), auditor:fa_profiles!fa_audit_instances_assigned_auditor_user_id_fkey(full_name)`).single()
  if (error) return NextResponse.json({ error: 'Unable to schedule audit' }, { status: 500 })
  return NextResponse.json({ schedule: data }, { status: 201 })
}
