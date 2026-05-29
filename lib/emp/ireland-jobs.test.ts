import { describe, expect, it } from 'vitest'
import {
  EMP_COLUMN_HIDDEN_FIELD_PREFIX,
  EMP_COLUMN_LABEL_FIELD_PREFIX,
  EMP_DOCUMENT_DESCRIPTION_FIELD,
  EMP_IRELAND_PSA_BADGE_COLUMN_LABEL,
  EMP_IRELAND_VEST_NUMBER_COLUMN_LABEL,
  EMP_IRELAND_SIGN_IN_TEMPLATE_ID,
  EMP_TABLE_EMPTY_ROWS_FIELD,
  buildIrelandSignInPrefillData,
  isIrelandSignInPreset,
} from '@/lib/emp/ireland-jobs'

describe('EMP Ireland jobs preset', () => {
  it('builds two blank sign-in pages with Ireland-specific labels', () => {
    const prefill = buildIrelandSignInPrefillData()
    const pages = prefill.templateTablePageValues?.[EMP_IRELAND_SIGN_IN_TEMPLATE_ID] || []

    expect(prefill.eventName).toBe('')
    expect(prefill.eventDate).toBe('')
    expect(pages).toHaveLength(2)
    expect(pages.map((page) => page.fields?.['Location / Venue'])).toEqual(['Marlay Park', 'Malahide Castle'])
    expect(pages.every((page) => (
      page.fields?.[`${EMP_COLUMN_LABEL_FIELD_PREFIX} sia_badge_number`] === EMP_IRELAND_PSA_BADGE_COLUMN_LABEL
    ))).toBe(true)
    expect(pages.every((page) => (
      page.fields?.[`${EMP_COLUMN_LABEL_FIELD_PREFIX} shift_start`] === EMP_IRELAND_VEST_NUMBER_COLUMN_LABEL
    ))).toBe(true)
    expect(pages.every((page) => (
      page.fields?.[`${EMP_COLUMN_HIDDEN_FIELD_PREFIX} shift_end`] === 'true'
    ))).toBe(true)
    expect(pages.every((page) => page.fields?.[EMP_TABLE_EMPTY_ROWS_FIELD] === '16')).toBe(true)
    expect(pages.every((page) => String(page.fields?.[EMP_DOCUMENT_DESCRIPTION_FIELD] || '').includes('PSA badge'))).toBe(true)
    expect(pages.every((page) => Object.keys(page.tableCells || {}).length === 0)).toBe(true)
  })

  it('matches the Ireland sign-in preset id case-insensitively', () => {
    expect(isIrelandSignInPreset(' IRELAND-SIGN-IN ')).toBe(true)
  })
})
