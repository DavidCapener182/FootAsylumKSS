import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getFRAPDFDownloadUrl } from './fra-pdfs'
const { permission, single, signed, from, storageFrom } = vi.hoisted(() => ({ permission: vi.fn(), single: vi.fn(), signed: vi.fn(), from: vi.fn(), storageFrom: vi.fn() }))
vi.mock('@/lib/permissions', () => ({ requirePermission: permission }))
beforeEach(() => {
  vi.resetAllMocks()
  from.mockReturnValue({ select: () => ({ eq: (_key: string, id: string) => { expect(id).toBe('store-A'); return { single } } }) })
  storageFrom.mockReturnValue({ createSignedUrl: signed })
  permission.mockResolvedValue({ supabase: { from, storage: { from: storageFrom } } })
})
describe('saved FRA download access', () => {
  it('denies before querying a store or storage when evidence permission is absent', async () => {
    permission.mockRejectedValue(new Error('Forbidden'))
    await expect(getFRAPDFDownloadUrl('old.pdf', undefined, 'store-A')).rejects.toThrow('Forbidden')
    expect(permission).toHaveBeenCalledWith('viewEvidence')
    expect(from).not.toHaveBeenCalled(); expect(storageFrom).not.toHaveBeenCalled()
  })
  it('uses the current store-scoped attachment unchanged rather than the stale supplied path', async () => {
    single.mockResolvedValue({ data: { fire_risk_assessment_pdf_path: 'store/store-A/saved-original.pdf' }, error: null })
    signed.mockResolvedValue({ data: { signedUrl: 'https://example.invalid/original.pdf' }, error: null })
    expect(await getFRAPDFDownloadUrl('old.pdf', undefined, 'store-A')).toBe('https://example.invalid/original.pdf')
    expect(from).toHaveBeenCalledWith('fa_stores'); expect(storageFrom).toHaveBeenCalledWith('fa-attachments')
    expect(signed).toHaveBeenCalledWith('store/store-A/saved-original.pdf', 3600, { download: true })
  })
  it('returns no link when a dated assessment has no saved PDF', async () => {
    single.mockResolvedValue({ data: { fire_risk_assessment_pdf_path: null }, error: null })
    expect(await getFRAPDFDownloadUrl('old.pdf', undefined, 'store-A')).toBeNull()
    expect(storageFrom).not.toHaveBeenCalled()
  })
  it('fails closed when store visibility or signing fails, allowing the UI to retry', async () => {
    single.mockResolvedValue({ data: null, error: { message: 'not visible' } })
    await expect(getFRAPDFDownloadUrl('old.pdf', undefined, 'store-A')).rejects.toThrow('Unable to load')
    expect(storageFrom).not.toHaveBeenCalled()
    single.mockResolvedValue({ data: { fire_risk_assessment_pdf_path: 'original.pdf' }, error: null })
    signed.mockResolvedValue({ data: null, error: { message: 'unavailable' } })
    await expect(getFRAPDFDownloadUrl('old.pdf', undefined, 'store-A')).rejects.toThrow('Failed to generate')
  })
})
