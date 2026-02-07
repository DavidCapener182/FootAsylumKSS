'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, MapPin, Clock, Home, Download, Calendar as CalendarIcon, Edit2, Plus, Trash2, Route as RouteIcon, Navigation, ClipboardPlus, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { format, addMinutes, addHours } from 'date-fns'
import dynamic from 'next/dynamic'
import { 
  getRouteOperationalItems, 
  saveRouteOperationalItem, 
  updateRouteOperationalItem, 
  deleteRouteOperationalItem,
  getRouteVisitTimes,
  saveRouteVisitTime,
  getCompletedRouteVisits,
  markRouteVisitComplete
} from '@/app/actions/route-planning'

// Dynamically import the map component to avoid SSR issues
const RouteMapComponent = dynamic(() => import('./route-map-component'), { ssr: false })

interface Store {
  id: string
  store_name: string
  store_code: string | null
  address_line_1?: string | null
  city?: string | null
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
  managerUserId: string | null
  region: string | null
}

interface RouteSegment {
  from: string
  to: string
  distance: number // in miles
  duration: number // in minutes
  type: 'travel' | 'visit'
}

interface ScheduleItem {
  id: string
  time: Date
  endTime?: Date
  action: string
  location: string
  travelTime?: number // in minutes
  travelDistance?: number // in miles
  storeId?: string // For visits - to recalculate travel times
  isOperational?: boolean // True for operational items (not visits)
  dbId?: string // Database ID for operational items or visit times
  visitTimeId?: string // Database ID for visit time overrides
}

// Convert kilometers to miles
function kmToMiles(km: number): number {
  return km * 0.621371
}

// Calculate distance using Haversine formula (returns miles)
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
  const distanceKm = R * c
  return kmToMiles(distanceKm)
}

