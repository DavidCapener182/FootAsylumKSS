import { PermissionError, requirePermission } from '@/lib/permissions'

/** Operational source records are for active KSS staff, including KSS readonly. */
export async function requireKssSourceRead() {
  const context = await requirePermission('viewEvidence')
  if (!['admin', 'ops', 'readonly'].includes(context.role)) {
    throw new PermissionError('KSS staff access required', 403)
  }
  return context
}
