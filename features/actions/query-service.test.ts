import { describe, expect, it } from 'vitest'
import { presentUnifiedActions } from './query-service'

const incident = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Review incident',
  description: 'Confirm the investigation evidence.',
  priority: 'high',
  due_date: '2026-08-20',
  status: 'open',
  created_at: '2026-08-01T10:00:00.000Z',
  updated_at: '2026-08-01T10:00:00.000Z',
  evidence_required: true,
  completion_notes: null,
  incident_id: '22222222-2222-4222-8222-222222222222',
  assigned_to: { id: '33333333-3333-4333-8333-333333333333', full_name: 'Alex Ops' },
  incident: { reference_no: 'INC-2026-000001' },
}

const storeAction = {
  id: '44444444-4444-4444-8444-444444444444',
  title: 'Are all ladders clearly numbered for identification purposes?',
  description: 'Number every ladder.',
  source_flagged_item: 'Are all ladders clearly numbered for identification purposes?',
  priority: 'medium',
  due_date: '2026-08-21',
  status: 'open',
  created_at: '2026-08-01T10:00:00.000Z',
  updated_at: '2026-08-01T10:00:00.000Z',
  completion_notes: null,
  store: {
    id: '55555555-5555-4555-8555-555555555555',
    store_name: 'Test Store',
    store_code: '001',
    region: 'A1',
    compliance_audit_1_overall_pct: 72,
    compliance_audit_2_overall_pct: null,
    compliance_audit_2_assigned_manager_user_id: null,
  },
}

describe('unified action presentation service', () => {
  it('returns one typed contract for incident and store work', () => {
    const result = presentUnifiedActions([incident], [storeAction])
    expect(result.actions.map((action) => action.source_type)).toEqual(['incident', 'store'])
    expect(result.actions[0].evidence_required).toBe(true)
    expect(result.actions[1].incident?.reference_no).toBe('001 - Test Store')
    expect(result.storeQuestionOptions).toEqual(['Are all ladders clearly numbered for identification purposes?'])
  })

  it('applies search and priority filters at the service boundary', () => {
    expect(presentUnifiedActions([incident], [storeAction], { q: '000001' }).actions).toHaveLength(1)
    expect(presentUnifiedActions([incident], [storeAction], { priority: 'medium' }).actions).toHaveLength(1)
  })

  it('rejects malformed database rows rather than silently reducing the page', () => {
    expect(() => presentUnifiedActions([{ ...incident, due_date: null }], [])).toThrow()
  })
})
