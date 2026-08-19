import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequirePermission = vi.fn()

const mockAuthenticatedUpdateEq = vi.fn()
const mockAuthenticatedUpdate = vi.fn(() => ({ eq: mockAuthenticatedUpdateEq }))
const mockAuthenticatedSingle = vi.fn()
const mockAuthenticatedSelectEq = vi.fn(() => ({ single: mockAuthenticatedSingle }))
const mockAuthenticatedSelect = vi.fn(() => ({ eq: mockAuthenticatedSelectEq }))
const mockAuthenticatedFrom = vi.fn(() => ({
  select: mockAuthenticatedSelect,
  update: mockAuthenticatedUpdate,
}))

const mockAdminUpload = vi.fn()
const mockAdminRemove = vi.fn()
const mockAdminCreateSignedUrl = vi.fn()
const mockAdminStorageFrom = vi.fn(() => ({
  upload: mockAdminUpload,
  remove: mockAdminRemove,
  createSignedUrl: mockAdminCreateSignedUrl,
}))
const mockAdminFrom = vi.fn()

const authenticatedSupabase = {
  from: mockAuthenticatedFrom,
}

const adminSupabase = {
  from: mockAdminFrom,
  storage: { from: mockAdminStorageFrom },
}

vi.mock('@/lib/permissions', () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(() => adminSupabase),
}))

describe('audit PDF actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      supabase: authenticatedSupabase,
      userId: 'user-1',
      role: 'ops',
      accountStatus: 'active',
    })
    mockAdminUpload.mockResolvedValue({ error: null })
    mockAdminRemove.mockResolvedValue({ error: null })
    mockAuthenticatedUpdateEq.mockResolvedValue({ error: null })
  })

  it('uploads through admin storage but attributes the store mutation to the authenticated client', async () => {
    const { uploadAuditPDF } = await import('./audit-pdfs')
    const file = new File(['%PDF-1.4'], 'audit.pdf', { type: 'application/pdf' })

    const filePath = await uploadAuditPDF('store-123', 1, file)

    expect(mockRequirePermission).toHaveBeenCalledWith('manageAudits')
    expect(mockAdminStorageFrom).toHaveBeenCalledWith('fa-attachments')
    expect(mockAdminUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^store\/store-123\/audit-1-.*\.pdf$/),
      file,
      expect.objectContaining({ contentType: 'application/pdf', upsert: false })
    )
    expect(mockAuthenticatedFrom).toHaveBeenCalledWith('fa_stores')
    expect(mockAuthenticatedUpdate).toHaveBeenCalledWith({
      compliance_audit_1_pdf_path: filePath,
    })
    expect(mockAuthenticatedUpdateEq).toHaveBeenCalledWith('id', 'store-123')
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })

  it('reads and clears the store path as the authenticated actor while using admin only to delete storage', async () => {
    const { deleteAuditPDF } = await import('./audit-pdfs')
    mockAuthenticatedSingle.mockResolvedValueOnce({
      data: { compliance_audit_2_pdf_path: 'store/store-123/audit-2.pdf' },
      error: null,
    })

    await expect(deleteAuditPDF('store-123', 2)).resolves.toEqual({ success: true })

    expect(mockRequirePermission).toHaveBeenCalledWith('manageAudits')
    expect(mockAuthenticatedSelect).toHaveBeenCalledWith('compliance_audit_2_pdf_path')
    expect(mockAuthenticatedSelectEq).toHaveBeenCalledWith('id', 'store-123')
    expect(mockAdminRemove).toHaveBeenCalledWith(['store/store-123/audit-2.pdf'])
    expect(mockAuthenticatedUpdate).toHaveBeenCalledWith({
      compliance_audit_2_pdf_path: null,
    })
    expect(mockAuthenticatedUpdateEq).toHaveBeenCalledWith('id', 'store-123')
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })
})
