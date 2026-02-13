import { describe, expect, it } from 'vitest'
import {
  buildFRAConsistencyNarratives,
  buildFRARiskSummary,
  computeFRARiskRating,
  type FRAOverallRisk,
  type FRARiskFindings,
} from './risk-rating'

function makeFindings(overrides: Partial<FRARiskFindings> = {}): FRARiskFindings {
  return {
    escape_routes_obstructed: false,
    fire_exits_obstructed: false,
    fire_doors_held_open: false,
    fire_doors_blocked: false,
    combustibles_in_escape_routes: false,
    combustibles_poorly_stored: false,
    fire_panel_access_obstructed: false,
    fire_door_integrity_issues: false,
    housekeeping_poor_back_of_house: false,
    housekeeping_good: true,
    training_completion_rate: 100,
    recent_fire_drill_within_6_months: true,
    emergency_lighting_tests_current: true,
    fire_alarm_tests_current: true,
    extinguishers_serviced_current: true,
    ...overrides,
  }
}

function consistency(findings: FRARiskFindings, overall: FRAOverallRisk) {
  return buildFRAConsistencyNarratives(findings, overall)
}

describe('computeFRARiskRating', () => {
  it('good store maps to low likelihood, slight harm and tolerable risk', () => {
    const result = computeFRARiskRating(makeFindings())
    expect(result).toMatchObject({
      likelihood: 'Low',
      consequence: 'Slight Harm',
      overall: 'Tolerable',
    })
  })

  it('bolton-like findings map to high likelihood, moderate harm and substantial risk', () => {
    const findings = makeFindings({
      escape_routes_obstructed: true,
      fire_exits_obstructed: true,
      fire_doors_held_open: true,
      combustibles_in_escape_routes: true,
      housekeeping_poor_back_of_house: true,
      housekeeping_good: false,
      training_completion_rate: 94,
    })
    const result = computeFRARiskRating(findings)
    expect(result).toMatchObject({
      likelihood: 'High',
      consequence: 'Moderate Harm',
      overall: 'Substantial',
    })
  })

  it('extreme consequence requires route/door compromise plus additional critical failures', () => {
    const findings = makeFindings({
      escape_routes_obstructed: true,
      fire_doors_held_open: true,
      fire_exits_obstructed: true,
      emergency_lighting_tests_current: false,
      fire_alarm_tests_current: false,
    })
    const result = computeFRARiskRating(findings)
    expect(result).toMatchObject({
      likelihood: 'High',
      consequence: 'Extreme Harm',
      overall: 'Intolerable',
    })
  })

  it('housekeeping-only issues map to normal likelihood and tolerable risk', () => {
    const result = computeFRARiskRating(
      makeFindings({
        combustibles_poorly_stored: true,
        housekeeping_poor_back_of_house: true,
        housekeeping_good: false,
      })
    )

    expect(result).toMatchObject({
      likelihood: 'Normal',
      consequence: 'Slight Harm',
      overall: 'Tolerable',
    })
  })

  it('doors held open only maps to high likelihood, moderate harm and substantial risk', () => {
    const result = computeFRARiskRating(
      makeFindings({
        fire_doors_held_open: true,
      })
    )

    expect(result).toMatchObject({
      likelihood: 'High',
      consequence: 'Moderate Harm',
      overall: 'Substantial',
    })
  })

  it('routes obstructed only maps to high likelihood, moderate harm and substantial risk', () => {
    const result = computeFRARiskRating(
      makeFindings({
        escape_routes_obstructed: true,
      })
    )

    expect(result).toMatchObject({
      likelihood: 'High',
      consequence: 'Moderate Harm',
      overall: 'Substantial',
    })
  })

  it('missing data does not crash and falls back to evidence-led neutral rationale', () => {
    const result = computeFRARiskRating(
      makeFindings({
        housekeeping_good: false,
        training_completion_rate: null,
        recent_fire_drill_within_6_months: null,
        emergency_lighting_tests_current: null,
        fire_alarm_tests_current: null,
        extinguishers_serviced_current: null,
      })
    )

    expect(result).toMatchObject({
      likelihood: 'Normal',
      consequence: 'Slight Harm',
      overall: 'Tolerable',
    })
    expect(result.rationale.join(' ')).toContain('No material evacuation, compartmentation, or fire safety management deficiencies were identified')
  })

  it('does not use training completion as a standalone risk rationale driver', () => {
    const result = computeFRARiskRating(
      makeFindings({
        training_completion_rate: 49.7,
      })
    )

    expect(result.rationale.join(' ').toLowerCase()).not.toContain('training completion')
  })

  it('summary text includes overall and key factor language', () => {
    const findings = makeFindings({
      escape_routes_obstructed: true,
      fire_doors_held_open: true,
      combustibles_in_escape_routes: true,
    })
    const result = computeFRARiskRating(findings)
    const summary = buildFRARiskSummary(findings, result)

    expect(summary).toContain('obstructed escape routes/back-of-house circulation routes')
    expect(summary).toContain('Likelihood is assessed as High')
    expect(summary).toContain('overall fire risk as Substantial')
  })
})

describe('buildFRAConsistencyNarratives', () => {
  it('does not output clear-route wording when routes are obstructed', () => {
    const findings = makeFindings({ escape_routes_obstructed: true })
    const text = consistency(findings, 'Substantial')
    expect(text.escapeRoutesStatement.toLowerCase()).toContain('obstructed')
    expect(text.escapeRoutesStatement.toLowerCase()).not.toContain('clear and unobstructed')
  })

  it('does not output door-compliant wording when doors are held open', () => {
    const findings = makeFindings({ fire_doors_held_open: true })
    const text = consistency(findings, 'Substantial')
    expect(text.fireDoorsStatement.toLowerCase()).toContain('held open')
    expect(text.fireDoorsStatement.toLowerCase()).not.toContain('not held open')
  })

  it('uses stronger controls wording for substantial/intolerable outcomes', () => {
    const findings = makeFindings({ escape_routes_obstructed: true, fire_doors_held_open: true })
    const text = consistency(findings, 'Intolerable')
    expect(text.controlsOverallStatement.toLowerCase()).toContain('material operational deficiencies')
    expect(text.controlsOverallStatement.toLowerCase()).not.toContain('good with minor observations')
  })
})
