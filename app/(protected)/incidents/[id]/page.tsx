import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { format } from 'date-fns'
import { IncidentOverview } from '@/components/incidents/incident-overview'
import { IncidentInvestigation } from '@/components/incidents/incident-investigation'
import { IncidentActions } from '@/components/incidents/incident-actions'
import { IncidentAttachments } from '@/components/incidents/incident-attachments'
import { IncidentActivity } from '@/components/incidents/incident-activity'

async function getIncident(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fa_incidents')
    .select(`
      *,
      fa_stores(*),
      reporter:fa_profiles!fa_incidents_reported_by_user_id_fkey(*),
      investigator:fa_profiles!fa_incidents_assigned_investigator_user_id_fkey(*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

async function getInvestigation(incidentId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('fa_investigations')
    .select(`
      *,
      lead_investigator:fa_profiles!fa_investigations_lead_investigator_user_id_fkey(*)
    `)
    .eq('incident_id', incidentId)
    .single()

  return data
}

async function getActions(incidentId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('fa_actions')
    .select(`
      *,
      assigned_to:fa_profiles!fa_actions_assigned_to_user_id_fkey(*)
    `)
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false })

  return data || []
}

async function getAttachments(entityType: string, entityId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('fa_attachments')
    .select(`
      *,
      uploaded_by:fa_profiles!fa_attachments_uploaded_by_user_id_fkey(*)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  return data || []
}

async function getActivityLog(entityType: string, entityId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('fa_activity_log')
    .select(`
      *,
      performed_by:fa_profiles!fa_activity_log_performed_by_user_id_fkey(*)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(50)

  return data || []
}

export default async function IncidentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await requireAuth()
  const incident = await getIncident(params.id)

  if (!incident) {
    notFound()
  }

  // Fetch all profiles for user selection
  const supabase = createClient()
  const { data: profiles } = await supabase
    .from('fa_profiles')
    .select('id, full_name')
    .order('full_name', { ascending: true })

  const [investigation, actions, attachments, activityLog] = await Promise.all([
    getInvestigation(params.id),
    getActions(params.id),
    getAttachments('incident', params.id),
    getActivityLog('incident', params.id),
  ])

  // Build user map for activity log
  const userIds = new Set<string>()
  activityLog.forEach((activity: any) => {
    if (activity.performed_by_user_id) userIds.add(activity.performed_by_user_id)
    if (activity.details?.old) {
      Object.entries(activity.details.old).forEach(([fieldName, val]: [string, any]) => {
        if (fieldName.includes('_user_id') && typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
          userIds.add(val)
        }
      })
    }
    if (activity.details?.new) {
      Object.entries(activity.details.new).forEach(([fieldName, val]: [string, any]) => {
        if (fieldName.includes('_user_id') && typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
          userIds.add(val)
        }
      })
    }
  })
  
  const userMap = new Map<string, string | null>()
  if (userIds.size > 0) {
    const { data: userProfiles } = await supabase
      .from('fa_profiles')
      .select('id, full_name')
      .in('id', Array.from(userIds))
    
    userProfiles?.forEach(profile => {
      userMap.set(profile.id, profile.full_name)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{incident.reference_no}</h1>
        <p className="text-muted-foreground mt-1">{incident.summary}</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto max-w-full">
          <TabsTrigger value="overview" className="shrink-0">Overview</TabsTrigger>
          <TabsTrigger value="investigation" className="shrink-0">Investigation</TabsTrigger>
          <TabsTrigger value="actions" className="shrink-0">Actions</TabsTrigger>
          <TabsTrigger value="attachments" className="shrink-0">Attachments</TabsTrigger>
          <TabsTrigger value="activity" className="shrink-0">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <IncidentOverview incident={incident} />
        </TabsContent>

        <TabsContent value="investigation">
          <IncidentInvestigation incident={incident} investigation={investigation} />
        </TabsContent>

        <TabsContent value="actions">
          <IncidentActions incidentId={params.id} actions={actions} profiles={profiles || []} />
        </TabsContent>

        <TabsContent value="attachments">
          <IncidentAttachments incidentId={params.id} attachments={attachments} />
        </TabsContent>

        <TabsContent value="activity">
          <IncidentActivity activityLog={activityLog} userMap={userMap} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

