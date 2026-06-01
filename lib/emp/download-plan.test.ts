import { describe, expect, it } from 'vitest'
import {
  EMP_DOWNLOAD_EVENT_NAME,
  EMP_DOWNLOAD_PLAN_TITLE,
  EMP_DOWNLOAD_PLAN_VALUES,
  EMP_DOWNLOAD_SELECTED_ANNEXES,
} from '@/lib/emp/download-plan'

describe('Download EMP seed plan', () => {
  it('creates a separate Download plan scope from the bar-only Radio 1 template', () => {
    expect(EMP_DOWNLOAD_EVENT_NAME).toBe('Download Festival 2026')
    expect(EMP_DOWNLOAD_PLAN_TITLE).toContain('Download Festival 2026')
    expect(EMP_DOWNLOAD_PLAN_VALUES.document_status).toBe('V1')
    expect(EMP_DOWNLOAD_SELECTED_ANNEXES).toEqual([
      'bar_operations',
      'search_screening',
      'front_of_stage_pit',
      'traffic_pedestrian_routes',
      'camping_security',
      'stewarding_deployment',
      'emergency_action_cards',
    ])
  })

  it('includes the required Download-specific operational areas', () => {
    const planText = Object.values(EMP_DOWNLOAD_PLAN_VALUES).join('\n')

    expect(planText).toContain('Co-Op')
    expect(planText).toContain('Co-Op shop ingress, egress, queueing and perimeter support')
    expect(planText).toContain('Co-Op shop')
    expect(planText).toContain('Accessible Campsite A4')
    expect(planText).toContain('Accessible Campsite D')
    expect(planText).toContain('accessibility campsite search')
  })

  it('defines RAMP areas as static and dynamic gathering spaces', () => {
    expect(EMP_DOWNLOAD_PLAN_VALUES.ramp_arrival).toContain('static and dynamic gathering spaces')
    expect(EMP_DOWNLOAD_PLAN_VALUES.ramp_arrival.toLowerCase()).not.toContain('arrival')
    expect(EMP_DOWNLOAD_PLAN_VALUES.ramp_arrival.toLowerCase()).not.toContain('pressure')
    expect(EMP_DOWNLOAD_PLAN_VALUES.ramp_movement.toLowerCase()).not.toContain('pressure')
  })

  it('includes supplied draft deployment schedule detail', () => {
    expect(EMP_DOWNLOAD_PLAN_VALUES.staffing_by_zone_and_time).toContain(
      'Monday 8 June|SPONSORSHIP|Sponsorship Supervisor|Access Control|KSS Security|SUP|1|07:00|19:00|12.00|1|19:00|07:00|12.00'
    )
    expect(EMP_DOWNLOAD_PLAN_VALUES.staffing_by_zone_and_time).toContain(
      'Wednesday 10 June|ACCESSIBILITY CAMPSITE ENTRANCE|Accessible Entrance Search Team|Access Control|KSS Security|SIA|4|08:00|20:00|12.00|1|20:00|08:00|12.00'
    )
    expect(EMP_DOWNLOAD_PLAN_VALUES.staffing_by_zone_and_time).toContain(
      'Wednesday 10 June|SPONSORSHIP|Coop Security No 2|Access Control|KSS Security|SIA|1|10:00|22:00|12.00|1|19:00|03:30|8.50'
    )
    expect(EMP_DOWNLOAD_PLAN_VALUES.staffing_by_zone_and_time).toContain(
      'Monday 15 June|PADDOCK|Paddock Gate|Access Control|KSS Security|SIA|2|08:00|15:00|7.00||||'
    )
    expect(EMP_DOWNLOAD_PLAN_VALUES.staffing_by_zone_and_time).toContain(
      'Thursday 11 June|ACCESSIBILITY CAMPSITE|Response Team 1 - Main Campsite|Security Patrol|KSS Security|SIA|2|08:00|20:00|12.00|2|20:00|08:00|12.00'
    )
    expect(EMP_DOWNLOAD_PLAN_VALUES.staffing_by_zone_and_time).toContain(
      'Sunday 14 June|PADDOCK|Hospital Gate 2|Access Control|KSS Security|SIA|1|08:00|20:00|12.00|1|20:00|08:00|12.00'
    )
    expect(EMP_DOWNLOAD_PLAN_VALUES.front_of_stage_roles).toContain(
      'The Co-Op is an actual shop, not a style of queue'
    )
    expect(EMP_DOWNLOAD_PLAN_VALUES.camping_security_roles).toContain('Accessibility Black Campsite')
    expect(EMP_DOWNLOAD_PLAN_VALUES.response_teams).toContain('Paddock response/access support')
  })

  it('makes safeguarding a lead control, not a secondary note', () => {
    expect(EMP_DOWNLOAD_PLAN_VALUES.safeguarding_process).toContain(
      'KSS staff will not conduct safeguarding investigations'
    )
    expect(EMP_DOWNLOAD_PLAN_VALUES.ejection_safeguarding).toContain(
      'ejection or eviction will pause immediately'
    )
    expect(EMP_DOWNLOAD_PLAN_VALUES.ask_for_angela_process).toContain('Ask for Angela')
    expect(EMP_DOWNLOAD_PLAN_VALUES.lost_vulnerable_person_process).toContain('Disney')
    expect(EMP_DOWNLOAD_PLAN_VALUES.lost_vulnerable_person_process).toContain('Mr Care')
  })
})
