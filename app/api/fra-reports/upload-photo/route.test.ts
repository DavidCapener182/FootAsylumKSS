import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockUser = { id: 'user-1', email: 'test@example.com' }

const mockStorageList = vi.fn()
const mockStorageRemove = vi.fn()
const mockStorageUpload = vi.fn()
const mockStorageCreateSignedUrl = vi.fn()

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  storage: {
    from: vi.fn(() => ({
      list: mockStorageList,
      remove: mockStorageRemove,
      upload: mockStorageUpload,
      createSignedUrl: mockStorageCreateSignedUrl,
    })),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/lib/permissions', () => ({
  requirePermission: vi.fn(async () => ({
    supabase: mockSupabase,
    userId: mockUser.id,
    role: 'admin',
  })),
}))

describe('FRA upload-photo route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
    mockStorageList.mockResolvedValue({ data: [], error: null })
    mockStorageRemove.mockResolvedValue({ error: null })
    mockStorageUpload.mockResolvedValue({ error: null })
    mockStorageCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed-url' } })
  })

  it('accepts WEBP files', async () => {
    const { POST } = await import('./route')

    const formData = new FormData()
    formData.set('instanceId', 'fra-123')
    formData.set('placeholderId', 'fire-panel-photo')
    formData.append('files', new File(['fake-webp'], 'photo.webp', { type: 'image/webp' }))

    const request = new NextRequest('http://localhost/api/fra-reports/upload-photo', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(json.files)).toBe(true)
    expect(mockStorageUpload).toHaveBeenCalledTimes(1)
    const uploadCall = mockStorageUpload.mock.calls[0]
    expect(uploadCall?.[2]?.contentType).toBe('image/webp')
  })

  it('accepts image uploads when browser sends octet-stream but filename is jpg', async () => {
    const { POST } = await import('./route')

    const file = new File(['fake-jpg'], 'photo.jpg', { type: 'application/octet-stream' })
    const formData = new FormData()
    formData.set('instanceId', 'fra-123')
    formData.set('placeholderId', 'fire-panel-photo')
    formData.append('files', file)

    const request = new NextRequest('http://localhost/api/fra-reports/upload-photo', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(json.files)).toBe(true)
    expect(mockStorageUpload).toHaveBeenCalledTimes(1)
    const uploadCall = mockStorageUpload.mock.calls[0]
    expect(uploadCall?.[2]?.contentType).toBe('image/jpeg')
  })

  it('continues upload when storage inspection fails and no existing paths were provided', async () => {
    const { POST } = await import('./route')
    mockStorageList.mockResolvedValueOnce({ data: null, error: { message: 'database error', code: '08P01' } })

    const formData = new FormData()
    formData.set('instanceId', 'fra-123')
    formData.set('placeholderId', 'premises-overview-photo')
    formData.append('files', new File(['fake-jpg'], 'photo.jpg', { type: 'image/jpeg' }))

    const request = new NextRequest('http://localhost/api/fra-reports/upload-photo', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(json.files)).toBe(true)
    expect(mockStorageUpload).toHaveBeenCalledTimes(1)
  })

  it('uses provided existing paths for replace without listing storage', async () => {
    const { POST } = await import('./route')

    const formData = new FormData()
    formData.set('instanceId', 'fra-123')
    formData.set('placeholderId', 'premises-overview-photo')
    formData.set('replace', 'true')
    formData.set('existingFilePaths', JSON.stringify(['fra/fra-123/photos/premises-overview-photo/old.jpg']))
    formData.append('files', new File(['fake-jpg'], 'photo.jpg', { type: 'image/jpeg' }))

    const request = new NextRequest('http://localhost/api/fra-reports/upload-photo', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockStorageList).not.toHaveBeenCalled()
    expect(mockStorageRemove).toHaveBeenCalledWith(['fra/fra-123/photos/premises-overview-photo/old.jpg'])
  })
})
