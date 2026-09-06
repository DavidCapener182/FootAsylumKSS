import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TodayMobile } from './today-mobile'

vi.mock('@/components/offline/offline-status', () => ({ OfflineStatus: () => null }))

const teamRoute = { key: 'andy-route', plannedDate: '2026-09-08', stores: [{ name: 'Southampton' }] }
const personalRoute = { key: 'david-route', plannedDate: '2026-09-16', stores: [{ name: 'Braehead' }] }

describe('mobile next route', () => {
  it('renders the signed-in user’s visit instead of the first team visit', () => {
    const html = renderToStaticMarkup(<TodayMobile profileName="David Capener" data={{ plannedRoutes: [teamRoute, personalRoute], personalPlannedRoutes: [personalRoute] }} />)
    expect(html).toContain('Braehead')
    expect(html).not.toContain('Southampton')
  })

  it('shows an unassigned-to-you empty state without falling back to team visits', () => {
    const html = renderToStaticMarkup(<TodayMobile profileName="David" data={{ plannedRoutes: [teamRoute] }} />)
    expect(html).toContain('No upcoming visits assigned to you.')
    expect(html).not.toContain('Southampton')
  })
})
import React from 'react'
