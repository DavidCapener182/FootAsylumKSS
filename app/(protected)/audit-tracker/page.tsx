import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AuditTable, AuditRow } from '@/components/audit/audit-table'
import { AuditLeagueTable } from '@/components/audit/audit-league-table'

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

export default async function AuditTrackerPage() {
  await requireAuth()
  const stores = await getStoreAudits()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Tracker</h1>
        <p className="text-muted-foreground mt-1">Compliance audits by store</p>
      </div>

      <Card>
        <CardContent className="pt-6 text-left">
          <Tabs defaultValue="by-area" className="space-y-4">
            <TabsList>
              <TabsTrigger value="by-area">By Area</TabsTrigger>
              <TabsTrigger value="league">League Table</TabsTrigger>
            </TabsList>

            <TabsContent value="by-area" className="space-y-4">
              <AuditTable rows={stores as AuditRow[]} />
            </TabsContent>

            <TabsContent value="league" className="space-y-4">
              <AuditLeagueTable rows={stores as AuditRow[]} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

