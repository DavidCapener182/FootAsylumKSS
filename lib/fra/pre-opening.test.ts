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
    expect(result.accessDescription).toContain('not been confirmed')
    expect(result.sprinklerDescription).not.toContain('in accordance')
    expect(result.actionPlanItems).toHaveLength(8)
    expect(result.actionPlanItems.some((row: any) => /^Continue routine/.test(row.recommendation))).toBe(false)
  })
  it('uses saved commissioning status without turning outstanding documents into an uncommissioned system', () => {
    const commissioning = 'Fire alarm commissioned; no faults at inspection. Commissioning documents and category confirmation outstanding.'
    const result: any = applyPreOpeningEvidence({ ...base, assessmentContext: 'pre_opening' }, { preOpeningEvidence: { commissioning } }, null)
    expect(result.fireAlarmDescription).toBe(commissioning)
    expect(result.fireAlarmDescription).not.toContain('No alarm category or completed commissioning is assumed')
    const waiting: any = applyPreOpeningEvidence({ ...base, assessmentContext: 'pre_opening' }, { preOpeningEvidence: { commissioning: 'Commissioning is still pending.' } }, null)
    expect(waiting.fireAlarmDescription).toBe('Commissioning is still pending.')
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
  it('uses report-only map coordinates without changing store identity or stored directory coordinates', () => {
    const store = { id: 'example-store', latitude: null, longitude: null }
    const result: any = applyPreOpeningEvidence({ ...base, assessmentContext: 'pre_opening', store }, { siteMapLatitude: '51.5', siteMapLongitude: '-1.8', siteMapSource: 'Verified public map' }, null)
    expect(result.store).toEqual({ id: 'example-store', latitude: 51.5, longitude: -1.8 })
    expect(store.latitude).toBeNull()
    expect(result.siteMapSource).toBe('Verified public map')
    expect(() => validatePreOpeningMetadata({ siteMapLatitude: '91', siteMapLongitude: '-1.8' })).toThrow()
  })
  it('keeps opening requirements separate from routine follow-up', () => {
    const result: any = applyPreOpeningEvidence({ ...base, assessmentContext: 'pre_opening' }, null, null)
    const routine = result.actionPlanItems.find((row: any) => row.priority === 'Low')
    expect(routine.dueNote).toBe('First scheduled H&S audit')
    expect(routine.recommendation).toContain('must be completed before public opening')
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
