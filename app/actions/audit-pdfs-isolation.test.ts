import { describe, expect, it, vi } from 'vitest'

// Production does not include the optional canvas binary. Merely importing
// the PDF parser there throws before any server action can run.
vi.mock('pdf-parse', () => { throw new Error('DOMMatrix is not defined') })
vi.mock('@/lib/permissions', () => ({ requirePermission: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: () => ({ storage: { from: () => ({
    createSignedUrl: async () => ({ data: { signedUrl: 'https://example.test/audit.pdf' }, error: null }),
  }) } }),
}))

describe('audit PDF download isolation', () => {
  it('opens an existing PDF without initializing the upload parser', async () => {
    const { getAuditPDFDownloadUrl } = await import('./audit-pdfs')
    await expect(getAuditPDFDownloadUrl('store/s/audit-2.pdf')).resolves.toBe('https://example.test/audit.pdf')
  })
})
