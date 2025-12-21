import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AuditTable, AuditRow } from '@/components/audit/audit-table'
import { AuditLeagueTable } from '@/components/audit/audit-league-table'
import { ClipboardCheck, Store, TrendingUp, Trophy } from 'lucide-react'

async function getStoreAudits() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fa_stores')
    .select(
      'id, store_code, store_name, region, city, is_active, compliance_audit_1_date, compliance_audit_1_overall_pct, action_plan_1_sent, compliance_audit_1_pdf_path, compliance_audit_2_date, compliance_audit_2_overall_pct, action_plan_2_sent, compliance_audit_2_pdf_path, compliance_audit_3_date, compliance_audit_3_overall_pct, action_plan_3_sent, area_average_pct, total_audits_to_date'
    )
    .order('region', { ascending: true })
    .order('store_name', { ascending: true })

  if (error) {
    console.error('Error fetching store audits:', error)
    return []
  }

  return data || []
}

// Helper for UI stats
function calculateStats(stores: any[]) {
  if (!stores || !stores.length) return { avgScore: 0, activeStores: 0, auditsCompleted: 0 }
  
  const activeStores = stores.filter(s => s.is_active).length
  // Simple average of the latest completed audit 1 score for active stores
  const scores = stores
    .filter(s => s.is_active && s.compliance_audit_1_overall_pct)
    .map(s => s.compliance_audit_1_overall_pct)
    
  const avgScore = scores.length 
    ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) 
    : 0

  const auditsCompleted = stores.reduce((acc, store) => {
    let count = 0
    if (store.compliance_audit_1_date) count++
    if (store.compliance_audit_2_date) count++
    return acc + count
  }, 0)

  return { avgScore, activeStores, auditsCompleted }
}

export default async function AuditTrackerPage() {
  const { profile } = await requireRole(['admin', 'ops', 'readonly'])
  const stores = await getStoreAudits()
  const stats = calculateStats(stores)

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm flex-shrink-0">
              <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Audit Tracker</h1>
          </div>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl ml-9 sm:ml-11">
            Track compliance scores, view audit history, and monitor network performance across all regions.
          </p>
        </div>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hidden md:block shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Network Average</p>
              <p className="text-3xl font-bold text-slate-900">{stats.avgScore}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="hidden md:block shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Active Stores</p>
              <p className="text-3xl font-bold text-slate-900">{stats.activeStores}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Store className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Audits Completed</p>
              <p className="text-3xl font-bold text-slate-900">{stats.auditsCompleted}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="border-b bg-slate-50/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Detailed Audit Reports</h2>
        </div>
        <CardContent className="p-4 md:p-6">
          <Tabs defaultValue="by-area" className="w-full">
            <div className="flex items-center justify-center md:justify-start mb-4 md:mb-6">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-slate-100 p-1 min-h-[44px]">
                <TabsTrigger 
                  value="by-area"
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
                >
                  By Area
                </TabsTrigger>
                <TabsTrigger 
                  value="league"
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">League Table</span>
                  <span className="sm:hidden">League</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="by-area" className="mt-0">
              <AuditTable rows={stores as AuditRow[]} userRole={profile.role} />
            </TabsContent>

            <TabsContent value="league" className="mt-0">
              <AuditLeagueTable rows={stores as AuditRow[]} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
