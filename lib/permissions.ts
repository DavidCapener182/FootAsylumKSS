import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/auth'
import { can, type Permission } from '@/lib/role-capabilities'

export type PermissionContext = {
  supabase: ReturnType<typeof createClient>
  userId: string
  role: UserRole
}

const PERMISSION_MESSAGES: Record<Permission, string> = {
  manageActions: 'You do not have permission to manage actions',
  manageAudits: 'You do not have permission to manage audits',
  manageFRA: 'You do not have permission to manage fire risk assessments',
  manageIncidents: 'You do not have permission to manage incident records',
  manageStoreCRM: 'You do not have permission to update store CRM data',
  manageRoutePlanning: 'You do not have permission to manage route planning',
  uploadEvidence: 'You do not have permission to upload or remove evidence',
  viewEvidence: 'You do not have permission to view this evidence',
  exportReports: 'You do not have permission to export reports',
  adminUsers: 'You do not have permission to manage users',
}

export async function requirePermission(permission: Permission): Promise<PermissionContext> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error } = await supabase
    .from('fa_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    throw new Error('Unable to verify user role')
  }

  const role = profile.role as UserRole
  if (!can(role, permission)) {
    throw new Error(PERMISSION_MESSAGES[permission])
  }

  return { supabase, userId: user.id, role }
}
