import 'server-only'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function recordDocumentOpened(userId: string, title: string) {
  const { error } = await createAdminSupabaseClient().from('fa_user_view_context').upsert({
    user_id: userId,
    document_title: title.slice(0, 300),
    document_opened_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  // Activity telemetry must never prevent a user from opening a document.
  if (error) console.warn('Unable to record document view', error.code)
}
