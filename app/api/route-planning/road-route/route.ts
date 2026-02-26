import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_WAYPOINTS = 25
const ROUTING_TIMEOUT_MS = 15000

type Waypoint = {
  latitude: number
  longitude: number
}

type OsrmResponse = {
  code?: string
  message?: string
  routes?: Array<{
    geometry?: {
      coordinates?: number[][]
    }
  }>
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function isValidLatitude(value: number): boolean {
  return value >= -90 && value <= 90
}

function isValidLongitude(value: number): boolean {
  return value >= -180 && value <= 180
}

function parseWaypoints(rawWaypoints: unknown): Waypoint[] | null {
  if (!Array.isArray(rawWaypoints)) return null
  if (rawWaypoints.length < 2 || rawWaypoints.length > MAX_WAYPOINTS) return null

  const parsed: Waypoint[] = []

  for (const rawWaypoint of rawWaypoints) {
    if (!rawWaypoint || typeof rawWaypoint !== 'object') return null

    const latitude = parseCoordinate((rawWaypoint as { latitude?: unknown }).latitude)
    const longitude = parseCoordinate((rawWaypoint as { longitude?: unknown }).longitude)

    if (
      latitude === null ||
      longitude === null ||
      !isValidLatitude(latitude) ||
      !isValidLongitude(longitude)
    ) {
      return null
    }

    parsed.push({ latitude, longitude })
  }

  return parsed
}

function toLatLngCoordinates(rawCoordinates: unknown): [number, number][] {
  if (!Array.isArray(rawCoordinates)) return []

  const coordinates: [number, number][] = []

  for (const value of rawCoordinates) {
    if (!Array.isArray(value) || value.length < 2) continue

    const longitude = parseCoordinate(value[0])
    const latitude = parseCoordinate(value[1])

    if (
      longitude === null ||
      latitude === null ||
      !isValidLatitude(latitude) ||
      !isValidLongitude(longitude)
    ) {
      continue
    }

    coordinates.push([latitude, longitude])
  }

  return coordinates
}

export async function POST(request: Request) {
  let body: { waypoints?: unknown }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 })
  }

  const waypoints = parseWaypoints(body.waypoints)

  if (!waypoints) {
    return NextResponse.json(
      { error: `waypoints must contain between 2 and ${MAX_WAYPOINTS} valid coordinates.` },
      { status: 400 }
    )
  }

  const coordinateString = waypoints
    .map(({ latitude, longitude }) => `${longitude},${latitude}`)
    .join(';')
  const routingUrl = `https://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=geojson&steps=false`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS)

  let routingResponse: Response
  try {
    routingResponse = await fetch(routingUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeout)

    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Routing request timed out.' }, { status: 504 })
    }

    return NextResponse.json({ error: 'Failed to fetch route geometry.' }, { status: 502 })
  }

  clearTimeout(timeout)

  if (!routingResponse.ok) {
    return NextResponse.json({ error: 'Routing provider returned an error.' }, { status: 502 })
  }

  const routingData = (await routingResponse.json()) as OsrmResponse
  const geometry = routingData.routes?.[0]?.geometry?.coordinates
  const coordinates = toLatLngCoordinates(geometry)

  if (routingData.code !== 'Ok' || coordinates.length < 2) {
    return NextResponse.json(
      { error: routingData.message || 'No valid road geometry returned by routing provider.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ coordinates })
}
