import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { truncateToDecimals } from '@/lib/utils'
import { subDays } from 'date-fns'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { computeComplianceForecast, getFRAStatusFromDate } from '@/lib/compliance-forecast'

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
    { data: fraStores },
    { data: openIncidentsByStoreRaw },
    { data: overdueActionsByStoreRaw },
    { data: storeActionsRaw }
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
    supabase
      .from('fa_stores')
      .select(`
        id,
        store_name,
        store_code,
        region,
        compliance_audit_1_date,
        compliance_audit_1_overall_pct,
        compliance_audit_2_date,
        compliance_audit_2_overall_pct,
        fire_risk_assessment_date,
        compliance_audit_2_planned_date
      `)
      .eq('is_active', true),
        supabase.from('fa_stores').select(`id, store_name, store_code, region, postcode, latitude, longitude, compliance_audit_2_planned_date, compliance_audit_2_assigned_manager_user_id, route_sequence, assigned_manager:fa_profiles!fa_stores_compliance_audit_2_assigned_manager_user_id_fkey(id, full_name, home_address, home_latitude, home_longitude)`).not('compliance_audit_2_planned_date', 'is', null).eq('is_active', true).order('compliance_audit_2_planned_date', { ascending: true }),
    supabase.from('fa_stores').select('id, compliance_audit_1_date, compliance_audit_2_date, fire_risk_assessment_date').eq('is_active', true),
    supabase
      .from('fa_incidents')
      .select('store_id')
      .in('status', ['open', 'under_investigation', 'actions_in_progress']),
    supabase
      .from('fa_actions')
      .select(`
        status,
        due_date,
        incident:fa_incidents!fa_actions_incident_id_fkey(
          store_id
        )
      `)
      .lt('due_date', today)
      .not('status', 'in', '(complete,cancelled)'),
    supabase
      .from('fa_store_actions')
      .select(`
        store_id,
        status,
        due_date,
        priority,
        store:fa_stores!fa_store_actions_store_id_fkey(store_name, store_code)
      `)
      .not('status', 'eq', 'cancelled')
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

  const parseDateOnly = (value: string | null | undefined): Date | null => {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    parsed.setHours(0, 0, 0, 0)
    return parsed
  }

  const todayDateOnly = parseDateOnly(today) || new Date()

  const storeActions = (storeActionsRaw || []) as any[]
  const activeStoreActions = storeActions.filter((action) => {
    const status = String(action?.status || '').toLowerCase()
    return status !== 'complete' && status !== 'cancelled'
  })

  const overdueStoreActionsCount = activeStoreActions.filter((action) => {
    const dueDate = parseDateOnly(action?.due_date)
    return dueDate ? dueDate.getTime() < todayDateOnly.getTime() : false
  }).length

  const highUrgentStoreActionsCount = activeStoreActions.filter((action) => {
    const priority = String(action?.priority || '').toLowerCase()
    return priority === 'high' || priority === 'urgent'
  }).length

  const storeActionsByStatus = activeStoreActions.reduce((acc: Record<string, number>, action: any) => {
    const status = String(action?.status || 'unknown').toLowerCase()
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const storeActionsByPriority = activeStoreActions.reduce((acc: Record<string, number>, action: any) => {
    const priority = String(action?.priority || 'unknown').toLowerCase()
    acc[priority] = (acc[priority] || 0) + 1
    return acc
  }, {})

  const storeActionCountsByStore = activeStoreActions.reduce((acc: Record<string, { name: string; code?: string; count: number; overdue: number }>, action: any) => {
    const storeId = String(action?.store_id || '')
    if (!storeId) return acc

    const storeRel = Array.isArray(action?.store) ? action.store[0] : action?.store
    if (!acc[storeId]) {
      acc[storeId] = {
        name: storeRel?.store_name || 'Unknown',
        code: storeRel?.store_code || undefined,
        count: 0,
        overdue: 0,
      }
    }

    acc[storeId].count += 1
    const dueDate = parseDateOnly(action?.due_date)
    if (dueDate && dueDate.getTime() < todayDateOnly.getTime()) {
      acc[storeId].overdue += 1
    }

    return acc
  }, {})

  const topStoresByStoreActions = Object.entries(storeActionCountsByStore)
    .sort(([, a], [, b]) => {
      if (b.overdue !== a.overdue) return b.overdue - a.overdue
      return b.count - a.count
    })
    .slice(0, 5)
    .map(([id, data]) => ({ id, ...data }))

  const openIncidentsByStore = (openIncidentsByStoreRaw || []).reduce((acc: Record<string, number>, row: any) => {
    if (!row?.store_id) return acc
    acc[row.store_id] = (acc[row.store_id] || 0) + 1
    return acc
  }, {})

  const overdueActionsByStore = (overdueActionsByStoreRaw || []).reduce((acc: Record<string, number>, row: any) => {
    const incidentRel = Array.isArray(row.incident) ? row.incident[0] : row.incident
    const storeId = incidentRel?.store_id
    if (!storeId) return acc
    acc[storeId] = (acc[storeId] || 0) + 1
    return acc
  }, {})

  const complianceForecast = computeComplianceForecast((allStores || []) as any, {
    openIncidentsByStore,
    overdueActionsByStore,
    referenceDate: new Date(),
  })

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
    const status = getFRAStatusFromDate(fraData.fire_risk_assessment_date)
    
    // Stores with in-date FRA (due or up_to_date) are counted as compliant, not requiring action.
    return status === 'required' || status === 'overdue'
  }).length || 0

  const allActiveStores = (allStores || []) as any[]
  const audit1CompleteCount = allActiveStores.filter((store: any) => Boolean(store.compliance_audit_1_date && store.compliance_audit_1_overall_pct !== null)).length
  const audit2CompleteCount = allActiveStores.filter((store: any) => Boolean(store.compliance_audit_2_date && store.compliance_audit_2_overall_pct !== null)).length
  const noAuditStartedCount = allActiveStores.filter((store: any) => !store.compliance_audit_1_date && !store.compliance_audit_2_date).length
  const awaitingSecondAuditCount = allActiveStores.filter((store: any) => Boolean(store.compliance_audit_1_date && !store.compliance_audit_2_date)).length
  const secondAuditPlannedCount = allActiveStores.filter((store: any) => Boolean(store.compliance_audit_1_date && !store.compliance_audit_2_date && store.compliance_audit_2_planned_date)).length
  const secondAuditUnplannedCount = Math.max(0, awaitingSecondAuditCount - secondAuditPlannedCount)

  const fraStatusCounts = allActiveStores.reduce((acc: Record<'required' | 'due' | 'overdue' | 'up_to_date', number>, store: any) => {
    const fraData = fraDataMap.get(store.id) || { fire_risk_assessment_date: null }
    const status = getFRAStatusFromDate(fraData.fire_risk_assessment_date)
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {
    required: 0,
    due: 0,
    overdue: 0,
    up_to_date: 0,
  })

  const fourteenDaysFromNow = new Date(todayDateOnly)
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14)
  const plannedVisitsNext14Days = routesWithOperationalItems.filter((route: any) => {
    const plannedDate = parseDateOnly(route?.plannedDate)
    if (!plannedDate) return false
    return plannedDate.getTime() >= todayDateOnly.getTime() && plannedDate.getTime() <= fourteenDaysFromNow.getTime()
  }).length

  // Fully compliant: at least one audit score of 80% or higher AND FRA in date (up_to_date or due).
  const totalAuditsComplete = (allStores || []).filter((store: any) => {
    const auditScores = [store.compliance_audit_1_overall_pct, store.compliance_audit_2_overall_pct]
      .filter((score: unknown): score is number => typeof score === 'number' && !isNaN(score))
    const hasPassingAudit = auditScores.some((score) => score >= 80)
    if (!hasPassingAudit) return false

    const fraData = fraDataMap.get(store.id) || { fire_risk_assessment_date: null, fire_risk_assessment_pct: null }
    const fraStatus = getFRAStatusFromDate(fraData.fire_risk_assessment_date)
    const hasInDateFRA = fraStatus === 'up_to_date' || fraStatus === 'due'

    return hasInDateFRA
  }).length

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
    storeActionStats: {
      totalTracked: storeActions.length,
      active: activeStoreActions.length,
      overdue: overdueStoreActionsCount,
      highUrgent: highUrgentStoreActionsCount,
      statusCounts: storeActionsByStatus,
      priorityCounts: storeActionsByPriority,
      topStores: topStoresByStoreActions,
    },
    combinedActionStats: {
      incidentOverdue: overdueActions || 0,
      storeOverdue: overdueStoreActionsCount,
      totalOverdue: (overdueActions || 0) + overdueStoreActionsCount,
    },
    complianceTracking: {
      noAuditStartedCount,
      audit1CompleteCount,
      audit2CompleteCount,
      awaitingSecondAuditCount,
      secondAuditPlannedCount,
      secondAuditUnplannedCount,
      storesNeedingSecondVisitCount: storesNeedingSecondVisit.length,
      plannedRoutesCount: routesWithOperationalItems.length,
      plannedVisitsNext14Days,
    },
    fraStats: {
      required: fraStatusCounts.required,
      due: fraStatusCounts.due,
      overdue: fraStatusCounts.overdue,
      upToDate: fraStatusCounts.up_to_date,
      inDate: fraStatusCounts.due + fraStatusCounts.up_to_date,
      inDateCoveragePercentage: totalStores > 0
        ? truncateToDecimals(((fraStatusCounts.due + fraStatusCounts.up_to_date) / totalStores) * 100)
        : 0,
    },
    storesRequiringFRA,
    complianceForecast,
  }
}

// --- Main Page Component ---

export default async function DashboardPage() {
  await requireAuth()
  const data = await getDashboardData()

  return <DashboardClient initialData={data} />
}
