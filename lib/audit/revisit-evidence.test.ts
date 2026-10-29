import { describe, expect, it, vi } from 'vitest'
import { appendRevisit, REVISIT_BUCKET } from './revisit-evidence'
import type { SupabaseClient } from '@supabase/supabase-js'

const storeId = '11111111-1111-4111-8111-111111111111'
const historyId = '22222222-2222-4222-8222-222222222222'
const requestId = '33333333-3333-4333-8333-333333333333'
function fixture() {
  const store = { id: storeId, score: 73.20, audit1: '2026-01-22', audit2: '2026-09-17', pdf1: 'old-1.pdf', pdf2: 'old-2.pdf', count: 2, answers: ['failed'], actions: ['open'] }
  const original = { id: historyId, visit_date: store.audit2 }
  const makeQuery = (row: unknown) => {
    const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn(async () => ({ data: row, error: null })) }
    return query
  }
  const storeQuery = makeQuery(store), historyQuery = makeQuery(original)
  const revisitQuery = makeQuery({ id: requestId, revisit_date: '2026-10-22' })
  const file = new File(['%PDF-1.4 fictional revisit evidence'], 'fictional.pdf', { type: 'application/pdf' })
  const objects = new Map<string, Buffer>()
  const bucket = {
    upload: vi.fn(async (path: string, bytes: Buffer) => { objects.set(path, bytes); return { error: null } }),
    download: vi.fn(async (path: string) => ({ data: new Blob([new Uint8Array(objects.get(path)!)]), error: null })),
    remove: vi.fn(async (paths: string[]) => { paths.forEach(path => objects.delete(path)); return { error: null } }),
  }
  const rows = new Map<string, any>()
  // Models only the RPC's uniqueness boundary; real SQL regression script is separate.
  const rpc = vi.fn(async (_name, args) => {
    const duplicate = [...rows.values()].find(row => row.id === args.p_id || (row.original_history_id === args.p_history && row.revisit_date === args.p_date && row.file_sha256 === args.p_sha256))
    if (duplicate) return { data: duplicate, error: null }
    const row = { id: args.p_id, replaces_id: args.p_replaces || null, storage_path: args.p_path, original_history_id: args.p_history, revisit_date: args.p_date, file_sha256: args.p_sha256 }
    rows.set(row.id, row); return { data: row, error: null }
  })
  const supabase = { from: vi.fn(() => storeQuery) } as unknown as SupabaseClient
  const admin = { from: vi.fn((table: string) => table === 'fa_audit_revisits' ? revisitQuery : historyQuery), rpc, storage: { from: vi.fn(() => bucket) } } as unknown as SupabaseClient
  return { store, original, bucket, objects, rpc, rows, storeQuery, historyQuery, revisitQuery, admin, supabase,
    input: { supabase, admin, actorId: storeId, storeId, historyId, requestId, visitDate: '2026-10-22', notes: 'Synthetic follow-up, findings remain open', file } }
}

