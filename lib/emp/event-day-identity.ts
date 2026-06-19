import { cleanImportText } from '@/lib/emp/event-day-import'

export type KioskNameLookupStatus = 'too_short' | 'no_match' | 'ambiguous' | 'matched'

export type KioskNameLookupMode = 'clock_in' | 'clock_out'

export type KioskUnavailableReason =
  | 'already_clocked_in'
  | 'already_completed'
  | 'not_clocked_in'
  | 'marked_no_show'

export type KioskNameLookupRow = {
  staffName: string
}

export function normaliseKioskNameText(value: unknown) {
  return cleanImportText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactKioskName(value: string) {
  return value.replace(/\s+/g, '')
}

function matchesKioskNameQuery(staffName: string, query: string) {
  const staff = normaliseKioskNameText(staffName)
  const normalizedQuery = normaliseKioskNameText(query)
  if (normalizedQuery.length < 3) return false

  const staffTokens = staff.split(' ').filter(Boolean)
  const queryTokens = normalizedQuery.split(' ').filter(Boolean)
  const tokenPrefixMatch = queryTokens.length > 0
    && queryTokens.length <= staffTokens.length
    && queryTokens.every((token, index) => staffTokens[index]?.startsWith(token))

  return tokenPrefixMatch || compactKioskName(staff).startsWith(compactKioskName(normalizedQuery))
}

export function resolveUniqueKioskNameMatch<T extends KioskNameLookupRow>(rows: T[], query: string): {
  status: KioskNameLookupStatus
  row: T | null
} {
  const normalizedQuery = normaliseKioskNameText(query)
  if (normalizedQuery.length < 3) return { status: 'too_short', row: null }

  const matches = rows.filter((row) => matchesKioskNameQuery(row.staffName, normalizedQuery))
  if (matches.length === 0) return { status: 'no_match', row: null }
  if (matches.length > 1) return { status: 'ambiguous', row: null }
  return { status: 'matched', row: matches[0] }
}

export function unavailableReasonForKioskStatus(
  status: string,
  mode: KioskNameLookupMode
): KioskUnavailableReason | null {
  if (mode === 'clock_in') {
    if (status === 'scheduled') return null
    if (status === 'clocked_in') return 'already_clocked_in'
    if (status === 'completed') return 'already_completed'
    if (status === 'no_show') return 'marked_no_show'
    return 'not_clocked_in'
  }

  if (status === 'clocked_in') return null
  if (status === 'completed') return 'already_completed'
  if (status === 'no_show') return 'marked_no_show'
  return 'not_clocked_in'
}
