export interface RouteCreationEligibilityInput {
  routeManager: string | null | undefined
  routeDate: string | null | undefined
  selectedStopCount: number
  stopLimit: number
  isCreatingRoute: boolean
}

export function getRouteCreationBlocker({
  routeManager,
  routeDate,
  selectedStopCount,
  stopLimit,
  isCreatingRoute,
}: RouteCreationEligibilityInput): string | null {
  if (isCreatingRoute) return 'Creating route…'
  if (!routeManager) return 'Select a manager to create the route.'
  if (!routeDate) return 'Select a route date to create the route.'
  if (selectedStopCount === 0) return 'Select at least one store to create the route.'
  if (selectedStopCount > stopLimit) return `Maximum ${stopLimit} stores per route.`

  return null
}

export function canCreateRoute(input: RouteCreationEligibilityInput): boolean {
  return getRouteCreationBlocker(input) === null
}
