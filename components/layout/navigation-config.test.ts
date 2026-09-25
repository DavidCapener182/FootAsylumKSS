import { describe, expect, it } from 'vitest'
import { canSeeNavItem, navItems } from '@/components/layout/nav-items'
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

  it('hides staff operational destinations from client navigation', () => {
    const clientMore = getMobileMoreItems('client').map((item) => item.href)

    expect(clientMore).not.toContain('/actions')
    expect(clientMore).not.toContain('/incidents')
    expect(clientMore).not.toContain('/reports')
    expect(navItems.find((item) => item.href === '/actions')?.clientHidden).toBe(true)
    expect(navItems.find((item) => item.href === '/incidents')?.clientHidden).toBe(true)
    expect(navItems.find((item) => item.href === '/reports')?.clientHidden).toBe(true)
    expect(clientMore).not.toContain('/fra-action-plans')
  })

  it('places FRA Action Plans under Assurance for KSS and limits Area Managers to their safe destinations', () => {
    const plans = navItems.find((item) => item.href === '/fra-action-plans')
    expect(plans?.section).toBe('Assurance')
    expect(canSeeNavItem(plans!, 'admin')).toBe(true)
    expect(canSeeNavItem(plans!, 'ops')).toBe(true)
    expect(canSeeNavItem(plans!, 'client')).toBe(false)
    expect(canSeeNavItem(plans!, 'client_admin')).toBe(true)

    expect(navItems.filter((item) => canSeeNavItem(item, 'area_manager')).map((item) => item.href)).toEqual([
      '/fra-action-plans', '/help', '/privacy',
    ])
    expect(getMobileTabItems('area_manager').map((item) => item.href)).toEqual(['/fra-action-plans'])
    expect(getMobileMoreItems('area_manager').map((item) => item.href)).toEqual(['/help', '/privacy'])
    expect(navItems.filter((item) => canSeeNavItem(item, 'client_admin')).map((item) => item.href)).toEqual([
      '/fra-action-plans', '/help', '/privacy',
    ])
  })
})
