import { describe, expect, it } from 'vitest'
import {
  AUTH_BAN_DURATION_BY_STATUS,
  accountHasApplicationAccess,
  accountStatusLabel,
  isAccountStatus,
  normalizeAccountChangeReason,
} from '@/lib/account-lifecycle'

describe('account lifecycle', () => {
  it('only grants application access to active accounts', () => {
    expect(accountHasApplicationAccess('active')).toBe(true)
    expect(accountHasApplicationAccess('invited')).toBe(false)
    expect(accountHasApplicationAccess('pending')).toBe(false)
    expect(accountHasApplicationAccess('suspended')).toBe(false)
    expect(accountHasApplicationAccess('deactivated')).toBe(false)
  })

  it('keeps invitation redemption available but bans suspended accounts', () => {
    expect(AUTH_BAN_DURATION_BY_STATUS.active).toBe('none')
    expect(AUTH_BAN_DURATION_BY_STATUS.invited).toBe('none')
    expect(AUTH_BAN_DURATION_BY_STATUS.pending).toBe('none')
    expect(AUTH_BAN_DURATION_BY_STATUS.suspended).toBe('876000h')
    expect(AUTH_BAN_DURATION_BY_STATUS.deactivated).toBe('876000h')
  })

  it('validates and labels persisted statuses', () => {
    expect(isAccountStatus('suspended')).toBe(true)
    expect(isAccountStatus('deleted')).toBe(false)
    expect(accountStatusLabel('pending')).toBe('Pending approval')
  })

  it('requires a meaningful bounded reason for role and status changes', () => {
    expect(normalizeAccountChangeReason('  Approved by HR  ')).toBe('Approved by HR')
    expect(() => normalizeAccountChangeReason('  ')).toThrow(/reason between 3 and 500/i)
    expect(() => normalizeAccountChangeReason('x'.repeat(501))).toThrow(/reason between 3 and 500/i)
  })
})
