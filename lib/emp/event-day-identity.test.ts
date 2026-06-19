import { describe, expect, it } from 'vitest'
import {
  resolveUniqueKioskNameMatch,
  unavailableReasonForKioskStatus,
} from '@/lib/emp/event-day-identity'

const staff = [
  { staffName: 'David Capener' },
  { staffName: 'David Smith' },
  { staffName: 'Jane Williams' },
]

describe('event-day kiosk name identity', () => {
  it('does not reveal a name until the query is long enough', () => {
    const result = resolveUniqueKioskNameMatch(staff, 'da')
    expect(result.status).toBe('too_short')
    expect(result.row).toBeNull()
  })

  it('does not reveal multiple first-name matches', () => {
    const result = resolveUniqueKioskNameMatch(staff, 'David')
    expect(result.status).toBe('ambiguous')
    expect(result.row).toBeNull()
  })

  it('reveals one staff member when surname typing makes the match unique', () => {
    const result = resolveUniqueKioskNameMatch(staff, 'David C')
    expect(result.status).toBe('matched')
    expect(result.row?.staffName).toBe('David Capener')
  })

  it('supports compact first-plus-surname typing without spaces', () => {
    const result = resolveUniqueKioskNameMatch(staff, 'davidc')
    expect(result.status).toBe('matched')
    expect(result.row?.staffName).toBe('David Capener')
  })

  it('marks completed shifts unavailable for clock-in', () => {
    expect(unavailableReasonForKioskStatus('completed', 'clock_in')).toBe('already_completed')
  })

  it('marks scheduled shifts unavailable for clock-out', () => {
    expect(unavailableReasonForKioskStatus('scheduled', 'clock_out')).toBe('not_clocked_in')
  })

  it('allows scheduled clock-ins and clocked-in clock-outs', () => {
    expect(unavailableReasonForKioskStatus('scheduled', 'clock_in')).toBeNull()
    expect(unavailableReasonForKioskStatus('clocked_in', 'clock_out')).toBeNull()
  })
})
