'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin, Clock, Home, X, Download, Calendar as CalendarIcon } from 'lucide-react'
import { format, addMinutes, addHours } from 'date-fns'
import dynamic from 'next/dynamic'

// Dynamically import the map component to avoid SSR issues
const RouteMapComponent = dynamic(() => import('./route-map-component'), { ssr: false })

interface Store {
  id: string
  store_name: string
  store_code: string | null
  postcode: string | null
  latitude: number | null
  longitude: number | null
}

interface ManagerHome {
  latitude: number
  longitude: number
  address: string
}

interface RouteDirectionsModalProps {
  isOpen: boolean
  onClose: () => void
  stores: Store[]
  managerHome: ManagerHome | null
  managerName: string
  plannedDate: string
}

interface RouteSegment {
  from: string
  to: string
  distance: number // in km
  duration: number // in minutes
  type: 'travel' | 'visit'
}

interface ScheduleItem {
  time: Date
  endTime?: Date
  action: string
  location: string
  travelTime?: number // in minutes
  travelDistance?: number // in km
}

// Calculate distance using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

// Estimate travel time based on distance (assuming average speed of 50 km/h in urban areas)
function estimateTravelTime(distance: number): number {
  // Average speed: 50 km/h = 0.833 km/min
  // Add 10 minutes buffer for traffic, parking, etc.
  return Math.round((distance / 0.833) + 10)
}

// Format date for ICS format (YYYYMMDDTHHMMSS)
function formatICSDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}`
}

// Generate ICS calendar file content
function generateICS(schedule: ScheduleItem[], managerName: string, plannedDate: string): string {
  const lines: string[] = []
  
  // Calendar header
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//Foot Asylum//Route Planning//EN')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  
  // Generate event for each schedule item
  schedule.forEach((item, index) => {
    let startDate = item.time
    let endDate = item.endTime
    
    // Calculate end time if not provided
    if (!endDate) {
      if (item.travelTime) {
        // For travel events, end time is start + travel time
        endDate = addMinutes(item.time, item.travelTime)
      } else if (item.action === 'Arrive home') {
        // For arrive home, make it a 5-minute event
        endDate = addMinutes(item.time, 5)
      } else {
        // Default to same time if no end time
        endDate = item.time
      }
    }
    
    // Create a unique UID for each event
    const uid = `route-${plannedDate.replace(/-/g, '')}-${index}-${Date.now()}@footasylum.com`
    
    // Determine event title
    let summary = item.action
    if (item.action === 'Visit') {
      summary = `${item.location} Visit`
    } else if (item.action === 'Travel') {
      // Extract destination from travel string (e.g., "Doncaster (DN1 1SW) → Rotherham (S60 1TG)")
      const parts = item.location.split('→')
      const destination = parts.length > 1 ? parts[parts.length - 1].trim() : item.location
      summary = `Travel to ${destination}`
    } else if (item.action === 'Leave home') {
      summary = 'Leave Home'
    } else if (item.action === 'Arrive home') {
      summary = 'Arrive Home'
    }
    
    // Build description
    let description = summary
    if (item.travelTime && item.travelDistance) {
      description += `\\nDistance: ${item.travelDistance.toFixed(1)} km\\nDuration: ${item.travelTime} minutes`
    }
    if (item.action === 'Visit' && item.endTime) {
      description += `\\nVisit duration: 2 hours`
    }
    if (item.location && !item.action.includes('Travel')) {
      description += `\\nLocation: ${item.location}`
    }
    
    // Build location
    let location = item.location
    if (item.action === 'Travel' && item.location.includes('→')) {
      // For travel, extract the destination
      const parts = item.location.split('→')
      location = parts[parts.length - 1].trim()
    }
    
    // Event
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTART:${formatICSDate(startDate)}`)
    lines.push(`DTEND:${formatICSDate(endDate)}`)
    lines.push(`SUMMARY:${summary}`)
    lines.push(`DESCRIPTION:${description.replace(/\n/g, '\\n')}`)
    lines.push(`LOCATION:${location}`)
    lines.push(`STATUS:CONFIRMED`)
    lines.push(`SEQUENCE:0`)
    lines.push('END:VEVENT')
  })
  
  // Calendar footer
  lines.push('END:VCALENDAR')
  
  return lines.join('\r\n')
}

