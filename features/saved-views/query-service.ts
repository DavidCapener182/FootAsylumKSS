import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export const savedViewFeatureSchema = z.enum(['audits', 'fra', 'actions', 'incidents', 'stores', 'activity', 'reports'])
export type SavedViewFeature = z.infer<typeof savedViewFeatureSchema>
const savedViewSchema = z.object({ id: z.string(), name: z.string(), filters: z.record(z.unknown()), visible_columns: z.array(z.unknown()), density: z.enum(['compact', 'comfortable']), is_default: z.boolean() })
export type SavedView = z.infer<typeof savedViewSchema>

export async function getSavedViews(feature: SavedViewFeature): Promise<SavedView[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('fa_saved_views').select('id, name, filters, visible_columns, density, is_default').eq('feature', feature).order('is_default', { ascending: false }).order('name')
  if (error) throw new Error(`Unable to load saved views: ${error.message}`)
  return z.array(savedViewSchema).parse(data || [])
}
