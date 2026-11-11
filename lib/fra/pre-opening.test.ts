import { describe, it, expect } from 'vitest'
import { applyPreOpeningEvidence, preOpeningLocation, validatePreOpeningMetadata } from './pre-opening'

const base = { assessmentContext: 'operational', fraTemplateVariant: null, sleepingRisk: 'Existing wording', sourcesOfFuel: ['Cleaning materials (low risk, non-flammable)'], actionPlanItems: [{ recommendation: 'Remove door wedge', priority: 'High' }, { recommendation: 'Continue routine checks and testing of fire alarm, emergency lighting and fire-fighting equipment.', priority: 'Low' }] }
describe('pre-opening profile isolation and evidence', () => {
  it.each([null, 'bremont_watches', 'ordinary'])('leaves other profiles byte-for-byte unchanged: %s', variant => {
    const input = { ...base, fraTemplateVariant: variant }
    expect(applyPreOpeningEvidence(input, null, null)).toBe(input)
  })
  it('does not activate for Bremont even with stale pre-opening context', () => {
    const input = { ...base, fraTemplateVariant: 'bremont_watches', assessmentContext: 'pre_opening' }
    expect(applyPreOpeningEvidence(input, null, null)).toBe(input)
  })
  it('retains reported facts without inventing commissioning, history or signatures', () => {
    const result: any = applyPreOpeningEvidence({ ...base, assessmentContext: 'pre_opening' }, null, { alarmSystemDescription: 'Panel reported powered; commissioning record pending.' })
    expect(result.fireAlarmDescription).toBe('Panel reported powered; commissioning record pending.')
    expect(result.historyOfFires).toContain('not been confirmed')
    expect(result.sleepingRisk).toContain('not been confirmed')
    expect(result.assessmentReviewDate).toContain('Before public opening')
    expect(result).not.toHaveProperty('signature')
    expect(result.accessDescription).toContain('not been verified')
    expect(result.sprinklerDescription).not.toContain('in accordance')
    expect(result.actionPlanItems).toHaveLength(7)
    expect(result.actionPlanItems.some((row: any) => /^Continue routine/.test(row.recommendation))).toBe(false)
  })
  it('preserves owner/date/closure evidence and stable action identity across reorder', () => {
    const input = { ...base, assessmentContext: 'pre_opening' }
    const first: any = applyPreOpeningEvidence(input, null, null)
    const sourceActionId = first.actionPlanItems[0].sourceActionId
    const tracking = { [sourceActionId]: { owner: 'Site manager', targetDate: '2026-12-01', closureEvidence: 'Photograph reference pending' } }
    const next: any = applyPreOpeningEvidence({ ...input, actionPlanItems: [...input.actionPlanItems].reverse() }, { preOpeningActionTracking: tracking }, null)
    expect(next.actionPlanItems.find((row: any) => row.recommendation === 'Remove door wedge').sourceActionId).toBe(sourceActionId)
    expect(next.preOpeningActionTracking).toEqual(tracking)
  })
  it('preserves full reviewed location including more than 90 characters', () => {
    const location = 'Within the rear stockroom adjacent to the electrical intake cupboard, behind the staff welfare corridor and opposite the final exit.'
    expect(preOpeningLocation(location)).toBe(location)
    expect(preOpeningLocation('')).toBeNull()
  })
  it('rejects invalid due dates and oversized metadata', () => {
    expect(() => validatePreOpeningMetadata({ preOpeningActionTracking: { test: { targetDate: '2026-02-31' } } })).toThrow('date')
    expect(() => validatePreOpeningMetadata({ preOpeningEvidence: { commissioning: 'x'.repeat(5001) } })).toThrow()
  })
})
