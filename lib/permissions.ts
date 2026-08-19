import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/auth'
import { can, type Permission } from '@/lib/role-capabilities'
import { accountHasApplicationAccess, type AccountStatus } from '@/lib/account-lifecycle'
import { hasRequiredMfaForRole, roleRequiresMfa } from '@/lib/mfa/policy'

export type PermissionContext = {
  supabase: ReturnType<typeof createClient>
  userId: string
  role: UserRole
  accountStatus: AccountStatus
}

export class PermissionError extends Error {
  readonly status: 401 | 403

  constructor(message: string, status: 401 | 403) {
    super(message)
    this.name = 'PermissionError'
    this.status = status
  }
}

export function isPermissionError(error: unknown): error is PermissionError {
  return error instanceof PermissionError
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
    throw new PermissionError('Unauthorized', 401)
  }

  const { data: profile, error } = await supabase
    .from('fa_profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw new Error('Unable to verify user role')
  }

  if (
    !profile
    || !accountHasApplicationAccess(profile.account_status as AccountStatus)
  ) {
    throw new PermissionError('Account profile is not authorized', 403)
  }

  const role = profile.role as UserRole
  const accountStatus = profile.account_status as AccountStatus
  if (
    roleRequiresMfa(role)
    && !(await hasRequiredMfaForRole(supabase.auth, role))
  ) {
    throw new PermissionError('Multi-factor authentication is required', 403)
  }

  if (!can(role, permission)) {
    throw new PermissionError(PERMISSION_MESSAGES[permission], 403)
  }

  return { supabase, userId: user.id, role, accountStatus }
}
