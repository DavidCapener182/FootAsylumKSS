import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockStorageRemove = vi.fn()
const mockDbDelete = vi.fn()
const mockDbEq = vi.fn()

const mockSupabase = {
  storage: {
    from: vi.fn(() => ({
      remove: mockStorageRemove,
    })),
  },
  from: vi.fn(() => ({
    delete: mockDbDelete,
  })),
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/lib/permissions', () => ({
  requirePermission: vi.fn(async () => ({
    supabase: mockSupabase,
    userId: 'user-1',
    role: 'admin',
  })),
}))

describe('FRA delete-photo route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageRemove.mockResolvedValue({ error: null })
    mockDbEq.mockReturnThis()
    mockDbDelete.mockReturnValue({ eq: mockDbEq })
  })

  it('removes only photos under the requested FRA instance path', async () => {
    const { POST } = await import('./route')

    const request = new NextRequest('http://localhost/api/fra-reports/delete-photo', {
      method: 'POST',
      body: JSON.stringify({
        instanceId: 'fra-123',
        filePath: 'fra/fra-123/photos/emergency-lighting-switch/photo.jpg',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('fa-attachments')
    expect(mockStorageRemove).toHaveBeenCalledWith(['fra/fra-123/photos/emergency-lighting-switch/photo.jpg'])
    expect(mockSupabase.from).toHaveBeenCalledWith('fa_fra_photo_comments')
    expect(mockDbEq).toHaveBeenCalledWith('audit_instance_id', 'fra-123')
    expect(mockDbEq).toHaveBeenCalledWith('file_path', 'fra/fra-123/photos/emergency-lighting-switch/photo.jpg')
  })

  it('rejects paths outside the requested FRA instance', async () => {
    const { POST } = await import('./route')

    const request = new NextRequest('http://localhost/api/fra-reports/delete-photo', {
      method: 'POST',
      body: JSON.stringify({
        instanceId: 'fra-123',
        filePath: 'fra/other-instance/photos/emergency-lighting-switch/photo.jpg',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mockStorageRemove).not.toHaveBeenCalled()
  })
})
