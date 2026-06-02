import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequirePermission = vi.fn()
const mockAdminStorageUpload = vi.fn()
const mockAdminStorageRemove = vi.fn()
const mockAdminStoreUpdateEq = vi.fn()
const mockAdminStoreUpdate = vi.fn(() => ({ eq: mockAdminStoreUpdateEq }))
const mockAdminFrom = vi.fn(() => ({ update: mockAdminStoreUpdate }))

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
    mockRequirePermission.mockResolvedValue({ userId: 'user-1', role: 'ops' })
    mockAdminStorageUpload.mockResolvedValue({ error: null })
    mockAdminStorageRemove.mockResolvedValue({ error: null })
    mockAdminStoreUpdateEq.mockResolvedValue({ error: null })
  })

  it('checks manageAudits then uploads and updates through the admin client', async () => {
    const { POST } = await import('./route')

    const response = await POST(createUploadRequest(2))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
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
    expect(mockAdminFrom).toHaveBeenCalledWith('fa_stores')
    expect(mockAdminStoreUpdate).toHaveBeenCalledWith({
      compliance_audit_2_pdf_path: expect.stringMatching(/^store\/store-123\/audit-2-.*\.pdf$/),
    })
    expect(mockAdminStoreUpdateEq).toHaveBeenCalledWith('id', 'store-123')
  })

  it('cleans up the uploaded PDF if the store update fails', async () => {
    const { POST } = await import('./route')
    mockAdminStoreUpdateEq.mockResolvedValueOnce({ error: { message: 'update blocked' } })

    const response = await POST(createUploadRequest(1))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Failed to update store record: update blocked')
    expect(mockAdminStorageRemove).toHaveBeenCalledWith([
      expect.stringMatching(/^store\/store-123\/audit-1-.*\.pdf$/),
    ])
  })
})
