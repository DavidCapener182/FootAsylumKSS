import { describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  requireKssSourceRead: vi.fn(),
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/kss-source-access', () => ({ requireKssSourceRead: auth.requireKssSourceRead }))
vi.mock('@/lib/permissions', () => ({ requirePermission: auth.requirePermission }))

describe('operational Server Action entrypoints', () => {
  it('denies a manager before calendar data is queried', async () => {
    auth.requireKssSourceRead.mockRejectedValueOnce(new Error('KSS staff access required'))
    const { getCalendarData } = await import('./calendar')
    await expect(getCalendarData(9, 2026)).rejects.toThrow('KSS staff access required')
    expect(auth.requireKssSourceRead).toHaveBeenCalledOnce()
  })

  it('denies a manager before route data is queried', async () => {
    auth.requirePermission.mockRejectedValueOnce(new Error('Route planning access required'))
    const { getRouteOperationalItems } = await import('./route-planning')
    await expect(getRouteOperationalItems('manager', '2026-09-25', 'AREA1')).rejects.toThrow('Route planning access required')
    expect(auth.requirePermission).toHaveBeenCalledWith('manageRoutePlanning')
  })
})
