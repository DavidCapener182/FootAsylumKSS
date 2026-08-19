import { describe, expect, it } from 'vitest'

import { getLoginHref, getSafeMfaRedirect } from '@/lib/mfa/redirect'

describe('MFA redirect safety', () => {
  it('preserves a local path, query and fragment', () => {
    expect(getSafeMfaRedirect('/incidents?page=2#open')).toBe('/incidents?page=2#open')
  })

  it.each([
    'https://attacker.example/path',
    '//attacker.example/path',
    '/\\attacker.example/path',
    '/login',
    '/login/mfa?redirectTo=/admin',
    '/path\nSet-Cookie: bad',
  ])('rejects unsafe or looping destination %s', (destination) => {
    expect(getSafeMfaRedirect(destination)).toBe('/')
  })

  it('uses only the first query-string value', () => {
    expect(getSafeMfaRedirect(['/actions', 'https://attacker.example'])).toBe('/actions')
  })

  it('encodes the safe destination when returning to login', () => {
    expect(getLoginHref('/actions?owner=me')).toBe('/login?redirectTo=%2Factions%3Fowner%3Dme')
  })
})
