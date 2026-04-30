import { describe, expect, it } from 'vitest'
import { EMP_MASTER_TEMPLATE_FIELDS, EMP_ANNEX_DEFINITIONS } from '@/lib/emp/master-template'
import { EMP_DEMO_PLAN_VALUES, EMP_DEMO_SELECTED_ANNEXES } from '@/lib/emp/demo-plan'

describe('EMP demo plan', () => {
  it('covers every template field with a non-empty example value', () => {
    const missingKeys = EMP_MASTER_TEMPLATE_FIELDS
      .map((field) => field.key)
      .filter((fieldKey) => !String(EMP_DEMO_PLAN_VALUES[fieldKey] || '').trim())

    expect(missingKeys).toEqual([])
  })

  it('enables every available annex in the example event', () => {
    expect(EMP_DEMO_SELECTED_ANNEXES).toEqual(EMP_ANNEX_DEFINITIONS.map((annex) => annex.key))
  })
})
