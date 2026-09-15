import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FY27_AREA_CHANGES } from '@/lib/retail-structure-fy27'
const permission = vi.hoisted(() => vi.fn())
vi.mock('@/lib/permissions', () => ({ requirePermission: permission }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { applyFY27RetailStructure } from './retail-structure'

describe('FY27 authenticated updates', () => {
  beforeEach(() => { vi.clearAllMocks() })
  it('rejects callers without admin permission before accessing stores', async () => {
    permission.mockRejectedValue(new Error('Forbidden'))
    await expect(applyFY27RetailStructure()).rejects.toThrow('Forbidden')
    expect(permission).toHaveBeenCalledWith('adminUsers')
  })
  it('checks every store before writing and rejects changed identities', async () => {
    const update = vi.fn()
    permission.mockResolvedValue({ supabase: { from: () => ({
      update, select: () => ({ in: async () => ({ data: [], error: null }) }),
    }) } })
    await expect(applyFY27RetailStructure()).rejects.toThrow('changed since review')
    expect(update).not.toHaveBeenCalled()
  })
  it('updates only reporting fields through the authenticated client with concurrency checks', async () => {
    const stores = FY27_AREA_CHANGES.map(change => ({
      id: change.code, store_code: change.code, store_name: change.name,
      reporting_area: change.before, is_active: true, updated_at: '2026-09-15',
    }))
    const eq = vi.fn()
    const query: any = { eq, select: () => ({ single: async () => ({ data: { id: 'ok' }, error: null }) }) }
    eq.mockReturnValue(query)
    const update = vi.fn((_values: Record<string, unknown>) => query)
    permission.mockResolvedValue({ supabase: { from: () => ({ update,
      select: () => ({ in: async () => ({ data: stores, error: null }) }),
    }) } })
    await applyFY27RetailStructure()
    expect(update).toHaveBeenCalledTimes(7)
    expect(update.mock.calls[0][0]).toEqual({
      reporting_area: 'NON_RETAIL', reporting_area_manager_name: null,
      reporting_area_manager_email: null, updated_at: expect.any(String),
    })
    expect(eq).toHaveBeenCalledWith('updated_at', '2026-09-15')
  })
})
