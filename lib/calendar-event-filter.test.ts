import { describe, expect, it } from 'vitest'

import {
  ALL_CALENDAR_EVENT_TYPES_VISIBLE,
  filterCalendarDayEvents,
  toggleCalendarEventVisibility,
} from '@/lib/calendar-event-filter'

describe('calendar event filters', () => {
  const day = {
    date: '2026-08-19',
    plannedRoutes: [{ id: 'route-1' }],
    completedStores: [{ id: 'store-1' }],
  }

  it('shows both event types by default', () => {
    expect(filterCalendarDayEvents(day, ALL_CALENDAR_EVENT_TYPES_VISIBLE)).toEqual(day)
  })

  it('toggles each event type independently without mutating the previous state', () => {
    const plannedHidden = toggleCalendarEventVisibility(
      ALL_CALENDAR_EVENT_TYPES_VISIBLE,
      'planned'
    )
    const bothHidden = toggleCalendarEventVisibility(plannedHidden, 'completed')

    expect(ALL_CALENDAR_EVENT_TYPES_VISIBLE).toEqual({ planned: true, completed: true })
    expect(plannedHidden).toEqual({ planned: false, completed: true })
    expect(bothHidden).toEqual({ planned: false, completed: false })
  })

  it('removes hidden event types while preserving the rest of the calendar day', () => {
    expect(
      filterCalendarDayEvents(day, { planned: false, completed: true })
    ).toEqual({
      date: day.date,
      plannedRoutes: [],
      completedStores: day.completedStores,
    })

    expect(
      filterCalendarDayEvents(day, { planned: true, completed: false })
    ).toEqual({
      date: day.date,
      plannedRoutes: day.plannedRoutes,
      completedStores: [],
    })
  })
})
