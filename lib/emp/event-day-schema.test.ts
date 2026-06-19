import { describe, expect, it } from 'vitest'
import {
  adminClockAdjustmentSchema,
  adminEquipmentReplaceSchema,
  adminEquipmentStockUpsertSchema,
  adminNoShowSchema,
  clockInSchema,
  eventDaySettingsSchema,
  mealTokenIssueSchema,
  staffingImportModeSchema,
} from '@/lib/emp/event-day-schema'

const staffShiftId = '00000000-0000-4000-8000-000000000001'

describe('event-day request schemas', () => {
  it('requires a radio number when a radio is issued at clock-in', () => {
    const parsed = clockInSchema.safeParse({
      staffShiftId,
      pin: '1234',
      nameQuery: 'Jane Smith',
      equipment: {
        hasRadio: true,
        radioNumber: '',
      },
    })

    expect(parsed.success).toBe(false)
    expect(parsed.success ? '' : parsed.error.issues[0].message).toContain('Radio number is required')
  })

  it('accepts a valid clock-in payload with issued equipment', () => {
    const parsed = clockInSchema.safeParse({
      staffShiftId,
      pin: '1234',
      nameQuery: 'Jane Smith',
      equipment: {
        hasRadio: true,
        radioNumber: '12',
        hasHiVis: true,
        hiVisDetails: 'Yellow XL',
        hasEarpiece: true,
      },
    })

    expect(parsed.success).toBe(true)
  })

  it('accepts kiosk clock-in with name query and no shared event PIN', () => {
    const parsed = clockInSchema.safeParse({
      staffShiftId,
      nameQuery: 'Jane Smith',
      equipment: {},
    })

    expect(parsed.success).toBe(true)
  })

  it('requires a name query for kiosk clock-in payloads', () => {
    const parsed = clockInSchema.safeParse({
      staffShiftId,
      pin: '1234',
      equipment: {},
    })

    expect(parsed.success).toBe(false)
    expect(parsed.success ? '' : parsed.error.issues.map((issue) => issue.message).join(' ')).toContain('Name is required')
  })

  it('requires an admin clock adjustment reason', () => {
    const parsed = adminClockAdjustmentSchema.safeParse({
      staffShiftId,
      clockType: 'clock_in',
      eventTime: '2026-06-20T09:00:00.000Z',
      reason: '',
    })

    expect(parsed.success).toBe(false)
  })

  it('requires an equipment replacement reason', () => {
    const parsed = adminEquipmentReplaceSchema.safeParse({
      assignmentId: staffShiftId,
      replacementItemNumber: '18',
      reason: '',
    })

    expect(parsed.success).toBe(false)
  })

  it('validates meal token staff shift ids', () => {
    expect(mealTokenIssueSchema.safeParse({ staffShiftId }).success).toBe(true)
    expect(mealTokenIssueSchema.safeParse({ staffShiftId: 'not-a-uuid' }).success).toBe(false)
  })

  it('supports explicit no-show and reinstate staff status actions', () => {
    const defaultAction = adminNoShowSchema.parse({ staffShiftId })
    const reinstate = adminNoShowSchema.parse({ staffShiftId, action: 'reinstate' })

    expect(defaultAction.action).toBe('mark_no_show')
    expect(reinstate.action).toBe('reinstate')
    expect(adminNoShowSchema.safeParse({ staffShiftId, action: 'delete' }).success).toBe(false)
  })

  it('does not support DOB-only roster update imports', () => {
    expect(staffingImportModeSchema.safeParse('update_dobs').success).toBe(false)
  })

  it('rejects negative equipment stock and meal token totals', () => {
    expect(adminEquipmentStockUpsertSchema.safeParse({
      equipmentType: 'radio',
      quantityTotal: -1,
    }).success).toBe(false)

    expect(eventDaySettingsSchema.safeParse({
      timezone: 'Europe/London',
      mealTokenTotal: -1,
    }).success).toBe(false)
  })
})
