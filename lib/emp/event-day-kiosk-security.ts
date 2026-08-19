export type EmpEventDayKioskAction =
  | 'verify'
  | 'search_staff'
  | 'clocked_in'
  | 'clock_in'
  | 'clock_out'

export type EmpEventDayKioskCredentialFailure =
  | 'unavailable'
  | 'revoked'
  | 'expired'
  | 'unscoped'
  | 'event_date_mismatch'
  | null

export type EmpEventDayKioskCredentialState = {
  enabled: boolean
  accessId: string | null
  eventDate: string | null
  issuedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
}

export type EmpEventDayKioskRequestContext = {
  action: EmpEventDayKioskAction
  correlationId: string
  clientKeyHash: string
  pinKeyHash: string
  planId: string | null
  kioskAccessId: string | null
  eventDate: string | null
}

export type EmpEventDayMinimalKioskStaff = {
  id: string
  staffName: string
  agency: string | null
  position: string | null
  area: string | null
  shiftStart: string | null
  shiftEnd: string | null
}

export type EmpEventDayWorkerVerificationResult = 'verified' | 'invalid' | 'unavailable'

function digitsOnly(value: string | null | undefined) {
  return (value || '').replace(/\D/g, '')
}

function fixedLengthMatch(actual: string, expected: string) {
  if (actual.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index)
  }
  return difference === 0
}

/**
 * Verify a worker without exposing roster contact or licence data to the kiosk.
 * The selected shift supplies the private source values; only their final four
 * digits are accepted. A shift with no usable source value fails closed so an
 * authenticated supervisor must handle it instead.
 */
export function evaluateEmpEventDayWorkerVerification(input: {
  providedCode: string
  phone: string | null
  siaBadgeNumber: string | null
}): EmpEventDayWorkerVerificationResult {
  const candidates = [input.phone, input.siaBadgeNumber]
    .map(digitsOnly)
    .filter((value) => value.length >= 4)
    .map((value) => value.slice(-4))

  if (candidates.length === 0) return 'unavailable'

  const providedCode = input.providedCode.trim()
  return /^\d{4}$/.test(providedCode)
    && candidates.some((candidate) => fixedLengthMatch(providedCode, candidate))
    ? 'verified'
    : 'invalid'
}

export function evaluateKioskCredentialState(input: {
  credential: EmpEventDayKioskCredentialState
  requestedEventDate?: string | null
  now?: Date
}): EmpEventDayKioskCredentialFailure {
  const { credential } = input
  if (!credential.enabled) return 'unavailable'
  if (credential.revokedAt) return 'revoked'
  if (!credential.accessId || !credential.eventDate || !credential.issuedAt || !credential.expiresAt) {
    return 'unscoped'
  }

  const expiresAt = Date.parse(credential.expiresAt)
  const now = (input.now || new Date()).getTime()
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return 'expired'

  if (
    typeof input.requestedEventDate !== 'undefined'
    && input.requestedEventDate !== credential.eventDate
  ) {
    return 'event_date_mismatch'
  }

  return null
}

export function resolveKioskPinHashForRotation(input: {
  existingPinHash: string | null
  replacementPinHash?: string | null
  clearPin?: boolean
}) {
  if (input.clearPin) return null
  return input.replacementPinHash || input.existingPinHash
}

export function buildMinimalKioskStaffConfirmation(row: {
  id: string
  staff_name: string
  agency: string | null
  position: string | null
  area: string | null
  shift_start: string | null
  shift_end: string | null
}): EmpEventDayMinimalKioskStaff {
  return {
    id: row.id,
    staffName: row.staff_name,
    agency: row.agency,
    position: row.position,
    area: row.area,
    shiftStart: row.shift_start,
    shiftEnd: row.shift_end,
  }
}
