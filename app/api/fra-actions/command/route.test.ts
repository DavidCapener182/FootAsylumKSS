import { NextRequest } from 'next/server'
import { beforeEach, expect, it, vi } from 'vitest'

const actor = '11111111-1111-4111-8111-111111111111'
const actionId = '22222222-2222-4222-8222-222222222222'
const storeId = '33333333-3333-4333-8333-333333333333'
const mocks = vi.hoisted(() => ({ role: 'area_manager', stores: [] as string[], rpc: vi.fn() }))
vi.mock('@/lib/auth', () => ({ requireRole: async () => ({ profile: { id: actor, role: mocks.role } }) }))
vi.mock('@/lib/fra/action-access', () => ({ getFraActionReadScope: async () => ({ kind: 'client_stores', role: 'area_manager', storeIds: mocks.stores }) }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabaseClient: () => ({
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { store_id: storeId }, error: null }) }) }) }),
  rpc: mocks.rpc,
}) }))
import { POST } from './route'

const request = (command: string, extras = {}) => new NextRequest('https://example.test/api/fra-actions/command', {
  method: 'POST', headers: { origin: 'https://example.test' },
  body: JSON.stringify({ actionId, expectedVersion: 1, command, ...extras }),
})

beforeEach(() => { vi.clearAllMocks(); mocks.role = 'area_manager'; mocks.stores = [] })

it('does not invoke a service command for an unassigned store', async () => {
  expect((await POST(request('acknowledge'))).status).toBe(404)
  expect(mocks.rpc).not.toHaveBeenCalled()
})

it('derives the manager actor on the server and returns the versioned result', async () => {
  mocks.stores = [storeId]
  mocks.rpc.mockResolvedValue({ data: [{ status: 'acknowledged', version: 2 }], error: null })
  const response = await POST(request('acknowledge'))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ result: { status: 'acknowledged', version: 2 } })
  expect(mocks.rpc).toHaveBeenCalledWith('fa_fra_acknowledge_action', { p_actor: actor, p_action_id: actionId, p_expected_version: 1 })
})

it('does not allow Area Managers to close actions', async () => {
  mocks.stores = [storeId]
  expect((await POST(request('close', { note: 'Verified' }))).status).toBe(403)
  expect(mocks.rpc).not.toHaveBeenCalled()
})
