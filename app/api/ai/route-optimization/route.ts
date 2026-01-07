import { NextRequest, NextResponse } from 'next/server'

// Haversine formula to calculate distance between two coordinates (in km)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
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

export async function POST(request: NextRequest) {
  let storeData: any[] = []
  let managerHome: any = null
  let stores: any[] = []

  try {
    const requestBody = await request.json()
    stores = requestBody?.stores || []
    managerHome = requestBody?.managerHome || null
    const apiKey = process.env.OPENAI_API_KEY

    // If no API key, skip OpenAI and use fallback optimization
    const useOpenAI = !!apiKey

    if (!stores || stores.length === 0) {
      return NextResponse.json(
        { error: 'No stores provided' },
        { status: 400 }
      )
    }

    // Calculate distances between all stores and from manager home
    storeData = stores.map((store: any) => {
      const distances: any = {}
      let distanceFromHome = null

      if (managerHome?.latitude && managerHome?.longitude) {
        distanceFromHome = calculateDistance(
          managerHome.latitude,
          managerHome.longitude,
          parseFloat(store.latitude),
          parseFloat(store.longitude)
        )
      }

      stores.forEach((otherStore: any) => {
        if (otherStore.id !== store.id) {
          distances[otherStore.id] = calculateDistance(
            parseFloat(store.latitude),
            parseFloat(store.longitude),
            parseFloat(otherStore.latitude),
            parseFloat(otherStore.longitude)
          )
        }
      })

      return {
        id: store.id,
        name: store.store_name,
        code: store.store_code || '',
        latitude: parseFloat(store.latitude),
        longitude: parseFloat(store.longitude),
        distanceFromHome: distanceFromHome ? Math.round(distanceFromHome * 10) / 10 : null,
        distances,
      }
    })

    // Always use fallback optimization for now to ensure clustering works correctly
    // OpenAI can sometimes return suboptimal results
    console.log('Using algorithmic optimization (prioritizing store clustering)')
    return fallbackOptimization(storeData, managerHome)
    
    // Uncomment below to use OpenAI (but fallback is more reliable for clustering)
    // if (!useOpenAI) {
    //   console.log('OpenAI API key not configured, using algorithmic optimization')
    //   return fallbackOptimization(storeData, managerHome)
    // }

    // Create a prompt for OpenAI
    const prompt = `You are a route optimization expert. Given a manager's home location and a list of stores in an area, select the optimal 3 stores that are closest to each other for a day's route.

Manager's Home Location:
- Address: ${managerHome?.address || 'Not specified'}
- Coordinates: ${managerHome?.latitude}, ${managerHome?.longitude}

Available Stores (${stores.length} total):
${storeData.map((s: any, idx: number) => 
  `${idx + 1}. ${s.name} (Code: ${s.code}, ID: ${s.id}) - ${s.distanceFromHome ? `${s.distanceFromHome}km from home` : 'distance unknown'}`
).join('\n')}

Distance Matrix (in km):
${storeData.map((s: any) => {
  const distances = Object.entries(s.distances)
    .map(([otherId, dist]: [string, any]) => {
      const otherStore = storeData.find((st: any) => st.id === otherId)
      return `${otherStore?.name}: ${Math.round(dist * 10) / 10}km`
    })
    .join(', ')
  return `${s.name}: ${distances || 'N/A'}`
}).join('\n')}

Requirements:
1. Select exactly 3 stores
2. CRITICAL: The 3 stores MUST be geographically close to each other - prioritize stores that form a tight cluster/group
3. The distance between the 3 stores should be minimized (they should be near each other, not spread out)
4. Consider the manager's home as the starting and ending point
5. Optimize for: (a) stores being close together, then (b) shortest total route: Home → Store 1 → Store 2 → Store 3 → Home
6. Look at the distance matrix - find 3 stores where the distances between them are the smallest
7. Return ONLY a JSON array of exactly 3 store IDs (the UUID values, NOT the store codes) in the optimal order
8. IMPORTANT: Use the ID field (UUID format like "098c9478-7edf-47b4-bd40-55e908157446"), NOT the store code (like "S0081")
9. Example format: ["098c9478-7edf-47b4-bd40-55e908157446", "c758432b-7012-4420-9ae9-be2ac735f094", "b341497b-aec3-4888-90df-2583d5969e28"]
10. Do not include any explanation, just the JSON array

Selected store IDs (JSON array of UUIDs only):`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a route optimization expert. Always respond with only a JSON array of store IDs, no other text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent, logical results
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API Error:', errorData)
      
      // Fallback: Use algorithmic approach if OpenAI fails
      return fallbackOptimization(storeData, managerHome)
    }

    const data = await response.json()
    let content = data.choices?.[0]?.message?.content || ''

    // Try to parse the response
    try {
      // Clean up any markdown or extra text
      content = content.replace(/```json/g, '').replace(/```/g, '').trim()
      
      // Create a mapping from store codes to IDs for fallback
      const codeToIdMap = new Map(storeData.map((s: any) => [s.code, s.id]))
      
      // Helper function to map codes to IDs if needed
      const mapCodesToIds = (ids: unknown[]): string[] => {
        const normalizedIds: string[] = ids.map((id) =>
          typeof id === 'string' ? id : String(id ?? '')
        )

        return normalizedIds.map((id: string) => {
          // If it looks like a store code (starts with 'S' and is short), try to map it
          if (id.startsWith('S') && id.length <= 10 && codeToIdMap.has(id)) {
            console.log(`Mapping store code ${id} to ID ${codeToIdMap.get(id)}`)
            return codeToIdMap.get(id)!
          }
          return id
        }) as string[]
      }
      
      // Try to extract JSON array (most common format)
      // Match arrays with UUIDs or quoted strings
      const arrayMatch = content.match(/\[["'][^"']+["'](?:,\s*["'][^"']+["'])*\]/)
      if (arrayMatch) {
        try {
          let storeIds = JSON.parse(arrayMatch[0])
          if (Array.isArray(storeIds) && storeIds.length >= 3) {
            // Map codes to IDs if needed
            storeIds = mapCodesToIds(storeIds)
            // Take first 3 if more than 3
            return NextResponse.json({ storeIds: storeIds.slice(0, 3) })
          }
        } catch (parseErr) {
          console.error('Error parsing array match:', parseErr)
        }
      }

      // Try parsing as JSON object
      const parsed = JSON.parse(content)
      if (parsed.storeIds && Array.isArray(parsed.storeIds) && parsed.storeIds.length >= 3) {
        // Map codes to IDs if needed
        const mappedIds = mapCodesToIds(parsed.storeIds)
        return NextResponse.json({ storeIds: mappedIds.slice(0, 3) })
      }
      if (Array.isArray(parsed) && parsed.length >= 3) {
        // Map codes to IDs if needed
        const mappedIds = mapCodesToIds(parsed)
        return NextResponse.json({ storeIds: mappedIds.slice(0, 3) })
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError, 'Content:', content)
      // Fallback to algorithmic approach
      return fallbackOptimization(storeData, managerHome)
    }

      // If we get here, parsing failed but no exception was thrown
      console.warn('Could not parse OpenAI response, using fallback')
      return fallbackOptimization(storeData, managerHome)
    } catch (openAIError) {
      console.error('OpenAI request failed:', openAIError)
      // Fallback to algorithmic approach
      return fallbackOptimization(storeData, managerHome)
    }
  } catch (error) {
    console.error('Error optimizing route:', error)
    // Even if there's an error, try to use fallback optimization
    try {
      return fallbackOptimization(storeData, managerHome)
    } catch (fallbackError) {
      console.error('Fallback optimization also failed:', fallbackError)
      return NextResponse.json(
        { error: 'Failed to optimize route' },
        { status: 500 }
      )
    }
  }
}

