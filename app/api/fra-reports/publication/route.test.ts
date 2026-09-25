import { createHash } from 'node:crypto'
import { NextRequest } from 'next/server'
import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ download: vi.fn(), sign: vi.fn(), render: vi.fn(), snapshot: vi.fn(), pending: {} as any }))
vi.mock('@/lib/permissions', () => ({
  isPermissionError: () => false,
  requirePermission: async () => ({ userId: 'reviewer', supabase: {
    from: () => {
      let pending = false
      const query: any = {
        select: () => query, eq: () => query, not: () => query,
        is: () => { pending = true; return query }, order: () => query, limit: () => query,
        maybeSingle: async () => ({ data: pending ? mocks.pending : null, error: null }),
      }
      return query
    },
  } }),
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabaseClient: () => ({ storage: {
  from: () => ({ download: mocks.download, createSignedUrl: mocks.sign }),
} }) }))
vi.mock('@/lib/fra/publication', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/fra/publication')>(),
  fraSourceSnapshot: mocks.snapshot,
}))
vi.mock('../generate-pdf/route', () => ({ GET: mocks.render }))
import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  const bytes = Buffer.from('%PDF-existing-reviewed-content')
  mocks.pending = { id: 'review-id', pdf_path: 'review.pdf', pdf_bytes: bytes.length,
    pdf_sha256: createHash('sha256').update(bytes).digest('hex'), source_images: [{ included_in_pdf: true }, { included_in_pdf: false }] }
  mocks.snapshot.mockResolvedValue({ fingerprint: 'unchanged-source' })
  mocks.download.mockResolvedValue({ data: new Blob([bytes]), error: null })
  mocks.sign.mockResolvedValue({ data: { signedUrl: 'https://example.test/review.pdf' }, error: null })
})

const request = () => new NextRequest('https://example.test/api/fra-reports/publication', {
  method: 'POST', body: JSON.stringify({ instanceId: '00000000-0000-4000-8000-000000000001' }),
})

it('reopens the verified unchanged review without rendering or storing another PDF', async () => {
  const response = await POST(request())
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ id: 'review-id', sourceImages: 2, unusedImages: 1 })
  expect(mocks.render).not.toHaveBeenCalled()
})

it('refuses a changed review file instead of silently regenerating its content', async () => {
  mocks.download.mockResolvedValue({ data: new Blob(['different contents']), error: null })
  const response = await POST(request())
  expect(response.status).toBe(400)
  expect(mocks.render).not.toHaveBeenCalled()
  expect(mocks.sign).not.toHaveBeenCalled()
})

it('requires explicit assessor approval before preparing a snapshot-bound PDF', async () => {
  const previous = process.env.FRA_ACTION_PLAN_REQUIRED
  process.env.FRA_ACTION_PLAN_REQUIRED = 'true'
  try {
    const response = await POST(request())
    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/Approve the FRA action plan/)
    expect(mocks.render).not.toHaveBeenCalled()
  } finally {
    if (previous === undefined) delete process.env.FRA_ACTION_PLAN_REQUIRED
    else process.env.FRA_ACTION_PLAN_REQUIRED = previous
  }
})