// Download ICS file
function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function RouteDirectionsModal({
  isOpen,
  onClose,
  stores,
  managerHome,
  managerName,
  plannedDate
}: RouteDirectionsModalProps) {
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([])
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [isCalculating, setIsCalculating] = useState(false)

  useEffect(() => {
    if (!isOpen || stores.length === 0) return

    setIsCalculating(true)
    
    // Filter stores that have coordinates
    const storesWithCoords = stores.filter(s => s.latitude && s.longitude)
    
    if (storesWithCoords.length === 0) {
      setIsCalculating(false)
      return
    }

    // Calculate route segments
    const segments: RouteSegment[] = []
    const scheduleItems: ScheduleItem[] = []
    
    // Start time: 09:00 on the planned date
    const startTime = new Date(`${plannedDate}T09:00:00`)
    let currentTime = startTime

    // If we have manager home, calculate travel from home to first store
    if (managerHome && storesWithCoords.length > 0) {
      const firstStore = storesWithCoords[0]
      const distance = calculateDistance(
        managerHome.latitude,
        managerHome.longitude,
        firstStore.latitude!,
        firstStore.longitude!
      )
      const travelTime = estimateTravelTime(distance)
      
      // Format first store name with postcode
      const toStoreName = firstStore.postcode
        ? `${firstStore.store_name} (${firstStore.postcode})`
        : firstStore.store_name
      
      segments.push({
        from: managerHome.address,
        to: toStoreName,
        distance,
        duration: travelTime,
        type: 'travel'
      })

      // Calculate when to leave home
      const leaveHomeTime = new Date(currentTime.getTime() - travelTime * 60000)
      scheduleItems.push({
        time: leaveHomeTime,
        action: 'Leave home',
        location: managerHome.address,
        travelTime,
        travelDistance: distance
      })
    }

    // Process each store
    storesWithCoords.forEach((store, index) => {
      // Visit at store (combined arrival and completion)
      const visitEndTime = addHours(currentTime, 2)
      scheduleItems.push({
        time: currentTime,
        endTime: visitEndTime,
        action: 'Visit',
        location: store.store_name
      })

      // Travel to next store (if not last)
      if (index < storesWithCoords.length - 1) {
        const nextStore = storesWithCoords[index + 1]
        const distance = calculateDistance(
          store.latitude!,
          store.longitude!,
          nextStore.latitude!,
          nextStore.longitude!
        )
        const travelTime = estimateTravelTime(distance)
        
        // Format store names with postcodes
        const fromStoreName = store.postcode 
          ? `${store.store_name} (${store.postcode})`
          : store.store_name
        const toStoreName = nextStore.postcode
          ? `${nextStore.store_name} (${nextStore.postcode})`
          : nextStore.store_name

        segments.push({
          from: fromStoreName,
          to: toStoreName,
          distance,
          duration: travelTime,
          type: 'travel'
        })

        // Add travel time entry
        scheduleItems.push({
          time: visitEndTime,
          action: 'Travel',
          location: `${fromStoreName} → ${toStoreName}`,
          travelTime,
          travelDistance: distance
        })

        currentTime = addMinutes(visitEndTime, travelTime)
      } else {
        // Last store - travel back home
        if (managerHome) {
          const distance = calculateDistance(
            store.latitude!,
            store.longitude!,
            managerHome.latitude,
            managerHome.longitude
          )
          const travelTime = estimateTravelTime(distance)
          
          // Format store name with postcode
          const fromStoreName = store.postcode
            ? `${store.store_name} (${store.postcode})`
            : store.store_name
          
          segments.push({
            from: fromStoreName,
            to: managerHome.address,
            distance,
            duration: travelTime,
            type: 'travel'
          })

          // Add travel time entry
          scheduleItems.push({
            time: visitEndTime,
            action: 'Travel',
            location: `${fromStoreName} → Home`,
            travelTime,
            travelDistance: distance
          })

          const arriveHomeTime = addMinutes(visitEndTime, travelTime)
          scheduleItems.push({
            time: arriveHomeTime,
            action: 'Arrive home',
            location: managerHome.address
          })
        }
      }
    })

    setRouteSegments(segments)
    setSchedule(scheduleItems)
    setIsCalculating(false)
  }, [isOpen, stores, managerHome, plannedDate])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-12 md:pr-0">
          <DialogTitle className="flex items-center gap-2 text-lg md:text-xl flex-wrap">
            <MapPin className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
            <span className="break-words">Route Directions - {managerName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Planned for {format(new Date(plannedDate), 'EEEE, dd MMMM yyyy')}
          </DialogDescription>
          {schedule.length > 0 && (
            <div className="mt-4">
              <Button
                onClick={() => {
                  const icsContent = generateICS(schedule, managerName, plannedDate)
                  const filename = `route-${managerName.replace(/\s+/g, '-')}-${plannedDate}.ics`
                  downloadICS(icsContent, filename)
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 min-h-[44px] md:min-h-0 w-full md:w-auto"
              >
                <CalendarIcon className="h-4 w-4" />
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download Calendar</span>
                <span className="sm:hidden">Download</span>
              </Button>
            </div>
          )}
        </DialogHeader>

        {isCalculating ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-slate-600">Calculating route...</span>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Schedule Timeline */}
            <div>
              <h3 className="font-semibold text-sm md:text-base text-slate-900 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 flex-shrink-0" />
                Schedule
              </h3>
              <div className="space-y-2">
                {schedule.map((item, index) => (
                  <div
                    key={index}
                    className={`flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-3 rounded-lg ${
                      item.action.includes('Leave') || item.action.includes('Arrive home')
                        ? 'bg-blue-50 border border-blue-200'
                        : item.action === 'Visit'
                        ? 'bg-green-50 border border-green-200'
                        : item.action === 'Travel'
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <div className="flex-shrink-0 w-full sm:w-28 text-xs sm:text-sm font-medium text-slate-700">
                      {item.endTime 
                        ? `${format(item.time, 'HH:mm')} - ${format(item.endTime, 'HH:mm')}`
                        : format(item.time, 'HH:mm')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm md:text-base text-slate-900 break-words">
                        {item.action === 'Visit' 
                          ? `${item.location} Visit`
                          : item.action === 'Travel'
                          ? `Travel: ${item.location}`
                          : item.action}
                      </div>
                      {item.action !== 'Travel' && (
                        <div className="text-xs sm:text-sm text-slate-600 flex items-center gap-1 mt-1 break-words">
                          {item.action.includes('home') ? (
                            <Home className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span className="break-words">{item.location}</span>
                        </div>
                      )}
                      {item.travelTime && (
                        <div className="text-xs text-slate-500 mt-1">
                          {item.travelDistance?.toFixed(1)} km • {item.travelTime} minutes
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Route Map */}
            <div>
              <h3 className="font-semibold text-sm md:text-base text-slate-900 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                Route Map
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden h-[300px] md:h-[400px]">
                <RouteMapComponent stores={stores} managerHome={managerHome} />
              </div>
            </div>

            {/* Route Segments */}
            {routeSegments.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Route Details</h3>
                <div className="space-y-2">
                  {routeSegments.map((segment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">
                          {segment.from} → {segment.to}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {segment.distance.toFixed(1)} km • {segment.duration} minutes
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stores.filter(s => !s.latitude || !s.longitude).length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  ⚠️ {stores.filter(s => !s.latitude || !s.longitude).length} store(s) missing coordinates and cannot be included in route calculation.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button onClick={onClose} className="w-full sm:w-auto min-h-[44px] md:min-h-0">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
