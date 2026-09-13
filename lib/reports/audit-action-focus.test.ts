import { describe, expect, it } from 'vitest'
import { reportActionFocus } from './audit-action-focus'
const focus = (title: string) => reportActionFocus({ title, source_flagged_item: null })
describe('report action priorities', () => {
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
