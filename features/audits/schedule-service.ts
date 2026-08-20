import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const optionSchema = z.object({ id: z.string(), label: z.string() })
const scheduleSchema = z.object({
  id: z.string(), status: z.string(), scheduled_at: z.string().nullable(), due_at: z.string().nullable(), evidence_complete: z.boolean(),
  store: z.union([z.object({ store_name: z.string(), store_code: z.string().nullable() }).nullable(), z.array(z.object({ store_name: z.string(), store_code: z.string().nullable() }).nullable())]),
  template: z.union([z.object({ title: z.string() }).nullable(), z.array(z.object({ title: z.string() }).nullable())]),
  auditor: z.union([z.object({ full_name: z.string().nullable() }).nullable(), z.array(z.object({ full_name: z.string().nullable() }).nullable())]),
})

export type AuditScheduleData = { schedules: z.infer<typeof scheduleSchema>[]; stores: z.infer<typeof optionSchema>[]; templates: z.infer<typeof optionSchema>[]; auditors: z.infer<typeof optionSchema>[] }

export async function getAuditScheduleData(): Promise<AuditScheduleData> {
  const supabase = createClient()
  const [schedules, stores, templates, auditors] = await Promise.all([
    supabase.from('fa_audit_instances').select(`id, status, scheduled_at, due_at, evidence_complete, store:fa_stores!fa_audit_instances_store_id_fkey(store_name, store_code), template:fa_audit_templates!fa_audit_instances_template_id_fkey(title), auditor:fa_profiles!fa_audit_instances_assigned_auditor_user_id_fkey(full_name)`).not('status', 'eq', 'completed').order('scheduled_at', { ascending: true, nullsFirst: false }).limit(100),
    supabase.from('fa_stores').select('id, store_name, store_code').eq('is_active', true).order('store_name'),
    supabase.from('fa_audit_templates').select('id, title').eq('is_active', true).order('title'),
    supabase.from('fa_profiles').select('id, full_name').in('role', ['admin', 'ops']).eq('account_status', 'active').order('full_name'),
  ])
  for (const [label, result] of [['schedules', schedules], ['stores', stores], ['templates', templates], ['auditors', auditors]] as const) if (result.error) throw new Error(`Unable to load audit ${label}: ${result.error.message}`)
  return {
    schedules: z.array(scheduleSchema).parse(schedules.data || []),
    stores: z.array(optionSchema).parse((stores.data || []).map((row) => ({ id: row.id, label: `${row.store_code ? `${row.store_code} · ` : ''}${row.store_name}` }))),
    templates: z.array(optionSchema).parse((templates.data || []).map((row) => ({ id: row.id, label: row.title }))),
    auditors: z.array(optionSchema).parse((auditors.data || []).map((row) => ({ id: row.id, label: row.full_name || 'Unnamed user' }))),
  }
}
