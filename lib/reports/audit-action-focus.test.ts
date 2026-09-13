import { describe, expect, it } from 'vitest'
import { correctiveActionForCheck, reportActionFocus } from './audit-action-focus'
const focus = (title: string) => reportActionFocus({ title, source_flagged_item: null })
describe('report action priorities', () => {
  it('describes corrections to failed checks without assigning new deadlines', () => {
    expect(correctiveActionForCheck('Fire exit routes clear and unobstructed?')).toBe('Remove the obstructions from fire-exit routes and keep the routes clear.')
    expect(correctiveActionForCheck('Ladder checks completed and recorded on weekly H&S checks?')).toContain('Complete the ladder checks')
    expect(correctiveActionForCheck('Is panel free of faults?')).toContain('verified fault')
  })
  it('groups formerly generic fire and electrical findings into specific controls', () => {
    expect(focus('Combustible materials are stored correctly? (No)').key).toBe('fire')
    expect(focus('Fire Extinguisher Service? (No)').key).toBe('fire')
    expect(focus('Are plugs and Extension leads managed and not overloaded? (No)').key).toBe('electrical')
  })
  it('keeps multi-topic training checks together', () => {
    expect(focus('H&S toolbox refresher training completed in the last 12 months and records available for Manual handling Housekeeping Fire Safety Stepladders? (No)').key).toBe('training')
  })
  it('retains unmatched findings instead of hiding them in generic control gaps', () => {
    const item = focus('Has the water system been flushed and Legionella compliant? (No)')
    expect(item.topic).toContain('water system')
    expect(item.question).toContain('Legionella')
  })
})
