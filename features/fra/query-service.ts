import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { extractFraRiskRatingFromResponses, type FRAResponseLike } from '@/lib/fra/risk-rating-from-responses'
import type { FRARow } from '@/components/fra/fra-table'

const storeRowSchema = z.object({
  id: z.string().uuid(),
  store_code: z.string().nullable(),
  store_name: z.string(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  is_active: z.boolean(),
  compliance_audit_1_date: z.string().nullable(),
  compliance_audit_2_date: z.string().nullable(),
  fire_risk_assessment_date: z.string().nullable(),
  fire_risk_assessment_pdf_path: z.string().nullable(),
  fire_risk_assessment_notes: z.string().nullable(),
  fire_risk_assessment_pct: z.number().nullable(),
})

const fraAuditSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid().nullable(),
  fra_overall_risk_rating: z.string().nullable(),
  conducted_at: z.string().nullable(),
  created_at: z.string(),
  fa_audit_templates: z.union([
    z.object({ category: z.string().nullable() }),
    z.array(z.object({ category: z.string().nullable() })),
  ]).nullable(),
  fa_audit_responses: z.array(z.object({
    response_value: z.unknown().optional(),
    response_json: z.unknown().optional(),
    fa_audit_template_questions: z.unknown().optional(),
  }).passthrough()).nullable(),
}).passthrough()

function templateCategory(value: z.infer<typeof fraAuditSchema>['fa_audit_templates']) {
  return Array.isArray(value) ? value[0]?.category : value?.category
}

export function presentFraRows(storeRows: unknown[], auditRows: unknown[]): FRARow[] {
  const stores = z.array(storeRowSchema).parse(storeRows)
  const audits = z.array(fraAuditSchema).parse(auditRows)
  const latestByStore = new Map<string, z.infer<typeof fraAuditSchema>>()

  for (const audit of audits) {
    if (!audit.store_id || latestByStore.has(audit.store_id)) continue
    if (templateCategory(audit.fa_audit_templates) !== 'fire_risk_assessment') continue
    latestByStore.set(audit.store_id, audit)
  }

  return stores.map((store) => {
    const audit = latestByStore.get(store.id)
    const responses = (audit?.fa_audit_responses || []) as FRAResponseLike[]
    const evidenceRating = audit ? extractFraRiskRatingFromResponses(responses) : null
    const storedRating = audit?.fra_overall_risk_rating?.trim() || null
    return {
      ...store,
      fire_risk_assessment_rating: evidenceRating ?? storedRating,
      fire_risk_assessment_instance_id: audit?.id || null,
    }
  })
}

export async function getFraTrackerRows(): Promise<FRARow[]> {
  const supabase = createClient()
  const [storesResult, auditsResult] = await Promise.all([
    supabase
      .from('fa_stores')
      .select('id, store_code, store_name, region, city, is_active, compliance_audit_1_date, compliance_audit_2_date, fire_risk_assessment_date, fire_risk_assessment_pdf_path, fire_risk_assessment_notes, fire_risk_assessment_pct')
      .order('region', { ascending: true })
      .order('store_name', { ascending: true }),
    supabase
      .from('fa_audit_instances')
      .select(`store_id, id, fra_overall_risk_rating, conducted_at, created_at,
        fa_audit_templates!inner(category),
        fa_audit_responses(response_value, response_json, fa_audit_template_questions(question_text))`)
      .eq('status', 'completed')
      .order('conducted_at', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  if (storesResult.error) throw new Error(`Unable to load FRA stores: ${storesResult.error.message}`)
  if (auditsResult.error) throw new Error(`Unable to load FRA assessments: ${auditsResult.error.message}`)
  return presentFraRows(storesResult.data || [], auditsResult.data || [])
}
