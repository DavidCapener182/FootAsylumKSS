import 'server-only'

import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/permissions'
import type { Permission } from '@/lib/role-capabilities'
import { FaEntityType } from '@/types/db'
import { randomUUID } from 'node:crypto'

const ACTIVITY_PERMISSION_BY_ENTITY = {
  incident: 'manageIncidents',
  investigation: 'manageIncidents',
  action: 'manageActions',
  store: 'manageStoreCRM',
  user: 'adminUsers',
} satisfies Record<FaEntityType, Permission>

export interface ActivityLogDetails {
  old?: Record<string, unknown>
  new?: Record<string, unknown>
  [key: string]: unknown
}

export async function logActivity(
  entityType: FaEntityType,
  entityId: string,
  action: string,
  details?: ActivityLogDetails
) {
  const normalizedAction = action.trim()
  if (!normalizedAction || normalizedAction.length > 160) {
    throw new Error('Activity action must contain between 1 and 160 characters')
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entityId)) {
    throw new Error('Activity entity ID must be a valid UUID')
  }

  const requiredPermission = ACTIVITY_PERMISSION_BY_ENTITY[entityType]
  if (!requiredPermission) {
    throw new Error('Activity entity type is not supported')
  }

  // Re-authorize at the service-role boundary instead of relying solely on
  // the calling action. This also enforces active-account and role policy.
  const { userId } = await requirePermission(requiredPermission)

  // Browser-facing roles cannot INSERT into the audit table. After validating
  // the caller's permission, use the server-only service-role client for the
  // single append operation and stamp all trusted provenance server-side.
  const adminSupabase = createAdminSupabaseClient()
  const { error } = await adminSupabase
    .from('fa_activity_log')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      action: normalizedAction,
      performed_by_user_id: userId,
      details: details || null,
      source: 'server_action',
      correlation_id: randomUUID(),
    })

  if (error) {
    console.error('Failed to log activity:', error)
    throw error
  }
}
