import { beforeEach, describe, expect, it, vi } from 'vitest'

const storeId = '00000000-0000-4000-8000-000000000001'

const stores = [
  {
    id: storeId,
    store_name: 'Test Store',
    store_code: 'S001',
    is_active: true,
    region: 'North',
    city: 'Manchester',
    address_line_1: '1 Test Street',
    postcode: 'M1 1AA',
  },
]

const incidents = Array.from({ length: 205 }, (_, index) => ({
  id: `00000000-0000-4000-8001-${String(index + 1).padStart(12, '0')}`,
  reference_no: `INC-${index + 1}`,
  summary: `Incident ${index + 1}`,
  status: 'open',
  closed_at: null,
  occurred_at: '2026-09-01T12:00:00.000Z',
  store_id: storeId,
}))

const incidentActionIn = vi.fn(async (_column: string, ids: string[]) => ({
  data: [],
  error: null,
  ids,
}))

const supabase = {
  from: vi.fn((table: string) => {
    if (table === 'fa_stores') {
      return {
        select: vi.fn(() => ({
          order: vi.fn(async () => ({ data: stores, error: null })),
        })),
      }
    }

    if (table === 'fa_incidents') {
      return {
        select: vi.fn(() => ({
          in: vi.fn(async () => ({ data: incidents, error: null })),
        })),
      }
    }

    if (table === 'fa_store_actions') {
      return {
        select: vi.fn(() => ({
          in: vi.fn(async () => ({ data: [], error: null })),
        })),
      }
    }

    if (table === 'fa_actions') {
      return {
        select: vi.fn(() => ({ in: incidentActionIn })),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  }),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => supabase),
}))

describe('getStoreDirectoryData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('batches incident action filters so large directories stay within request limits', async () => {
    const { getStoreDirectoryData } = await import('./query-service')

    await expect(getStoreDirectoryData()).resolves.toMatchObject({ totalStores: 1 })

    expect(incidentActionIn).toHaveBeenCalledTimes(3)
    expect(incidentActionIn.mock.calls.map(([, ids]) => ids.length)).toEqual([100, 100, 5])
  })
})
