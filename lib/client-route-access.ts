/**
 * Fail-closed route boundary for the new scoped client roles. The legacy
 * `client` role continues through its existing routes until separately
 * migrated. API routes are explicitly listed after their handlers enforce
 * the same store-level checks.
 */
export function isScopedClientRole(role: string): boolean {
  return role === 'client_admin' || role === 'area_manager'
}

export function isAllowedScopedClientPath(pathname: string): boolean {
  return pathname === '/fra-action-plans'
    || pathname === '/help'
    || pathname === '/privacy'
    || pathname.startsWith('/login/')
    || pathname === '/login'
}

export function isAllowedScopedClientApi(role: string, pathname: string, method: string): boolean {
  if (!isScopedClientRole(role)) return false
  if (method === 'GET' && pathname === '/api/fra-actions/pdf') return true
  if (role !== 'area_manager') return false
  if (method === 'POST' && (pathname === '/api/fra-actions/command' || pathname === '/api/fra-actions/evidence')) return true
  if (method === 'GET' && /^\/api\/fra-actions\/evidence\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathname)) return true
  return false
}
