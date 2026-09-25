import { beforeEach, describe, expect, it, vi } from 'vitest'

const requirePermission = vi.fn()
vi.mock('@/lib/permissions', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/permissions')>()
  return { ...original, requirePermission }
})

describe('KSS operational source read gate', () => {
  beforeEach(() => requirePermission.mockReset())

  it.each(['admin', 'ops', 'readonly'])('allows active KSS %s', async (role) => {
    const context = { role, userId: 'kss' }
    requirePermission.mockResolvedValue(context)
    const { requireKssSourceRead } = await import('./kss-source-access')
    await expect(requireKssSourceRead()).resolves.toBe(context)
    expect(requirePermission).toHaveBeenCalledWith('viewEvidence')
  })

  it.each(['client', 'client_admin', 'area_manager'])('denies client role %s', async (role) => {
    requirePermission.mockResolvedValue({ role, userId: 'client' })
    const { requireKssSourceRead } = await import('./kss-source-access')
    await expect(requireKssSourceRead()).rejects.toMatchObject({ name: 'PermissionError', status: 403 })
  })

})
