import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
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
    { data: allStores }
  ] = await Promise.all([
    supabase.from('fa_incidents').select('*', { count: 'exact', head: true }).in('status', ['open', 'under_investigation', 'actions_in_progress']),
    supabase.from('fa_incidents').select('*', { count: 'exact', head: true }).eq('status', 'under_investigation'),
    supabase.from('fa_actions').select('*', { count: 'exact', head: true }).lt('due_date', today).not('status', 'in', '(complete,cancelled)'),
    supabase.from('fa_incidents').select('*', { count: 'exact', head: true }).in('severity', ['high', 'critical']).gte('occurred_at', thirtyDaysAgo),
    supabase.from('fa_incidents').select('status'),
    supabase.from('fa_incidents').select('severity'),
    supabase.from('fa_incidents').select(`store_id, fa_stores!inner(store_name, store_code)`).in('status', ['open', 'under_investigation', 'actions_in_progress']),
    supabase.from('fa_activity_log').select(`*, performed_by:fa_profiles!fa_activity_log_performed_by_user_id_fkey(full_name)`).order('created_at', { ascending: false }).limit(20),
    supabase.from('fa_stores').select(`id, store_name, store_code, compliance_audit_2_date, compliance_audit_2_assigned_manager_user_id, compliance_audit_2_planned_date, assigned_manager:fa_profiles!fa_stores_compliance_audit_2_assigned_manager_user_id_fkey(id, full_name)`).is('compliance_audit_2_date', null).eq('is_active', true).order('store_name', { ascending: true }),
    supabase.from('fa_profiles').select('id, full_name').order('full_name', { ascending: true }),
    supabase.from('fa_stores').select('id, compliance_audit_1_date, compliance_audit_1_overall_pct, compliance_audit_2_date, compliance_audit_2_overall_pct').eq('is_active', true)
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

  const storesNeedingSecondVisit = storesNeedingSecondVisitRaw?.map((store: any) => ({
    ...store,
    assigned_manager: Array.isArray(store.assigned_manager) 
      ? (store.assigned_manager[0] || null)
      : store.assigned_manager || null
  })) || []

  const totalStores = allStores?.length || 0
  const firstAuditsComplete = allStores?.filter(s => s.compliance_audit_1_date && s.compliance_audit_1_overall_pct !== null).length || 0
  const secondAuditsComplete = allStores?.filter(s => s.compliance_audit_2_date && s.compliance_audit_2_overall_pct !== null).length || 0
  const totalAuditsComplete = allStores?.filter(s => {
    return s.compliance_audit_1_date && s.compliance_audit_1_overall_pct !== null && 
           s.compliance_audit_2_date && s.compliance_audit_2_overall_pct !== null
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
    auditStats: {
      totalStores,
      firstAuditsComplete,
      secondAuditsComplete,
      totalAuditsComplete,
      firstAuditPercentage: totalStores > 0 ? Math.round((firstAuditsComplete / totalStores) * 100) : 0,
      secondAuditPercentage: totalStores > 0 ? Math.round((secondAuditsComplete / totalStores) * 100) : 0,
      totalAuditPercentage: totalStores > 0 ? Math.round((totalAuditsComplete / totalStores) * 100) : 0,
    },
  }
}

// --- Main Page Component ---

export default async function DashboardPage() {
  await requireAuth()
  const data = await getDashboardData()

  return <DashboardClient initialData={data} />
}