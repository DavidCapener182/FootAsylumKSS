import { describe, expect, it } from 'vitest'
import {
  createIncidentInputSchema,
  incidentFormSchema,
  toCreateIncidentInput,
} from '@/lib/incidents/schema'

const baseForm = {
  store_id: '11111111-1111-4111-8111-111111111111',
  incident_category: 'accident' as const,
  severity: 'medium' as const,
  summary: 'Customer slipped near the entrance',
  description: 'Area isolated and first aid offered.',
  occurred_at: '2026-08-19T12:30',
}

describe('incident creation schema', () => {
  it('requires an explicit RIDDOR screening outcome', () => {
    const result = incidentFormSchema.safeParse({
      ...baseForm,
      riddor_reportable: '',
    })

    expect(result.success).toBe(false)
    expect(() => toCreateIncidentInput({
      ...baseForm,
      riddor_reportable: '',
    })).toThrow('Select a RIDDOR screening outcome')
  })

  it('maps a potential RIDDOR outcome to the persisted boolean', () => {
    const form = incidentFormSchema.parse({
      ...baseForm,
      riddor_reportable: 'yes',
    })

    expect(toCreateIncidentInput(form)).toMatchObject({
      summary: baseForm.summary,
      riddor_reportable: true,
    })
  })

  it('rejects malformed and extra server-action input', () => {
    const result = createIncidentInputSchema.safeParse({
      ...baseForm,
      occurred_at: 'not-a-date',
      riddor_reportable: false,
      requested_role: 'admin',
    })

    expect(result.success).toBe(false)
  })
})
