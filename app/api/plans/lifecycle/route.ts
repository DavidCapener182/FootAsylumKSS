import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requirePermission } from '@/lib/permissions'

const bodySchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('transition'), planType: z.enum(['emp', 'cmp']), planId: z.string().uuid(), status: z.enum(['draft', 'review', 'approved', 'published', 'archived']), changeNotes: z.string().max(2000).optional() }),
  z.object({ operation: z.literal('comment'), planType: z.enum(['emp', 'cmp']), planId: z.string().uuid(), sectionKey: z.string().max(100).optional(), comment: z.string().trim().min(1).max(4000) }),
])

export async function POST(request: Request) {
  const { supabase, userId } = await requirePermission('adminUsers')
  const body = bodySchema.parse(await request.json())
  if (body.operation === 'transition') {
    const { data, error } = await supabase.rpc('kss_transition_plan', { p_plan_type: body.planType, p_plan_id: body.planId, p_status: body.status, p_change_notes: body.changeNotes || null })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }
  const { data, error } = await supabase.from('kss_plan_review_comments').insert({ plan_type: body.planType, plan_id: body.planId, section_key: body.sectionKey || null, comment: body.comment, created_by_user_id: userId }).select('id, section_key, comment, status, created_at').single()
  if (error) return NextResponse.json({ error: 'Unable to add review comment' }, { status: 500 })
  return NextResponse.json({ comment: data }, { status: 201 })
}
