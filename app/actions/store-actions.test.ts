import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isHistoricalStoreAction } from '@/lib/actions/action-history'

const permission = vi.hoisted(() => vi.fn())
vi.mock('@/lib/permissions', () => ({ requirePermission: permission }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { completeStoreAction } from './store-actions'

describe('store action completion', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('requires action-management permission before accessing records', async () => {
    permission.mockRejectedValue(new Error('Forbidden'))
    await expect(completeStoreAction('action-1')).rejects.toThrow('Forbidden')
    expect(permission).toHaveBeenCalledWith('manageActions')
  })

  it('archives current work without deleting its source or overwriting completed records', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({data:{id:'action-1',store_id:'store-1'},error:null})
    const select = vi.fn(() => ({maybeSingle}))
    const statuses = vi.fn(() => ({select}))
    const eq = vi.fn(() => ({in:statuses}))
    const update = vi.fn((_patch: {status:string;completed_at:string}) => ({eq}))
    const from = vi.fn(() => ({update}))
    permission.mockResolvedValue({supabase:{from}})
    await completeStoreAction('action-1')
    expect(from).toHaveBeenCalledWith('fa_store_actions')
    expect(eq).toHaveBeenCalledWith('id','action-1')
    expect(statuses).toHaveBeenCalledWith('status',['open','in_progress','blocked'])
    const patch = update.mock.calls[0][0]
    expect(Object.keys(patch).sort()).toEqual(['completed_at','status'])
    expect(patch.status).toBe('complete')
    expect(Number.isNaN(Date.parse(patch.completed_at))).toBe(false)
    expect(isHistoricalStoreAction({...patch,active_until:'2027-02-04'},'2026-09-06')).toBe(true)
  })
})
