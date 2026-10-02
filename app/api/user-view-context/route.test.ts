import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { DAVID_CAPENER_USER_ID } from '@/lib/user-view-access'

const mocks = vi.hoisted(() => ({ profile: vi.fn(), from: vi.fn(), upsert: vi.fn(), read: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getUserProfile: mocks.profile }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabaseClient: () => ({ from: mocks.from }) }))
import { GET, POST } from './route'

describe('private user view context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.profile.mockResolvedValue({ id: DAVID_CAPENER_USER_ID, role: 'admin' })
    mocks.read.mockResolvedValue({ data: [], error: null })
    mocks.upsert.mockResolvedValue({ error: null })
    mocks.from.mockReturnValue({ upsert: mocks.upsert, select: () => ({ in: mocks.read }) })
  })

  it('allows only the verified David account to read', async () => {
    expect((await GET(new NextRequest(`http://localhost/api/user-view-context?userId=${DAVID_CAPENER_USER_ID}`))).status).toBe(200)
    expect(mocks.read).toHaveBeenCalled()
  })

  it.each(['admin', 'client_admin', 'ops'])('denies other %s accounts before reading the table', async role => {
    mocks.profile.mockResolvedValue({ id: 'someone-else', full_name: 'David Capener', role })
    expect((await GET(new NextRequest('http://localhost/api/user-view-context'))).status).toBe(403)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('denies anonymous users', async () => {
    mocks.profile.mockResolvedValue(null)
    expect((await GET(new NextRequest('http://localhost/api/user-view-context'))).status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('stamps the authenticated actor and server time, ignoring forged identity and timestamp', async () => {
    mocks.profile.mockResolvedValue({ id: 'client-user', role: 'client_admin' })
    const response = await POST(new NextRequest('http://localhost/api/user-view-context', {
      method: 'POST', headers: { origin: 'http://localhost' },
      body: JSON.stringify({ path: '/client-documents', title: 'H&S Audits', document: null, user_id: DAVID_CAPENER_USER_ID, page_seen_at: 'fake' }),
    }))
    expect(response.status).toBe(204)
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'client-user', page_title: 'H&S Audits', viewing_document: null, page_seen_at: expect.not.stringMatching(/^fake$/) }), { onConflict: 'user_id' })
  })

  it('rejects cross-origin writes', async () => {
    expect((await POST(new NextRequest('http://localhost/api/user-view-context', { method: 'POST', headers: { origin: 'https://other.example' } }))).status).toBe(403)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('rejects full URLs and query strings rather than recording secrets', async () => {
    const response = await POST(new NextRequest('http://localhost/api/user-view-context', {
      method: 'POST', headers: { origin: 'http://localhost' }, body: JSON.stringify({ path: '/report?token=secret', title: 'Report', document: null }),
    }))
    expect(response.status).toBe(400)
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
