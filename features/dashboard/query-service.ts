import { z } from 'zod'

import type { DashboardData, RegionalCompliance } from '@/components/dashboard/dashboard-types'
import { computeComplianceForecast, getFRAStatusFromDate } from '@/lib/compliance-forecast'
import { observeQuery } from '@/lib/observability'
import { shouldHideStore } from '@/lib/store-normalization'
import { createClient } from '@/lib/supabase/server'
import { truncateToDecimals } from '@/lib/utils'

const storeSchema = z.object({
  id: z.string(),
  store_name: z.string(),
  store_code: z.string().nullable(),
  region: z.string().nullable(),
  is_active: z.boolean(),
  compliance_audit_1_date: z.string().nullable(),
  compliance_audit_1_overall_pct: z.number().nullable(),
  compliance_audit_2_date: z.string().nullable(),
  compliance_audit_2_overall_pct: z.number().nullable(),
  compliance_audit_2_planned_date: z.string().nullable(),
  fire_risk_assessment_date: z.string().nullable(),
})

const incidentSchema = z.object({
  store_id: z.string().nullable(),
  status: z.string(),
  severity: z.string(),
  occurred_at: z.string(),
})

const actionSchema = z.object({
  store_id: z.string().nullable().optional(),
  status: z.string(),
  priority: z.string(),
  due_date: z.string(),
})

const routeSchema = z.object({
  id: z.string(),
  store_name: z.string(),
  store_code: z.string().nullable(),
  region: z.string().nullable(),
  compliance_audit_2_planned_date: z.string(),
})

function assertResult<T>(label: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(`Unable to load ${label}: ${result.error.message}`)
  if (!result.data) return [] as T
  return result.data
}