// Fallback optimization using distance calculations
// Prioritizes stores that are close together (clustered) over total route distance
function fallbackOptimization(storeData: any[], managerHome: any) {
  if (storeData.length < 3) {
    return NextResponse.json(
      { error: 'Need at least 3 stores for optimization' },
      { status: 400 }
    )
  }

  let bestRoute: string[] = []
  let bestScore = Infinity

  // Try all combinations of 3 stores
  for (let i = 0; i < storeData.length; i++) {
    for (let j = i + 1; j < storeData.length; j++) {
      for (let k = j + 1; k < storeData.length; k++) {
        const stores = [storeData[i], storeData[j], storeData[k]]
        
        // Calculate inter-store distances (how close the stores are to each other)
        const dist1 = calculateDistance(
          stores[0].latitude,
          stores[0].longitude,
          stores[1].latitude,
          stores[1].longitude
        )
        const dist2 = calculateDistance(
          stores[1].latitude,
          stores[1].longitude,
          stores[2].latitude,
          stores[2].longitude
        )
        const dist3 = calculateDistance(
          stores[0].latitude,
          stores[0].longitude,
          stores[2].latitude,
          stores[2].longitude
        )
        
        // Calculate cluster tightness (sum of distances between all pairs)
        // Lower = stores are closer together
        const clusterTightness = dist1 + dist2 + dist3
        
        // Find the maximum distance between any two stores (diameter of the cluster)
        const maxInterStoreDistance = Math.max(dist1, dist2, dist3)
        
        // Try all permutations to find best route order
        const permutations = [
          [stores[0], stores[1], stores[2]],
          [stores[0], stores[2], stores[1]],
          [stores[1], stores[0], stores[2]],
          [stores[1], stores[2], stores[0]],
          [stores[2], stores[0], stores[1]],
          [stores[2], stores[1], stores[0]],
        ]

        let bestPermutation: any[] = []
        let bestRouteDistance = Infinity

        // First, find the best route order for this combination
        permutations.forEach((perm) => {
          // Calculate route distance
          let routeDistance = 0

          // Distance from home to first store
          if (managerHome?.latitude && managerHome?.longitude) {
            routeDistance += calculateDistance(
              managerHome.latitude,
              managerHome.longitude,
              perm[0].latitude,
              perm[0].longitude
            )
          }

          // Distances between stores
          routeDistance += calculateDistance(
            perm[0].latitude,
            perm[0].longitude,
            perm[1].latitude,
            perm[1].longitude
          )
          routeDistance += calculateDistance(
            perm[1].latitude,
            perm[1].longitude,
            perm[2].latitude,
            perm[2].longitude
          )

          // Distance from last store back to home
          if (managerHome?.latitude && managerHome?.longitude) {
            routeDistance += calculateDistance(
              perm[2].latitude,
              perm[2].longitude,
              managerHome.latitude,
              managerHome.longitude
            )
          }

          if (routeDistance < bestRouteDistance) {
            bestRouteDistance = routeDistance
            bestPermutation = perm
          }
        })

        // Score heavily prioritizes cluster tightness (90%) over route distance (10%)
        // This ensures we pick stores that are very close together
        // Use maxInterStoreDistance as the primary factor (stores should be within a small radius)
        const score = (maxInterStoreDistance * 0.9) + (clusterTightness * 0.05) + (bestRouteDistance * 0.05)

        if (score < bestScore) {
          bestScore = score
          bestRoute = bestPermutation.map((s) => s.id)
        }
      }
    }
  }

  return NextResponse.json({ storeIds: bestRoute })
}
