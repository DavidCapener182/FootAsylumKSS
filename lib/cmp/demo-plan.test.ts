import { describe, expect, it } from 'vitest'
import { CMP_MASTER_TEMPLATE_FIELDS, CMP_ANNEX_DEFINITIONS } from '@/lib/cmp/master-template'
import { CMP_DEMO_PLAN_VALUES, CMP_DEMO_SELECTED_ANNEXES } from '@/lib/cmp/demo-plan'

describe('CMP demo plan', () => {
  it('covers every template field with a non-empty example value', () => {
    const missingKeys = CMP_MASTER_TEMPLATE_FIELDS
      .map((field) => field.key)
      .filter((fieldKey) => !String(CMP_DEMO_PLAN_VALUES[fieldKey] || '').trim())

    expect(missingKeys).toEqual([])
  })

  it('enables every available annex in the example event', () => {
    expect(CMP_DEMO_SELECTED_ANNEXES).toEqual(CMP_ANNEX_DEFINITIONS.map((annex) => annex.key))
  })
})