function dateOnly(value: string) {
  const parsed = new Date(value)
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

export async function getDashboardData(): Promise<DashboardData> {
  return observeQuery('dashboard.workspace', async () => {
    const supabase = createClient()
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const fourteenDays = new Date(now)
    fourteenDays.setDate(fourteenDays.getDate() + 14)

    const [storesResult, incidentsResult, incidentActionsResult, storeActionsResult, activityResult, routesResult] = await Promise.all([
      supabase.from('fa_stores').select(`id, store_name, store_code, region, is_active,
        compliance_audit_1_date, compliance_audit_1_overall_pct,
        compliance_audit_2_date, compliance_audit_2_overall_pct,
        compliance_audit_2_planned_date, fire_risk_assessment_date`).eq('is_active', true),
      supabase.from('fa_incidents').select('store_id, status, severity, occurred_at'),
      supabase.from('fa_actions').select('status, priority, due_date'),
      supabase.from('fa_store_actions').select('store_id, status, priority, due_date'),
      supabase.from('fa_activity_log').select('id, action, entity_type, details, created_at, performed_by:fa_profiles!fa_activity_log_performed_by_user_id_fkey(full_name)').order('created_at', { ascending: false }).limit(20),
      supabase.from('fa_stores').select('id, store_name, store_code, region, compliance_audit_2_planned_date').eq('is_active', true).not('compliance_audit_2_planned_date', 'is', null).gte('compliance_audit_2_planned_date', today).order('compliance_audit_2_planned_date'),
    ])

    const stores = z.array(storeSchema).parse(assertResult('dashboard stores', storesResult)).filter((store) => !shouldHideStore(store))
    const storeIds = new Set(stores.map((store) => store.id))
    const incidents = z.array(incidentSchema).parse(assertResult('dashboard incidents', incidentsResult))
    const incidentActions = z.array(actionSchema).parse(assertResult('dashboard incident actions', incidentActionsResult))
    const storeActions = z.array(actionSchema).parse(assertResult('dashboard store actions', storeActionsResult)).filter((action) => !action.store_id || storeIds.has(action.store_id))
    const routes = z.array(routeSchema).parse(assertResult('dashboard routes', routesResult)).filter((route) => storeIds.has(route.id))
    const recentActivity = assertResult('dashboard activity', activityResult) as Array<Record<string, unknown>>

    const activeStatuses = new Set(['open', 'under_investigation', 'actions_in_progress'])
    const incompleteStatuses = new Set(['complete', 'completed', 'cancelled'])
    const openIncidents = incidents.filter((incident) => activeStatuses.has(incident.status)).length
    const underInvestigation = incidents.filter((incident) => incident.status === 'under_investigation').length
    const highCritical = incidents.filter((incident) => ['high', 'critical'].includes(incident.severity)).length
    const allActions = [...incidentActions, ...storeActions]
    const activeActions = allActions.filter((action) => !incompleteStatuses.has(action.status.toLowerCase()))
    const overdueActions = activeActions.filter((action) => action.due_date < today).length
    const firstAuditsComplete = stores.filter((store) => store.compliance_audit_1_date && store.compliance_audit_1_overall_pct !== null).length
    const secondAuditsComplete = stores.filter((store) => store.compliance_audit_2_date && store.compliance_audit_2_overall_pct !== null).length
    const awaitingSecondAudit = stores.filter((store) => store.compliance_audit_1_date && !store.compliance_audit_2_date).length
    const secondAuditPlanned = stores.filter((store) => store.compliance_audit_1_date && !store.compliance_audit_2_date && store.compliance_audit_2_planned_date).length
    const fraCounts = stores.reduce((counts, store) => {
      counts[getFRAStatusFromDate(store.fire_risk_assessment_date, now)] += 1
      return counts
    }, { required: 0, due: 0, overdue: 0, up_to_date: 0 })

    const regionMap = stores.reduce((map, store) => {
      const region = store.region || 'Not assigned'
      const entry = map.get(region) || { region, total: 0, inDate: 0 }
      entry.total += 1
      if (['up_to_date', 'due'].includes(getFRAStatusFromDate(store.fire_risk_assessment_date, now))) entry.inDate += 1
      map.set(region, entry)
      return map
    }, new Map<string, { region: string; total: number; inDate: number }>())
    const regionalCompliance: RegionalCompliance[] = [...regionMap.values()].map((entry) => ({
      ...entry,
      inDatePercentage: entry.total ? truncateToDecimals((entry.inDate / entry.total) * 100) : 0,
    })).sort((a, b) => b.inDatePercentage - a.inDatePercentage)

    const openIncidentsByStore = incidents.reduce<Record<string, number>>((counts, incident) => {
      if (incident.store_id && storeIds.has(incident.store_id) && activeStatuses.has(incident.status)) counts[incident.store_id] = (counts[incident.store_id] || 0) + 1
      return counts
    }, {})
    const overdueActionsByStore = storeActions.reduce<Record<string, number>>((counts, action) => {
      if (action.store_id && action.due_date < today && !incompleteStatuses.has(action.status.toLowerCase())) counts[action.store_id] = (counts[action.store_id] || 0) + 1
      return counts
    }, {})

    const statusCounts = incidents.reduce<Record<string, number>>((counts, incident) => {
      counts[incident.status] = (counts[incident.status] || 0) + 1
      return counts
    }, {})
    const severityCounts = incidents.reduce<Record<string, number>>((counts, incident) => {
      counts[incident.severity] = (counts[incident.severity] || 0) + 1
      return counts
    }, {})
    const totalStores = stores.length
    const plannedRoutes = routes.map((route) => ({
      key: route.id,
      plannedDate: route.compliance_audit_2_planned_date,
      area: route.region || 'Not assigned',
      storeCount: 1,
      stores: [{ id: route.id, name: route.store_name, store_code: route.store_code }],
      managerName: 'Assigned manager',
    }))

    return {
      openIncidents,
      underInvestigation,
      overdueActions,
      highCritical,
      statusCounts,
      totalIncidents: incidents.length,
      severityCounts,
      recentActivity,
      plannedRoutes,
      storesNeedingSecondVisit: stores.filter((store) => store.compliance_audit_1_date && !store.compliance_audit_2_date),
      auditStats: {
        totalStores,
        firstAuditsComplete,
        secondAuditsComplete,
        totalAuditsComplete: stores.filter((store) => [store.compliance_audit_1_overall_pct, store.compliance_audit_2_overall_pct].some((score) => typeof score === 'number' && score >= 80) && ['up_to_date', 'due'].includes(getFRAStatusFromDate(store.fire_risk_assessment_date, now))).length,
        firstAuditPercentage: totalStores ? truncateToDecimals((firstAuditsComplete / totalStores) * 100) : 0,
        secondAuditPercentage: totalStores ? truncateToDecimals((secondAuditsComplete / totalStores) * 100) : 0,
      },
      storeActionStats: {
        totalTracked: storeActions.length,
        active: storeActions.filter((action) => !incompleteStatuses.has(action.status.toLowerCase())).length,
        overdue: storeActions.filter((action) => action.due_date < today && !incompleteStatuses.has(action.status.toLowerCase())).length,
        highUrgent: storeActions.filter((action) => ['high', 'urgent'].includes(action.priority.toLowerCase()) && !incompleteStatuses.has(action.status.toLowerCase())).length,
      },
      combinedActionStats: { incidentOverdue: incidentActions.filter((action) => action.due_date < today && !incompleteStatuses.has(action.status.toLowerCase())).length, storeOverdue: overdueActionsByStore ? Object.values(overdueActionsByStore).reduce((sum, value) => sum + value, 0) : 0, totalOverdue: overdueActions },
      complianceTracking: {
        noAuditStartedCount: stores.filter((store) => !store.compliance_audit_1_date && !store.compliance_audit_2_date).length,
        audit1CompleteCount: firstAuditsComplete,
        audit2CompleteCount: secondAuditsComplete,
        awaitingSecondAuditCount: awaitingSecondAudit,
        secondAuditPlannedCount: secondAuditPlanned,
        secondAuditUnplannedCount: Math.max(0, awaitingSecondAudit - secondAuditPlanned),
        storesNeedingSecondVisitCount: awaitingSecondAudit,
        plannedRoutesCount: plannedRoutes.length,
        plannedVisitsNext14Days: routes.filter((route) => dateOnly(route.compliance_audit_2_planned_date) <= fourteenDays).length,
      },
      fraStats: {
        required: fraCounts.required,
        due: fraCounts.due,
        overdue: fraCounts.overdue,
        upToDate: fraCounts.up_to_date,
        inDate: fraCounts.due + fraCounts.up_to_date,
        inDateCoveragePercentage: totalStores ? truncateToDecimals(((fraCounts.due + fraCounts.up_to_date) / totalStores) * 100) : 0,
      },
      storesRequiringFRA: fraCounts.required + fraCounts.overdue,
      regionalCompliance,
      complianceForecast: computeComplianceForecast(stores, { openIncidentsByStore, overdueActionsByStore, referenceDate: now }),
    }
  })
}
