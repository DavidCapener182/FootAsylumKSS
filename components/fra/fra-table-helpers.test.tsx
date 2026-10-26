import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getFRAStatus, storeNeedsFRA, type FRARow } from './fra-table-helpers'

const store: FRARow = {
  id: 'closed-store',
  store_code: 'S0014',
  store_name: 'Hanley',
  region: 'A4',
  is_active: false,
  compliance_audit_1_date: '2025-11-11',
  compliance_audit_2_date: null,
  fire_risk_assessment_date: '2025-11-11',
  fire_risk_assessment_pdf_path: null,
  fire_risk_assessment_notes: null,
  fire_risk_assessment_pct: null,
}

describe('FRA renewal eligibility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each(['2025-11-11', '2025-01-01', null])(
    'does not request an FRA for a closed store with previous date %s',
    (date) => {
      const closed = { ...store, fire_risk_assessment_date: date }
      expect(getFRAStatus(date, storeNeedsFRA(closed))).toBe('not_required')
    }
  )

  it.each([
    ['2025-11-11', 'due'],
    ['2025-01-01', 'overdue'],
    [null, 'required'],
    ['2026-09-10', 'up_to_date'],
  ])('preserves the renewal status of an active store with date %s', (date, status) => {
    const active = { ...store, is_active: true, fire_risk_assessment_date: date }
    expect(getFRAStatus(date, storeNeedsFRA(active))).toBe(status)
  })

  it('requires a completed H&S audit before an active store needs an FRA', () => {
    const active = { ...store, is_active: true, compliance_audit_1_date: null }
    expect(storeNeedsFRA(active)).toBe(false)
    expect(storeNeedsFRA({ ...active, compliance_audit_2_date: '2026-09-10' })).toBe(true)
  })
})