// Estimate travel time based on distance (assuming average speed of 31 mph in urban areas)
function estimateTravelTime(distanceMiles: number): number {
  // Treat effectively same-site moves as no drive time.
  if (distanceMiles <= 0.05) return 0

  // Average speed: 31 mph = 0.517 miles/min.
  const baseMinutes = distanceMiles / 0.517
  const bufferMinutes = distanceMiles < 1 ? 4 : 10
  return Math.max(1, Math.round(baseMinutes + bufferMinutes))
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
function generateICS(schedule: ScheduleItem[], managerName: string, plannedDate: string, stores: Store[]): string {
  const lines: string[] = []
  
  // Calendar header
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//KSS x Footasylum//Route Planning//EN')
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
      description += `\\nDistance: ${item.travelDistance.toFixed(1)} miles\\nDuration: ${item.travelTime} minutes`
    }
    if (item.action === 'Visit' && item.endTime) {
      const duration = Math.round((item.endTime.getTime() - item.time.getTime()) / 60000)
      description += `\\nVisit duration: ${duration} minutes`
    }
    if (item.location && !item.action.includes('Travel')) {
      description += `\\nLocation: ${item.location}`
    }
    
    // Build location - use store address for visits
    let location = item.location
    if (item.action === 'Visit' && item.storeId) {
      // Look up the store to get its full address
      const store = stores.find(s => s.id === item.storeId)
      if (store) {
        const addressParts: string[] = []
        if (store.address_line_1) addressParts.push(store.address_line_1)
        if (store.city) addressParts.push(store.city)
        if (store.postcode) addressParts.push(store.postcode)
        location = addressParts.length > 0 ? addressParts.join(', ') : store.store_name
      }
    } else if (item.action === 'Travel' && item.location.includes('→')) {
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

// Recalculate schedule times after a visit time change
function recalculateScheduleAfterEdit(
  schedule: ScheduleItem[],
  editedItemId: string,
  newStartTime: Date,
  newEndTime: Date,
  stores: Store[],
  managerHome: ManagerHome | null
): ScheduleItem[] {
  // Deep clone schedule items with dates
  const updated = schedule.map(item => ({
    ...item,
    time: new Date(item.time),
    endTime: item.endTime ? new Date(item.endTime) : undefined
  }))
  
  const editedIndex = updated.findIndex(item => item.id === editedItemId)
  if (editedIndex === -1) return schedule
  
  const editedItem = updated[editedIndex]
  const storesWithCoords = stores.filter(s => s.latitude && s.longitude)
  const storeMap = new Map(storesWithCoords.map(s => [s.id, s]))
  
  // Update the edited visit
  editedItem.time = new Date(newStartTime)
  editedItem.endTime = new Date(newEndTime)
  
  // Sort by time to ensure correct order, but "Leave home" should always be first
  updated.sort((a, b) => {
    if (a.action === 'Leave home') return -1
    if (b.action === 'Leave home') return 1
    return a.time.getTime() - b.time.getTime()
  })
  const sortedEditedIndex = updated.findIndex(item => item.id === editedItemId)
  
  // Update travel item after this visit
  const travelIndex = updated.findIndex((item, idx) => idx > sortedEditedIndex && item.action === 'Travel')
  if (travelIndex !== -1 && editedItem.storeId) {
    const travelItem = updated[travelIndex]
    travelItem.time = new Date(newEndTime)
    
    // Find the next visit, operational item, or home arrival
    const nextItem = updated.find((item, idx) => idx > travelIndex && (item.action === 'Visit' || item.action === 'Arrive home' || item.isOperational))
    if (nextItem) {
      const store = storeMap.get(editedItem.storeId)
      if (store && (nextItem.action === 'Visit' || nextItem.action === 'Arrive home')) {
        let distance = 0
        if (nextItem.action === 'Visit' && nextItem.storeId) {
          const nextStore = storeMap.get(nextItem.storeId)
          if (nextStore) {
            distance = calculateDistance(store.latitude!, store.longitude!, nextStore.latitude!, nextStore.longitude!)
          }
        } else if (nextItem.action === 'Arrive home' && managerHome) {
          distance = calculateDistance(store.latitude!, store.longitude!, managerHome.latitude, managerHome.longitude)
        }
        
        if (distance > 0) {
          const travelTime = estimateTravelTime(distance)
          travelItem.travelTime = travelTime
          travelItem.travelDistance = distance
          
          // Update next item's start time
          nextItem.time = addMinutes(newEndTime, travelTime)
          if (nextItem.endTime) {
            const duration = nextItem.endTime.getTime() - nextItem.time.getTime()
            nextItem.endTime = addMinutes(nextItem.time, duration / 60000)
          }
          
          // Continue cascading updates for subsequent items
          let currentTime = nextItem.endTime || nextItem.time
          const nextItemIndex = updated.indexOf(nextItem)
          for (let i = nextItemIndex + 1; i < updated.length; i++) {
            const item = updated[i]
            if (item.action === 'Travel') {
              item.time = new Date(currentTime)
              if (item.travelTime) {
                currentTime = addMinutes(currentTime, item.travelTime)
              }
            } else {
              item.time = new Date(currentTime)
              if (item.endTime) {
                const duration = item.endTime.getTime() - item.time.getTime()
                item.endTime = addMinutes(currentTime, duration / 60000)
                currentTime = item.endTime
              } else {
                currentTime = item.time
              }
            }
          }
        }
      } else if (nextItem.isOperational) {
        // For operational items, just update the start time based on travel
        const travelTime = travelItem.travelTime || 0
        nextItem.time = addMinutes(newEndTime, travelTime)
        if (nextItem.endTime) {
          const duration = nextItem.endTime.getTime() - nextItem.time.getTime()
          nextItem.endTime = addMinutes(nextItem.time, duration / 60000)
        }
      }
    }
  }
  
  return updated.sort((a, b) => {
    if (a.action === 'Leave home') return -1
    if (b.action === 'Leave home') return 1
    return a.time.getTime() - b.time.getTime()
  })
}

export function RouteDirectionsModal({
  isOpen,
  onClose,
  stores,
  managerHome,
  managerName,
  plannedDate,
  managerUserId,
  region
}: RouteDirectionsModalProps) {
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([])
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingOpItemId, setEditingOpItemId] = useState<string | null>(null)
  const [addingOperational, setAddingOperational] = useState(false)
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [opItemTitle, setOpItemTitle] = useState('')
  const [opItemLocation, setOpItemLocation] = useState('')
  const [opItemStartTime, setOpItemStartTime] = useState('')
  const [opItemDuration, setOpItemDuration] = useState('60')
  const [completedVisitStoreIds, setCompletedVisitStoreIds] = useState<Set<string>>(new Set())
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || stores.length === 0) return

    setIsCalculating(true)
    
    const loadAndGenerateSchedule = async () => {
      // Load saved visit times, operational items, and completed visit markers first.
      let savedVisitTimes: { store_id: string; start_time: string; end_time: string; id: string }[] = []
      let savedOpItems: any[] = []
      let completedVisits: string[] = []
      
      if (managerUserId && plannedDate) {
        try {
          const [visitTimesResult, opItemsResult, completedResult] = await Promise.all([
            getRouteVisitTimes(managerUserId, plannedDate, region),
            getRouteOperationalItems(managerUserId, plannedDate, region),
            getCompletedRouteVisits(managerUserId, plannedDate, region, stores.map((store) => store.id)),
          ])
          
          if (visitTimesResult.data) {
            savedVisitTimes = visitTimesResult.data
          }
          if (opItemsResult.data) {
            savedOpItems = opItemsResult.data
          }
          if (completedResult.data) {
            completedVisits = completedResult.data
          }
        } catch (error) {
          console.error('Error loading saved data:', error)
        }
      }

      setCompletedVisitStoreIds(new Set(completedVisits))
    
    // Filter stores that have coordinates
    const storesWithCoords = stores.filter(s => s.latitude && s.longitude)
    
    if (storesWithCoords.length === 0) {
      setIsCalculating(false)
      return
    }

      // Create a map of saved visit times by store ID
      const visitTimeMap = new Map(savedVisitTimes.map(vt => [vt.store_id, vt]))

    // Calculate route segments
    const segments: RouteSegment[] = []
    const scheduleItems: ScheduleItem[] = []
    
      // First store always starts at 09:00 (ignore saved visit times for first store)
      let firstVisitTime: Date
      firstVisitTime = new Date(`${plannedDate}T09:00:00`)
      
      let currentTime = firstVisitTime

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

      // Calculate when to leave home - use firstVisitTime instead of currentTime
      const leaveHomeTime = new Date(firstVisitTime.getTime() - travelTime * 60000)
      scheduleItems.push({
        id: `leave-home-${Date.now()}`,
        time: leaveHomeTime,
        action: 'Leave home',
        location: managerHome.address,
        travelTime,
        travelDistance: distance
      })
    }

    // Process each store
    storesWithCoords.forEach((store, index) => {
        // Check if we have a saved visit time for this store
        const savedVisitTime = visitTimeMap.get(store.id)
        let visitStartTime: Date
        let visitEndTime: Date
        
        if (savedVisitTime) {
          // Use saved visit time
          const baseDate = new Date(plannedDate)
          const [startHours, startMinutes] = savedVisitTime.start_time.split(':').map(Number)
          const [endHours, endMinutes] = savedVisitTime.end_time.split(':').map(Number)
          
          visitStartTime = new Date(baseDate)
          visitStartTime.setHours(startHours, startMinutes, 0, 0)
          
          visitEndTime = new Date(baseDate)
          visitEndTime.setHours(endHours, endMinutes, 0, 0)
          
          // Update currentTime to the saved visit end time
          currentTime = visitEndTime
        } else {
          // Default to 2 hours from current time
          visitStartTime = new Date(currentTime)
          visitEndTime = addHours(currentTime, 2)
          currentTime = visitEndTime
        }
        
      scheduleItems.push({
          id: `visit-${store.id}-${index}`,
          time: visitStartTime,
        endTime: visitEndTime,
        action: 'Visit',
          location: store.store_name,
          storeId: store.id,
          visitTimeId: savedVisitTime?.id
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

          // Check if next store has a saved visit time
          const nextSavedVisitTime = visitTimeMap.get(nextStore.id)
          let travelStartTime = visitEndTime
          
          if (nextSavedVisitTime) {
            // Calculate travel start time to arrive at saved visit time
            const baseDate = new Date(plannedDate)
            const [nextStartHours, nextStartMinutes] = nextSavedVisitTime.start_time.split(':').map(Number)
            const nextVisitStart = new Date(baseDate)
            nextVisitStart.setHours(nextStartHours, nextStartMinutes, 0, 0)
            
            // Travel should start so we arrive at the saved visit time
            travelStartTime = new Date(nextVisitStart.getTime() - travelTime * 60000)
            currentTime = nextVisitStart
          } else {
            // Normal flow
            travelStartTime = visitEndTime
            currentTime = addMinutes(visitEndTime, travelTime)
          }

        // Add travel time entry
        scheduleItems.push({
            id: `travel-${store.id}-${nextStore.id}-${index}`,
            time: travelStartTime,
          action: 'Travel',
          location: `${fromStoreName} → ${toStoreName}`,
          travelTime,
          travelDistance: distance
        })
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
            id: `travel-${store.id}-home-${index}`,
            time: visitEndTime,
            action: 'Travel',
            location: `${fromStoreName} → Home`,
            travelTime,
            travelDistance: distance
          })

          const arriveHomeTime = addMinutes(visitEndTime, travelTime)
          scheduleItems.push({
            id: `arrive-home-${Date.now()}`,
            time: arriveHomeTime,
            action: 'Arrive home',
            location: managerHome.address
          })
        }
      }
    })

        // Add operational items from database
        if (savedOpItems.length > 0) {
          const baseDate = new Date(plannedDate)
          savedOpItems.forEach(item => {
            const [hours, minutes] = item.start_time.split(':').map(Number)
            const startTime = new Date(baseDate)
            startTime.setHours(hours, minutes, 0, 0)
            const endTime = addMinutes(startTime, item.duration_minutes)

            scheduleItems.push({
              id: `operational-${item.id}`,
              dbId: item.id,
              time: startTime,
              endTime: endTime,
              action: item.title,
              location: item.location || '',
              isOperational: true
            })
          })
        }

        // If no operational items, keep items in store order (already added in correct order)
        // If operational items exist, sort by time to interleave them correctly
        if (savedOpItems.length > 0) {
          // Sort all items by time, but ensure "Leave home" is always first
          scheduleItems.sort((a, b) => {
            // Always put "Leave home" first
            if (a.action === 'Leave home') return -1
            if (b.action === 'Leave home') return 1
            // Otherwise sort by time
            return a.time.getTime() - b.time.getTime()
          })
        } else {
          // No operational items - keep items in store order (already correct from forEach loop)
          // Just ensure "Leave home" is first by moving it to the front
          const leaveHomeIndex = scheduleItems.findIndex(item => item.action === 'Leave home')
          if (leaveHomeIndex > 0) {
            const leaveHomeItem = scheduleItems.splice(leaveHomeIndex, 1)[0]
            scheduleItems.unshift(leaveHomeItem)
          }
        }

        // Recalculate travel segments to ensure correct positioning
        // This ensures travel segments appear right after their origin visits
        const storeMapForRecalc = new Map(storesWithCoords.map(s => [s.id, s]))
        
        for (let i = 0; i < scheduleItems.length; i++) {
          const item = scheduleItems[i]
          
          if (item.action === 'Travel' && item.id.startsWith('travel-')) {
            // Parse travel segment ID: travel-{fromStoreId}-{toStoreId}-{index}
            // Store IDs are UUIDs (with dashes), so we need to extract them correctly
            let fromStoreId: string | null = null
            let toStoreId: string | null = null
            
            if (item.id.includes('-home')) {
              // Travel to home: travel-{storeId}-home-{index}
              // Extract everything between 'travel-' and '-home'
              const match = item.id.match(/^travel-(.+)-home-\d+$/)
              if (match) {
                fromStoreId = match[1]
              }
            } else {
              // Travel between stores: travel-{fromStoreId}-{toStoreId}-{index}
              // Extract the two UUIDs before the final index
              // UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with dashes)
              const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g
              const uuids = item.id.match(uuidPattern)
              if (uuids && uuids.length >= 2) {
                fromStoreId = uuids[0]
                toStoreId = uuids[1]
              }
            }
            
            const fromVisit = fromStoreId 
              ? scheduleItems.find(si => si.action === 'Visit' && si.storeId === fromStoreId)
              : null
            
            const toVisit = toStoreId 
              ? scheduleItems.find(si => si.action === 'Visit' && si.storeId === toStoreId)
              : null
            
            if (fromVisit && fromVisit.endTime) {
              if (toVisit && toVisit.storeId) {
                const fromStore = storeMapForRecalc.get(fromStoreId!)
                const toStore = storeMapForRecalc.get(toVisit.storeId)
                
                if (fromStore && toStore) {
                  const distance = calculateDistance(
                    fromStore.latitude!,
                    fromStore.longitude!,
                    toStore.latitude!,
                    toStore.longitude!
                  )
                  const travelTime = estimateTravelTime(distance)
                  
                  item.travelTime = travelTime
                  item.travelDistance = distance
                  
                  // Travel starts when origin visit ends
                  const fromVisitEndTime = fromVisit.endTime.getTime()
                  let earliestTravelStart = fromVisitEndTime
                  
                  // Check for operational items between origin and destination
                  for (const opItem of scheduleItems) {
                    if (opItem.isOperational) {
                      const opStart = opItem.time.getTime()
                      const opEnd = opItem.endTime ? opItem.endTime.getTime() : opStart
                      if (opStart >= fromVisitEndTime && opStart < toVisit.time.getTime()) {
                        if (opEnd > earliestTravelStart) {
                          earliestTravelStart = opEnd
                        }
                      }
                    }
                  }
                  
                  item.time = new Date(earliestTravelStart)
                }
              } else if (managerHome && item.location.includes('Home')) {
                const fromStore = storeMapForRecalc.get(fromStoreId!)
                if (fromStore) {
                  const distance = calculateDistance(
                    fromStore.latitude!,
                    fromStore.longitude!,
                    managerHome.latitude,
                    managerHome.longitude
                  )
                  const travelTime = estimateTravelTime(distance)
                  item.travelTime = travelTime
                  item.travelDistance = distance
                  item.time = new Date(fromVisit.endTime)
                }
              }
            }
          }
        }
        
        // Final sort - only sort by time if there are operational items
        // If no operational items, keep items in store order (travel recalculation preserves order)
        if (savedOpItems.length > 0) {
          // Sort all items by time, but ensure "Leave home" is always first
          scheduleItems.sort((a, b) => {
            if (a.action === 'Leave home') return -1
            if (b.action === 'Leave home') return 1
            return a.time.getTime() - b.time.getTime()
          })
        } else {
          // No operational items - keep items in store order (travel recalculation preserves order)
          // Just ensure "Leave home" is first by moving it to the front
          const leaveHomeIndex = scheduleItems.findIndex(item => item.action === 'Leave home')
          if (leaveHomeIndex > 0) {
            const leaveHomeItem = scheduleItems.splice(leaveHomeIndex, 1)[0]
            scheduleItems.unshift(leaveHomeItem)
          }
        }
        
        // Now recalculate travel segments to ensure correct positioning after all items are added
        console.log('=== INITIAL LOAD: RECALCULATING TRAVEL SEGMENTS ===', {
          totalItems: scheduleItems.length,
          travelItems: scheduleItems.filter(si => si.action === 'Travel').length
        })
        
        const storeMapForInitialRecalc = new Map(storesWithCoords.map(s => [s.id, s]))
        
        for (let i = 0; i < scheduleItems.length; i++) {
          const item = scheduleItems[i]
          
          if (item.action === 'Travel' && item.id.startsWith('travel-')) {
            console.log(`Processing travel segment ${i}:`, {
              id: item.id,
              location: item.location,
              currentTime: format(item.time, 'HH:mm')
            })
            
            // Parse travel segment ID: travel-{fromStoreId}-{toStoreId}-{index}
            // Store IDs are UUIDs (with dashes), so we need to extract them correctly
            let fromStoreId: string | null = null
            let toStoreId: string | null = null
            
            if (item.id.includes('-home')) {
              // Travel to home: travel-{storeId}-home-{index}
              // Extract everything between 'travel-' and '-home'
              const match = item.id.match(/^travel-(.+)-home-\d+$/)
              if (match) {
                fromStoreId = match[1]
              }
            } else {
              // Travel between stores: travel-{fromStoreId}-{toStoreId}-{index}
              // Extract the two UUIDs before the final index
              // UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with dashes)
              const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g
              const uuids = item.id.match(uuidPattern)
              if (uuids && uuids.length >= 2) {
                fromStoreId = uuids[0]
                toStoreId = uuids[1]
              }
            }
            
            console.log('  Parsed IDs:', { fromStoreId, toStoreId })
            
            const fromVisit = fromStoreId 
              ? scheduleItems.find(si => si.action === 'Visit' && si.storeId === fromStoreId)
              : null
            
            const toVisit = toStoreId 
              ? scheduleItems.find(si => si.action === 'Visit' && si.storeId === toStoreId)
              : null
            
            console.log('  Found visits:', {
              fromVisit: fromVisit ? `${fromVisit.location} (${format(fromVisit.time, 'HH:mm')} - ${fromVisit.endTime ? format(fromVisit.endTime, 'HH:mm') : 'N/A'})` : 'NOT FOUND',
              toVisit: toVisit ? `${toVisit.location} (${format(toVisit.time, 'HH:mm')} - ${toVisit.endTime ? format(toVisit.endTime, 'HH:mm') : 'N/A'})` : 'NOT FOUND'
            })
            
            if (fromVisit && fromVisit.endTime) {
              if (toVisit && toVisit.storeId) {
                const fromStore = storeMapForInitialRecalc.get(fromStoreId!)
                const toStore = storeMapForInitialRecalc.get(toVisit.storeId)
                
                if (fromStore && toStore) {
                  const distance = calculateDistance(
                    fromStore.latitude!,
                    fromStore.longitude!,
                    toStore.latitude!,
                    toStore.longitude!
                  )
                  const travelTime = estimateTravelTime(distance)
                  
                  item.travelTime = travelTime
                  item.travelDistance = distance
                  
                  // Update location string
                  const fromStoreName = fromStore.postcode 
                    ? `${fromStore.store_name} (${fromStore.postcode})`
                    : fromStore.store_name
                  const toStoreName = toStore.postcode
                    ? `${toStore.store_name} (${toStore.postcode})`
                    : toStore.store_name
                  item.location = `${fromStoreName} → ${toStoreName}`
                  
                  // Travel starts when origin visit ends
                  const fromVisitEndTime = fromVisit.endTime.getTime()
                  let earliestTravelStart = fromVisitEndTime
                  
                  // Check for operational items
                  for (const opItem of scheduleItems) {
                    if (opItem.isOperational) {
                      const opStart = opItem.time.getTime()
                      const opEnd = opItem.endTime ? opItem.endTime.getTime() : opStart
                      if (opStart >= fromVisitEndTime && opStart < toVisit.time.getTime()) {
                        if (opEnd > earliestTravelStart) {
                          earliestTravelStart = opEnd
                        }
                      }
                    }
                  }
                  
                  item.time = new Date(earliestTravelStart)
                  
                  console.log(`  Updated travel time from ${format(new Date(fromVisitEndTime), 'HH:mm')} to ${format(item.time, 'HH:mm')}`)
                }
              } else if (managerHome && item.location.includes('Home')) {
                const fromStore = storeMapForInitialRecalc.get(fromStoreId!)
                if (fromStore) {
                  const distance = calculateDistance(
                    fromStore.latitude!,
                    fromStore.longitude!,
                    managerHome.latitude,
                    managerHome.longitude
                  )
                  const travelTime = estimateTravelTime(distance)
                  item.travelTime = travelTime
                  item.travelDistance = distance
                  item.time = new Date(fromVisit.endTime)
                }
              }
            }
          }
        }
        
        // Final sort again after recalculation
        scheduleItems.sort((a, b) => {
          if (a.action === 'Leave home') return -1
          if (b.action === 'Leave home') return 1
          return a.time.getTime() - b.time.getTime()
    })

    setRouteSegments(segments)
    setSchedule(scheduleItems)
    setIsCalculating(false)
      }

      loadAndGenerateSchedule()
    }, [isOpen, stores, managerHome, plannedDate, managerUserId, region])

  const handleEditVisit = (item: ScheduleItem) => {
    setEditingItemId(item.id)
    setEditStartTime(format(item.time, 'HH:mm'))
    setEditEndTime(item.endTime ? format(item.endTime, 'HH:mm') : '')
  }

  const handleSaveEdit = async () => {
    if (!editingItemId || !managerUserId) return
    
    const item = schedule.find(s => s.id === editingItemId)
    if (!item || !item.storeId) return
    
    const [startHours, startMinutes] = editStartTime.split(':').map(Number)
    const [endHours, endMinutes] = editEndTime.split(':').map(Number)
    
    const baseDate = new Date(plannedDate)
    const newStartTime = new Date(baseDate)
    newStartTime.setHours(startHours, startMinutes, 0, 0)
    
    const newEndTime = new Date(baseDate)
    newEndTime.setHours(endHours, endMinutes, 0, 0)
    
    // Save visit time to database
    const startTimeStr = `${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`
    const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
    
    const { data: savedVisitTime, error } = await saveRouteVisitTime(
      managerUserId,
      plannedDate,
      region,
      item.storeId,
      startTimeStr,
      endTimeStr
    )

    if (error) {
      alert(`Error saving visit time: ${error}`)
      return
    }
    
    const updated = recalculateScheduleAfterEdit(schedule, editingItemId, newStartTime, newEndTime, stores, managerHome)
    
    // Update the visit item with the database ID
    if (savedVisitTime) {
      const visitItem = updated.find(s => s.id === editingItemId)
      if (visitItem) {
        visitItem.visitTimeId = savedVisitTime.id
      }
    }
    
    setSchedule(updated)
    setEditingItemId(null)
    setEditStartTime('')
    setEditEndTime('')
  }

  const handleAddOperational = async () => {
    if (!opItemTitle || !opItemStartTime || !opItemDuration || !managerUserId) return
    
    const [hours, minutes] = opItemStartTime.split(':').map(Number)
    const duration = parseInt(opItemDuration)
    
    const baseDate = new Date(plannedDate)
    const startTime = new Date(baseDate)
    startTime.setHours(hours, minutes, 0, 0)
    
    const endTime = addMinutes(startTime, duration)
    
    // Save to database
    const startTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    const { data: savedItem, error } = await saveRouteOperationalItem(
      managerUserId,
      plannedDate,
      region,
      opItemTitle,
      opItemLocation || null,
      startTimeStr,
      duration
    )

    if (error) {
      alert(`Error saving operational item: ${error}`)
      return
    }

    if (!savedItem) return
    
    const newItem: ScheduleItem = {
      id: `operational-${savedItem.id}`,
      dbId: savedItem.id,
      time: startTime,
      endTime: endTime,
      action: opItemTitle,
      location: opItemLocation || '',
      isOperational: true
    }
    
    // Deep clone schedule and add new item
    const updated: ScheduleItem[] = schedule.map(item => ({
      ...item,
      time: new Date(item.time),
      endTime: item.endTime ? new Date(item.endTime) : undefined
    }))
    updated.push(newItem)
    
    // Sort by time, but ensure "Leave home" is always first
    updated.sort((a, b) => {
      if (a.action === 'Leave home') return -1
      if (b.action === 'Leave home') return 1
      return a.time.getTime() - b.time.getTime()
    })
    
    const opStart = startTime.getTime()
    const opEnd = endTime.getTime()
    
    // Find items that overlap with the operational item
    const overlappingItems: ScheduleItem[] = []
    updated.forEach(item => {
      if (item.id === newItem.id || item.isOperational) return // Skip the operational item itself and other operational items
      
      const itemStart = item.time.getTime()
      const itemEnd = item.endTime ? item.endTime.getTime() : itemStart + 60000 // Default 1 min if no endTime
      
      // Check if items overlap
      if (itemStart < opEnd && itemEnd > opStart) {
        overlappingItems.push(item)
      }
    })
    
    // Shift overlapping items to start after the operational item ends
    if (overlappingItems.length > 0) {
      let currentTime = endTime
      
      // Sort overlapping items by their original start time
      overlappingItems.sort((a, b) => a.time.getTime() - b.time.getTime())
      
      // Save shifted visit times to database
      const visitTimeUpdates: Promise<any>[] = []
      
      overlappingItems.forEach(item => {
        // Preserve the duration of the item
        const itemDuration = item.endTime 
          ? item.endTime.getTime() - item.time.getTime() 
          : (item.action === 'Visit' ? 120 * 60000 : (item.action === 'Travel' && item.travelTime ? item.travelTime * 60000 : 0))
        
        if (item.action === 'Travel') {
          // For travel items, update the start time
          item.time = new Date(currentTime)
          if (item.travelTime) {
            currentTime = addMinutes(currentTime, item.travelTime)
          }
        } else if (item.action === 'Visit' && item.storeId) {
          // For visits, shift to start after operational item (or after previous shifted item)
          const newStartTime = new Date(currentTime)
          const newEndTime = addMinutes(currentTime, itemDuration / 60000)
          
          item.time = newStartTime
          item.endTime = newEndTime
          currentTime = newEndTime
          
          // Save the shifted visit time to database
          if (managerUserId) {
            const startTimeStr = format(newStartTime, 'HH:mm')
            const endTimeStr = format(newEndTime, 'HH:mm')
            visitTimeUpdates.push(
              saveRouteVisitTime(managerUserId, plannedDate, region, item.storeId, startTimeStr, endTimeStr)
            )
          }
        } else {
          // For other items, shift to start after operational item
          item.time = new Date(currentTime)
          if (item.endTime) {
            item.endTime = addMinutes(currentTime, itemDuration / 60000)
            currentTime = item.endTime
          } else {
            currentTime = item.time
          }
        }
      })
      
      // Wait for all visit time updates to complete
      if (visitTimeUpdates.length > 0) {
        await Promise.all(visitTimeUpdates)
      }
      
      // Update travel items after shifted visits - ensure "Leave home" is always first
      updated.sort((a, b) => {
        if (a.action === 'Leave home') return -1
        if (b.action === 'Leave home') return 1
        return a.time.getTime() - b.time.getTime()
      })
      const storesWithCoords = stores.filter(s => s.latitude && s.longitude)
      const storeMap = new Map(storesWithCoords.map(s => [s.id, s]))
      
      // Update travel items that come after shifted visits
      overlappingItems.forEach(item => {
        if (item.action === 'Visit' && item.endTime) {
          const itemIndex = updated.indexOf(item)
          const travelAfterIndex = updated.findIndex((si, idx) => 
            idx > itemIndex && si.action === 'Travel'
          )
          
          if (travelAfterIndex !== -1) {
            const travelAfter = updated[travelAfterIndex]
            travelAfter.time = item.endTime
            
            // Recalculate travel time if next item is a visit
            const nextItemIndex = updated.findIndex((si, idx) => 
              idx > travelAfterIndex && (si.action === 'Visit' || si.action === 'Arrive home')
            )
            
            if (nextItemIndex !== -1 && item.storeId) {
              const nextItem = updated[nextItemIndex]
              const store = storeMap.get(item.storeId)
              
              if (store) {
                let distance = 0
                if (nextItem.action === 'Visit' && nextItem.storeId) {
                  const nextStore = storeMap.get(nextItem.storeId)
                  if (nextStore) {
                    distance = calculateDistance(
                      store.latitude!,
                      store.longitude!,
                      nextStore.latitude!,
                      nextStore.longitude!
                    )
                  }
                } else if (nextItem.action === 'Arrive home' && managerHome) {
                  distance = calculateDistance(
                    store.latitude!,
                    store.longitude!,
                    managerHome.latitude,
                    managerHome.longitude
                  )
                }
                
                if (distance > 0) {
                  const travelTime = estimateTravelTime(distance)
                  travelAfter.travelTime = travelTime
                  travelAfter.travelDistance = distance
                  nextItem.time = addMinutes(item.endTime, travelTime)
                  if (nextItem.endTime) {
                    const duration = nextItem.endTime.getTime() - nextItem.time.getTime()
                    nextItem.endTime = addMinutes(nextItem.time, duration / 60000)
                  }
                }
              }
            }
          }
        }
      })
    }
    
    // Final sort
    updated.sort((a, b) => a.time.getTime() - b.time.getTime())
    setSchedule(updated)
    setAddingOperational(false)
    setOpItemTitle('')
    setOpItemLocation('')
    setOpItemStartTime('')
    setOpItemDuration('60')
  }

  const totalTravelDistance = schedule.reduce((total, item) => {
    const isCountedTravel = item.action === 'Travel' || item.action === 'Leave home'
    if (!isCountedTravel || !item.travelDistance) return total
    return total + item.travelDistance
  }, 0)
  const totalTravelMinutes = schedule.reduce((total, item) => {
    const isCountedTravel = item.action === 'Travel' || item.action === 'Leave home'
    if (!isCountedTravel || !item.travelTime) return total
    return total + item.travelTime
  }, 0)
  const visitCount = schedule.filter((item) => item.action === 'Visit').length
  const operationalCount = schedule.filter((item) => item.isOperational).length
  const routeStart = schedule.length > 0 ? schedule[0].time : null
  const lastScheduleItem = schedule.length > 0 ? schedule[schedule.length - 1] : null
  const routeEnd = lastScheduleItem ? lastScheduleItem.endTime || lastScheduleItem.time : null
  const routeWindow = routeStart && routeEnd ? `${format(routeStart, 'HH:mm')} - ${format(routeEnd, 'HH:mm')}` : 'Not set'
  const missingCoordinatesCount = stores.filter((store) => !store.latitude || !store.longitude).length
  const visitItems = schedule.filter((item) => item.action === 'Visit' && item.storeId)
  const nextPendingVisit = visitItems.find((item) => item.storeId && !completedVisitStoreIds.has(item.storeId))
  const quickActionStoreId = nextPendingVisit?.storeId || visitItems[0]?.storeId || null

  const handleMarkVisitComplete = async (storeId: string) => {
    if (!managerUserId || !plannedDate) {
      alert('Route context is missing. Please close and reopen route directions.')
      return
    }

    setQuickActionLoading(`complete-${storeId}`)
    const result = await markRouteVisitComplete(storeId, managerUserId, plannedDate, region)
    setQuickActionLoading(null)

    if (!result.success) {
      alert(result.error || 'Failed to mark this visit complete.')
      return
    }

    setCompletedVisitStoreIds((prev) => {
      const next = new Set(prev)
      next.add(storeId)
      return next
    })
  }

  const openMapsRoute = () => {
    const remainingStores = stores
      .filter((store) => store.latitude && store.longitude)
      .filter((store) => !completedVisitStoreIds.has(store.id))

    if (remainingStores.length === 0) {
      alert('No remaining route stops with coordinates.')
      return
    }

    const destination = remainingStores[remainingStores.length - 1]
    const waypointStores = remainingStores.slice(0, -1)
    const waypoints = waypointStores.map((store) => `${store.latitude},${store.longitude}`).join('|')
    const origin = managerHome && managerHome.latitude && managerHome.longitude
      ? `${managerHome.latitude},${managerHome.longitude}`
      : undefined

    const params = new URLSearchParams({
      api: '1',
      destination: `${destination.latitude},${destination.longitude}`,
      travelmode: 'driving',
    })

    if (origin) {
      params.set('origin', origin)
    }
    if (waypoints) {
      params.set('waypoints', waypoints)
    }

    window.open(`https://www.google.com/maps/dir/?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  if (!isOpen) return null

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!inset-[2vh_2vw] !h-auto !max-h-none !w-auto !max-w-none !overflow-y-auto !translate-x-0 !translate-y-0 border border-slate-200 p-0 data-[state=open]:animate-none data-[state=closed]:animate-none">
        <div className="min-h-full flex flex-col bg-white">
          <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-4 pb-4 pt-4 sm:px-6">
            <div className="space-y-3 pr-12 md:pr-0">
              <DialogTitle className="flex items-start gap-3 text-lg md:text-xl">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <RouteIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate">Route Directions</span>
                  <span className="block text-sm font-medium text-slate-600">{managerName}</span>
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs md:text-sm text-slate-600">
                Planned for {format(new Date(plannedDate), 'EEEE, dd MMMM yyyy')}
              </DialogDescription>
              {schedule.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      const icsContent = generateICS(schedule, managerName, plannedDate, stores)
                      const filename = `route-${managerName.replace(/\s+/g, '-')}-${plannedDate}.ics`
                      downloadICS(icsContent, filename)
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-slate-300 bg-white min-h-[40px]"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <Download className="h-4 w-4" />
                    <span>Download Calendar</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingOpItemId(null)
                      setOpItemTitle('')
                      setOpItemLocation('')
                      setOpItemStartTime('')
                      setOpItemDuration('60')
                      setAddingOperational(true)
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-slate-300 bg-white min-h-[40px]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Operational Item</span>
                  </Button>
                </div>
              )}
            </div>

            {schedule.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Visits</p>
                  <p className="text-sm font-bold text-slate-900">{visitCount}</p>
                  <p className="text-[10px] text-slate-500">{operationalCount} operational</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Travel</p>
                  <p className="text-sm font-bold text-blue-900">{totalTravelDistance.toFixed(1)} mi</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Drive Time</p>
                  <p className="text-sm font-bold text-amber-900">{totalTravelMinutes} mins</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Route Window</p>
                  <p className="text-sm font-bold text-emerald-900">{routeWindow}</p>
                </div>
              </div>
            )}
          </DialogHeader>

          {schedule.length > 0 && (
            <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-6 md:hidden">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Mobile Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="min-h-[40px] bg-blue-600 hover:bg-blue-700"
                  onClick={openMapsRoute}
                >
                  <Navigation className="mr-1.5 h-3.5 w-3.5" />
                  Start Route
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[40px]"
                  disabled={!nextPendingVisit?.storeId || quickActionLoading === `complete-${nextPendingVisit?.storeId}`}
                  onClick={() => {
                    if (nextPendingVisit?.storeId) {
                      handleMarkVisitComplete(nextPendingVisit.storeId)
                    }
                  }}
                >
                  {quickActionLoading === `complete-${nextPendingVisit?.storeId}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Mark Next
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[40px]"
                  disabled={!quickActionStoreId}
                  onClick={() => {
                    if (quickActionStoreId) {
                      window.location.href = `/audit-tracker?storeId=${quickActionStoreId}`
                    }
                  }}
                >
                  <ClipboardPlus className="mr-1.5 h-3.5 w-3.5" />
                  Add Evidence
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[40px]"
                  disabled={!quickActionStoreId}
                  onClick={() => {
                    if (quickActionStoreId) {
                      window.location.href = `/incidents/new?storeId=${quickActionStoreId}`
                    }
                  }}
                >
                  <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                  Log Issue
                </Button>
              </div>
            </div>
          )}

          {isCalculating ? (
            <div className="flex flex-1 items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-slate-600">Calculating route...</span>
            </div>
          ) : (
            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-4 lg:space-y-0 xl:grid-cols-[minmax(0,1fr)_400px]">
                {/* Schedule Timeline */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex lg:flex-col">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <h3 className="font-semibold text-sm md:text-base text-slate-900 flex items-center gap-2">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      Schedule
                    </h3>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {schedule.length} items
                    </span>
                  </div>
                  <div className="space-y-2.5 p-3 sm:p-4">
                    {schedule.map((item) => {
                      const isHomeAction = item.action.includes('Leave') || item.action.includes('Arrive home')
                      const isVisitAction = item.action === 'Visit'
                      const isTravelAction = item.action === 'Travel'
                      const cardClass = isHomeAction
                        ? 'border-blue-200 bg-blue-50/70'
                        : isVisitAction
                        ? 'border-emerald-200 bg-emerald-50/70'
                        : isTravelAction
                        ? 'border-amber-200 bg-amber-50/70'
                        : 'border-violet-200 bg-violet-50/70'
                      const badgeClass = isHomeAction
                        ? 'border-blue-200 bg-blue-100 text-blue-700'
                        : isVisitAction
                        ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                        : isTravelAction
                        ? 'border-amber-200 bg-amber-100 text-amber-700'
                        : 'border-violet-200 bg-violet-100 text-violet-700'
                      const typeLabel = isHomeAction ? 'Home' : isVisitAction ? 'Visit' : isTravelAction ? 'Travel' : 'Operational'
                      const actionLabel = isVisitAction
                        ? `${item.location} Visit`
                        : isTravelAction
                        ? `Travel: ${item.location}`
                        : item.action
                      const isVisitCompleted = !!item.storeId && completedVisitStoreIds.has(item.storeId)

                      return (
                        <div key={item.id} className={`rounded-xl border p-3 shadow-sm ${cardClass}`}>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                                  {item.endTime ? `${format(item.time, 'HH:mm')} - ${format(item.endTime, 'HH:mm')}` : format(item.time, 'HH:mm')}
                                </span>
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
                                  {typeLabel}
                                </span>
                              </div>
                              <p className="mt-2 text-sm font-semibold text-slate-900 break-words">{actionLabel}</p>
                              {isVisitAction && (
                                <div className="mt-1">
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                      isVisitCompleted
                                        ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                        : 'border-amber-200 bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {isVisitCompleted ? 'Completed' : 'Pending'}
                                  </span>
                                </div>
                              )}
                              {item.action !== 'Travel' && item.location && (
                                <div className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">
                                  {item.action.includes('home') ? (
                                    <Home className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                  )}
                                  <span className="break-words">{item.location}</span>
                                </div>
                              )}
                              {item.travelTime && (
                                <div className="mt-1 text-xs font-medium text-slate-600">
                                  {item.travelDistance?.toFixed(1)} miles • {item.travelTime} minutes
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 self-end sm:self-auto">
                              {item.action === 'Visit' && (
                                <>
                                  <Button
                                    onClick={() => {
                                      if (item.storeId) {
                                        handleMarkVisitComplete(item.storeId)
                                      }
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    disabled={!item.storeId || isVisitCompleted || quickActionLoading === `complete-${item.storeId}`}
                                    className="h-8 px-2 rounded-lg hover:bg-white/80 text-emerald-700 disabled:text-slate-400"
                                    title={isVisitCompleted ? 'Visit completed' : 'Mark visit complete'}
                                  >
                                    {quickActionLoading === `complete-${item.storeId}` ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    onClick={() => handleEditVisit(item)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-white/80"
                                    title="Edit times"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {item.isOperational && (
                                <>
                                  <Button
                                    onClick={() => {
                                      setEditingOpItemId(item.id)
                                      setOpItemTitle(item.action)
                                      setOpItemLocation(item.location)
                                      setOpItemStartTime(format(item.time, 'HH:mm'))
                                      setOpItemDuration(String(Math.round((item.endTime!.getTime() - item.time.getTime()) / 60000)))
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-white/80"
                                    title="Edit operational item"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={async () => {
                                      if (!item.dbId) return
                                      if (!confirm(`Are you sure you want to delete "${item.action}"?`)) return

                                      const { error } = await deleteRouteOperationalItem(item.dbId)
                                      if (error) {
                                        alert(`Error deleting operational item: ${error}`)
                                        return
                                      }

                                      setSchedule(prev => prev.filter(s => s.id !== item.id))
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Delete operational item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <div className="space-y-5 lg:sticky lg:top-0 lg:pr-1">
                  {/* Route Map */}
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                      <h3 className="font-semibold text-sm md:text-base text-slate-900 flex items-center gap-2">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        Route Map
                      </h3>
                    </div>
                    <div className="h-[280px] sm:h-[320px] lg:h-[360px]">
                      <RouteMapComponent stores={stores} managerHome={managerHome} />
                    </div>
                  </section>

                  {/* Route Segments */}
                  {routeSegments.length > 0 && (
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                        <h3 className="font-semibold text-sm md:text-base text-slate-900">Route Details</h3>
                      </div>
                      <div className="space-y-2 p-3 sm:p-4">
                        {routeSegments.map((segment, index) => (
                          <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                            <p className="text-sm font-medium text-slate-900 break-words">{segment.from} → {segment.to}</p>
                            <p className="mt-1 text-xs text-slate-600">{segment.distance.toFixed(1)} miles • {segment.duration} minutes</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {missingCoordinatesCount > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                      <p className="text-sm text-amber-800">
                        {missingCoordinatesCount} store(s) are missing coordinates and were excluded from route calculation.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
            <Button onClick={onClose} className="w-full sm:w-auto min-h-[44px]">Close</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

      {/* Edit Visit Times Dialog */}
      <Dialog open={!!editingItemId} onOpenChange={(open) => !open && setEditingItemId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Visit Times</DialogTitle>
            <DialogDescription>
              Update the start and end times for this visit. Travel times will be recalculated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItemId(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Operational Item Dialog */}
      <Dialog open={addingOperational || !!editingOpItemId} onOpenChange={(open) => {
        if (!open) {
          setAddingOperational(false)
          setEditingOpItemId(null)
          setOpItemTitle('')
          setOpItemLocation('')
          setOpItemStartTime('')
          setOpItemDuration('60')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOpItemId ? 'Edit Operational Item' : 'Add Operational Item'}</DialogTitle>
            <DialogDescription>
              {editingOpItemId 
                ? 'Update the operational item details.'
                : 'Add an operational task or activity to the schedule (e.g., meetings, breaks, etc.)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="op-title">Title *</Label>
              <Input
                id="op-title"
                value={opItemTitle}
                onChange={(e) => setOpItemTitle(e.target.value)}
                placeholder="e.g., Team Meeting"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="op-location">Location</Label>
              <Input
                id="op-location"
                value={opItemLocation}
                onChange={(e) => setOpItemLocation(e.target.value)}
                placeholder="Optional location"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="op-start-time">Start Time *</Label>
              <Input
                id="op-start-time"
                type="time"
                value={opItemStartTime}
                onChange={(e) => setOpItemStartTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="op-duration">Duration (minutes) *</Label>
              <Input
                id="op-duration"
                type="number"
                value={opItemDuration}
                onChange={(e) => setOpItemDuration(e.target.value)}
                min="1"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddingOperational(false)
              setEditingOpItemId(null)
              setOpItemTitle('')
              setOpItemLocation('')
              setOpItemStartTime('')
              setOpItemDuration('60')
            }}>Cancel</Button>
            <Button onClick=            {async () => {
              if (editingOpItemId) {
                // Edit existing operational item
                const item = schedule.find(s => s.id === editingOpItemId)
                if (!item || !item.dbId || !managerUserId) return

                const [hours, minutes] = opItemStartTime.split(':').map(Number)
                const duration = parseInt(opItemDuration)
                const startTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

                const { error } = await updateRouteOperationalItem(
                  item.dbId,
                  opItemTitle,
                  opItemLocation || null,
                  startTimeStr,
                  duration
                )

                if (error) {
                  alert(`Error updating operational item: ${error}`)
                  return
                }

                // After updating operational item, regenerate the entire schedule from database
                // This ensures items that were shifted by the old time shift back correctly,
                // and items overlapping with the new time shift forward correctly
                setIsCalculating(true)
                
                try {
                  // Load all saved data
                  const [visitTimesResult, opItemsResult] = await Promise.all([
                    getRouteVisitTimes(managerUserId, plannedDate, region),
                    getRouteOperationalItems(managerUserId, plannedDate, region)
                  ])
                  
                  const savedVisitTimes = visitTimesResult.data || []
                  const savedOpItems = opItemsResult.data || []
                  
                  // Filter stores that have coordinates
                  const storesWithCoords = stores.filter(s => s.latitude && s.longitude)
                  
                  if (storesWithCoords.length === 0) {
                    setIsCalculating(false)
                    return
                  }

                  // Create a map of saved visit times by store ID
                  const visitTimeMap = new Map(savedVisitTimes.map(vt => [vt.store_id, vt]))

                  // Calculate route segments
                  const segments: RouteSegment[] = []
                  const scheduleItems: ScheduleItem[] = []
                  
                  // First store always starts at 09:00 (ignore saved visit times for first store)
                  let firstVisitTime: Date
                  firstVisitTime = new Date(`${plannedDate}T09:00:00`)
                  
                  let currentTime = firstVisitTime

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

                    const leaveHomeTime = new Date(firstVisitTime.getTime() - travelTime * 60000)
                    scheduleItems.push({
                      id: `leave-home-${Date.now()}`,
                      time: leaveHomeTime,
                      action: 'Leave home',
                      location: managerHome.address,
                      travelTime,
                      travelDistance: distance
                    })
                  }

                  // Process each store
                  storesWithCoords.forEach((store, index) => {
                    const savedVisitTime = visitTimeMap.get(store.id)
                    let visitStartTime: Date
                    let visitEndTime: Date
                    
                    // First store always starts at 09:00 (ignore saved visit times)
                    if (index === 0) {
                      visitStartTime = new Date(firstVisitTime)
                      visitEndTime = addHours(firstVisitTime, 2)
                      currentTime = visitEndTime
                    } else if (savedVisitTime) {
                      // Use saved visit time for subsequent stores
                      const baseDate = new Date(plannedDate)
                      const [startHours, startMinutes] = savedVisitTime.start_time.split(':').map(Number)
                      const [endHours, endMinutes] = savedVisitTime.end_time.split(':').map(Number)
                      
                      visitStartTime = new Date(baseDate)
                      visitStartTime.setHours(startHours, startMinutes, 0, 0)
                      
                      visitEndTime = new Date(baseDate)
                      visitEndTime.setHours(endHours, endMinutes, 0, 0)
                      currentTime = visitEndTime
                    } else {
                      visitStartTime = new Date(currentTime)
                      visitEndTime = addHours(currentTime, 2)
                      currentTime = visitEndTime
                    }
                    
                    scheduleItems.push({
                      id: `visit-${store.id}-${index}`,
                      time: visitStartTime,
                      endTime: visitEndTime,
                      action: 'Visit',
                      location: store.store_name,
                      storeId: store.id,
                      visitTimeId: savedVisitTime?.id
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

                      const nextSavedVisitTime = visitTimeMap.get(nextStore.id)
                      let travelStartTime = visitEndTime
                      
                      if (nextSavedVisitTime) {
                        const baseDate = new Date(plannedDate)
                        const [nextStartHours, nextStartMinutes] = nextSavedVisitTime.start_time.split(':').map(Number)
                        const nextVisitStart = new Date(baseDate)
                        nextVisitStart.setHours(nextStartHours, nextStartMinutes, 0, 0)
                        travelStartTime = new Date(nextVisitStart.getTime() - travelTime * 60000)
                        currentTime = nextVisitStart
                      } else {
                        travelStartTime = visitEndTime
                        currentTime = addMinutes(visitEndTime, travelTime)
                      }

                      scheduleItems.push({
                        id: `travel-${store.id}-${nextStore.id}-${index}`,
                        time: travelStartTime,
                        action: 'Travel',
                        location: `${fromStoreName} → ${toStoreName}`,
                        travelTime,
                        travelDistance: distance
                      })
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

                        scheduleItems.push({
                          id: `travel-${store.id}-home-${index}`,
                          time: visitEndTime,
                          action: 'Travel',
                          location: `${fromStoreName} → Home`,
                          travelTime,
                          travelDistance: distance
                        })

                        const arriveHomeTime = addMinutes(visitEndTime, travelTime)
                        scheduleItems.push({
                          id: `arrive-home-${Date.now()}`,
                          time: arriveHomeTime,
                          action: 'Arrive home',
                          location: managerHome.address
                        })
                      }
                    }
                  })

                  // Add operational items from database (including the updated one)
                  if (savedOpItems.length > 0) {
                    const baseDate = new Date(plannedDate)
                    savedOpItems.forEach(item => {
                      const [hours, minutes] = item.start_time.split(':').map(Number)
                      const startTime = new Date(baseDate)
                      startTime.setHours(hours, minutes, 0, 0)
                      const endTime = addMinutes(startTime, item.duration_minutes)

                      scheduleItems.push({
                        id: `operational-${item.id}`,
                        dbId: item.id,
                        time: startTime,
                        endTime: endTime,
                        action: item.title,
                        location: item.location || '',
                        isOperational: true
                      })
                    })
                  }

                  // Sort all items by time, but ensure "Leave home" is always first
                  scheduleItems.sort((a, b) => {
                    if (a.action === 'Leave home') return -1
                    if (b.action === 'Leave home') return 1
                    return a.time.getTime() - b.time.getTime()
                  })

                  // Now detect overlaps with operational items and shift visits
                  // Only shift items that actually overlap - items before the operational item stay where they are
                  const visitTimeUpdates: Promise<any>[] = []
                  
                  savedOpItems.forEach(opItem => {
                    const baseDate = new Date(plannedDate)
                    const [opHours, opMinutes] = opItem.start_time.split(':').map(Number)
                    const opStart = new Date(baseDate)
                    opStart.setHours(opHours, opMinutes, 0, 0)
                    const opEnd = addMinutes(opStart, opItem.duration_minutes)
                    
                    const opStartTime = opStart.getTime()
                    const opEndTime = opEnd.getTime()
                    
                    // Find overlapping visits
                    const overlappingVisits = scheduleItems.filter(item => 
                      item.action === 'Visit' && 
                      item.storeId &&
                      item.time.getTime() < opEndTime &&
                      (item.endTime ? item.endTime.getTime() : item.time.getTime()) > opStartTime
                    )
                    
                    if (overlappingVisits.length > 0) {
                      let currentShiftTime = opEndTime
                      
                      overlappingVisits.sort((a, b) => a.time.getTime() - b.time.getTime())
                      
                      overlappingVisits.forEach(visit => {
                        const duration = visit.endTime 
                          ? visit.endTime.getTime() - visit.time.getTime()
                          : 120 * 60000
                        
                        visit.time = new Date(currentShiftTime)
                        visit.endTime = addMinutes(currentShiftTime, duration / 60000)
                        currentShiftTime = visit.endTime.getTime()
                        
                        // Save shifted visit time
                        if (visit.storeId && managerUserId) {
                          const startTimeStr = format(visit.time, 'HH:mm')
                          const endTimeStr = format(visit.endTime, 'HH:mm')
                          visitTimeUpdates.push(
                            saveRouteVisitTime(managerUserId, plannedDate, region, visit.storeId, startTimeStr, endTimeStr)
                          )
                        }
                      })
                      
                      // Cascade to subsequent items
                      const lastShiftedVisit = overlappingVisits[overlappingVisits.length - 1]
                      if (lastShiftedVisit && lastShiftedVisit.endTime) {
                        let cascadeTime = lastShiftedVisit.endTime.getTime()
                        const lastShiftedIndex = scheduleItems.indexOf(lastShiftedVisit)
                        
                        for (let i = lastShiftedIndex + 1; i < scheduleItems.length; i++) {
                          const item = scheduleItems[i]
                          
                          if (item.isOperational) {
                            // Check if this operational item overlaps with cascade time
                            const itemStart = item.time.getTime()
                            if (itemStart < cascadeTime) {
                              cascadeTime = item.endTime ? item.endTime.getTime() : itemStart
                            } else {
                              cascadeTime = item.endTime ? item.endTime.getTime() : itemStart
                            }
                            continue
                          }
                          
                          if (item.action === 'Travel') {
                            item.time = new Date(cascadeTime)
                            if (item.travelTime) {
                              cascadeTime = addMinutes(cascadeTime, item.travelTime).getTime()
                            }
                          } else if (item.action === 'Visit' && item.storeId) {
                            const duration = item.endTime 
                              ? item.endTime.getTime() - item.time.getTime()
                              : 120 * 60000
                            
                            item.time = new Date(cascadeTime)
                            item.endTime = addMinutes(cascadeTime, duration / 60000)
                            cascadeTime = item.endTime.getTime()
                            
                            // Save shifted visit time
                            if (managerUserId) {
                              const startTimeStr = format(item.time, 'HH:mm')
                              const endTimeStr = format(item.endTime, 'HH:mm')
                              visitTimeUpdates.push(
                                saveRouteVisitTime(managerUserId, plannedDate, region, item.storeId, startTimeStr, endTimeStr)
                              )
                            }
                          } else {
                            item.time = new Date(cascadeTime)
                            if (item.endTime) {
                              const duration = item.endTime.getTime() - item.time.getTime()
                              item.endTime = addMinutes(cascadeTime, duration / 60000)
                              cascadeTime = item.endTime.getTime()
                            } else {
                              cascadeTime = item.time.getTime()
                            }
                          }
                        }
                      }
                    }
                  })
                  
                  // Wait for all visit time updates
                  if (visitTimeUpdates.length > 0) {
                    await Promise.all(visitTimeUpdates)
                  }
                  
                  // Recalculate all travel segments based on current visit positions
                  // This ensures travel segments are correctly positioned relative to visits
                  // Note: storesWithCoords is already defined above, reusing it here
                  const storeMap = new Map(storesWithCoords.map(s => [s.id, s]))
                  
                  // Sort by time (with "Leave home" first)
                  scheduleItems.sort((a, b) => {
                    if (a.action === 'Leave home') return -1
                    if (b.action === 'Leave home') return 1
                    return a.time.getTime() - b.time.getTime()
                  })
                  
                  // Recalculate all travel segments based on visit positions
                  // Extract store IDs from travel segment IDs: travel-{fromStoreId}-{toStoreId} or travel-{storeId}-home
                  // First, sort items to ensure we can find items in order
                  scheduleItems.sort((a, b) => {
                    if (a.action === 'Leave home') return -1
                    if (b.action === 'Leave home') return 1
                    return a.time.getTime() - b.time.getTime()
                  })
                  
                  console.log('=== RECALCULATING TRAVEL SEGMENTS ===', {
                    totalItems: scheduleItems.length,
                    travelItems: scheduleItems.filter(si => si.action === 'Travel').length
                  })
                  
                  for (let i = 0; i < scheduleItems.length; i++) {
                    const item = scheduleItems[i]
                    
                    if (item.action === 'Travel' && item.id.startsWith('travel-')) {
                      console.log(`Processing travel segment ${i}:`, {
                        id: item.id,
                        location: item.location,
                        currentTime: format(item.time, 'HH:mm')
                      })
                      // Parse travel segment ID: travel-{fromStoreId}-{toStoreId}-{index}
                      // Store IDs are UUIDs (with dashes), so we need to extract them correctly
                      let fromStoreId: string | null = null
                      let toStoreId: string | null = null
                      
                      if (item.id.includes('-home')) {
                        // Travel to home: travel-{storeId}-home-{index}
                        // Extract everything between 'travel-' and '-home'
                        const match = item.id.match(/^travel-(.+)-home-\d+$/)
                        if (match) {
                          fromStoreId = match[1]
                        }
                      } else {
                        // Travel between stores: travel-{fromStoreId}-{toStoreId}-{index}
                        // Extract the two UUIDs before the final index
                        // UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with dashes)
                        const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g
                        const uuids = item.id.match(uuidPattern)
                        if (uuids && uuids.length >= 2) {
                          fromStoreId = uuids[0]
                          toStoreId = uuids[1]
                        }
                      }
                      
                      console.log('  Parsed IDs:', { fromStoreId, toStoreId })
                      
                      // Find the origin visit - must find the one that appears BEFORE this travel segment
                      const fromVisit = fromStoreId 
                        ? scheduleItems.find(si => si.action === 'Visit' && si.storeId === fromStoreId)
                        : null
                      
                      // Find the destination visit - must find the one that appears AFTER this travel segment
                      const toVisit = toStoreId 
                        ? scheduleItems.find(si => si.action === 'Visit' && si.storeId === toStoreId)
                        : null
                      
                      console.log('  Found visits:', {
                        fromVisit: fromVisit ? `${fromVisit.location} (${format(fromVisit.time, 'HH:mm')} - ${fromVisit.endTime ? format(fromVisit.endTime, 'HH:mm') : 'N/A'})` : 'NOT FOUND',
                        toVisit: toVisit ? `${toVisit.location} (${format(toVisit.time, 'HH:mm')} - ${toVisit.endTime ? format(toVisit.endTime, 'HH:mm') : 'N/A'})` : 'NOT FOUND'
                      })
                      
                      // Debug logging for Denton → Manchester Women's
                      if (fromStoreId && toStoreId) {
                        const fromStore = storeMap.get(fromStoreId)
                        const toStore = storeMap.get(toStoreId)
                        if (fromStore && toStore && 
                            (fromStore.store_name.includes('Denton') || item.location.includes('Denton')) &&
                            (toStore.store_name.includes('Manchester Women') || item.location.includes('Manchester Women'))) {
                          console.log('Recalculating travel Denton → Manchester Women\'s:', {
                            travelId: item.id,
                            travelLocation: item.location,
                            fromStoreId,
                            fromStoreName: fromStore.store_name,
                            toStoreId,
                            toStoreName: toStore.store_name,
                            fromVisit: fromVisit ? { 
                              storeId: fromVisit.storeId, 
                              location: fromVisit.location,
                              time: format(fromVisit.time, 'HH:mm'), 
                              endTime: fromVisit.endTime ? format(fromVisit.endTime, 'HH:mm') : null 
                            } : null,
                            toVisit: toVisit ? { 
                              storeId: toVisit.storeId, 
                              location: toVisit.location,
                              time: format(toVisit.time, 'HH:mm'), 
                              endTime: toVisit.endTime ? format(toVisit.endTime, 'HH:mm') : null 
                            } : null,
                            currentTravelTime: format(item.time, 'HH:mm')
                          })
                        }
                      }
                      
                      if (fromVisit && fromVisit.endTime) {
                        if (toVisit && toVisit.storeId) {
                          // Travel between stores
                          const fromStore = storeMap.get(fromStoreId!)
                          const toStore = storeMap.get(toVisit.storeId)
                          
                          if (fromStore && toStore) {
                            const distance = calculateDistance(
                              fromStore.latitude!,
                              fromStore.longitude!,
                              toStore.latitude!,
                              toStore.longitude!
                            )
                            const travelTime = estimateTravelTime(distance)
                            
                            item.travelTime = travelTime
                            item.travelDistance = distance
                            
                            // Update location string to match actual stores
                            const fromStoreName = fromStore.postcode 
                              ? `${fromStore.store_name} (${fromStore.postcode})`
                              : fromStore.store_name
                            const toStoreName = toStore.postcode
                              ? `${toStore.store_name} (${toStore.postcode})`
                              : toStore.store_name
                            item.location = `${fromStoreName} → ${toStoreName}`
                            
                            // Find any operational items that come after the origin visit ends
                            const fromVisitEndTime = fromVisit.endTime.getTime()
                            let earliestTravelStart = fromVisitEndTime
                            
                            // Check for operational items between origin visit end and destination visit start
                            for (const opItem of scheduleItems) {
                              if (opItem.isOperational) {
                                const opStart = opItem.time.getTime()
                                const opEnd = opItem.endTime ? opItem.endTime.getTime() : opStart
                                
                                // If operational item overlaps with the travel period, travel should start after it
                                if (opStart >= fromVisitEndTime && opStart < toVisit.time.getTime()) {
                                  if (opEnd > earliestTravelStart) {
                                    earliestTravelStart = opEnd
                                  }
                                }
                              }
                            }
                            
                            // Travel ALWAYS starts after origin visit ends (and after any operational items)
                            item.time = new Date(earliestTravelStart)
                            
                            // Debug logging for Denton → Manchester Women's travel
                            if (fromStore.store_name.includes('Denton') && toStore.store_name.includes('Manchester Women')) {
                              console.log('Setting travel time for Denton → Manchester Women\'s:', {
                                fromVisitEndTime: format(fromVisit.endTime, 'HH:mm'),
                                earliestTravelStart: format(new Date(earliestTravelStart), 'HH:mm'),
                                travelTime,
                                destinationVisitTime: format(toVisit.time, 'HH:mm'),
                                newTravelTime: format(item.time, 'HH:mm')
                              })
                            }
                            
                            // Calculate when travel would arrive at destination
                            const arrivalTime = addMinutes(earliestTravelStart, travelTime)
                            
                            if (toVisit.visitTimeId) {
                              // Destination visit has a saved time - don't change it
                              // Travel starts at earliestTravelStart, arrives at arrivalTime
                              // If arrival is before saved visit time, that's fine (waiting time)
                              // The travel segment time is correct regardless of destination visit saved time
                            } else {
                              // No saved time - update destination visit to start when travel arrives
                              const visitDuration = toVisit.endTime 
                                ? toVisit.endTime.getTime() - toVisit.time.getTime()
                                : 120 * 60000
                              toVisit.time = new Date(arrivalTime)
                              toVisit.endTime = addMinutes(arrivalTime, visitDuration / 60000)
                            }
                          }
                        } else if (managerHome && item.location.includes('Home')) {
                          // Travel to home
                          const fromStore = storeMap.get(fromStoreId!)
                          if (fromStore) {
                            const distance = calculateDistance(
                              fromStore.latitude!,
                              fromStore.longitude!,
                              managerHome.latitude,
                              managerHome.longitude
                            )
                            const travelTime = estimateTravelTime(distance)
                            
                            item.travelTime = travelTime
                            item.travelDistance = distance
                            item.time = new Date(fromVisit.endTime)
                          }
                        }
                      }
                    }
                  }
                  
                  // Final sort - only sort by time if there are operational items
                  // If no operational items, keep items in store order (already correct from forEach loop)
                  if (savedOpItems.length > 0) {
                    // Sort all items by time, but ensure "Leave home" is always first
                    scheduleItems.sort((a, b) => {
                      if (a.action === 'Leave home') return -1
                      if (b.action === 'Leave home') return 1
                      return a.time.getTime() - b.time.getTime()
                    })
                  } else {
                    // No operational items - keep items in store order (travel recalculation preserves order)
                    // Just ensure "Leave home" is first by moving it to the front
                    const leaveHomeIndex = scheduleItems.findIndex(item => item.action === 'Leave home')
                    if (leaveHomeIndex > 0) {
                      const leaveHomeItem = scheduleItems.splice(leaveHomeIndex, 1)[0]
                      scheduleItems.unshift(leaveHomeItem)
                    }
                  }

                  setRouteSegments(segments)
                  setSchedule(scheduleItems)
                  setIsCalculating(false)
                } catch (error) {
                  console.error('Error regenerating schedule:', error)
                  setIsCalculating(false)
                }

                setEditingOpItemId(null)
              } else {
                // Add new operational item
                await handleAddOperational()
              }
              
              setAddingOperational(false)
              setOpItemTitle('')
              setOpItemLocation('')
              setOpItemStartTime('')
              setOpItemDuration('60')
            }}>
              {editingOpItemId ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
