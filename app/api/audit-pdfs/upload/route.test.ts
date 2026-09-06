import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequirePermission = vi.fn()
const mockImportPdfActions = vi.fn()
vi.mock('@/lib/audit/import-pdf-actions',()=>({importAuditPdfActions:mockImportPdfActions}))
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}))
const mockAdminStorageUpload = vi.fn()
const mockAdminStorageRemove = vi.fn()
const mockAuthenticatedStoreUpdateSingle = vi.fn()
const mockReadSingle = vi.fn()
const mockUpdateQuery: any = { select: () => ({ single: mockAuthenticatedStoreUpdateSingle }), eq: (...args: unknown[]) => mockAuthenticatedStoreUpdateEq(...args), is: () => mockUpdateQuery }
const mockAuthenticatedStoreUpdateEq = vi.fn((..._args: unknown[]) => mockUpdateQuery)
const mockAuthenticatedStoreUpdate = vi.fn(() => ({ eq: mockAuthenticatedStoreUpdateEq }))
const mockAuthenticatedFrom = vi.fn(() => ({ update: mockAuthenticatedStoreUpdate, select: () => ({ eq: () => ({ single: mockReadSingle }) }) }))
const mockAdminFrom = vi.fn()

const mockAuthenticatedSupabase = {
  from: mockAuthenticatedFrom,
}

const mockAdminSupabase = {
  from: mockAdminFrom,
  storage: {
    from: vi.fn(() => ({
      upload: mockAdminStorageUpload,
      remove: mockAdminStorageRemove,
    })),
  },
}

vi.mock('@/lib/permissions', () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(() => mockAdminSupabase),
}))

function createUploadRequest(auditNumber: 1 | 2 = 2) {
  const formData = new FormData()
  formData.set('storeId', 'store-123')
  formData.set('auditNumber', String(auditNumber))
  formData.append('file', new File(['%PDF-1.4'], 'audit.pdf', { type: 'application/pdf' }))

  return new NextRequest('http://localhost/api/audit-pdfs/upload', {
    method: 'POST',
    body: formData,
  })
}

describe('audit PDF upload route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockImportPdfActions.mockResolvedValue({status:'imported',count:2,total:2,warning:null})
    mockRequirePermission.mockResolvedValue({
      supabase: mockAuthenticatedSupabase,
      userId: 'user-1',
      role: 'ops',
      accountStatus: 'active',
    })
    mockAdminStorageUpload.mockResolvedValue({ error: null })
    mockAdminStorageRemove.mockResolvedValue({ error: null })
    mockAuthenticatedStoreUpdateSingle.mockResolvedValue({ data: { id: 'store-123' }, error: null })
    mockReadSingle.mockResolvedValue({ data: { compliance_audit_1_pdf_path: null, compliance_audit_2_pdf_path: null }, error: null })
  })

  it('checks manageAudits, uses admin storage, and updates through the authenticated client', async () => {
    const { POST } = await import('./route')

    const response = await POST(createUploadRequest(2))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockImportPdfActions).toHaveBeenCalledWith(expect.objectContaining({supabase:mockAuthenticatedSupabase,userId:'user-1',auditNumber:2,filePath:json.filePath}))
    expect(json.filePath).toMatch(/^store\/store-123\/audit-2-.*\.pdf$/)
    expect(mockRequirePermission).toHaveBeenCalledWith('manageAudits')
    expect(mockAdminSupabase.storage.from).toHaveBeenCalledWith('fa-attachments')
    expect(mockAdminStorageUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^store\/store-123\/audit-2-.*\.pdf$/),
      expect.any(File),
      expect.objectContaining({
        contentType: 'application/pdf',
        upsert: false,
      })
    )
    expect(mockAuthenticatedFrom).toHaveBeenCalledWith('fa_stores')
    expect(mockAuthenticatedStoreUpdate).toHaveBeenCalledWith({
      compliance_audit_1_pdf_path: null,
      compliance_audit_2_pdf_path: expect.stringMatching(/^store\/store-123\/audit-2-.*\.pdf$/),
    })
    expect(mockAuthenticatedStoreUpdateEq).toHaveBeenCalledWith('id', 'store-123')
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })

  it('cleans up the uploaded PDF if the store update fails', async () => {
    const { POST } = await import('./route')
    mockAuthenticatedStoreUpdateSingle.mockResolvedValueOnce({ error: { message: 'update blocked' } })

    const response = await POST(createUploadRequest(1))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Failed to update store record: update blocked')
    expect(mockAdminStorageRemove).toHaveBeenCalledWith([
      expect.stringMatching(/^store\/store-123\/audit-1-.*\.pdf$/),
    ])
  })
})
