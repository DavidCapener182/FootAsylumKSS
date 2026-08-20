import { z } from 'zod'

import { observeQuery } from '@/lib/observability'
import { createClient } from '@/lib/supabase/server'

const reportVersionSchema = z.object({
  id: z.string(),
  report_type: z.string(),
  status: z.enum(['queued', 'generating', 'ready', 'failed']),
  data_cutoff_at: z.string(),
  file_name: z.string().nullable(),
  storage_path: z.string().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
  generated_by: z.union([z.object({ full_name: z.string().nullable() }).nullable(), z.array(z.object({ full_name: z.string().nullable() }).nullable())]),
})

export type ReportVersion = z.infer<typeof reportVersionSchema>

export async function getRecentReportVersions(): Promise<ReportVersion[]> {
  return observeQuery('reports.recent_versions', async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('fa_report_versions')
      .select('id, report_type, status, data_cutoff_at, file_name, storage_path, created_at, completed_at, generated_by:fa_profiles!fa_report_versions_generated_by_user_id_fkey(full_name)')
      .order('created_at', { ascending: false }).limit(25)
    if (error) throw new Error(`Unable to load recent report versions: ${error.message}`)
    return z.array(reportVersionSchema).parse(data || [])
  })
}
