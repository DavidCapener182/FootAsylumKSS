import { describe, expect, it } from 'vitest'
import { navItems } from '@/components/layout/nav-items'
import { getMobileMoreItems, getMobileTabItems } from '@/components/layout/mobile-nav-config'

describe('role-aware product navigation', () => {
  it('groups desktop destinations by operational work', () => {
    expect(new Set(navItems.map((item) => item.section))).toEqual(new Set([
      'Today',
      'Assurance',
      'Stores',
      'Insights',
      'Events',
      'Administration',
    ]))
    expect(navItems.find((item) => item.href === '/help')?.label).toBe('Help Centre')
    expect(navItems.find((item) => item.href === '/privacy')?.section).toBe('Insights')
  })

  it('gives field roles a route-focused mobile workspace', () => {
    expect(getMobileTabItems('ops').map((item) => item.label)).toEqual([
      'Today',
      'Routes',
      'Audits',
      'Actions',
    ])
    expect(getMobileTabItems('client').map((item) => item.label)).toEqual([
      'Today',
      'Audits',
      'FRAs',
      'Stores',
    ])
  })

  it('does not expose event administration to non-admin mobile users', () => {
    const adminMore = getMobileMoreItems('admin').map((item) => item.href)
    const opsMore = getMobileMoreItems('ops').map((item) => item.href)

    expect(adminMore).toContain('/admin/event-day')
    expect(opsMore).not.toContain('/admin/event-day')
  })
})
