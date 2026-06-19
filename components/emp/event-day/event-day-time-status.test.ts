import { describe, expect, it } from 'vitest'
import {
  clockVarianceForShift,
  workedDurationLabel,
} from '@/components/emp/event-day/event-day-time-status'
import type {
  EmpEventDayClockEvent,
  EmpEventDayStaffShift,
} from '@/lib/emp/event-day-data'

function shift(overrides: Partial<EmpEventDayStaffShift>): EmpEventDayStaffShift {
  return {
    id: 'shift-1',
    planId: 'plan-1',
    importBatchId: null,
    staffName: 'David Capener',
    staffNameNormalised: 'david capener',
    agency: 'KSS',
    email: null,
    phone: null,
    siaBadgeNumber: null,
    siaExpiryDate: null,
    position: 'MGR',
    area: null,
    shiftStart: '2026-06-10T06:00:00.000Z',
    shiftEnd: '2026-06-10T18:00:00.000Z',
    status: 'clocked_in',
    clockedInAt: '2026-06-10T06:05:00.000Z',
    clockedOutAt: null,
    completedAt: null,
    adminNotes: null,
    staffNotes: null,
    isWalkUp: false,
    createdAt: '2026-06-10T05:00:00.000Z',
    updatedAt: '2026-06-10T06:05:00.000Z',
    ...overrides,
  }
}

function clockEvent(overrides: Partial<EmpEventDayClockEvent>): EmpEventDayClockEvent {
  return {
    id: 'event-1',
    planId: 'plan-1',
    staffShiftId: 'shift-1',
    eventType: 'admin_adjustment',
    eventTime: '2026-06-10T06:05:00.000Z',
    capturedVia: 'admin',
    deviceLabel: null,
    reason: 'Started late after supervisor briefing.',
    metadata: { clockType: 'clock_in' },
    createdAt: '2026-06-10T06:10:00.000Z',
    ...overrides,
  }
}

describe('event day time status', () => {
  it('counts worked time from clock in to now', () => {
    expect(workedDurationLabel(shift({}), Date.parse('2026-06-10T08:06:07.000Z'))).toBe('02:01:07')
  })

  it('flags unconfirmed clock-in variance over one minute', () => {
    expect(clockVarianceForShift(shift({}), [], 'clock_in')).toMatchObject({
      clockType: 'clock_in',
      confirmed: false,
      label: 'late by 5m',
    })
  })

  it('treats admin adjustment reason as confirming the variance', () => {
    expect(clockVarianceForShift(shift({}), [clockEvent({})], 'clock_in')).toMatchObject({
      confirmed: true,
      label: 'late by 5m',
    })
  })

  it('flags early clock-out variance', () => {
    expect(clockVarianceForShift(shift({
      status: 'completed',
      clockedOutAt: '2026-06-10T17:30:00.000Z',
    }), [], 'clock_out')).toMatchObject({
      clockType: 'clock_out',
      confirmed: false,
      label: 'early leaving by 30m',
    })
  })
})
