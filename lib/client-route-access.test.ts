import { describe, expect, it } from 'vitest'
import { isAllowedScopedClientApi, isAllowedScopedClientPath, isScopedClientRole } from './client-route-access'

describe('scoped client route boundary', () => {
  it('identifies only the new restricted roles', () => {
    expect(isScopedClientRole('area_manager')).toBe(true)
    expect(isScopedClientRole('client_admin')).toBe(true)
    expect(isScopedClientRole('client')).toBe(false)
    expect(isScopedClientRole('admin')).toBe(false)
  })

  it('allows only the manager board and support pages', () => {
    for (const path of ['/fra-action-plans', '/help', '/privacy', '/login', '/login/reset-password']) {
      expect(isAllowedScopedClientPath(path)).toBe(true)
    }
    for (const path of ['/dashboard', '/stores', '/calendar', '/incidents', '/privacy/gdpr', '/print/fra-report', '/api/fra-reports/view', '/fra-action-plans/other']) {
      expect(isAllowedScopedClientPath(path)).toBe(false)
    }
  })

  it('allows only scoped FRA APIs and methods for each client role', () => {
    expect(isAllowedScopedClientApi('client_admin', '/api/fra-actions/pdf', 'GET')).toBe(true)
    expect(isAllowedScopedClientApi('client_admin', '/api/fra-actions/command', 'POST')).toBe(false)
    expect(isAllowedScopedClientApi('client_admin', '/api/fra-actions/evidence', 'POST')).toBe(false)
    expect(isAllowedScopedClientApi('area_manager', '/api/fra-actions/command', 'POST')).toBe(true)
    expect(isAllowedScopedClientApi('area_manager', '/api/fra-actions/evidence', 'POST')).toBe(true)
    expect(isAllowedScopedClientApi('area_manager', '/api/fra-actions/evidence/11111111-1111-4111-8111-111111111111', 'GET')).toBe(true)
    expect(isAllowedScopedClientApi('area_manager', '/api/fra-actions/evidence/not-an-id', 'GET')).toBe(false)
    expect(isAllowedScopedClientApi('area_manager', '/api/fra-actions/command', 'GET')).toBe(false)
    expect(isAllowedScopedClientApi('area_manager', '/api/fra-reports/view', 'GET')).toBe(false)
  })
})
