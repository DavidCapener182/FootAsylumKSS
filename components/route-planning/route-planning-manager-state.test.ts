import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const routePlannerSource = readFileSync(
  new URL('./route-planning-client.tsx', import.meta.url),
  'utf8'
)

describe('route planner manager selection state', () => {
  it('starts with an empty controlled select value', () => {
    expect(routePlannerSource).toMatch(
      /const \[routeManager, setRouteManager\] = useState<string>\(''\)/
    )
  })

  it('clears back to an empty controlled select value after route creation', () => {
    expect(routePlannerSource).toContain("setRouteManager('')")
    expect(routePlannerSource).not.toContain('setRouteManager(undefined)')
  })
})
