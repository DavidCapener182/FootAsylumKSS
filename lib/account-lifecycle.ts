export const ACCOUNT_STATUSES = [
  'invited',
  'pending',
  'active',
  'suspended',
  'deactivated',
] as const

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export const ACCOUNT_CHANGE_REASON_MIN_LENGTH = 3
export const ACCOUNT_CHANGE_REASON_MAX_LENGTH = 500

export const AUTH_BAN_DURATION_BY_STATUS: Record<AccountStatus, string> = {
  // Invited and pending users must still be able to redeem an invitation and
  // reach the no-access account status screen. RLS remains fail-closed.
  invited: 'none',
  pending: 'none',
  active: 'none',
  suspended: '876000h',
  deactivated: '876000h',
}

export function isAccountStatus(value: unknown): value is AccountStatus {
  return typeof value === 'string' && ACCOUNT_STATUSES.includes(value as AccountStatus)
}

export function accountHasApplicationAccess(status: AccountStatus | null | undefined) {
  return status === 'active'
}

export function normalizeAccountChangeReason(value: unknown) {
  const reason = typeof value === 'string' ? value.trim() : ''

  if (
    reason.length < ACCOUNT_CHANGE_REASON_MIN_LENGTH
    || reason.length > ACCOUNT_CHANGE_REASON_MAX_LENGTH
  ) {
    throw new Error(
      `A reason between ${ACCOUNT_CHANGE_REASON_MIN_LENGTH} and ${ACCOUNT_CHANGE_REASON_MAX_LENGTH} characters is required`
    )
  }

  return reason
}

export function accountStatusLabel(status: AccountStatus) {
  switch (status) {
    case 'invited':
      return 'Invited'
    case 'pending':
      return 'Pending approval'
    case 'active':
      return 'Active'
    case 'suspended':
      return 'Suspended'
    case 'deactivated':
      return 'Deactivated'
  }
}
