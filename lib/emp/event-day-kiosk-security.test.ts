import { describe, expect, it } from 'vitest'
import {
  buildMinimalKioskStaffConfirmation,
  evaluateEmpEventDayWorkerVerification,
  evaluateKioskCredentialState,
  resolveKioskPinHashForRotation,
  type EmpEventDayKioskCredentialState,
} from '@/lib/emp/event-day-kiosk-security'

const activeCredential: EmpEventDayKioskCredentialState = {
  enabled: true,
  accessId: '00000000-0000-4000-8000-000000000001',
  eventDate: '2026-08-20',
  issuedAt: '2026-08-19T09:00:00.000Z',
  expiresAt: '2026-08-21T06:00:00.000Z',
  revokedAt: null,
}

describe('event-day kiosk credential lifecycle', () => {
  it('accepts only an active credential scoped to the requested date', () => {
    expect(evaluateKioskCredentialState({
      credential: activeCredential,
      requestedEventDate: '2026-08-20',
      now: new Date('2026-08-20T12:00:00.000Z'),
    })).toBeNull()
  })

  it('rejects disabled, revoked, unscoped, expired, and wrong-date credentials', () => {
    const now = new Date('2026-08-20T12:00:00.000Z')
    expect(evaluateKioskCredentialState({ credential: { ...activeCredential, enabled: false }, now })).toBe('unavailable')
    expect(evaluateKioskCredentialState({ credential: { ...activeCredential, revokedAt: '2026-08-20T10:00:00.000Z' }, now })).toBe('revoked')
    expect(evaluateKioskCredentialState({ credential: { ...activeCredential, accessId: null }, now })).toBe('unscoped')
    expect(evaluateKioskCredentialState({ credential: { ...activeCredential, expiresAt: '2026-08-20T11:59:59.000Z' }, now })).toBe('expired')
    expect(evaluateKioskCredentialState({ credential: activeCredential, requestedEventDate: '2026-08-21', now })).toBe('event_date_mismatch')
  })

  it('preserves a configured PIN hash during rotation unless explicitly changed or cleared', () => {
    expect(resolveKioskPinHashForRotation({ existingPinHash: 'existing' })).toBe('existing')
    expect(resolveKioskPinHashForRotation({ existingPinHash: 'existing', replacementPinHash: 'replacement' })).toBe('replacement')
    expect(resolveKioskPinHashForRotation({ existingPinHash: 'existing', clearPin: true })).toBeNull()
  })

  it('serializes only staff details used by the kiosk confirmation view', () => {
    const result = buildMinimalKioskStaffConfirmation({
      id: 'shift-1',
      staff_name: 'Jane Smith',
      agency: 'KSS',
      position: 'Steward',
      area: 'Gate A',
      shift_start: '2026-08-20T08:00:00.000Z',
      shift_end: '2026-08-20T18:00:00.000Z',
    })

    expect(result).toEqual({
      id: 'shift-1',
      staffName: 'Jane Smith',
      agency: 'KSS',
      position: 'Steward',
      area: 'Gate A',
      shiftStart: '2026-08-20T08:00:00.000Z',
      shiftEnd: '2026-08-20T18:00:00.000Z',
    })
    expect(result).not.toHaveProperty('email')
    expect(result).not.toHaveProperty('phone')
    expect(result).not.toHaveProperty('status')
  })
})

describe('event-day kiosk worker verification', () => {
  it('accepts the final four digits of the selected shift mobile number', () => {
    expect(evaluateEmpEventDayWorkerVerification({
      providedCode: '5481',
      phone: '07927 885 481',
      siaBadgeNumber: null,
    })).toBe('verified')
  })

  it('accepts the final four digits of the selected shift SIA badge', () => {
    expect(evaluateEmpEventDayWorkerVerification({
      providedCode: '7254',
      phone: null,
      siaBadgeNumber: '1014 8888 7483 7254',
    })).toBe('verified')
  })

  it('rejects another worker code and malformed alternate encodings', () => {
    const input = {
      phone: '07927 885 481',
      siaBadgeNumber: '1014 8888 7483 7254',
    }

    expect(evaluateEmpEventDayWorkerVerification({ ...input, providedCode: '0000' })).toBe('invalid')
    expect(evaluateEmpEventDayWorkerVerification({ ...input, providedCode: '54-81' })).toBe('invalid')
    expect(evaluateEmpEventDayWorkerVerification({ ...input, providedCode: '07927885481' })).toBe('invalid')
  })

  it('fails closed when the selected shift has no usable private identifier', () => {
    expect(evaluateEmpEventDayWorkerVerification({
      providedCode: '1234',
      phone: null,
      siaBadgeNumber: 'ST',
    })).toBe('unavailable')
  })
})
