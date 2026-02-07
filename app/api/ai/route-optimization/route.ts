import { NextRequest, NextResponse } from 'next/server'

interface StoreNode {
  id: string
  name: string
  code: string
  latitude: number
  longitude: number
  distanceFromHome: number | null
  distances: Record<string, number>
}

interface OptimizationConstraints {
  stopLimit: number
  maxDriveMinutes: number | null
  maxRouteMinutes: number | null
  prioritize: 'balanced' | 'min_drive' | 'tight_cluster'
  requireHomeStart: boolean
  requireHomeEnd: boolean
}

interface RouteEstimate {
  order: StoreNode[]
  totalDistanceKm: number
  totalDriveMinutes: number
  totalRouteMinutes: number
  maxInterStoreDistanceKm: number
  avgInterStoreDistanceKm: number
  score: number
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function parseConstraints(requestBody: any, storeCount: number): OptimizationConstraints {
  const rawStopLimit = parseNumber(requestBody?.constraints?.stopLimit)
  const stopLimit = Math.max(1, Math.min(6, Math.round(rawStopLimit || 3), storeCount))

  const maxDriveMinutesRaw = parseNumber(requestBody?.constraints?.maxDriveMinutes)
  const maxRouteHoursRaw = parseNumber(requestBody?.constraints?.maxRouteHours)

  const prioritize = requestBody?.constraints?.prioritize
  const normalizedPrioritize: OptimizationConstraints['prioritize'] =
    prioritize === 'min_drive' || prioritize === 'tight_cluster' ? prioritize : 'balanced'

  return {
    stopLimit,
    maxDriveMinutes: maxDriveMinutesRaw && maxDriveMinutesRaw > 0 ? Math.round(maxDriveMinutesRaw) : null,
    maxRouteMinutes: maxRouteHoursRaw && maxRouteHoursRaw > 0 ? Math.round(maxRouteHoursRaw * 60) : null,
    prioritize: normalizedPrioritize,
    requireHomeStart: requestBody?.constraints?.requireHomeStart !== false,
    requireHomeEnd: requestBody?.constraints?.requireHomeEnd !== false,
  }
}

function kmToMiles(km: number): number {
  return km * 0.621371
}

// Haversine formula to calculate distance between two coordinates (in km)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function estimateDriveMinutes(distanceKm: number): number {
  const distanceMiles = kmToMiles(distanceKm)
  const avgMph = 31
  return Math.max(6, Math.round((distanceMiles / avgMph) * 60 + 8))
}

function getStoreDistance(a: StoreNode, b: StoreNode): number {
  return a.distances[b.id] ?? calculateDistance(a.latitude, a.longitude, b.latitude, b.longitude)
}

function pickBestStartStore(stores: StoreNode[], managerHome: any, constraints: OptimizationConstraints): StoreNode {
  if (constraints.requireHomeStart && managerHome?.latitude && managerHome?.longitude) {
    return [...stores].sort((a, b) => (a.distanceFromHome ?? Infinity) - (b.distanceFromHome ?? Infinity))[0]
  }

  // If no home constraint, start from the most central stop (lowest average distance to other stops)
  return [...stores].sort((a, b) => {
    const avgA = stores.length > 1
      ? stores.filter((s) => s.id !== a.id).reduce((sum, s) => sum + getStoreDistance(a, s), 0) / (stores.length - 1)
      : 0
    const avgB = stores.length > 1
      ? stores.filter((s) => s.id !== b.id).reduce((sum, s) => sum + getStoreDistance(b, s), 0) / (stores.length - 1)
      : 0
    return avgA - avgB
  })[0]
}

function buildGreedyOrder(stores: StoreNode[], managerHome: any, constraints: OptimizationConstraints): StoreNode[] {
  if (stores.length <= 1) return stores

  const remaining = [...stores]
  const startStore = pickBestStartStore(stores, managerHome, constraints)
  const ordered: StoreNode[] = [startStore]
  const startIndex = remaining.findIndex((store) => store.id === startStore.id)
  remaining.splice(startIndex, 1)

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1]
    let bestIndex = 0
    let bestDistance = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const candidateDistance = getStoreDistance(last, remaining[i])
      if (candidateDistance < bestDistance) {
        bestDistance = candidateDistance
        bestIndex = i
      }
    }

    ordered.push(remaining[bestIndex])
    remaining.splice(bestIndex, 1)
  }

  return ordered
}

