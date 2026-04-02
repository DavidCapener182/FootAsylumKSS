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

describe('FRA upload-photo route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
    mockStorageList.mockResolvedValue({ data: [], error: null })
    mockStorageRemove.mockResolvedValue({ error: null })
    mockStorageUpload.mockResolvedValue({ error: null })
    mockStorageCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed-url' } })
  })

  it('rejects WEBP files with a clear error message', async () => {
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

    expect(response.status).toBe(400)
    expect(json.error).toContain('WEBP photos are not supported')
    expect(mockStorageUpload).not.toHaveBeenCalled()
  })
})
