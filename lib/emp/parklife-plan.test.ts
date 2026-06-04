import { describe, expect, it } from 'vitest'
import {
  EMP_PARKLIFE_DEPLOYMENT_ROWS,
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
    expect(EMP_PARKLIFE_PLAN_VALUES.document_version).toBe('V1')
    expect(EMP_PARKLIFE_PLAN_VALUES.document_status).toBe('V1')
    expect(EMP_PARKLIFE_SELECTED_ANNEXES).toEqual(['bar_operations'])
  })

  it('uses current Parklife source-document basics with deployment added', () => {
    expect(EMP_PARKLIFE_PLAN_VALUES.venue_name).toBe('Heaton Park')
    expect(EMP_PARKLIFE_PLAN_VALUES.venue_address).toContain('M25 2SW')
    expect(EMP_PARKLIFE_PLAN_VALUES.show_dates).toBe('20 June 2026 to 21 June 2026')
    expect(EMP_PARKLIFE_PLAN_VALUES.public_ingress_time).toContain('12:00 on Saturday 20 June')
    expect(EMP_PARKLIFE_PLAN_VALUES.public_ingress_time).toContain('13:00 on Sunday 21 June')
    expect(EMP_PARKLIFE_PLAN_VALUES.expected_attendance).toContain('45,000 plus guests')
    expect(EMP_PARKLIFE_PLAN_VALUES.licensed_capacity).toContain('60,000')
    expect(EMP_PARKLIFE_PLAN_VALUES.licensed_capacity).toContain('79,999')
    expect(EMP_PARKLIFE_PLAN_VALUES.staffing_by_zone_and_time).toContain('Saturday 20 June|BARS|Valley A')
  })

  it('includes the supplied Parklife deployment schedule in the detailed table format', () => {
    const deploymentRows = EMP_PARKLIFE_PLAN_VALUES.staffing_by_zone_and_time.split('\n')
    const staffByDay = deploymentRows.reduce<Record<string, number>>((totals, row) => {
      const cells = row.split('|')
      totals[cells[0]] = (totals[cells[0]] || 0) + Number(cells[6] || 0) + Number(cells[10] || 0)
      return totals
    }, {})

    expect(EMP_PARKLIFE_DEPLOYMENT_ROWS).toHaveLength(68)
    expect(deploymentRows).toEqual(EMP_PARKLIFE_DEPLOYMENT_ROWS)
    expect(deploymentRows.every((row) => row.split('|').length === 14)).toBe(true)
    expect(staffByDay['Saturday 20 June']).toBe(51)
    expect(staffByDay['Sunday 21 June']).toBe(51)
    expect(deploymentRows).toContain(
      'Saturday 20 June|BARS|Valley A|Bar security|STRAZA|SUP|1|11:30|23:00|11.5||||'
    )
    expect(deploymentRows).toContain(
      'Sunday 21 June|ACTIVATIONS|Beatbox Activation|Activation security|GUARDEX|SIA|2|12:30|23:00|11||||'
    )
    expect(EMP_PARKLIFE_PLAN_VALUES.staffing_by_zone_and_time).not.toContain(
      'TBC - final KSS Parklife bar deployment schedule'
    )
  })

  it('keeps the scope bar-only and avoids full-site ownership', () => {
    const planText = Object.values(EMP_PARKLIFE_PLAN_VALUES).join('\n')

    expect(planText).toContain('Bars/VIP Activations')
    expect(planText).toContain('KSS does not assume ownership of full-site crowd management')
    expect(planText).toContain('No planned KSS camping-security role')
    expect(planText).toContain('No planned KSS front-of-stage')
    expect(planText).toContain('No planned KSS traffic')
  })

  it('sets the named KSS Parklife leadership roles', () => {
    expect(EMP_PARKLIFE_PLAN_VALUES.named_command_roles).toContain('KSS Head of Security - Jack Longthorne')
    expect(EMP_PARKLIFE_PLAN_VALUES.named_command_roles).toContain('KSS Operational Lead - David Capener')
    expect(EMP_PARKLIFE_PLAN_VALUES.named_command_roles).toContain('KSS Operational Support - Laura Parker')
    expect(EMP_PARKLIFE_PLAN_VALUES.named_command_roles).toContain('Festival Director / Venue DPS - Jon Drape')
    expect(EMP_PARKLIFE_PLAN_VALUES.named_command_roles).toContain('Event Control Manager - Charlie Mussett')
    expect(EMP_PARKLIFE_PLAN_VALUES.named_command_roles).toContain('Head of Security and Crowd Management - Tom Bailey')
    expect(EMP_PARKLIFE_PLAN_VALUES.reporting_lines).toContain('Jack Longthorne')
    expect(EMP_PARKLIFE_PLAN_VALUES.reporting_lines).toContain('David Capener')
    expect(EMP_PARKLIFE_PLAN_VALUES.reporting_lines).toContain('Laura Parker')
  })

  it('applies confirmed Warehouse Project and communications details', () => {
    const planText = Object.values(EMP_PARKLIFE_PLAN_VALUES).join('\n')

    expect(EMP_PARKLIFE_PLAN_VALUES.client_name).toContain('Warehouse Project')
    expect(EMP_PARKLIFE_PLAN_VALUES.named_command_roles).toContain('Bar Operator Lead - Dan Pirie, Warehouse Project')
    expect(EMP_PARKLIFE_PLAN_VALUES.contact_directory).toContain('Bar Operator Lead - Dan Pirie, Warehouse Project')
    expect(EMP_PARKLIFE_PLAN_VALUES.specialist_teams_and_assets).toContain('response teams')
    expect(EMP_PARKLIFE_PLAN_VALUES.response_teams).toContain('KSS response teams')
    expect(EMP_PARKLIFE_PLAN_VALUES.relief_and_contingency).toContain('percentage-over-specification contingency allowance')
    expect(EMP_PARKLIFE_PLAN_VALUES.queue_design).toContain('set out in this EMP')
    expect(EMP_PARKLIFE_PLAN_VALUES.radio_channels_callsigns).toContain('confirmed on the day')
    expect(EMP_PARKLIFE_PLAN_VALUES.radio_channels_callsigns).toContain('Showsec Event Control')
    expect(EMP_PARKLIFE_PLAN_VALUES.refusal_false_id_protocol).toContain('JotForm and Event Control')
    expect(EMP_PARKLIFE_PLAN_VALUES.risk_assessment_source_notes).toContain('No additional final hazards')
    expect(EMP_PARKLIFE_PLAN_VALUES.appendix_notes).not.toContain('supervisor briefing')
    expect(EMP_PARKLIFE_PLAN_VALUES.site_maps_and_route_diagrams).not.toContain('deployment map')
    expect(planText).toContain('Warehouse Project')
  })

  it('captures Parklife site, welfare and emergency references from the supplied plans', () => {
    expect(EMP_PARKLIFE_PLAN_VALUES.related_documents).toContain('Parklife Festival 2026 ESMP v2.1')
    expect(EMP_PARKLIFE_PLAN_VALUES.related_documents).toContain('Parklife 2026 CMP v1')
    expect(EMP_PARKLIFE_PLAN_VALUES.site_maps_and_route_diagrams).toContain('PL26 Site Plan V10.6')
    expect(EMP_PARKLIFE_PLAN_VALUES.safe_spaces).toContain('FCP2')
    expect(EMP_PARKLIFE_PLAN_VALUES.safe_spaces).toContain('///eggs.cure.posed')
    expect(EMP_PARKLIFE_PLAN_VALUES.rendezvous_points).toContain('Production Boneyard')
    expect(EMP_PARKLIFE_PLAN_VALUES.emergency_procedures).toContain('traffic-light alert states')
    expect(EMP_PARKLIFE_PLAN_VALUES.bar_operations_roles).toContain('bar is breached')
  })

  it('uses the corrected RAMP areas wording and tone', () => {
    expect(EMP_PARKLIFE_PLAN_VALUES.ramp_arrival).toContain('static and dynamic gathering spaces')
    expect(EMP_PARKLIFE_PLAN_VALUES.ramp_arrival.toLowerCase()).not.toContain('arrival planning')
    expect(EMP_PARKLIFE_PLAN_VALUES.ramp_arrival.toLowerCase()).not.toContain('pressure')
    expect(EMP_PARKLIFE_PLAN_VALUES.ramp_movement.toLowerCase()).not.toContain('pressure')
  })
})
