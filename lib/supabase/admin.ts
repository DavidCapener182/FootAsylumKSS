import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getRequiredEnv } from '@/lib/env'

/**
 * Create a Supabase admin client with service role key
 * This should ONLY be used in server-side code for admin operations
 * NEVER expose the service role key to the client
 */
export function createAdminSupabaseClient() {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