describe('append-only revisit evidence', () => {
  it('retains original audit, dates, scores, pointers, answers and actions; verifies bytes and disables upsert', async () => {
    const f = fixture(), before = structuredClone(f.store)
    await appendRevisit(f.input)
    expect(f.store).toEqual(before)
    expect(f.admin.from).toHaveBeenCalledTimes(1)
    expect(f.admin.from).toHaveBeenCalledWith('fa_store_audit_history')
    expect(f.historyQuery.eq).toHaveBeenCalledWith('store_id', storeId)
    expect(f.historyQuery.eq).toHaveBeenCalledWith('kind', 'H&S')
    expect(f.admin.storage.from).toHaveBeenCalledWith(REVISIT_BUCKET)
    expect(f.bucket.upload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${historyId}/.+\\.pdf$`)), expect.any(Buffer), { contentType: 'application/pdf', upsert: false })
    expect(f.bucket.download).toHaveBeenCalledOnce()
    expect(f.bucket.remove).not.toHaveBeenCalled()
  })
  it('handles concurrent retries with unique attempt objects and only removes the losing attempt', async () => {
    const f = fixture()
    const results = await Promise.all([appendRevisit(f.input), appendRevisit(f.input), appendRevisit(f.input)])
    expect(new Set(results.map(row => row.id)).size).toBe(1)
    expect(f.rows.size).toBe(1); expect(f.objects.size).toBe(1)
    expect(f.objects.has([...f.rows.values()][0].storage_path)).toBe(true)
    expect(f.bucket.remove).toHaveBeenCalledTimes(2)
  })
  it('deduplicates the same evidence with a fresh request ID, but adds multiple dated revisits', async () => {
    const f = fixture()
    const one = await appendRevisit(f.input)
    const retry = await appendRevisit({ ...f.input, requestId: '44444444-4444-4444-8444-444444444444' })
    expect(retry.id).toBe(one.id)
    await appendRevisit({ ...f.input, requestId: '55555555-5555-4555-8555-555555555555', visitDate: '2026-10-23' })
    expect(f.rows.size).toBe(2); expect(f.objects.size).toBe(2)
  })
  it('denies an inaccessible store before privileged history or storage access', async () => {
    const f = fixture(); f.storeQuery.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(appendRevisit(f.input)).rejects.toMatchObject({ status: 404 })
    expect(f.admin.from).not.toHaveBeenCalled(); expect(f.bucket.upload).not.toHaveBeenCalled()
  })
  it('denies mismatched-store or non-H&S parent before uploading', async () => {
    const f = fixture(); f.historyQuery.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(appendRevisit(f.input)).rejects.toMatchObject({ status: 404 })
    expect(f.historyQuery.eq).toHaveBeenCalledWith('store_id', storeId)
    expect(f.bucket.upload).not.toHaveBeenCalled()
  })
  it.each(['2026-02-30', 'not a date', '2026-09-16'])('rejects invalid or preceding date %s', async visitDate => {
    const f = fixture(); await expect(appendRevisit({ ...f.input, visitDate })).rejects.toMatchObject({ status: 400 })
    expect(f.bucket.upload).not.toHaveBeenCalled()
  })
  it('rejects spoofed content without writing anything', async () => {
    const f = fixture()
    await expect(appendRevisit({ ...f.input, file: new File(['not pdf'], 'a.pdf', { type: 'application/pdf' }) })).rejects.toThrow('content')
    expect(f.bucket.upload).not.toHaveBeenCalled()
  })
  it('cleans only the new object on failed hash readback', async () => {
    const f = fixture(); f.bucket.download.mockResolvedValue({ data: new Blob(['different']), error: null })
    await expect(appendRevisit(f.input)).rejects.toThrow('verification failed')
    expect(f.objects.size).toBe(0); expect(f.rpc).not.toHaveBeenCalled()
  })
  it('reports failed cleanup without claiming success', async () => {
    const f = fixture(); f.bucket.download.mockRejectedValue(new Error('network')); f.bucket.remove.mockResolvedValue({ error: { message: 'offline' } } as any)
    await expect(appendRevisit(f.input)).rejects.toThrow('cleanup review')
    expect(f.rpc).not.toHaveBeenCalled()
  })
  it('cleans the owned object after a definitive rejected transaction', async () => {
    const f = fixture(); f.rpc.mockResolvedValue({ data: null, error: { code: 'P0001' } } as any)
    await expect(appendRevisit(f.input)).rejects.toMatchObject({ status: 409 })
    expect(f.objects.size).toBe(0)
  })
  it('retains the object after uncertain commit outcome', async () => {
    const f = fixture(); f.rpc.mockResolvedValue({ data: null, error: { code: '', message: 'fetch failed' } } as any)
    await expect(appendRevisit(f.input)).rejects.toMatchObject({ status: 503 })
    expect(f.bucket.remove).not.toHaveBeenCalled(); expect(f.objects.size).toBe(1)
  })
  it('does not commit records if storage upload fails', async () => {
    const f = fixture(); f.bucket.upload.mockResolvedValue({ error: { message: 'quota' } } as any)
    await expect(appendRevisit(f.input)).rejects.toThrow('upload failed')
    expect(f.rpc).not.toHaveBeenCalled()
  })
})


describe('replacement upload boundary', () => {
  it('uses the replacement RPC and retains the previous immutable row and object bytes', async () => {
    const f = fixture()
    await appendRevisit(f.input)
    const previous = structuredClone([...f.rows.values()][0])
    const previousBytes = Buffer.from(f.objects.get(previous.storage_path)!)
    const newId = '44444444-4444-4444-8444-444444444444'
    await appendRevisit({ ...f.input, requestId: newId, replacesId: requestId,
      file: new File(['%PDF-1.4 corrected fictional evidence'], 'corrected.pdf', { type: 'application/pdf' }) })
    expect(f.rpc).toHaveBeenLastCalledWith('fa_replace_audit_revisit', expect.objectContaining({ p_replaces: requestId, p_id: newId, p_history: historyId, p_date: '2026-10-22' }))
    expect(f.revisitQuery.eq).toHaveBeenCalledWith('original_history_id', historyId)
    expect(f.rows.get(requestId)).toEqual(previous)
    expect(f.objects.get(previous.storage_path)).toEqual(previousBytes)
    expect(f.objects.size).toBe(2)
    expect(f.bucket.remove).not.toHaveBeenCalled()
  })
  it.each(['missing', 'wrong-date', 'bad-id'])('rejects an invalid replacement target before uploading: %s', async scenario => {
    const f = fixture()
    if (scenario === 'missing') f.revisitQuery.maybeSingle.mockResolvedValue({ data: null, error: null })
    if (scenario === 'wrong-date') f.revisitQuery.maybeSingle.mockResolvedValue({ data: { revisit_date: '2026-10-23' }, error: null })
    await expect(appendRevisit({ ...f.input, replacesId: scenario === 'bad-id' ? 'bad' : requestId })).rejects.toBeInstanceOf(Error)
    expect(f.bucket.upload).not.toHaveBeenCalled()
  })
  it('removes only the owned attempt object after a stale replacement is definitively rejected', async () => {
    const f = fixture()
    f.rpc.mockResolvedValue({ data: null, error: { code: 'P0001' } } as any)
    await expect(appendRevisit({ ...f.input, replacesId: requestId })).rejects.toMatchObject({ status: 409 })
    expect(f.bucket.remove).toHaveBeenCalledOnce()
    expect(f.objects.size).toBe(0)
  })
  it('retains attempt bytes after an uncertain replacement result for safe retry', async () => {
    const f = fixture()
    f.rpc.mockRejectedValue(new Error('Connection lost after commit'))
    await expect(appendRevisit({ ...f.input, replacesId: requestId })).rejects.toThrow('Connection lost')
    expect(f.bucket.remove).not.toHaveBeenCalled()
  })
})
