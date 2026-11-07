import { describe, it, expect, vi, beforeEach } from 'vitest'
const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/admin', () => ({createAdminSupabaseClient: () => ({rpc})}))
import { cancelAudit } from './server'
const id = '11111111-1111-4111-8111-111111111111'
beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({error:null}) })
describe('cancel audit', () => {
  it('uses the atomic operation with actor and expected revision', async () => {
    expect(await cancelAudit(id,{revision:3},{id:'actor'})).toEqual({cancelled:true})
    expect(rpc).toHaveBeenCalledWith('fa_cancel_studio_audit',{p_audit:id,p_revision:3,p_user:'actor'})
  })
  it.each(['REVISION_CONFLICT','Only unfinished drafts can be cancelled'])('rejects a conflict: %s', async message => {
    rpc.mockResolvedValue({error:{message}})
    await expect(cancelAudit(id,{revision:3},{id:'actor'})).rejects.toMatchObject({status:409})
  })
  it('does not claim success on storage failure', async () => {
    rpc.mockResolvedValue({error:{message:'offline'}})
    await expect(cancelAudit(id,{revision:3},{id:'actor'})).rejects.toMatchObject({status:503})
  })
  it('rejects invalid revisions before touching storage', async () => {
    await expect(cancelAudit(id,{revision:-1},{id:'actor'})).rejects.toThrow()
    expect(rpc).not.toHaveBeenCalled()
  })
})
