import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requirePermission } from '@/lib/permissions'

const bodySchema = z.object({
  reportType: z.string().min(1).max(100),
  fileName: z.string().min(1).max(240),
  dataCutoffAt: z.string().datetime(),
  configuration: z.record(z.unknown()).default({}),
})

export async function POST(request: Request) {
  const { supabase, userId } = await requirePermission('exportReports')
  const body = bodySchema.parse(await request.json())
  const completedAt = new Date().toISOString()
  const { data, error } = await supabase.from('fa_report_versions').insert({
    report_type: body.reportType,
    configuration: body.configuration,
    status: 'ready',
    data_cutoff_at: body.dataCutoffAt,
    file_name: body.fileName,
    generated_by_user_id: userId,
    completed_at: completedAt,
  }).select('id').single()
  if (error) return NextResponse.json({ error: 'Unable to record report version' }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}
