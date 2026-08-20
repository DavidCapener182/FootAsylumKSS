import { describe, expect, it } from 'vitest'

import { getSafeAuthRedirect } from '@/lib/auth-redirect'

describe('authentication redirect safety', () => {
  it('preserves a local path, query and fragment', () => {
    expect(getSafeAuthRedirect('/incidents?page=2#open')).toBe('/incidents?page=2#open')
  })

  it.each([
    'https://attacker.example/path',
    '//attacker.example/path',
    '/\\attacker.example/path',
    '/login',
    '/login/reset-password?redirectTo=/admin',
    '/path\nSet-Cookie: bad',
  ])('rejects unsafe or looping destination %s', (destination) => {
    expect(getSafeAuthRedirect(destination)).toBe('/')
  })

  it('uses only the first query-string value', () => {
    expect(getSafeAuthRedirect(['/actions', 'https://attacker.example'])).toBe('/actions')
  })
})
