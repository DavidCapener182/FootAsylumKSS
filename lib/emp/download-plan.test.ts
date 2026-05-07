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
    expect(planText).toContain('sponsor activations')
    expect(planText).toContain('Accessible Campsite A4')
    expect(planText).toContain('Accessible Campsite D')
    expect(planText).toContain('accessibility campsite search')
  })

  it('makes safeguarding a lead control, not a secondary note', () => {
    expect(EMP_DOWNLOAD_PLAN_VALUES.safeguarding_process).toContain(
      'KSS staff must not conduct safeguarding investigations'
    )
    expect(EMP_DOWNLOAD_PLAN_VALUES.ejection_safeguarding).toContain(
      'ejection or eviction must pause immediately'
    )
    expect(EMP_DOWNLOAD_PLAN_VALUES.ask_for_angela_process).toContain('Ask for Angela')
    expect(EMP_DOWNLOAD_PLAN_VALUES.lost_vulnerable_person_process).toContain('Disney')
    expect(EMP_DOWNLOAD_PLAN_VALUES.lost_vulnerable_person_process).toContain('Mr Care')
  })
})
