import type { UserRole } from '@/lib/auth'

export type Permission =
  | 'manageActions'
  | 'manageAudits'
  | 'manageFRA'
  | 'manageIncidents'
  | 'manageStoreCRM'
  | 'manageRoutePlanning'
  | 'uploadEvidence'
  | 'viewEvidence'
  | 'exportReports'
  | 'adminUsers'

export const PERMISSION_ROLES: Record<Permission, ReadonlySet<UserRole>> = {
  manageActions: new Set(['admin', 'ops']),
  manageAudits: new Set(['admin', 'ops']),
  manageFRA: new Set(['admin', 'ops']),
  manageIncidents: new Set(['admin', 'ops']),
  manageStoreCRM: new Set(['admin', 'ops']),
  manageRoutePlanning: new Set(['admin', 'ops']),
  uploadEvidence: new Set(['admin', 'ops']),
  viewEvidence: new Set(['admin', 'ops', 'readonly', 'client']),
  exportReports: new Set(['admin', 'ops', 'readonly', 'client']),
  adminUsers: new Set(['admin']),
}

export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  return Boolean(role && PERMISSION_ROLES[permission].has(role))
}
