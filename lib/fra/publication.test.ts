import { describe, it, expect, vi } from 'vitest'
const download = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabaseClient: () => ({ storage: { from: () => ({ download }) } }) }))
import { pdfHash, verifiedPublication } from './publication'

describe('FRA publication verification', () => {
  it('hashes exact PDF bytes consistently', () => {
    expect(pdfHash(Buffer.from('%PDF-1.7 test'))).toHaveLength(64)
    expect(pdfHash(Buffer.from('a'))).not.toBe(pdfHash(Buffer.from('b')))
  })
  it('rejects missing or differently bound publications before accessing storage', async () => {
    const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), single: vi.fn(async () => ({ data: null, error: null })) }
    await expect(verifiedPublication({ from: () => query }, 'instance-a', 'publication-b')).rejects.toThrow('Reviewed PDF not found')
    expect(query.eq).toHaveBeenCalledWith('instance_id', 'instance-a')
    expect(download).not.toHaveBeenCalled()
  })
  it('allows an already confirmed publication to be retried without reprocessing sources', async () => {
    const row = { id: 'p', confirmed_at: '2026-09-07' }
    const query: any = { select: () => query, eq: () => query, single: async () => ({ data: row }) }
    expect(await verifiedPublication({ from: () => query }, 'i','p')).toBe(row)
  })
})
