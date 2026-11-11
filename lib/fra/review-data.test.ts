import { describe, it, expect } from 'vitest'
import { buildEditedDataFromExtracted, isPreOpeningReviewData, prepareReviewedFraData } from './review-data'
import { FRA_RISK_MATRIX, normalizeFRAManualRiskRatingOverride } from './risk-rating'
const override = { likelihood: 'Low', consequence: 'Extreme Harm', reason: 'Controls maintained; potential for death.' }
describe('pre-opening assessor review controls', () => {
  it('retains saved judgement through extraction, form and save roundtrip', () => {
    const extracted = { assessmentContext: 'pre_opening', manualRiskRatingOverride: override, firePanelLocation: 'Observed panel' }
    const form = buildEditedDataFromExtracted(extracted)
    const saved = prepareReviewedFraData(form, true)
    expect(saved.manualRiskRatingOverride).toEqual(override)
    expect(buildEditedDataFromExtracted(saved)).toEqual(form)
    expect(saved.firePanelLocation).toBe('Observed panel')
    const validated = normalizeFRAManualRiskRatingOverride(saved.manualRiskRatingOverride)!
    expect(FRA_RISK_MATRIX[validated.likelihood][validated.consequence]).toBe('Moderate')
  })
  it('does not default or infer assessor inputs', () => {
    expect(buildEditedDataFromExtracted({ assessmentContext: 'pre_opening' }).manualRiskRatingOverride).toBeNull()
    expect(() => prepareReviewedFraData({ manualRiskRatingOverride: { overall: 'Moderate', reason: 'Reason' } }, true)).toThrow()
  })
  it.each([{ likelihood: 'Low' }, { likelihood: 'Low', consequence: 'Extreme Harm', reason: '' }, { likelihood: 'Low', consequence: 'High', reason: 'Reason' }])('rejects incomplete or invalid selection %j', value => {
    expect(() => prepareReviewedFraData({ manualRiskRatingOverride: value }, true)).toThrow()
  })
  it('allows explicit clearing without signing or completing', () => {
    const result = prepareReviewedFraData({ manualRiskRatingOverride: null }, true)
    expect(result).toEqual({ manualRiskRatingOverride: null })
    expect(prepareReviewedFraData({ manualRiskRatingOverride: { likelihood: '', consequence: '', reason: '' } }, true)).toEqual(result)
  })
  it.each([{ assessmentContext: 'operational' }, { assessmentContext: 'pre_opening', fra_template_variant: 'bremont_watches' }])('does not add controls or modify unrelated profiles %j', data => {
    expect(isPreOpeningReviewData(data)).toBe(false)
    expect(buildEditedDataFromExtracted(data)).not.toHaveProperty('manualRiskRatingOverride')
    expect(prepareReviewedFraData(data, false)).toBe(data)
  })
})
