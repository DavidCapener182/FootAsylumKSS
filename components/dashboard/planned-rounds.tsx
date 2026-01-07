'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Route, Calendar, MapPin, User } from 'lucide-react'
import { format } from 'date-fns'
import { RouteDirectionsModal } from '@/components/route-planning/route-directions-modal'

// Area name mapping
const areaNames: Record<string, string> = {
  'A1': 'Scotland & North East',
  'A2': 'Yorkshire & Midlands',
  'A3': 'Manchester',
  'A4': 'Lancashire & Merseyside',
  'A5': 'Birmingham',
  'A6': 'Wales',
  'A7': 'South',
  'A8': 'London',
}

function getAreaDisplayName(areaCode: string | null): string {
  if (!areaCode) return 'Unknown Area'
  const name = areaNames[areaCode]
  return name ? `${areaCode} - ${name}` : areaCode
}

interface Store {
  id: string
  name: string
  store_code: string | null
  postcode: string | null
  latitude: number | null
  longitude: number | null
  sequence: number | null
}

interface PlannedRoute {
  key: string
  managerId: string | null
  managerName: string
  area: string | null
  plannedDate: string
  storeCount: number
  stores: Store[]
  storeNames?: string[] // For backward compatibility
  managerHome: {
    latitude: number
    longitude: number
    address: string
  } | null
}

interface PlannedRoundsProps {
  plannedRoutes: PlannedRoute[]
}

export function PlannedRounds({ plannedRoutes }: PlannedRoundsProps) {
  const [selectedRoute, setSelectedRoute] = useState<PlannedRoute | null>(null)

  if (plannedRoutes.length === 0) {
    return (
      <Card className="bg-blue-50 border-blue-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <Route className="h-5 w-5" />
            Planned Rounds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">No planned rounds scheduled.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-2xl shadow-sm flex flex-col h-full">
        <div className="pb-1.5 px-3 pt-3">
          <h3 className="text-blue-900 flex items-center gap-2 text-sm font-semibold">
            <Route className="h-4 w-4" />
            Planned Rounds ({plannedRoutes.length})
          </h3>
        </div>
        <div className="px-3 pb-3 flex-1 min-h-0">
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {plannedRoutes.map((route) => (
              <div 
                key={route.key} 
                onClick={() => setSelectedRoute(route)}
                className="bg-white rounded-lg border border-blue-200 p-2.5 space-y-0.5 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="font-semibold text-slate-900 text-sm">
                  {route.managerName}
                </div>
                <div className="text-xs text-slate-600">
                  {getAreaDisplayName(route.area)}
                </div>
                <div className="text-xs text-slate-600">
                  {route.plannedDate 
                    ? format(new Date(route.plannedDate), 'dd/MM/yyyy')
                    : 'Not set'}
                </div>
                <div className="text-xs text-slate-700 pt-0.5">
                  {route.stores.map(s => s.name).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Route Directions Modal */}
      {selectedRoute && (
        <RouteDirectionsModal
          isOpen={true}
          onClose={() => setSelectedRoute(null)}
          stores={selectedRoute.stores.map(s => ({
            id: s.id,
            store_name: s.name,
            store_code: s.store_code,
            postcode: s.postcode,
            latitude: s.latitude,
            longitude: s.longitude,
          }))}
          managerHome={selectedRoute.managerHome}
          managerName={selectedRoute.managerName}
          plannedDate={selectedRoute.plannedDate}
        />
      )}
    </>
  )
}
