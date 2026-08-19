export type CalendarEventType = 'planned' | 'completed'

export type CalendarEventVisibility = Readonly<Record<CalendarEventType, boolean>>

export const ALL_CALENDAR_EVENT_TYPES_VISIBLE: CalendarEventVisibility = Object.freeze({
  planned: true,
  completed: true,
})

export function toggleCalendarEventVisibility(
  visibility: CalendarEventVisibility,
  eventType: CalendarEventType
): CalendarEventVisibility {
  return {
    ...visibility,
    [eventType]: !visibility[eventType],
  }
}

export function filterCalendarDayEvents<
  TDay extends { plannedRoutes: unknown[]; completedStores: unknown[] },
>(day: TDay, visibility: CalendarEventVisibility): TDay {
  return {
    ...day,
    plannedRoutes: visibility.planned ? day.plannedRoutes : [],
    completedStores: visibility.completed ? day.completedStores : [],
  }
}
