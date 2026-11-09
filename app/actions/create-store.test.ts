import { beforeEach, describe, expect, it, vi } from 'vitest'
const permission = vi.hoisted(() => vi.fn())
vi.mock('@/lib/permissions', () => ({ requirePermission: permission, isPermissionError: (error: any) => error?.name === 'PermissionError' }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { createStore } from './create-store'
import { revalidatePath } from 'next/cache'

const input = {
  requestId: 'a1111111-1111-4111-8111-111111111111', store_name: 'New Outlet', store_code: '',
  address_line_1: '1 Example Road', city: 'Example', postcode: 'AB1 2CD', region: '', reporting_area: '' as const,
}
const record = { id: input.requestId, ...input, store_code: null, region: null, reporting_area: null, is_active: true }

function database(reads: Array<{ data: any; error: any }> = [], writeError: any = null) {
  const queries: any[] = []
  const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: writeError ? null : { id: input.requestId }, error: writeError }) }) }))
  const update = vi.fn(), upsert = vi.fn()
  const from = vi.fn(() => {
    const query: any = { eq: vi.fn(() => query), ilike: vi.fn(() => query), limit: vi.fn(() => query),
      maybeSingle: vi.fn(async () => reads.shift() || { data: null, error: null }) }
    queries.push(query)
    return { select: vi.fn(() => query), insert, update, upsert }
  })
  permission.mockResolvedValue({ supabase: { from } })
  return { from, insert, update, upsert, queries }
}

beforeEach(() => { vi.clearAllMocks() })

describe('create store', () => {
  it('enforces an active admin capability before reading or writing', async () => {
    const db = database()
    permission.mockRejectedValue(Object.assign(new Error('Forbidden'), { name: 'PermissionError' }))
    expect(await createStore(input)).toEqual({ ok: false, error: 'Forbidden' })
    expect(permission).toHaveBeenCalledWith('manageStores')
    expect(db.from).not.toHaveBeenCalled()
  })
  it('rejects incomplete details before touching the database', async () => {
    const db = database()
    expect((await createStore({ ...input, address_line_1: '' })).ok).toBe(false)
    expect(db.from).not.toHaveBeenCalled()
  })
  it('creates a fresh active record with no invented code or audit data', async () => {
    const db = database()
    const result = await createStore({ ...input, store_name: '  New Outlet  ', fire_risk_assessment_pct: 100, is_active: false } as any)
    expect(result).toEqual({ ok: true, id: input.requestId })
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(db.insert).toHaveBeenCalledWith({
      id: input.requestId, store_name: 'New Outlet', store_code: null, address_line_1: '1 Example Road',
      city: 'Example', postcode: 'AB1 2CD', region: null, reporting_area: null, is_active: true,
    })
    expect(db.update).not.toHaveBeenCalled()
    expect(db.upsert).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/stores')
    expect(revalidatePath).toHaveBeenCalledWith('/audit-tracker')
  })
  it('normalizes a supplied code and rejects any existing code, including a closed store', async () => {
    const db = database([{ data: null, error: null }, { data: { id: 'old-closed-store' }, error: null }])
    const result = await createStore({ ...input, store_code: ' s0051 ' })
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('already in use') })
    expect(db.queries[1].ilike).toHaveBeenCalledWith('store_code', 'S0051')
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })
  it('rejects a duplicate name and postcode even when code is unknown', async () => {
    const db = database([{ data: null, error: null }, { data: { id: 'existing' }, error: null }])
    expect(await createStore(input)).toMatchObject({ ok: false, error: expect.stringContaining('already exists') })
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('recovers a saved response using the same submission without another insert', async () => {
    const db = database([{ data: record, error: null }])
    expect(await createStore(input)).toEqual({ ok: true, id: input.requestId })
    expect(db.insert).not.toHaveBeenCalled()
  })
  it.each([{ ...record, is_active: false }, { ...record, postcode: 'ZZ1 1ZZ' }])('never reuses a conflicting or inactive record', async existing => {
    const db = database([{ data: existing, error: null }])
    expect(await createStore(input)).toMatchObject({ ok: false, error: expect.stringContaining('different details') })
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
    expect(db.upsert).not.toHaveBeenCalled()
  })
  it.each([0, 1])('fails closed when duplicate check %s is unavailable', async failAt => {
    const reads = Array.from({ length: failAt + 1 }, (_, i) => ({ data: null, error: i === failAt ? { message: 'offline' } : null }))
    const db = database(reads)
    expect((await createStore(input)).ok).toBe(false)
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('handles a concurrent unique-key conflict without overwriting anything', async () => {
    const db = database([], { code: '23505' })
    expect(await createStore(input)).toMatchObject({ ok: false, error: expect.stringContaining('same details') })
    expect(db.update).not.toHaveBeenCalled()
    expect(db.upsert).not.toHaveBeenCalled()
  })
})
