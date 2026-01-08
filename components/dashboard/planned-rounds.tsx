'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Route, Calendar, MapPin, User, CheckCircle2, Calendar as CalendarIcon } from 'lucide-react'
import { format, isSameDay, parseISO } from 'date-fns'
import { RouteDirectionsModal } from '@/components/route-planning/route-directions-modal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { completeRoute, rescheduleRoute } from '@/app/actions/route-planning'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

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
  const [rescheduleRouteData, setRescheduleRouteData] = useState<PlannedRoute | null>(null)
  const [newDate, setNewDate] = useState<string>('')
  const [isCompleting, setIsCompleting] = useState<string | null>(null)
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [completedRoutes, setCompletedRoutes] = useState<Set<string>>(new Set())
  const router = useRouter()
  
  // Filter out completed routes immediately
  const visibleRoutes = plannedRoutes.filter(route => !completedRoutes.has(route.key))
  
  // Debug: Log hidden routes
  useEffect(() => {
    if (completedRoutes.size > 0) {
      const hiddenRoutes = plannedRoutes.filter(route => completedRoutes.has(route.key))
      console.log('Hidden routes (client-side):', hiddenRoutes.map(r => ({
        key: r.key,
        manager: r.managerName,
        area: r.area,
        date: r.plannedDate
      })))
    }
  }, [completedRoutes, plannedRoutes])

  // Check if a route's planned date is today
  const isRouteToday = (plannedDate: string | null): boolean => {
    if (!plannedDate) return false
    try {
      const routeDate = parseISO(plannedDate)
      const today = new Date()
      return isSameDay(routeDate, today)
    } catch {
      return false
    }
  }

  const handleComplete = async (route: PlannedRoute) => {
    // Show completing state but keep route visible
    setIsCompleting(route.key)
    
    const storeIds = route.stores.map(s => s.id)
    const result = await completeRoute(storeIds)
    
    if (result.error) {
      alert(`Error completing route: ${result.error}`)
      setIsCompleting(null)
    } else {
      // Hide the route after successful completion
      setCompletedRoutes(prev => new Set(prev).add(route.key))
      // Refresh to sync with server
      router.refresh()
      // Clear the completing state after a short delay
      setTimeout(() => {
        setIsCompleting(null)
      }, 500)
    }
  }

  const handleReschedule = async () => {
    if (!rescheduleRouteData || !newDate) return

    setIsRescheduling(true)
    const storeIds = rescheduleRouteData.stores.map(s => s.id)
    const result = await rescheduleRoute(storeIds, newDate)
    
    if (result.error) {
      alert(`Error rescheduling route: ${result.error}`)
      setIsRescheduling(false)
    } else {
      setRescheduleRouteData(null)
      setNewDate('')
      setIsRescheduling(false)
      router.refresh()
    }
  }

  const openRescheduleDialog = (route: PlannedRoute, e: React.MouseEvent) => {
    e.stopPropagation()
    setRescheduleRouteData(route)
    setNewDate(route.plannedDate || '')
  }

  if (visibleRoutes.length === 0 && plannedRoutes.length > 0 && completedRoutes.size === 0) {
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
          <div className="flex items-center justify-between">
            <h3 className="text-blue-900 flex items-center gap-2 text-sm font-semibold">
              <Route className="h-4 w-4" />
              Planned Rounds ({visibleRoutes.length})
            </h3>
            {completedRoutes.size > 0 && (
              <span className="text-xs text-slate-500">
                {completedRoutes.size} hidden
              </span>
            )}
          </div>
        </div>
        <div className="px-3 pb-3 flex-1 min-h-0">
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {visibleRoutes.map((route) => {
              const isToday = isRouteToday(route.plannedDate)
              const isCompletingRoute = isCompleting === route.key
              const isChecked = completedRoutes.has(route.key)

              return (
                <div 
                  key={route.key} 
                  onClick={() => !isToday && setSelectedRoute(route)}
                  className={cn(
                    "bg-white rounded-lg border border-blue-200 p-2.5 space-y-0.5 transition-all",
                    isToday ? "border-orange-300 bg-orange-50/30" : "cursor-pointer hover:border-blue-400 hover:shadow-md",
                    isCompletingRoute && "opacity-50"
                  )}
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
                  <div className="text-xs text-slate-700 pt-0.5 mb-2">
                    {route.stores.map(s => s.name).join(', ')}
                  </div>

                  {/* Complete/Reschedule options - only show on the day of the route */}
                  {isToday && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-orange-200 mt-2" onClick={(e) => e.stopPropagation()}>
                      {/* Complete Toggle */}
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 py-2 min-h-[44px] md:min-h-0" htmlFor={`complete-${route.key}`}>
                          <input
                            type="checkbox"
                            id={`complete-${route.key}`}
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked && !isCompletingRoute) {
                                handleComplete(route)
                              }
                            }}
                            disabled={isCompletingRoute}
                            className="sr-only"
                          />
                          <div className={cn(
                            "relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-within:outline-none focus-within:ring-2 focus-within:ring-green-500 focus-within:ring-offset-2",
                            isCompletingRoute ? "opacity-50 cursor-not-allowed bg-slate-400" : "cursor-pointer",
                            !isCompletingRoute && isChecked ? "bg-green-600" : !isCompletingRoute ? "bg-slate-300" : ""
                          )}>
                            <span className={cn(
                              "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out translate-y-0.5",
                              isCompletingRoute || isChecked ? "translate-x-5" : "translate-x-0.5"
                            )} />
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-slate-700 select-none">
                            {isCompletingRoute ? 'Completing...' : 'Complete?'}
                          </span>
                        </label>
                      </div>
                      {/* Reschedule Button */}
                      <Button
                        onClick={(e) => openRescheduleDialog(route, e)}
                        disabled={isCompletingRoute}
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 min-h-[44px] md:min-h-0"
                      >
                        <CalendarIcon className="h-3 w-3 mr-1.5" />
                        Reschedule
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
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

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleRouteData} onOpenChange={(open) => !open && setRescheduleRouteData(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Route</DialogTitle>
            <DialogDescription>
              Change the planned date for {rescheduleRouteData?.managerName}&apos;s route in {rescheduleRouteData?.area && getAreaDisplayName(rescheduleRouteData.area)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-date">New Planned Date</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="min-h-[44px] sm:min-h-0"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            {rescheduleRouteData && (
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md">
                <p className="font-medium mb-1">Current date:</p>
                <p>{rescheduleRouteData.plannedDate ? format(new Date(rescheduleRouteData.plannedDate), 'EEEE, dd MMMM yyyy') : 'Not set'}</p>
                <p className="font-medium mt-2 mb-1">Stores in route:</p>
                <p className="text-xs">{rescheduleRouteData.stores.length} store(s)</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleRouteData(null)
                setNewDate('')
              }}
              disabled={isRescheduling}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={isRescheduling || !newDate}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              {isRescheduling ? 'Rescheduling...' : 'Reschedule Route'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
