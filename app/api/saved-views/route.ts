import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { savedViewFeatureSchema } from '@/features/saved-views/query-service'

const bodySchema = z.object({ feature: savedViewFeatureSchema, name: z.string().trim().min(1).max(100), filters: z.record(z.unknown()), visibleColumns: z.array(z.string()).default([]), density: z.enum(['compact', 'comfortable']).default('comfortable') })

export async function POST(request: Request) {
  const { user } = await requireAuth()
  const supabase = createClient()
  const body = bodySchema.parse(await request.json())
  const { data, error } = await supabase.from('fa_saved_views').upsert({ owner_user_id: user.id, feature: body.feature, name: body.name, filters: body.filters, visible_columns: body.visibleColumns, density: body.density }, { onConflict: 'owner_user_id,feature,name' }).select('id, name, filters, visible_columns, density, is_default').single()
  if (error) return NextResponse.json({ error: 'Unable to save this view' }, { status: 500 })
  return NextResponse.json({ view: data }, { status: 201 })
}

export async function DELETE(request: Request) {
  await requireAuth()
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Valid view id required' }, { status: 400 })
  const supabase = createClient()
  const { error } = await supabase.from('fa_saved_views').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Unable to delete this view' }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
