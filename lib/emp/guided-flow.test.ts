import { describe, expect, it } from 'vitest'
import {
  generateEmpFieldValuesFromGuidedAnswers,
  getGuidedAutoFillTargetKeys,
  getGuidedAutoFillUpdates,
  getGuidedSelectedAnnexes,
  type EmpGuidedAnswers,
} from '@/lib/emp/guided-flow'

describe('EMP guided flow', () => {
  it('generates event-specific attendance wording from structured answers', () => {
    const answers: EmpGuidedAnswers = {
      event_name: 'Example Event',
      expected_attendance_number: '16500',
      staff_and_contractor_number: '1050',
      has_camping: true,
      camper_count: '3800',
    }

    const generated = generateEmpFieldValuesFromGuidedAnswers(answers)

    expect(generated.values.expected_attendance).toContain('16,500 public attendees expected')
    expect(generated.values.expected_attendance).toContain('1,050 staff and contractors')
    expect(generated.values.expected_attendance).toContain('3,800 campers')
    expect(generated.selectedAnnexes).toContain('camping_security')
  })

  it('keeps optional annexes off unless guided answers enable them', () => {
    expect(getGuidedSelectedAnnexes({})).toEqual([])
    expect(getGuidedSelectedAnnexes({ has_bars: true, has_vip_backstage: false })).toEqual([
      'bar_operations',
    ])
  })

  it('expands condensed risk and count inputs into operational wording', () => {
    const generated = generateEmpFieldValuesFromGuidedAnswers({
      event_name: 'Example Event',
      has_bars: true,
      alcohol_risk_level: 'high',
      family_vulnerability_level: 'medium',
      crowd_behaviour_level: 'low',
      main_arrival_mode: 'public_transport',
      public_transport_percent: '70',
      search_lane_count: '6',
      accessible_lane_count: '1',
      admission_search_posture: 'enhanced',
      queue_barriered: 'yes',
      weather_degradation_level: 'high',
      radio_channel_count: '4',
      sitrep_interval: '30 minutes',
    })

    expect(generated.values.alcohol_profile).toContain('Alcohol-related risk is assessed as high')
    expect(generated.values.travel_modes).toContain('Estimated public transport share: 70%')
    expect(generated.values.queue_design).toContain('6 standard search lane')
    expect(generated.values.search_policy).toContain('enhanced posture')
    expect(generated.values.degraded_route_weather_assumptions).toContain('assessed as high')
    expect(generated.values.communications_plan).toContain('4 radio channels')
    expect(generated.values.sitrep_decision_logging).toContain('30 minutes')
  })

  it('autofills related guided notes from dropdown selections without overwriting custom notes', () => {
    expect(getGuidedAutoFillUpdates('family_vulnerability_level', 'high', {})).toEqual({
      family_presence_notes: expect.stringContaining('Supervisors will confirm active welfare presence'),
    })

    const firstUpdate = getGuidedAutoFillUpdates('family_vulnerability_level', 'high', {})
    expect(
      getGuidedAutoFillUpdates('family_vulnerability_level', 'medium', {
        family_presence_notes: firstUpdate.family_presence_notes,
      })
    ).toEqual({
      family_presence_notes: expect.stringContaining('Supervisors will confirm welfare handover routes'),
    })

    expect(
      getGuidedAutoFillUpdates('family_vulnerability_level', 'low', {
        family_presence_notes: 'Manual note about the specific safe space.',
      })
    ).toEqual({})
  })

  it('can force dropdown autofill over seeded wording until the target is manually edited', () => {
    const targetKeys = getGuidedAutoFillTargetKeys('admission_search_posture')

    expect(targetKeys).toContain('search_policy')
    expect(
      getGuidedAutoFillUpdates(
        'admission_search_posture',
        'bar_only',
        {
          search_policy: 'KSS will apply standard event search controls with supervisor-led lane checks.',
        },
        ['search_policy']
      ).search_policy
    ).toContain('Main event search is not within the bar security scope')
  })

  it('keeps bar-only search wording out of the full search annex flow', () => {
    const updates = getGuidedAutoFillUpdates('admission_search_posture', 'bar_only', {
      has_search_screening: true,
    })

    expect(updates.has_search_screening).toBe(false)
    expect(updates.search_policy).toContain('Main event search is not within the bar security scope')

    const generated = generateEmpFieldValuesFromGuidedAnswers({
      admission_search_posture: 'bar_only',
      search_policy: String(updates.search_policy),
      has_search_screening: false,
    })

    expect(generated.selectedAnnexes).not.toContain('search_screening')
    expect(generated.values.search_policy).toContain('may request or conduct further search at bars')
  })
})
