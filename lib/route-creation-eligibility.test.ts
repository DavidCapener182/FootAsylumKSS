import { describe, expect, it } from 'vitest'
import { canCreateRoute, getRouteCreationBlocker } from './route-creation-eligibility'

const validRoute = {
  routeManager: 'manager-1',
  routeDate: '2026-07-28',
  stopLimit: 2,
  isCreatingRoute: false,
}

describe('route creation eligibility', () => {
  it.each([1, 2])('allows a %s-store route within a two-stop limit', (selectedStopCount) => {
    expect(canCreateRoute({ ...validRoute, selectedStopCount })).toBe(true)
  })

  it('identifies the specific missing route date instead of a generic disabled state', () => {
    expect(getRouteCreationBlocker({ ...validRoute, routeDate: '', selectedStopCount: 1 })).toBe(
      'Select a route date to create the route.'
    )
  })
})