function evaluateCandidate(
  selectedStores: StoreNode[],
  managerHome: any,
  constraints: OptimizationConstraints
): RouteEstimate {
  const order = buildGreedyOrder(selectedStores, managerHome, constraints)

  let totalDistanceKm = 0

  if (constraints.requireHomeStart && managerHome?.latitude && managerHome?.longitude && order.length > 0) {
    totalDistanceKm += calculateDistance(
      managerHome.latitude,
      managerHome.longitude,
      order[0].latitude,
      order[0].longitude
    )
  }

  for (let i = 0; i < order.length - 1; i++) {
    totalDistanceKm += getStoreDistance(order[i], order[i + 1])
  }

  if (constraints.requireHomeEnd && managerHome?.latitude && managerHome?.longitude && order.length > 0) {
    const last = order[order.length - 1]
    totalDistanceKm += calculateDistance(last.latitude, last.longitude, managerHome.latitude, managerHome.longitude)
  }

  const pairDistances: number[] = []
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      pairDistances.push(getStoreDistance(order[i], order[j]))
    }
  }

  const maxInterStoreDistanceKm = pairDistances.length > 0 ? Math.max(...pairDistances) : 0
  const avgInterStoreDistanceKm = pairDistances.length > 0
    ? pairDistances.reduce((sum, value) => sum + value, 0) / pairDistances.length
    : 0

  const totalDriveMinutes = estimateDriveMinutes(totalDistanceKm)
  const totalVisitMinutes = order.length * 120
  const totalRouteMinutes = totalDriveMinutes + totalVisitMinutes

  let score: number
  if (constraints.prioritize === 'tight_cluster') {
    score = (maxInterStoreDistanceKm * 0.55) + (avgInterStoreDistanceKm * 0.25) + (totalDistanceKm * 0.2)
  } else if (constraints.prioritize === 'min_drive') {
    score = (totalDistanceKm * 0.7) + (maxInterStoreDistanceKm * 0.2) + (avgInterStoreDistanceKm * 0.1)
  } else {
    score = (totalDistanceKm * 0.45) + (maxInterStoreDistanceKm * 0.35) + (avgInterStoreDistanceKm * 0.2)
  }

  return {
    order,
    totalDistanceKm,
    totalDriveMinutes,
    totalRouteMinutes,
    maxInterStoreDistanceKm,
    avgInterStoreDistanceKm,
    score,
  }
}

function buildCandidateCombinations(
  storeData: StoreNode[],
  stopCount: number,
  managerHome: any
): StoreNode[][] {
  if (storeData.length <= stopCount) return [storeData]

  const combos = new Map<string, StoreNode[]>()

  const addCombo = (stores: StoreNode[]) => {
    if (stores.length !== stopCount) return
    const key = stores.map((store) => store.id).sort().join('|')
    if (!combos.has(key)) combos.set(key, stores)
  }

  const homeRanked = [...storeData].sort((a, b) => (a.distanceFromHome ?? Infinity) - (b.distanceFromHome ?? Infinity))
  addCombo(homeRanked.slice(0, stopCount))

  // Seed from up to 30 stores to keep compute cost predictable.
  const seeds = homeRanked.slice(0, Math.min(30, homeRanked.length))

  for (const seed of seeds) {
    const nearest = [...storeData]
      .filter((store) => store.id !== seed.id)
      .sort((a, b) => {
        const distA = seed.distances[a.id] ?? Infinity
        const distB = seed.distances[b.id] ?? Infinity
        return distA - distB
      })
      .slice(0, stopCount - 1)

    addCombo([seed, ...nearest])
  }

  // Build one candidate around centroid for broad-area balancing.
  const centroid = storeData.reduce(
    (acc, store) => ({ lat: acc.lat + store.latitude, lng: acc.lng + store.longitude }),
    { lat: 0, lng: 0 }
  )
  centroid.lat /= storeData.length
  centroid.lng /= storeData.length

  const centroidRanked = [...storeData].sort((a, b) => {
    const distA = calculateDistance(centroid.lat, centroid.lng, a.latitude, a.longitude)
    const distB = calculateDistance(centroid.lat, centroid.lng, b.latitude, b.longitude)
    return distA - distB
  })
  addCombo(centroidRanked.slice(0, stopCount))

  return Array.from(combos.values())
}

