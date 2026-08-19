import { describe, expect, it } from 'vitest'
import {
  buildPersistedStoreActionSummary,
  isSuppressedStoreActionQuestion,
} from '@/lib/actions/action-summary'

describe('persisted action summaries', () => {
  it('prefers persisted reviewed wording and caps it for the list view', () => {
    const summary = buildPersistedStoreActionSummary({
      source_type: 'store',
      store_question: 'Are all ladders clearly numbered for identification purposes?',
      description: 'Assign a numbered asset label to every ladder and record the completed check in the store log before Friday.',
    })

    expect(summary).toBe('Assign a numbered asset label to every ladder and record the completed check in the')
    expect(summary.split(' ')).toHaveLength(15)
  })

  it('uses deterministic fallback wording when no persisted description exists', () => {
    expect(buildPersistedStoreActionSummary({
      source_type: 'store',
      store_question: 'Are all ladders clearly numbered for identification purposes?',
    })).toBe('Ensure ladders are clearly numbered')
  })

  it('preserves the current and target percentage for toolbox actions', () => {
    expect(buildPersistedStoreActionSummary({
      source_type: 'store',
      store_question: 'H&S toolbox refresher training completed in the last 12 months and records available for Manual handling Housekeeping Fire Safety Stepladders?',
      training_completion_rate: 72,
      description: 'Complete refresher training.',
    })).toContain('100% from current 72%')
  })

  it('continues to suppress non-actionable maintenance questions', () => {
    expect(isSuppressedStoreActionQuestion('PAT?')).toBe(true)
  })
})
