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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm">Overview of compliance status</p>
      </div>

      {/* KPI Section - Compact Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 flex flex-row items-center justify-between space-y-0 bg-white shadow-sm border-slate-200">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Open Incidents</span>
            <span className="text-2xl font-bold text-slate-900">{data.openIncidents}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center justify-between space-y-0 bg-white shadow-sm border-slate-200">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Investigating</span>
            <span className="text-2xl font-bold text-slate-900">{data.underInvestigation}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center justify-between space-y-0 bg-white shadow-sm border-slate-200">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overdue Actions</span>
            <span className="text-2xl font-bold text-slate-900">{data.overdueActions}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center">
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center justify-between space-y-0 bg-white shadow-sm border-slate-200">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">High Risk (30d)</span>
            <span className="text-2xl font-bold text-slate-900">{data.highCritical}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-rose-600" />
          </div>
        </Card>
      </div>

      {/* Main Grid Content */}
      <div className="grid gap-6 md:grid-cols-12">
        
        {/* Row 1: Audit Stats (Inline for tighter control) */}
        <div className="md:col-span-12 lg:col-span-6 flex flex-col h-full">
           <Card className="h-full shadow-sm border-slate-200">
            <CardHeader className="pb-2 pt-5 px-6">
              <CardTitle className="text-base font-semibold text-slate-800">Audit Completion</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <Tabs defaultValue="first" className="w-full">
                {/* Reduced margin-bottom here to bring tabs closer to header */}
                <TabsList className="w-full mb-4 bg-slate-100/80 min-w-0 justify-start overflow-x-auto gap-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
                  <TabsTrigger value="first" className="shrink-0 sm:shrink min-w-0 truncate px-3 sm:px-2 text-[11px] sm:text-xs">
                    First Audits
                  </TabsTrigger>
                  <TabsTrigger value="second" className="shrink-0 sm:shrink min-w-0 truncate px-3 sm:px-2 text-[11px] sm:text-xs">
                    Second Audits
                  </TabsTrigger>
                  <TabsTrigger value="total" className="shrink-0 sm:shrink min-w-0 truncate px-3 sm:px-2 text-[11px] sm:text-xs">
                    Total Complete
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="first" className="mt-0 space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-end justify-between gap-3 min-w-0">
                      <span className="text-4xl font-bold text-emerald-600">{data.auditStats.firstAuditPercentage}%</span>
                      <span className="text-xs sm:text-sm text-slate-500 mb-1 text-right min-w-0">
                        {data.auditStats.firstAuditsComplete} of {data.auditStats.totalStores} stores
                      </span>
                    </div>
                    <ProgressBar value={data.auditStats.firstAuditPercentage} colorClass="bg-emerald-500" />
                  </div>
                </TabsContent>

                <TabsContent value="second" className="mt-0 space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-end justify-between gap-3 min-w-0">
                      <span className="text-4xl font-bold text-blue-600">{data.auditStats.secondAuditPercentage}%</span>
                      <span className="text-xs sm:text-sm text-slate-500 mb-1 text-right min-w-0">
                        {data.auditStats.secondAuditsComplete} of {data.auditStats.totalStores} stores
                      </span>
                    </div>
                    <ProgressBar value={data.auditStats.secondAuditPercentage} colorClass="bg-blue-500" />
                  </div>
                </TabsContent>

                <TabsContent value="total" className="mt-0 space-y-4">
                   <div className="flex flex-col gap-2">
                    <div className="flex items-end justify-between gap-3 min-w-0">
                      <span className="text-4xl font-bold text-purple-600">{data.auditStats.totalAuditPercentage}%</span>
                      <span className="text-xs sm:text-sm text-slate-500 mb-1 text-right min-w-0">
                        {data.auditStats.totalAuditsComplete} of {data.auditStats.totalStores} stores
                      </span>
                    </div>
                    <ProgressBar value={data.auditStats.totalAuditPercentage} colorClass="bg-purple-500" />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Row 1 Right: Status & Severity */}
        <div className="md:col-span-12 lg:col-span-3">
          <Card className="h-full border-l-4 border-l-purple-500 shadow-sm border-t-slate-200 border-r-slate-200 border-b-slate-200">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-500">By Status</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {Object.keys(data.statusCounts).length === 0 ? (
                <p className="text-slate-400 text-sm italic">No data available</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-sm font-medium text-slate-700 capitalize truncate pr-2 min-w-0">
                        {status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-full min-w-[24px] text-center shrink-0">
                        {count as number}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-12 lg:col-span-3">
          <Card className="h-full border-l-4 border-l-orange-500 shadow-sm border-t-slate-200 border-r-slate-200 border-b-slate-200">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-500">By Severity</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {Object.keys(data.severityCounts).length === 0 ? (
                <p className="text-slate-400 text-sm italic">No data available</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.severityCounts).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-sm font-medium text-slate-700 capitalize truncate pr-2 min-w-0">
                        {severity}
                      </span>
                      <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full min-w-[24px] text-center shrink-0">
                        {count as number}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Compliance Visits (Wide) & Top Stores (Narrow) */}
        <div className="md:col-span-12 lg:col-span-8">
           <ComplianceVisitsTracking 
             stores={data.storesNeedingSecondVisit} 
             profiles={data.profiles} 
           />
        </div>

        <div className="md:col-span-12 lg:col-span-4 flex flex-col">
          <Card className="h-full shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b bg-slate-50/50 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-sm font-bold text-slate-800">Top Stores (Open Incidents)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 px-5">
              {data.topStores.length === 0 ? (
                <p className="text-slate-400 text-sm py-4 text-center italic">No data available</p>
              ) : (
                <div className="space-y-4">
                  {data.topStores.map((store, idx) => (
                    <div key={store.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700 transition-colors">
                            {store.name}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-slate-700">
                        {store.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Recent Activity (Restricted Height) */}
        <div className="md:col-span-12">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b bg-slate-50/50 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-bold text-slate-800">Recent Activity Log</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {data.recentActivity.length === 0 ? (
                <p className="text-slate-400 text-sm py-6 text-center italic">No recent activity</p>
              ) : (
                // Fixed height to show approx 5 items (5 * ~50px)
                <div className="h-[250px] overflow-y-auto p-4 space-y-1">
                  {data.recentActivity.map((activity: any, i: number) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                       <div className="mt-1">
                          <CheckCircle2 className="h-4 w-4 text-slate-400" />
                       </div>
                       <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {activity.action}
                            </p>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                              {format(new Date(activity.created_at), 'MMM dd, HH:mm')}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {activity.performed_by?.full_name || 'System'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
=======
  return <DashboardClient initialData={data} />
>>>>>>> 8306438 (Implement mobile responsiveness across entire application)
}