'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Route, Calendar, Home, Trash2, Filter, Plus, CheckCircle2, Sparkles, Loader2, Edit2, X, ChevronUp, ChevronDown } from 'lucide-react'
import dynamic from 'next/dynamic'
import { updateRoutePlannedDate, updateManagerHomeAddress, getRouteOperationalItems, deleteAllRouteVisitTimes, deleteAllRouteOperationalItems } from '@/app/actions/route-planning'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RouteDirectionsModal } from './route-directions-modal'

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import('./map-component'), { ssr: false })

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

// Helper function to get area display name
function getAreaDisplayName(areaCode: string | null): string {
  if (!areaCode) return 'All Areas'
  const name = areaNames[areaCode]
  return name ? `${areaCode} - ${name}` : areaCode
}

interface Store {
  id: string
  store_code: string | null
  store_name: string
  address_line_1: string | null
  city: string | null
  postcode: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
  compliance_audit_1_date: string | null
  compliance_audit_1_overall_pct: number | null
  compliance_audit_2_date: string | null
  compliance_audit_2_planned_date: string | null
  compliance_audit_2_assigned_manager_user_id: string | null
  route_sequence: number | null
  assigned_manager?: {
    id: string
    full_name: string | null
    home_address: string | null
    home_latitude: number | null
    home_longitude: number | null
  } | null
}

interface StoreWithCoords extends Store {
  latitude: number
  longitude: number
}

interface Profile {
  id: string
  full_name: string | null
  home_address: string | null
  home_latitude: number | null
  home_longitude: number | null
}

interface RoutePlanningClientProps {
  initialData: {
    stores: Store[]
    profiles: Profile[]
  }
}