function fallbackOptimization(storeData: StoreNode[], managerHome: any, constraints: OptimizationConstraints) {
  const stopCount = Math.min(constraints.stopLimit, storeData.length)
  const candidateCombos = buildCandidateCombinations(storeData, stopCount, managerHome)

  let bestAny: RouteEstimate | null = null
  let bestValid: RouteEstimate | null = null

  for (const combo of candidateCombos) {
    const estimate = evaluateCandidate(combo, managerHome, constraints)

    if (!bestAny || estimate.score < bestAny.score) {
      bestAny = estimate
    }

    const fitsDriveLimit = constraints.maxDriveMinutes === null || estimate.totalDriveMinutes <= constraints.maxDriveMinutes
    const fitsRouteLimit = constraints.maxRouteMinutes === null || estimate.totalRouteMinutes <= constraints.maxRouteMinutes

    if (fitsDriveLimit && fitsRouteLimit) {
      if (!bestValid || estimate.score < bestValid.score) {
        bestValid = estimate
      }
    }
  }

  const best = bestValid || bestAny
  if (!best) {
    return NextResponse.json({ error: 'Unable to build a route with the provided data.' }, { status: 400 })
  }

  const warnings: string[] = []
  if (!bestValid) {
    warnings.push('No combination satisfied all constraints. Returned the closest feasible route.')
  }

  return NextResponse.json({
    storeIds: best.order.map((store) => store.id),
    estimate: {
      stopCount: best.order.length,
      totalDistanceKm: Number(best.totalDistanceKm.toFixed(1)),
      totalDistanceMiles: Number(kmToMiles(best.totalDistanceKm).toFixed(1)),
      totalDriveMinutes: best.totalDriveMinutes,
      totalRouteMinutes: best.totalRouteMinutes,
      maxInterStoreDistanceKm: Number(best.maxInterStoreDistanceKm.toFixed(1)),
    },
    constraints,
    warnings,
  })
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const stores = Array.isArray(requestBody?.stores) ? requestBody.stores : []
    const managerHome = requestBody?.managerHome || null

    if (stores.length === 0) {
      return NextResponse.json({ error: 'No stores provided' }, { status: 400 })
    }

    const constraints = parseConstraints(requestBody, stores.length)

    const storeData: StoreNode[] = stores
      .map((store: any) => {
        const latitude = parseNumber(store.latitude)
        const longitude = parseNumber(store.longitude)
        if (latitude === null || longitude === null) return null

        let distanceFromHome: number | null = null
        if (managerHome?.latitude && managerHome?.longitude) {
          distanceFromHome = calculateDistance(managerHome.latitude, managerHome.longitude, latitude, longitude)
        }

        return {
          id: String(store.id),
          name: store.store_name || 'Unknown Store',
          code: store.store_code || '',
          latitude,
          longitude,
          distanceFromHome,
          distances: {},
        } satisfies StoreNode
      })
      .filter((store: StoreNode | null): store is StoreNode => !!store)

    if (storeData.length === 0) {
      return NextResponse.json({ error: 'No stores with valid coordinates were provided.' }, { status: 400 })
    }

    for (let i = 0; i < storeData.length; i++) {
      for (let j = i + 1; j < storeData.length; j++) {
        const distance = calculateDistance(
          storeData[i].latitude,
          storeData[i].longitude,
          storeData[j].latitude,
          storeData[j].longitude
        )
        storeData[i].distances[storeData[j].id] = distance
        storeData[j].distances[storeData[i].id] = distance
      }
    }

    return fallbackOptimization(storeData, managerHome, constraints)
  } catch (error) {
    console.error('Error optimizing route:', error)
    return NextResponse.json({ error: 'Failed to optimize route' }, { status: 500 })
  }
}
