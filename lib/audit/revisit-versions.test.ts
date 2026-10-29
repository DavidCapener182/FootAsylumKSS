import { describe, expect, it } from 'vitest'
import { currentRevisitEvidence, previousRevisitVersions } from './revisit-versions'

describe('immutable revisit versions', () => {
  const first = { id: 'first', replaces_id: null }, second = { id: 'second', replaces_id: 'first' }, third = { id: 'third', replaces_id: 'second' }
  it('shows exactly one current report per chain and preserves separately dated visits', () => {
    const separate = { id: 'separate', replaces_id: null }
    expect(currentRevisitEvidence([second, separate, first, third])).toEqual([separate, third])
    expect(previousRevisitVersions(third, [second, separate, first, third])).toEqual([second, first])
  })
  it('handles legacy rows and incomplete/cyclic histories without looping', () => {
    expect(currentRevisitEvidence([{ id: 'legacy' }])).toEqual([{ id: 'legacy' }])
    expect(previousRevisitVersions(second, [second])).toEqual([])
    expect(previousRevisitVersions(second, [second, { id: 'first', replaces_id: 'second' }])).toHaveLength(1)
  })
})
