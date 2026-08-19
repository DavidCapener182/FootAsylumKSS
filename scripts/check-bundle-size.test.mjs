import { describe, expect, it } from 'vitest'
import { evaluateBundleBudget } from './check-bundle-size.mjs'

describe('bundle-size budget', () => {
  it('accepts a bundle within both aggregate and individual budgets', () => {
    const result = evaluateBundleBudget(
      [
        { path: 'a.js', gzipBytes: 100 },
        { path: 'b.js', gzipBytes: 200 },
      ],
      { totalGzipBytes: 500, chunkGzipBytes: 250 }
    )

    expect(result.failures).toEqual([])
    expect(result.totalBytes).toBe(300)
    expect(result.largestChunk).toEqual({ path: 'b.js', gzipBytes: 200 })
  })

  it('reports aggregate and individual budget failures separately', () => {
    const result = evaluateBundleBudget(
      [{ path: 'oversized.js', gzipBytes: 600 }],
      { totalGzipBytes: 500, chunkGzipBytes: 250 }
    )

    expect(result.failures).toHaveLength(2)
    expect(result.failures[0]).toContain('Total client JavaScript')
    expect(result.failures[1]).toContain('oversized.js')
  })
})
