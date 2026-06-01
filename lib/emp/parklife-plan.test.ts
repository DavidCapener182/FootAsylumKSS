import { describe, expect, it } from 'vitest'
import {
  EMP_PARKLIFE_EVENT_NAME,
  EMP_PARKLIFE_PLAN_TITLE,
  EMP_PARKLIFE_PLAN_VALUES,
  EMP_PARKLIFE_SELECTED_ANNEXES,
} from '@/lib/emp/parklife-plan'

describe('Parklife EMP seed plan', () => {
  it('creates a Parklife bar-only plan scope', () => {
    expect(EMP_PARKLIFE_EVENT_NAME).toBe('Parklife Festival 2026')
    expect(EMP_PARKLIFE_PLAN_TITLE).toContain('Parklife Festival 2026')
    expect(EMP_PARKLIFE_PLAN_TITLE).toContain('Bar Security Operations Plan')
    expect(EMP_PARKLIFE_PLAN_VALUES.document_status).toBe('Draft')
    expect(EMP_PARKLIFE_SELECTED_ANNEXES).toEqual(['bar_operations'])
  })

  it('uses current Parklife event basics with deployment left pending', () => {
    expect(EMP_PARKLIFE_PLAN_VALUES.venue_name).toBe('Heaton Park')
    expect(EMP_PARKLIFE_PLAN_VALUES.venue_address).toContain('M25 0EG')
    expect(EMP_PARKLIFE_PLAN_VALUES.show_dates).toBe('20 June 2026 to 21 June 2026')
    expect(EMP_PARKLIFE_PLAN_VALUES.public_ingress_time).toContain('12:00 on Saturday 20 June')
    expect(EMP_PARKLIFE_PLAN_VALUES.public_ingress_time).toContain('13:00 on Sunday 21 June')
    expect(EMP_PARKLIFE_PLAN_VALUES.staffing_by_zone_and_time).toContain('TBC')
  })

  it('keeps the scope bar-only and avoids full-site ownership', () => {
    const planText = Object.values(EMP_PARKLIFE_PLAN_VALUES).join('\n')

    expect(planText).toContain('bar-security support only')
    expect(planText).toContain('KSS does not assume ownership of full-site crowd management')
    expect(planText).toContain('No planned KSS camping-security role')
    expect(planText).toContain('No planned KSS front-of-stage')
    expect(planText).toContain('No planned KSS traffic')
  })

  it('sets the named KSS Parklife leadership roles', () => {
    expect(EMP_PARKLIFE_PLAN_VALUES.named_command_roles).toContain('KSS Head of Security - Jack Longthorne')
    expect(EMP_PARKLIFE_PLAN_VALUES.named_command_roles).toContain('KSS Operational Lead - David Capener')
    expect(EMP_PARKLIFE_PLAN_VALUES.named_command_roles).toContain('KSS Operational Support - Laura Parker')
    expect(EMP_PARKLIFE_PLAN_VALUES.reporting_lines).toContain('Jack Longthorne')
    expect(EMP_PARKLIFE_PLAN_VALUES.reporting_lines).toContain('David Capener')
    expect(EMP_PARKLIFE_PLAN_VALUES.reporting_lines).toContain('Laura Parker')
  })

  it('uses the corrected RAMP areas wording and tone', () => {
    expect(EMP_PARKLIFE_PLAN_VALUES.ramp_arrival).toContain('static and dynamic gathering spaces')
    expect(EMP_PARKLIFE_PLAN_VALUES.ramp_arrival.toLowerCase()).not.toContain('arrival planning')
    expect(EMP_PARKLIFE_PLAN_VALUES.ramp_arrival.toLowerCase()).not.toContain('pressure')
    expect(EMP_PARKLIFE_PLAN_VALUES.ramp_movement.toLowerCase()).not.toContain('pressure')
  })
})
