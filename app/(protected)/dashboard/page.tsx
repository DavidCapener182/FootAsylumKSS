import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { truncateToDecimals } from '@/lib/utils'
import { subDays } from 'date-fns'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

// --- Data Fetching ---

async function getDashboardData() {
  const supabase = createClient()
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: openIncidents },
    { count: underInvestigation },
    { count: overdueActions },
    { count: highCritical },
    { data: incidentsByStatus },
    { data: incidentsBySeverity },
    { data: storeStats },
    { data: recentActivity },
    { data: storesNeedingSecondVisitRaw },
    { data: profiles },
    { data: allStores },
    { data: plannedRoutesRaw },
    { data: fraStores }
  ] = await Promise.all([
    supabase.from('fa_incidents').select('*', { count: 'exact', head: true }).in('status', ['open', 'under_investigation', 'actions_in_progress']),
    supabase.from('fa_incidents').select('*', { count: 'exact', head: true }).eq('status', 'under_investigation'),
    supabase.from('fa_actions').select('*', { count: 'exact', head: true }).lt('due_date', today).not('status', 'in', '(complete,cancelled)'),
    supabase.from('fa_incidents').select('*', { count: 'exact', head: true }).in('severity', ['high', 'critical']).gte('occurred_at', thirtyDaysAgo),
    supabase.from('fa_incidents').select('status'),
    supabase.from('fa_incidents').select('severity'),
    supabase.from('fa_incidents').select(`store_id, fa_stores!inner(store_name, store_code)`).in('status', ['open', 'under_investigation', 'actions_in_progress']),
    supabase.from('fa_activity_log').select(`*, performed_by:fa_profiles!fa_activity_log_performed_by_user_id_fkey(full_name)`).order('created_at', { ascending: false }).limit(20),
    supabase.from('fa_stores').select(`id, store_name, store_code, compliance_audit_1_date, compliance_audit_2_date, compliance_audit_2_assigned_manager_user_id, compliance_audit_2_planned_date, assigned_manager:fa_profiles!fa_stores_compliance_audit_2_assigned_manager_user_id_fkey(id, full_name)`).is('compliance_audit_2_date', null).eq('is_active', true).order('store_name', { ascending: true }),
    supabase.from('fa_profiles').select('id, full_name').order('full_name', { ascending: true }),
    supabase.from('fa_stores').select('id, compliance_audit_1_date, compliance_audit_1_overall_pct, compliance_audit_2_date, compliance_audit_2_overall_pct').eq('is_active', true),
        supabase.from('fa_stores').select(`id, store_name, store_code, region, postcode, latitude, longitude, compliance_audit_2_planned_date, compliance_audit_2_assigned_manager_user_id, route_sequence, assigned_manager:fa_profiles!fa_stores_compliance_audit_2_assigned_manager_user_id_fkey(id, full_name, home_address, home_latitude, home_longitude)`).not('compliance_audit_2_planned_date', 'is', null).eq('is_active', true).order('compliance_audit_2_planned_date', { ascending: true }),
    supabase.from('fa_stores').select('id, compliance_audit_1_date, compliance_audit_2_date, fire_risk_assessment_date').eq('is_active', true)
  ])

  // Data Processing
  const statusCounts = incidentsByStatus?.reduce((acc: Record<string, number>, incident) => {
    acc[incident.status] = (acc[incident.status] || 0) + 1
    return acc
  }, {}) || {}

  const severityCounts = incidentsBySeverity?.reduce((acc: Record<string, number>, incident) => {
    acc[incident.severity] = (acc[incident.severity] || 0) + 1
    return acc
  }, {}) || {}

  const storeCounts = storeStats?.reduce((acc: Record<string, { name: string; code?: string; count: number }>, item: any) => {
    const storeId = item.store_id
    if (!acc[storeId]) {
      acc[storeId] = {
        name: item.fa_stores?.store_name || 'Unknown',
        code: item.fa_stores?.store_code,
        count: 0,
      }
    }
    acc[storeId].count++
    return acc
  }, {}) || {}

  const topStores = Object.entries(storeCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([id, data]) => ({ id, ...data }))
  
  const maxStoreCount = topStores.length > 0 ? Math.max(...topStores.map(s => s.count)) : 0

  // Filter out stores that completed audit 1 today (2026) or within the last 6 months
  // We're starting fresh for 2026, so hide stores that completed audit 1 recently
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  sixMonthsAgo.setHours(0, 0, 0, 0)
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const storesNeedingSecondVisit = storesNeedingSecondVisitRaw
    ?.filter((store: any) => {
      // If store completed audit 1 today or within last 6 months (2026), hide it
      if (store.compliance_audit_1_date) {
        const audit1Date = new Date(store.compliance_audit_1_date)
        audit1Date.setHours(0, 0, 0, 0)
        
        // Hide if audit 1 was completed today or within last 6 months
        if (audit1Date >= sixMonthsAgo) {
          return false
        }
      }
      return true
    })
    ?.map((store: any) => ({
      ...store,
      assigned_manager: Array.isArray(store.assigned_manager) 
        ? (store.assigned_manager[0] || null)
        : store.assigned_manager || null
    })) || []

  // Process planned routes - group by manager, area, and date
  const plannedRoutes = (plannedRoutesRaw || []).reduce((acc: any[], store: any) => {
    const managerId = store.compliance_audit_2_assigned_manager_user_id
    const region = store.region
    const plannedDate = store.compliance_audit_2_planned_date
    const manager = Array.isArray(store.assigned_manager) 
      ? (store.assigned_manager[0] || null)
      : store.assigned_manager || null
    
    const key = `${managerId || 'unassigned'}-${region || 'unknown'}-${plannedDate}`
    const existing = acc.find(r => r.key === key)
    
    if (existing) {
      existing.storeCount++
      // Store full store data with route_sequence for sorting later
      existing.stores.push({
        id: store.id,
        name: store.store_name,
        store_code: store.store_code,
        postcode: store.postcode,
        latitude: store.latitude,
        longitude: store.longitude,
        sequence: store.route_sequence ?? null
      })
    } else {
      acc.push({
        key,
        managerId,
        managerName: manager?.full_name || 'Unassigned',
        area: region || 'Unknown',
        plannedDate,
        storeCount: 1,
        managerHome: manager?.home_latitude && manager?.home_longitude ? {
          latitude: typeof manager.home_latitude === 'string' 
            ? parseFloat(manager.home_latitude) 
            : manager.home_latitude,
          longitude: typeof manager.home_longitude === 'string' 
            ? parseFloat(manager.home_longitude) 
            : manager.home_longitude,
          address: manager.home_address || 'Manager Home',
        } : null,
        stores: [{
          id: store.id,
          name: store.store_name,
          store_code: store.store_code,
          postcode: store.postcode,
          latitude: store.latitude,
          longitude: store.longitude,
          sequence: store.route_sequence ?? null
        }]
      })
    }
    
    return acc
  }, []).map(route => {
    // Sort stores within each route by route_sequence
    const sortedStores = [...route.stores].sort((a, b) => {
      if (a.sequence !== null && b.sequence !== null) {
        return a.sequence - b.sequence
      }
      if (a.sequence !== null) return -1
      if (b.sequence !== null) return 1
      return 0
    })
    // Return full store data
    return {
      ...route,
      stores: sortedStores
    }
  }).sort((a, b) => {
    // Sort by date, then by manager name
    const dateCompare = (a.plannedDate || '').localeCompare(b.plannedDate || '')
    if (dateCompare !== 0) return dateCompare
    return a.managerName.localeCompare(b.managerName)
  })

  // Fetch operational items for each planned route
  const routesWithOperationalItems = await Promise.all(plannedRoutes.map(async (route) => {
    if (!route.managerId || !route.plannedDate) {
      return { ...route, operationalItems: [] }
    }

    try {
      const { data: operationalItems, error } = await supabase
        .from('fa_route_operational_items')
        .select('title, location')
        .eq('manager_user_id', route.managerId)
        .eq('planned_date', route.plannedDate)
        .eq('region', route.area)
        .order('start_time')

      if (error) {
        console.error('Error fetching operational items for route:', error)
        return { ...route, operationalItems: [] }
      }

      return {
        ...route,
        operationalItems: operationalItems || []
      }
    } catch (e) {
      console.error('Error fetching operational items:', e)
      return { ...route, operationalItems: [] }
    }
  }))

  const totalStores = allStores?.length || 0
  const firstAuditsComplete = allStores?.filter(s => s.compliance_audit_1_date && s.compliance_audit_1_overall_pct !== null).length || 0
  const secondAuditsComplete = allStores?.filter(s => s.compliance_audit_2_date && s.compliance_audit_2_overall_pct !== null).length || 0
  const totalAuditsComplete = allStores?.filter(s => {
    return s.compliance_audit_1_date && s.compliance_audit_1_overall_pct !== null && 
           s.compliance_audit_2_date && s.compliance_audit_2_overall_pct !== null
  }).length || 0

  // Calculate stores requiring FRA (have audit 1 or 2 in current year, but haven't completed FRA)
  // Use same logic as FRA page - use allStores which we already have
  const currentYear = new Date().getFullYear()
  
  // Get FRA data if available (handle missing columns gracefully)
  let fraDataMap = new Map()
  if (fraStores && fraStores.length > 0) {
    fraStores.forEach((store: any) => {
      fraDataMap.set(store.id, {
        fire_risk_assessment_date: store.fire_risk_assessment_date || null,
        fire_risk_assessment_pct: null // Will try to fetch separately
      })
    })
    
    // Try to fetch percentage column if it exists
    try {
      const storeIds = Array.from(fraDataMap.keys())
      const { data: fraPctData, error: pctError } = await supabase
        .from('fa_stores')
        .select('id, fire_risk_assessment_pct')
        .in('id', storeIds)
      
      if (!pctError && fraPctData) {
        fraPctData.forEach((f: any) => {
          const existing = fraDataMap.get(f.id)
          if (existing) {
            existing.fire_risk_assessment_pct = f.fire_risk_assessment_pct
          }
        })
      }
    } catch (e) {
      // Percentage column doesn't exist yet - that's okay
    }
  }
  
  // Use allStores (which we already have) to calculate - more reliable
  const storesRequiringFRA = (allStores || []).filter((store: any) => {
    // Check if store needs FRA (has audit 1 or 2 in current year)
    let needsFRA = false
    
    // Check audit 1 date
    if (store.compliance_audit_1_date) {
      try {
        const audit1Date = new Date(store.compliance_audit_1_date)
        if (!isNaN(audit1Date.getTime())) {
          const audit1Year = audit1Date.getFullYear()
          if (audit1Year === currentYear) {
            needsFRA = true
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // Check audit 2 date
    if (!needsFRA && store.compliance_audit_2_date) {
      try {
        const audit2Date = new Date(store.compliance_audit_2_date)
        if (!isNaN(audit2Date.getTime())) {
          const audit2Year = audit2Date.getFullYear()
          if (audit2Year === currentYear) {
            needsFRA = true
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    if (!needsFRA) return false
    
    // Get FRA data for this store
    const fraData = fraDataMap.get(store.id) || { fire_risk_assessment_date: null, fire_risk_assessment_pct: null }
    const fraDate = fraData.fire_risk_assessment_date
    
    // Calculate FRA status (same logic as getFRAStatus helper)
    let status: 'up_to_date' | 'due' | 'overdue' | 'required' = 'required'
    if (fraDate) {
      try {
        const date = new Date(fraDate)
        const nextDue = new Date(date)
        nextDue.setMonth(nextDue.getMonth() + 12)
        
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dueDate = new Date(nextDue)
        dueDate.setHours(0, 0, 0, 0)
        
        const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff < 0) {
          status = 'overdue'
        } else if (daysDiff <= 30) {
          status = 'due'
        } else {
          status = 'up_to_date'
        }
      } catch (e) {
        // If date parsing fails, keep as 'required'
      }
    }
    
    // Show stores that need FRA and are NOT "up_to_date"
    // "Up to date" stores should be counted as completed, not requiring action
    return status !== 'up_to_date'
  }).length || 0

  return {
    openIncidents: openIncidents || 0,
    underInvestigation: underInvestigation || 0,
    overdueActions: overdueActions || 0,
    highCritical: highCritical || 0,
    statusCounts,
    totalIncidents: incidentsByStatus?.length || 0,
    severityCounts,
    topStores,
    maxStoreCount,
    recentActivity: recentActivity || [],
    storesNeedingSecondVisit,
    profiles: profiles || [],
    plannedRoutes: routesWithOperationalItems,
    auditStats: {
      totalStores,
      firstAuditsComplete,
      secondAuditsComplete,
      totalAuditsComplete,
      firstAuditPercentage: totalStores > 0 ? truncateToDecimals((firstAuditsComplete / totalStores) * 100) : 0,
      secondAuditPercentage: totalStores > 0 ? truncateToDecimals((secondAuditsComplete / totalStores) * 100) : 0,
      totalAuditPercentage: totalStores > 0 ? truncateToDecimals((totalAuditsComplete / totalStores) * 100) : 0,
    },
    storesRequiringFRA,
  }
}

// --- Main Page Component ---

export default async function DashboardPage() {
  await requireAuth()
  const data = await getDashboardData()

  return <DashboardClient initialData={data} />
}