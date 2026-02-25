import { describe, expect, it } from 'vitest'
import {
  getStoreActionListTitle,
  getStoreActionQuestion,
  normalizeStoreActionQuestion,
} from './store-action-titles'

describe('store action title normalization', () => {
  it('maps onboarding answer-style text back to the induction canonical question', () => {
    const input =
      "Are staff who haven't completed their onboarding, meaning they may not be fully briefed on workplace procedures and operational requirements. This incomplete induction could result in some team members being unaware?"

    expect(normalizeStoreActionQuestion(input)).toBe('H&S induction training onboarding up to date and at 100%?')
  })

  it('maps toolbox completion answer-style text back to the toolbox canonical question', () => {
    const input =
      'Toolbox training is currently at 87% and records are incomplete for manual handling, housekeeping and fire safety topics.'

    expect(normalizeStoreActionQuestion(input)).toBe(
      'H&S toolbox refresher training completed in the last 12 months and records available for Manual handling Housekeeping Fire Safety Stepladders?'
    )
  })

  it('prefers canonical question found in source text over weak fallback title text', () => {
    const action = {
      title: 'Are there gaps with this control?',
      source_flagged_item: 'H&S induction training onboarding up to date and at 100%? (No)',
    }

    expect(getStoreActionQuestion(action)).toBe('H&S induction training onboarding up to date and at 100%?')
  })

  it('formats mapped induction content as a canonical list title', () => {
    const action = {
      title:
        "Are staff who haven't completed their onboarding, meaning they may not be fully briefed on workplace procedures and operational requirements. This incomplete induction could result in some team members being unaware?",
      description: 'Training matrix currently at 78%.',
    }

    expect(getStoreActionListTitle(action)).toBe('H&S induction training onboarding up to date and at 100%? (No)')
  })
})
