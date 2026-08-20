import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { observeQuery } from '@/lib/observability'

export const planTypeSchema = z.enum(['emp', 'cmp'])
export type PlanType = z.infer<typeof planTypeSchema>

const versionSchema = z.object({
  id: z.string(), version_number: z.number().int(), status: z.string(), change_notes: z.string().nullable(), created_at: z.string(),
})
const commentSchema = z.object({ id: z.string(), section_key: z.string().nullable(), comment: z.string(), status: z.enum(['open', 'resolved']), created_at: z.string() })
const planSchema = z.object({ id: z.string(), status: z.string(), version_number: z.number().int(), review_date: z.string().nullable(), approved_at: z.string().nullable(), published_at: z.string().nullable() })

export type PlanLifecycleData = {
  plan: z.infer<typeof planSchema>
  versions: z.infer<typeof versionSchema>[]
  comments: z.infer<typeof commentSchema>[]
}

export async function getPlanLifecycleData(planType: PlanType, planId: string): Promise<PlanLifecycleData> {
  return observeQuery(`${planType}.plan_lifecycle`, async () => {
    const supabase = createClient()
    const table = planType === 'emp' ? 'emp_plans' : 'cmp_plans'
    const [planResult, versionsResult, commentsResult] = await Promise.all([
      supabase.from(table).select('id, status, version_number, review_date, approved_at, published_at').eq('id', planId).single(),
      supabase.from('kss_plan_versions').select('id, version_number, status, change_notes, created_at').eq('plan_type', planType).eq('plan_id', planId).order('version_number', { ascending: false }),
      supabase.from('kss_plan_review_comments').select('id, section_key, comment, status, created_at').eq('plan_type', planType).eq('plan_id', planId).order('created_at', { ascending: false }),
    ])
    if (planResult.error) throw new Error(`Unable to load plan lifecycle: ${planResult.error.message}`)
    if (versionsResult.error) throw new Error(`Unable to load plan versions: ${versionsResult.error.message}`)
    if (commentsResult.error) throw new Error(`Unable to load plan review comments: ${commentsResult.error.message}`)
    return { plan: planSchema.parse(planResult.data), versions: z.array(versionSchema).parse(versionsResult.data || []), comments: z.array(commentSchema).parse(commentsResult.data || []) }
  })
}
