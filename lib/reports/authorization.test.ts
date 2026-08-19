import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequirePermission = vi.fn()
const mockIsPermissionError = vi.fn()

vi.mock('@/lib/permissions', () => ({
  requirePermission: mockRequirePermission,
  isPermissionError: mockIsPermissionError,
}))

describe('report authorization boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires the exportReports capability', async () => {
    const context = { userId: 'user-1', role: 'readonly', supabase: {} }
    mockRequirePermission.mockResolvedValue(context)
    const { requireReportAccess } = await import('./authorization')

    await expect(requireReportAccess()).resolves.toBe(context)
    expect(mockRequirePermission).toHaveBeenCalledWith('exportReports')
  })

  it.each([
    ['Unauthorized', 401],
    ['You do not have permission to export reports', 403],
  ] as const)('preserves the %s permission status for API responses', async (message, status) => {
    mockIsPermissionError.mockReturnValue(true)
    const { reportPermissionErrorResponse } = await import('./authorization')
    const error = Object.assign(new Error(message), { status })

    const response = reportPermissionErrorResponse(error)

    expect(response?.status).toBe(status)
    await expect(response?.json()).resolves.toEqual({ error: message })
  })
})
