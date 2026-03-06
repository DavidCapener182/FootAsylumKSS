import { describe, expect, it } from 'vitest'
import { buildFraRiskFindingsFromResponses } from '@/lib/fra/risk-rating-from-responses'

describe('buildFraRiskFindingsFromResponses', () => {
  it('does not flag fire doors when the narrative explicitly says none were propped open', () => {
    const findings = buildFraRiskFindingsFromResponses([
      {
        response_value: 'Yes',
        response_json: {
          value: 'Yes',
          comment: 'At the time of inspection no fire doors were propped open.',
          fra_extracted_data: {
            fireDoorsCondition: 'At the time of inspection no fire doors were propped open.',
          },
        },
        fa_audit_template_questions: {
          question_text: 'Fire doors closed and not held open?',
        },
      },
      {
        response_value: 'Yes',
        response_json: {
          value: 'Yes',
        },
        fa_audit_template_questions: {
          question_text: 'Fire doors in a good condition?',
        },
      },
    ])

    expect(findings.fire_doors_held_open).toBe(false)
    expect(findings.fire_doors_blocked).toBe(false)
    expect(findings.fire_door_integrity_issues).toBe(false)
  })
})