export function RoutePlanningClient({ initialData }: RoutePlanningClientProps) {
  const router = useRouter()
  const [stores, setStores] = useState(initialData.stores)
  const [profiles] = useState(initialData.profiles)
  
  // Update stores when initialData changes (after router.refresh())
  useEffect(() => {
    setStores(initialData.stores)
  }, [initialData])
  const [selectedManager, setSelectedManager] = useState<string | undefined>(undefined)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<{ id: string; name: string } | null>(null)
  
  // Route creation state
  const [routeManager, setRouteManager] = useState<string | undefined>(undefined)
  const [routeDate, setRouteDate] = useState<string>('')
  const [routeArea, setRouteArea] = useState<string | null>(null)
  const [routeSelectedStores, setRouteSelectedStores] = useState<Set<string>>(new Set())
  const [isCreatingRoute, setIsCreatingRoute] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [editingRouteGroup, setEditingRouteGroup] = useState<string | null>(null)
  const [selectedRouteForDirections, setSelectedRouteForDirections] = useState<{
    stores: Store[]
    managerHome: { latitude: number; longitude: number; address: string } | null
    managerName: string
    plannedDate: string
    managerUserId: string | null
    region: string | null
  } | null>(null)
  // Track store order for each route group
  const [routeStoreOrder, setRouteStoreOrder] = useState<Record<string, string[]>>({})
  // Track operational items for each route group
  const [routeOperationalItems, setRouteOperationalItems] = useState<Record<string, Array<{ title: string; start_time: string }>>>({})

  // Get selected manager's home location
  const managerHome = useMemo(() => {
    if (!selectedManager) return null
    const manager = profiles.find(p => p.id === selectedManager)
    if (!manager || !manager.home_latitude || !manager.home_longitude) return null
    // Convert string coordinates to numbers
    const lat = typeof manager.home_latitude === 'string' 
      ? parseFloat(manager.home_latitude) 
      : manager.home_latitude
    const lng = typeof manager.home_longitude === 'string' 
      ? parseFloat(manager.home_longitude) 
      : manager.home_longitude
    
    if (isNaN(lat) || isNaN(lng)) return null
    
    return {
      latitude: lat,
      longitude: lng,
      address: manager.home_address || 'Manager Home',
    }
  }, [selectedManager, profiles])

  // Get unique areas for filter
  const uniqueAreas = useMemo<string[]>(() => {
    const areas = new Set<string>(
      (stores.map(s => s.region || '').filter(Boolean) as string[])
    )
    return Array.from(areas).sort()
  }, [stores])

  // Filter stores with locations and available for planning (not planned, not completed within 6 months, not completed today)
  const storesWithLocations = useMemo<StoreWithCoords[]>(() => {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setHours(0, 0, 0, 0) // Start of day
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today
    const hiddenStoreCodes = ['M3', 'POINT 62', 'Sharp Project', 'S0777']
    
    return stores.filter(s => {
      // Must have coordinates
      if (s.latitude === null || s.longitude === null) return false
      
      // Hide warehouse/photo studio stores
      if (hiddenStoreCodes.includes(s.store_code || '')) return false
      
      // Hide stores that have been planned (for map display only)
      if (s.compliance_audit_2_planned_date) return false
      
      // Hide stores that completed audit 1 TODAY (2026) - they just finished, so hide them
      // We're starting fresh for 2026, so we only care about 2026 audit dates
      if (s.compliance_audit_1_date) {
        const audit1Date = new Date(s.compliance_audit_1_date)
        audit1Date.setHours(0, 0, 0, 0)
        
        // Only check if audit 1 was completed today (2026)
        // Disregard all 2025 audits - we're starting fresh for 2026
        if (audit1Date.getTime() === today.getTime()) {
          // Debug logging for Speke specifically
          if (s.store_code === 'S0042' || s.store_name?.toLowerCase().includes('speke')) {
            console.log('Speke store filtering (audit 1 completed today):', {
              store_name: s.store_name,
              store_code: s.store_code,
              compliance_audit_1_date: s.compliance_audit_1_date,
              audit1Date: audit1Date.toISOString(),
              today: today.toISOString(),
              shouldHide: true
            })
          }
          return false // Hide stores that completed audit 1 today
        }
      }
      
      // Hide stores that completed audit 2 from 2025 within the last 6 months
      // (But we're starting fresh for 2026, so this is mainly for stores that completed audit 2 recently)
      if (s.compliance_audit_2_date) {
        const audit2Date = new Date(s.compliance_audit_2_date)
        audit2Date.setHours(0, 0, 0, 0)
        
        // Only hide if audit 2 was completed within last 6 months (from 2025)
        // This ensures stores that recently completed audit 2 are hidden
        if (audit2Date >= sixMonthsAgo) {
          return false
        }
      }
      
      return true
    }).map((s) => ({
      ...s,
      latitude: typeof s.latitude === 'number' ? s.latitude : Number(s.latitude),
      longitude: typeof s.longitude === 'number' ? s.longitude : Number(s.longitude),
    }))
  }, [stores])

  // Get stores in the selected route area
  const storesInRouteArea = useMemo(() => {
    if (!routeArea) return []
    return storesWithLocations.filter(s => s.region === routeArea)
  }, [routeArea, storesWithLocations])

  // Get stores with planned dates, grouped by region and date
  const plannedRoutes = useMemo(() => {
    const storesWithPlannedDates = stores.filter(s => s.compliance_audit_2_planned_date)
    
    // Group by region and planned date
    const grouped = storesWithPlannedDates.reduce((acc, store) => {
      const key = `${store.region || 'unknown'}-${store.compliance_audit_2_planned_date}-${store.compliance_audit_2_assigned_manager_user_id || 'unassigned'}`
      if (!acc[key]) {
        acc[key] = {
          region: store.region,
          plannedDate: store.compliance_audit_2_planned_date || '',
          managerId: store.compliance_audit_2_assigned_manager_user_id || '',
          assignedManager: store.assigned_manager,
          stores: []
        }
      }
      acc[key].stores.push(store)
      return acc
    }, {} as Record<string, {
      region: string | null
      plannedDate: string
      managerId: string | null
      assignedManager: any
      stores: Store[]
    }>)

    // Convert to array and sort by date, then apply custom ordering
    return Object.entries(grouped).map(([key, group]) => {
      // If we have a custom order for this route, apply it
      if (routeStoreOrder[key] && routeStoreOrder[key].length === group.stores.length) {
        const orderedStores = routeStoreOrder[key]
          .map(storeId => group.stores.find(s => s.id === storeId))
          .filter(Boolean) as Store[]
        // Add any stores not in the order (shouldn't happen, but safety check)
        const orderedIds = new Set(orderedStores.map(s => s.id))
        const remainingStores = group.stores.filter(s => !orderedIds.has(s.id))
        return {
          ...group,
          _groupKey: key, // Store the stable key
          stores: [...orderedStores, ...remainingStores]
        }
      }
      // Otherwise, sort by route_sequence from database
      const sortedStores = [...group.stores].sort((a, b) => {
        if (a.route_sequence !== null && b.route_sequence !== null) {
          return a.route_sequence - b.route_sequence
        }
        if (a.route_sequence !== null) return -1
        if (b.route_sequence !== null) return 1
        return 0
      })
      return {
        ...group,
        _groupKey: key, // Store the stable key
        stores: sortedStores
      }
    }).sort((a, b) => {
      const dateA = a.plannedDate || ''
      const dateB = b.plannedDate || ''
      return dateA.localeCompare(dateB)
    })
  }, [stores, routeStoreOrder])

  const handleDateChange = async (storeId: string, date: string) => {
    setLoading({ ...loading, [storeId]: true })
    try {
      await updateRoutePlannedDate(storeId, date || null)
      router.refresh()
    } catch (error) {
      console.error('Error updating planned date:', error)
    } finally {
      setLoading({ ...loading, [storeId]: false })
    }
  }

  const handleDeleteRoute = (storeId: string, storeName: string) => {
    setStoreToDelete({ id: storeId, name: storeName })
    setDeleteConfirmOpen(true)
  }

  const handleDeleteRouteGroup = (group: { stores: Store[] }) => {
    const storeNames = group.stores.map(s => s.store_name).join(', ')
    setStoreToDelete({ id: group.stores[0].id, name: storeNames })
    setDeleteConfirmOpen(true)
  }

  const handleRemoveStoreFromRoute = async (storeId: string) => {
    setLoading({ ...loading, [storeId]: true })
    try {
      await updateRoutePlannedDate(storeId, null)
      router.refresh()
    } catch (error) {
      console.error('Error removing store from route:', error)
      alert('Error removing store from route. Please try again.')
    } finally {
      setLoading({ ...loading, [storeId]: false })
    }
  }

  // Initialize routeStoreOrder from database route_sequence on mount
  useEffect(() => {
    const storesWithPlannedDates = stores.filter(s => s.compliance_audit_2_planned_date)
    
    if (storesWithPlannedDates.length === 0) {
      setRouteStoreOrder({})
      return
    }
    
    // Group by region and planned date
    const grouped = storesWithPlannedDates.reduce((acc, store) => {
      const key = `${store.region || 'unknown'}-${store.compliance_audit_2_planned_date}-${store.compliance_audit_2_assigned_manager_user_id || 'unassigned'}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(store)
      return acc
    }, {} as Record<string, Store[]>)

    // Build routeStoreOrder from database route_sequence
    const initialOrder: Record<string, string[]> = {}
    Object.entries(grouped).forEach(([key, groupStores]) => {
      // Sort by route_sequence if available, otherwise keep original order
      const sorted = [...groupStores].sort((a, b) => {
        if (a.route_sequence !== null && b.route_sequence !== null) {
          return a.route_sequence - b.route_sequence
        }
        if (a.route_sequence !== null) return -1
        if (b.route_sequence !== null) return 1
        return 0
      })
      initialOrder[key] = sorted.map(s => s.id)
    })

    // Always update from database on mount/refresh
    setRouteStoreOrder(initialOrder)
  }, [stores])

  // Load operational items for each planned route
  useEffect(() => {
    const loadOperationalItems = async () => {
      const itemsMap: Record<string, Array<{ title: string; start_time: string }>> = {}
      
      for (const group of plannedRoutes) {
        if (!group.managerId || !group.plannedDate) continue
        
        const groupKey = (group as any)._groupKey || `${group.region || 'unknown'}-${group.plannedDate}-${group.managerId || 'unassigned'}`
        
        try {
          const { data, error } = await getRouteOperationalItems(group.managerId, group.plannedDate, group.region)
          if (!error && data) {
            itemsMap[groupKey] = data.map(item => ({ title: item.title, start_time: item.start_time }))
          }
        } catch (error) {
          console.error('Error loading operational items for route:', error)
        }
      }
      
      setRouteOperationalItems(itemsMap)
    }
    
    if (plannedRoutes.length > 0) {
      loadOperationalItems()
    }
  }, [plannedRoutes])

  const handleReorderStore = async (groupKey: string, storeId: string, direction: 'up' | 'down') => {
    const group = plannedRoutes.find((g) => {
      const key = (g as any)._groupKey || `${g.region || 'unknown'}-${g.plannedDate}-${g.managerId || 'unassigned'}`
      return key === groupKey
    })
    
    if (!group) return

    const currentOrder = routeStoreOrder[groupKey] || group.stores.map(s => s.id)
    const currentIndex = currentOrder.indexOf(storeId)
    
    if (currentIndex === -1) return
    
    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === currentOrder.length - 1) return

    const newOrder = [...currentOrder]
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    ;[newOrder[currentIndex], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[currentIndex]]

    // Update state immediately for responsive UI
    setRouteStoreOrder({
      ...routeStoreOrder,
      [groupKey]: newOrder
    })

    // Save to database
    try {
      const { updateRouteSequence } = await import('@/app/actions/route-planning')
      await updateRouteSequence(newOrder, groupKey)
      router.refresh()
    } catch (error) {
      console.error('Error saving route order:', error)
      // Revert on error
      setRouteStoreOrder({
        ...routeStoreOrder,
        [groupKey]: currentOrder
      })
      alert('Error saving route order. Please try again.')
    }

    // Update the selected route directions if it's currently open for this group
    if (selectedRouteForDirections) {
      const reorderedStores = newOrder
        .map(id => group.stores.find(s => s.id === id))
        .filter(Boolean) as Store[]
      setSelectedRouteForDirections({
        ...selectedRouteForDirections,
        stores: reorderedStores
      })
    }
  }

  const confirmDeleteRoute = async () => {
    if (!storeToDelete) return
    
    setDeleteConfirmOpen(false)
    
    try {
      // Find the route group that contains this store
      const routeGroup = plannedRoutes.find(group => 
        group.stores.some(s => s.id === storeToDelete.id)
      )
      
      if (routeGroup) {
        // Delete all stores in the group
        setLoading({ ...loading, ...Object.fromEntries(routeGroup.stores.map(s => [s.id, true])) })
        await Promise.all(
          routeGroup.stores.map(store => updateRoutePlannedDate(store.id, null))
        )
        
        // Delete all saved visit times and operational items for this route
        if (routeGroup.managerId && routeGroup.plannedDate) {
          await Promise.all([
            deleteAllRouteVisitTimes(routeGroup.managerId, routeGroup.plannedDate, routeGroup.region),
            deleteAllRouteOperationalItems(routeGroup.managerId, routeGroup.plannedDate, routeGroup.region)
          ])
        }
        
        setLoading({ ...loading, ...Object.fromEntries(routeGroup.stores.map(s => [s.id, false])) })
      } else {
        // Fallback: delete just the one store
        setLoading({ ...loading, [storeToDelete.id]: true })
        await updateRoutePlannedDate(storeToDelete.id, null)
        setLoading({ ...loading, [storeToDelete.id]: false })
      }
      
      setStoreToDelete(null)
      router.refresh()
    } catch (error) {
      console.error('Error deleting route:', error)
      setStoreToDelete(null)
    }
  }

  const handleManagerSelect = (managerId: string) => {
    setSelectedManager(managerId)
  }

  const handleStoreSelect = (storeId: string) => {
    const newSelected = new Set(selectedStores)
    if (newSelected.has(storeId)) {
      newSelected.delete(storeId)
    } else {
      newSelected.add(storeId)
    }
    setSelectedStores(newSelected)
  }

  const handleBulkDateAssign = async () => {
    if (!selectedDate || selectedStores.size === 0) return
    
    setLoading({ bulk: true })
    try {
      await Promise.all(
        Array.from(selectedStores).map(storeId =>
          updateRoutePlannedDate(storeId, selectedDate)
        )
      )
      setSelectedStores(new Set())
      router.refresh()
    } catch (error) {
      console.error('Error bulk updating dates:', error)
    } finally {
      setLoading({ bulk: false })
    }
  }

  const handleRouteAreaSelect = (area: string | null) => {
    setRouteArea(area)
    setRouteSelectedStores(new Set()) // Clear selections when area changes
  }

  const handleRouteStoreToggle = (storeId: string) => {
    const newSelected = new Set(routeSelectedStores)
    if (newSelected.has(storeId)) {
      newSelected.delete(storeId)
    } else {
      newSelected.add(storeId)
    }
    setRouteSelectedStores(newSelected)
  }

  const handleOptimizeRoute = async () => {
    if (!routeManager || !routeArea || storesInRouteArea.length < 3) {
      alert('Please select a manager and an area with at least 3 stores available for optimization.')
      return
    }

    setIsOptimizing(true)
    try {
      const manager = profiles.find(p => p.id === routeManager)
      if (!manager) {
        alert('Manager not found.')
        setIsOptimizing(false)
        return
      }

      // Get manager home location (optional - optimization can work without it)
      const managerHome = manager.home_latitude && manager.home_longitude
        ? {
            latitude: typeof manager.home_latitude === 'string' 
              ? parseFloat(manager.home_latitude) 
              : manager.home_latitude,
            longitude: typeof manager.home_longitude === 'string' 
              ? parseFloat(manager.home_longitude) 
              : manager.home_longitude,
            address: manager.home_address || 'Manager Home',
          }
        : null
      
      // If no home address, show a warning but continue
      if (!managerHome) {
        console.warn('Manager home address not set - optimization will use store-to-store distances only')
      }

      const response = await fetch('/api/ai/route-optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stores: storesInRouteArea,
          managerHome,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Route optimization API error:', errorData)
        throw new Error(errorData.error || 'Failed to optimize route')
      }

      const result = await response.json()
      console.log('Optimization result:', result)
      console.log('Result storeIds (expanded):', result.storeIds?.map((id: string) => ({ id, type: typeof id, value: String(id) })))
      console.log('Stores in route area IDs (expanded):', storesInRouteArea.map(s => ({ id: s.id, type: typeof s.id, value: String(s.id), name: s.store_name })))
      
      if (result.storeIds && Array.isArray(result.storeIds)) {
        // Verify that all store IDs exist in the current area stores
        // Use string comparison to handle any type mismatches
        const validStoreIds = result.storeIds.filter((id: string) => {
          const idStr = String(id).trim()
          const found = storesInRouteArea.some(store => {
            const storeIdStr = String(store.id).trim()
            return storeIdStr === idStr
          })
          if (!found) {
            console.log(`ID not found: API returned "${id}" (type: ${typeof id}), available IDs:`, storesInRouteArea.map(s => s.id))
          }
          return found
        })
        
        console.log('Valid store IDs:', validStoreIds)
        console.log('Available stores in area:', storesInRouteArea.map(s => ({ id: s.id, name: s.store_name })))
        
        if (validStoreIds.length > 0) {
          // Create a new Set to ensure React detects the change
          const newSelectedSet = new Set<string>(validStoreIds)
          console.log('Setting selected stores:', Array.from(newSelectedSet))
          setRouteSelectedStores(newSelectedSet)
          
          // Scroll to the first selected store after React has updated
          requestAnimationFrame(() => {
            setTimeout(() => {
              const firstSelected = document.querySelector(`[data-store-id="${validStoreIds[0]}"]`)
              if (firstSelected) {
                firstSelected.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              }
            }, 100)
          })
          
          if (validStoreIds.length !== result.storeIds.length) {
            console.warn('Some store IDs from optimization were not found in the area:', 
              result.storeIds.filter((id: string) => !validStoreIds.includes(id)))
          }
        } else {
          console.error('No valid store IDs found in the area')
          alert('The optimized stores were not found in the selected area. Please try again.')
        }
      } else if (result.error) {
        console.error('Route optimization error:', result.error)
        alert(`Unable to optimize route: ${result.error}. Please select stores manually.`)
      } else {
        console.error('Invalid response format:', result)
        alert('Unable to get optimal route. Please select stores manually.')
      }
    } catch (error) {
      console.error('Error optimizing route:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error optimizing route: ${errorMessage}. Please try again or select stores manually.`)
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleCreateRoute = async () => {
    if (!routeManager) {
      alert('Please select a manager for the route.')
      return
    }
    if (!routeDate) {
      alert('Please select a date for the route.')
      return
    }
    if (routeSelectedStores.size === 0) {
      alert('Please select at least one store for the route.')
      return
    }
    if (routeSelectedStores.size > 3) {
      alert('Maximum 3 stores per day. Please select 3 or fewer stores.')
      return
    }

        setIsCreatingRoute(true)
        try {
          // Update all selected stores with the manager and date
          const storeIdsArray = Array.from(routeSelectedStores)
          await Promise.all(
            storeIdsArray.map(async (storeId) => {
              // First update the manager assignment
              const { updateComplianceAudit2Tracking } = await import('@/app/actions/stores')
              await updateComplianceAudit2Tracking(storeId, routeManager, routeDate)
            })
          )
          
          // Set route sequence for all stores in the route (maintains the order they were selected)
          const routeKey = `${routeArea || 'unknown'}-${routeDate}-${routeManager || 'unassigned'}`
          const { updateRouteSequence } = await import('@/app/actions/route-planning')
          await updateRouteSequence(storeIdsArray, routeKey)
      
      // Optimistically update the stores state to show the new route immediately
      const updatedStores = stores.map(store => {
        if (routeSelectedStores.has(store.id)) {
          return {
            ...store,
            compliance_audit_2_planned_date: routeDate,
            compliance_audit_2_assigned_manager_user_id: routeManager,
            assigned_manager: profiles.find(p => p.id === routeManager) || null
          }
        }
        return store
      })
      setStores(updatedStores)
      
      // Reset form
      setRouteManager(undefined)
      setRouteDate('')
      setRouteArea(null)
      setRouteSelectedStores(new Set())
      
      // Refresh the page data in the background to ensure consistency
      router.refresh()
    } catch (error) {
      console.error('Error creating route:', error)
      alert('Error creating route. Please try again.')
    } finally {
      setIsCreatingRoute(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
              <Route className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Route Planning</h1>
          </div>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl ml-11">
            Plan compliance visit routes with map visualization. Stores are hidden for 6 months after completion.
          </p>
        </div>
      </div>

      {/* Create Route Section */}
      <Card className="bg-blue-50 border-blue-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Route
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Home className="h-4 w-4" />
                Manager
              </label>
              <Select value={routeManager} onValueChange={setRouteManager}>
                <SelectTrigger>
                  <SelectValue placeholder="Select manager..." />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Route Date
              </label>
              <Input
                type="date"
                value={routeDate}
                onChange={(e) => setRouteDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                max={`${new Date().getFullYear()}-12-31`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Area
              </label>
              <Select value={routeArea || 'all'} onValueChange={(value) => handleRouteAreaSelect(value === 'all' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select area..." />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="all">All Areas</SelectItem>
                  {uniqueAreas.map((area) => (
                    <SelectItem key={area} value={area}>
                      {getAreaDisplayName(area)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Store Selection for Route */}
          {routeArea && storesInRouteArea.length > 0 && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  Stores in {getAreaDisplayName(routeArea)} ({storesInRouteArea.length} stores)
                </h3>
                <div className="flex items-center gap-2">
                  {storesInRouteArea.length >= 3 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleOptimizeRoute}
                      disabled={isOptimizing}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Suggest optimal 3 stores for this route"
                    >
                      {isOptimizing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Suggest Optimal 3 Stores
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Limit to max 3 stores when selecting all
                      if (routeSelectedStores.size >= 3 || routeSelectedStores.size === Math.min(3, storesInRouteArea.length)) {
                        setRouteSelectedStores(new Set())
                      } else {
                        const maxStores = Math.min(3, storesInRouteArea.length)
                        setRouteSelectedStores(new Set(storesInRouteArea.slice(0, maxStores).map(s => s.id)))
                      }
                    }}
                  >
                    {routeSelectedStores.size >= 3 || (routeSelectedStores.size > 0 && routeSelectedStores.size === Math.min(3, storesInRouteArea.length)) ? 'Deselect All' : 'Select All (Max 3)'}
                  </Button>
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {storesInRouteArea.map((store) => {
                      const isSelected = routeSelectedStores.has(store.id)
                      const isDisabled = !isSelected && routeSelectedStores.size >= 3
                      return (
                        <div
                          key={store.id}
                          data-store-id={store.id}
                          onClick={() => {
                            // Prevent selecting more than 3 stores
                            if (isDisabled) {
                              alert('Maximum 3 stores per day. Please deselect a store first.')
                              return
                            }
                            handleRouteStoreToggle(store.id)
                          }}
                          className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            isDisabled
                              ? 'bg-slate-50 border-2 border-transparent opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'bg-blue-100 border-2 border-blue-500 cursor-pointer'
                              : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100 cursor-pointer'
                          }`}
                        >
                      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                      }`}>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 flex items-center gap-2">
                          {store.store_name}
                          {/* Show (Revisit) flag if store has completed Audit 1 with score < 80% */}
                          {store.compliance_audit_1_date && 
                           store.compliance_audit_1_overall_pct !== null && 
                           store.compliance_audit_1_overall_pct < 80 && (
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              (Revisit)
                            </span>
                          )}
                        </div>
                        {store.store_code && (
                          <div className="text-xs text-slate-500">{store.store_code}</div>
                        )}
                      </div>
                      {store.compliance_audit_2_planned_date && (
                        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          Already planned
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">
                    {routeSelectedStores.size > 0 
                      ? `${routeSelectedStores.size} store${routeSelectedStores.size > 1 ? 's' : ''} selected`
                      : 'No stores selected'}
                  </span>
                      {routeSelectedStores.size > 0 && routeSelectedStores.size < 3 && (
                        <span className="text-xs text-blue-600">
                          Tip: You can select up to 3 stores for optimal daily route
                        </span>
                      )}
                      {routeSelectedStores.size > 3 && (
                        <span className="text-xs text-red-600">
                          Maximum 3 stores per day. Please deselect some stores.
                        </span>
                      )}
                </div>
                    <Button
                      onClick={handleCreateRoute}
                      disabled={isCreatingRoute || !routeManager || !routeDate || routeSelectedStores.size === 0 || routeSelectedStores.size > 3}
                      className="w-full"
                    >
                      {isCreatingRoute ? 'Creating Route...' : `Create Route with ${routeSelectedStores.size} Store${routeSelectedStores.size > 1 ? 's' : ''}`}
                    </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="bg-white shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Store Locations Map
            <span className="text-sm font-normal text-slate-500 ml-2">
              ({routeArea 
                ? storesWithLocations.filter(s => s.region === routeArea).length 
                : storesWithLocations.length} stores with locations)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] w-full rounded-lg overflow-hidden border border-slate-200 relative" style={{ zIndex: 0 }}>
            <MapComponent
              stores={storesWithLocations}
              managerHome={routeManager ? (() => {
                const manager = profiles.find(p => p.id === routeManager)
                if (!manager || !manager.home_latitude || !manager.home_longitude) return null
                const lat = typeof manager.home_latitude === 'string' 
                  ? parseFloat(manager.home_latitude) 
                  : manager.home_latitude
                const lng = typeof manager.home_longitude === 'string' 
                  ? parseFloat(manager.home_longitude) 
                  : manager.home_longitude
                if (isNaN(lat) || isNaN(lng)) return null
                return {
                  latitude: lat,
                  longitude: lng,
                  address: manager.home_address || 'Manager Home',
                }
              })() : managerHome}
              selectedStores={routeArea ? routeSelectedStores : selectedStores}
              onStoreSelect={routeArea ? handleRouteStoreToggle : handleStoreSelect}
              filteredArea={routeArea}
            />
          </div>
        </CardContent>
      </Card>

      {/* Planned Routes Table */}
      <Card className="bg-white shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planned Routes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plannedRoutes.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No routes planned yet.</p>
          ) : (
            <div className="rounded-md border border-slate-200 bg-white max-w-full">
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Stores</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Assigned Manager</TableHead>
                      <TableHead>Planned Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plannedRoutes.map((group, groupIndex) => {
                      const groupKey = (group as any)._groupKey || `${group.region || 'unknown'}-${group.plannedDate}-${group.managerId || 'unassigned'}`
                      
                      // Get manager home location for this route
                      const routeManager = group.managerId
                      const routeManagerProfile = profiles.find(p => p.id === routeManager)
                      const routeManagerHome = routeManagerProfile && routeManagerProfile.home_latitude && routeManagerProfile.home_longitude
                        ? {
                            latitude: typeof routeManagerProfile.home_latitude === 'string' 
                              ? parseFloat(routeManagerProfile.home_latitude) 
                              : routeManagerProfile.home_latitude,
                            longitude: typeof routeManagerProfile.home_longitude === 'string' 
                              ? parseFloat(routeManagerProfile.home_longitude) 
                              : routeManagerProfile.home_longitude,
                            address: routeManagerProfile.home_address || 'Manager Home',
                          }
                        : null
                      
                      return (
                        <TableRow 
                          key={groupKey}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={(e) => {
                            // Don't trigger if clicking on buttons or input fields
                            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
                              return
                            }
                            // Use ordered stores if available, otherwise use group.stores
                            const orderedStores = routeStoreOrder[groupKey] 
                              ? routeStoreOrder[groupKey]
                                  .map(id => group.stores.find(s => s.id === id))
                                  .filter(Boolean) as Store[]
                              : group.stores
                            
                            setSelectedRouteForDirections({
                              stores: orderedStores,
                              managerHome: routeManagerHome,
                              managerName: group.assignedManager?.full_name || 'Unassigned',
                              plannedDate: group.plannedDate,
                              managerUserId: group.managerId,
                              region: group.region
                            })
                          }}
                        >
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              {group.stores.map((store, storeIndex) => {
                                const isStoreLoading = loading[store.id]
                                const isEditing = editingRouteGroup === groupKey
                                const currentOrder = routeStoreOrder[groupKey] || group.stores.map(s => s.id)
                                const orderedIndex = currentOrder.indexOf(store.id)
                                const canMoveUp = orderedIndex > 0
                                const canMoveDown = orderedIndex < group.stores.length - 1
                                
                                return (
                                  <div key={store.id} className="flex items-center gap-2">
                                    {isEditing && (
                                      <>
                                        {/* Reorder controls */}
                                        <div className="flex flex-col gap-0.5">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleReorderStore(groupKey, store.id, 'up')
                                            }}
                                            disabled={!canMoveUp}
                                            className="h-5 w-5 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
                                            title="Move up"
                                          >
                                            <ChevronUp className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleReorderStore(groupKey, store.id, 'down')
                                            }}
                                            disabled={!canMoveDown}
                                            className="h-5 w-5 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
                                            title="Move down"
                                          >
                                            <ChevronDown className="h-3 w-3" />
                                          </Button>
                                        </div>
                                        {/* Remove button */}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemoveStoreFromRoute(store.id)
                                          }}
                                          disabled={isStoreLoading}
                                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          title="Remove from route"
                                        >
                                          {isStoreLoading ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <X className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </>
                                    )}
                                    <span>
                                      {store.store_name}
                                      {store.store_code && (
                                        <span className="text-gray-500 text-xs ml-2">({store.store_code})</span>
                                      )}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </TableCell>
                          <TableCell>{group.region ? getAreaDisplayName(group.region) : '-'}</TableCell>
                          <TableCell>
                            {group.assignedManager?.full_name || '-'}
                          </TableCell>
                          <TableCell>
                            {editingRouteGroup === groupKey ? (
                              <Input
                                type="date"
                                defaultValue={group.plannedDate || ''}
                                onBlur={async (e) => {
                                  const newDate = e.target.value
                                  if (newDate && newDate !== group.plannedDate) {
                                    setLoading({ ...loading, [group.stores[0].id]: true })
                                    try {
                                      const { updateComplianceAudit2Tracking } = await import('@/app/actions/stores')
                                      await Promise.all(
                                        group.stores.map(store => 
                                          updateComplianceAudit2Tracking(store.id, group.managerId, newDate)
                                        )
                                      )
                                      router.refresh()
                                    } catch (error) {
                                      console.error('Error updating route date:', error)
                                      alert('Error updating route date. Please try again.')
                                    } finally {
                                      setLoading({ ...loading, [group.stores[0].id]: false })
                                    }
                                  }
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    const newDate = (e.target as HTMLInputElement).value
                                    if (newDate && newDate !== group.plannedDate) {
                                      setLoading({ ...loading, [group.stores[0].id]: true })
                                      try {
                                        const { updateComplianceAudit2Tracking } = await import('@/app/actions/stores')
                                        await Promise.all(
                                          group.stores.map(store => 
                                            updateComplianceAudit2Tracking(store.id, group.managerId, newDate)
                                          )
                                        )
                                        router.refresh()
                                      } catch (error) {
                                        console.error('Error updating route date:', error)
                                        alert('Error updating route date. Please try again.')
                                      } finally {
                                        setLoading({ ...loading, [group.stores[0].id]: false })
                                      }
                                    }
                                  }
                                }}
                                className="w-40 h-8 text-sm"
                                min={new Date().toISOString().split('T')[0]}
                              />
                            ) : (
                              <span className="cursor-pointer hover:text-blue-600" onClick={() => setEditingRouteGroup(groupKey)} title="Click to edit date">
                                {group.plannedDate ? format(new Date(group.plannedDate), 'dd/MM/yyyy') : '-'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {routeOperationalItems[groupKey] && routeOperationalItems[groupKey].length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {routeOperationalItems[groupKey].map((item, idx) => (
                                  <div key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                                    <span className="text-purple-600 font-medium">{item.start_time}</span>
                                    <span>{item.title}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {editingRouteGroup === groupKey ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingRouteGroup(null)}
                                  className="h-8"
                                >
                                  Done
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingRouteGroup(groupKey)}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title="Edit route"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteRouteGroup(group)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Delete entire route"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route Directions Modal */}
      {selectedRouteForDirections && (
        <RouteDirectionsModal
          isOpen={!!selectedRouteForDirections}
          onClose={() => setSelectedRouteForDirections(null)}
          stores={selectedRouteForDirections.stores}
          managerHome={selectedRouteForDirections.managerHome}
          managerName={selectedRouteForDirections.managerName}
          plannedDate={selectedRouteForDirections.plannedDate}
          managerUserId={selectedRouteForDirections.managerUserId}
          region={selectedRouteForDirections.region}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Planned Route?</DialogTitle>
            <DialogDescription>
              {storeToDelete && storeToDelete.name.includes(',') ? (
                <>
                  Are you sure you want to delete the entire route for <strong>{storeToDelete.name}</strong>? 
                  This will clear the planned date for all stores in this route and they will appear back in the Compliance Visits Due list.
                </>
              ) : (
                <>
                  Are you sure you want to remove the planned route for <strong>{storeToDelete?.name}</strong>? 
                  This will clear the planned date and the store will appear back in the Compliance Visits Due list.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false)
                setStoreToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteRoute}
              disabled={loading[storeToDelete?.id || '']}
            >
              {loading[storeToDelete?.id || ''] ? 'Deleting...' : 'Delete Route'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
