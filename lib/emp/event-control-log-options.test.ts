import { describe, expect, it } from 'vitest'
import {
  EMP_EVENT_CONTROL_LOG_TYPE_OPTIONS,
  getEmpEventControlLogTypeLabel,
  normalizeEmpEventControlLogTypeValue,
} from '@/lib/emp/event-control-log-options'

describe('emp event control log options', () => {
  it('includes operational venue areas in the default type list', () => {
    expect(EMP_EVENT_CONTROL_LOG_TYPE_OPTIONS.map((option) => option.value)).toEqual(
      expect.arrayContaining(['bars', 'campsites'])
    )
  })

  it('normalizes and labels custom message types for reuse', () => {
    expect(normalizeEmpEventControlLogTypeValue('Lost Property / Info Point')).toBe('lost_property_info_point')
    expect(getEmpEventControlLogTypeLabel('lost_property_info_point')).toBe('Lost Property Info Point')
  })
})
