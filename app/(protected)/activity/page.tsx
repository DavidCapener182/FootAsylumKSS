import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-react'
import { format } from 'date-fns'

async function getRecentActivity() {
  const supabase = createClient()
  const { data: recentActivity, error } = await supabase
    .from('fa_activity_log')
    .select(`*, performed_by:fa_profiles!fa_activity_log_performed_by_user_id_fkey(full_name)`)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching recent activity:', error)
    return []
  }

  return recentActivity || []
}

// Helper to format field names to be more readable
function formatFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    store_name: 'Store Name',
    store_code: 'Store Code',
    status: 'Status',
    severity: 'Severity',
    summary: 'Summary',
    incident_category: 'Category',
    occurred_at: 'Occurred At',
    reported_at: 'Reported At',
    assigned_investigator_user_id: 'Assigned Investigator',
    reference_no: 'Reference Number',
    compliance_audit_1_date: 'Compliance Audit 1 Date',
    compliance_audit_1_overall_pct: 'Compliance Audit 1 Score',
    compliance_audit_2_date: 'Compliance Audit 2 Date',
    compliance_audit_2_overall_pct: 'Compliance Audit 2 Score',
    compliance_audit_3_date: 'Compliance Audit 3 Date',
    compliance_audit_3_overall_pct: 'Compliance Audit 3 Score',
    action_plan_1_sent: 'Action Plan 1 Sent',
    action_plan_2_sent: 'Action Plan 2 Sent',
    action_plan_3_sent: 'Action Plan 3 Sent',
    compliance_audit_2_assigned_manager_user_id: 'Assigned Manager',
    compliance_audit_2_planned_date: 'Planned Date',
    title: 'Title',
    description: 'Description',
    priority: 'Priority',
    due_date: 'Due Date',
    completed_at: 'Completed At',
    completion_notes: 'Completion Notes',
    evidence_required: 'Evidence Required',
    region: 'Region',
    city: 'City',
    is_active: 'Active Status',
  }
  return fieldMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Helper to check if a string is a UUID
function isUUID(str: any): boolean {
  if (typeof str !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// Helper to format field values (with user name mapping)
function formatFieldValue(value: any, fieldName: string, userMap?: Map<string, string | null>): string {
  if (value === null || value === undefined) return '—'
  
  // If this is a user_id field and we have a user map, try to resolve the name
  if (fieldName.includes('_user_id') && userMap && isUUID(value)) {
    const userName = userMap.get(value)
    if (userName) return userName
  }
  
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      return format(new Date(value), 'dd MMM yyyy')
    } catch {
      return value
    }
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Helper to get changed fields from details
function getChangedFields(details: any): Array<{ field: string; oldValue: any; newValue: any }> {
  if (!details || !details.old || !details.new) return []
  
  const oldData = details.old as Record<string, any>
  const newData = details.new as Record<string, any>
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = []
  
  // Ignore these fields as they change frequently and aren't meaningful
  const ignoreFields = ['updated_at', 'id']
  
  // Check all fields in new data
  Object.keys(newData).forEach(key => {
    if (ignoreFields.includes(key)) return
    
    const oldVal = oldData[key]
    const newVal = newData[key]
    
    // Compare values (handling null/undefined)
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, oldValue: oldVal, newValue: newVal })
    }
  })
  
  return changes
}

// Helper to batch fetch user names from all user IDs in activities
async function getUserNamesFromActivities(activities: any[]): Promise<Map<string, string | null>> {
  const supabase = createClient()
  const userMap = new Map<string, string | null>()
  
  // Collect user IDs only from fields that end with _user_id
  const userIds = new Set<string>()
  activities.forEach(activity => {
    if (activity.details?.old) {
      Object.entries(activity.details.old as Record<string, any>).forEach(([key, val]) => {
        if (key.includes('_user_id') && isUUID(val)) {
          userIds.add(val)
        }
      })
    }
    if (activity.details?.new) {
      Object.entries(activity.details.new as Record<string, any>).forEach(([key, val]) => {
        if (key.includes('_user_id') && isUUID(val)) {
          userIds.add(val)
        }
      })
    }
  })
  
  // Batch fetch all users
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('fa_profiles')
      .select('id, full_name')
      .in('id', Array.from(userIds))
    
    profiles?.forEach(profile => {
      userMap.set(profile.id, profile.full_name || 'Unknown User')
    })
  }
  
  return userMap
}

// Helper to batch fetch entity display names
async function getEntityDisplayNames(activities: any[]): Promise<Map<string, string | null>> {
  const supabase = createClient()
  const nameMap = new Map<string, string | null>()
  
  // Group activities by entity type
  const byType: Record<string, string[]> = {}
  activities.forEach(activity => {
    if (!byType[activity.entity_type]) {
      byType[activity.entity_type] = []
    }
    byType[activity.entity_type].push(activity.entity_id)
  })
  
  // Batch fetch incidents (both open and closed)
  if (byType.incident?.length) {
    const [openIncidents, closedIncidents] = await Promise.all([
      supabase
        .from('fa_incidents')
        .select('id, reference_no, summary')
        .in('id', byType.incident),
      supabase
        .from('fa_closed_incidents')
        .select('id, reference_no, summary')
        .in('id', byType.incident)
    ])
    
    openIncidents.data?.forEach(incident => {
      nameMap.set(`incident:${incident.id}`, 
        `${incident.reference_no}${incident.summary ? `: ${incident.summary}` : ''}`
      )
    })
    
    closedIncidents.data?.forEach(incident => {
      nameMap.set(`incident:${incident.id}`, 
        `${incident.reference_no}${incident.summary ? `: ${incident.summary}` : ''}`
      )
    })
  }
  
  // Batch fetch stores
  if (byType.store?.length) {
    const { data: stores } = await supabase
      .from('fa_stores')
      .select('id, store_name, store_code')
      .in('id', byType.store)
    
    stores?.forEach(store => {
      nameMap.set(`store:${store.id}`, 
        `${store.store_name}${store.store_code ? ` (${store.store_code})` : ''}`
      )
    })
  }
  
  // Batch fetch actions
  if (byType.action?.length) {
    const { data: actions } = await supabase
      .from('fa_actions')
      .select('id, title')
      .in('id', byType.action)
    
    actions?.forEach(action => {
      nameMap.set(`action:${action.id}`, action.title)
    })
  }
  
  return nameMap
}

// Helper to format entity type for display
function formatEntityType(entityType: string): string {
  const typeMap: Record<string, string> = {
    incident: 'Incident',
    store: 'Store',
    action: 'Action',
    investigation: 'Investigation',
  }
  return typeMap[entityType] || entityType
}

export default async function ActivityPage() {
  await requireAuth()
  const recentActivity = await getRecentActivity()
  
  // Batch fetch entity names and user names
  const [entityNameMap, userMap] = await Promise.all([
    getEntityDisplayNames(recentActivity),
    getUserNamesFromActivities(recentActivity)
  ])
  
  // Map entity names to activities, with fallback to extract from details if entity was deleted
  const activitiesWithNames = recentActivity.map((activity: any) => {
    const key = `${activity.entity_type}:${activity.entity_id}`
    let entityName = entityNameMap.get(key) || null
    
    // If we don't have a name and this is a DELETED action, try to extract from details.old
    if (!entityName && activity.action === 'DELETED' && activity.details?.old) {
      const oldData = activity.details.old as Record<string, any>
      
      if (activity.entity_type === 'incident') {
        // Try to get reference_no or summary from deleted incident
        entityName = oldData.reference_no 
          ? `${oldData.reference_no}${oldData.summary ? `: ${oldData.summary}` : ''}`
          : null
      } else if (activity.entity_type === 'action') {
        // Try to get title from deleted action
        entityName = oldData.title || null
      } else if (activity.entity_type === 'store') {
        // Try to get store name from deleted store
        entityName = oldData.store_name 
          ? `${oldData.store_name}${oldData.store_code ? ` (${oldData.store_code})` : ''}`
          : null
      }
    }
    
    // If we still don't have a name and this is a CREATED/UPDATED action, try to extract from details.new
    if (!entityName && activity.details?.new) {
      const newData = activity.details.new as Record<string, any>
      
      if (activity.entity_type === 'incident') {
        entityName = newData.reference_no 
          ? `${newData.reference_no}${newData.summary ? `: ${newData.summary}` : ''}`
          : null
      } else if (activity.entity_type === 'action') {
        entityName = newData.title || null
      } else if (activity.entity_type === 'store') {
        entityName = newData.store_name 
          ? `${newData.store_name}${newData.store_code ? ` (${newData.store_code})` : ''}`
          : null
      }
    }
    
    return { ...activity, entityName }
  })

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Recent Activity</h1>
        <p className="text-slate-500 text-sm mt-1">Activity log of all system events</p>
      </div>

      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="pb-3 border-b bg-slate-50/40">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-bold text-slate-800">Activity Timeline</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto p-5">
            {activitiesWithNames.length === 0 ? (
              <p className="text-slate-400 text-sm text-center italic">No recent activity</p>
            ) : (
              <div className="relative border-l border-slate-200 ml-2 space-y-6">
                {activitiesWithNames.map((activity: any) => {
                  const changedFields = getChangedFields(activity.details)
                  // Only show entity name if we have it, otherwise just show the action and entity type
                  const entityDisplayName = activity.entityName
                  
                  return (
                    <div key={activity.id} className="relative pl-6">
                      {/* Timeline Dot */}
                      <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow-sm ring-1 ring-slate-100" />
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            {format(new Date(activity.created_at), 'MMM dd, HH:mm')}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-900">
                              {activity.action}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-medium text-blue-600 uppercase">
                              {formatEntityType(activity.entity_type)}
                            </span>
                            {entityDisplayName && (
                              <>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-slate-600 font-medium truncate max-w-xs">
                                  {entityDisplayName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Show changed fields for updates */}
                        {activity.action === 'UPDATED' && changedFields.length > 0 && (
                          <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-2">
                            {changedFields.slice(0, 5).map((change, idx) => (
                              <div key={idx} className="text-xs">
                                <span className="font-semibold text-slate-700">
                                  {formatFieldName(change.field)}:
                                </span>
                                <span className="text-slate-500 ml-2">
                                  <span className="line-through text-red-400 mr-2">
                                    {formatFieldValue(change.oldValue, change.field, userMap)}
                                  </span>
                                  →
                                  <span className="text-emerald-600 ml-2 font-medium">
                                    {formatFieldValue(change.newValue, change.field, userMap)}
                                  </span>
                                </span>
                              </div>
                            ))}
                            {changedFields.length > 5 && (
                              <p className="text-xs text-slate-400 italic">
                                +{changedFields.length - 5} more change{changedFields.length - 5 !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Show entity info for CREATED actions */}
                        {activity.action === 'CREATED' && activity.details?.new && (
                          <div className="mt-2 pl-3 border-l-2 border-emerald-200">
                            <p className="text-xs text-slate-600">
                              <span className="font-semibold">New {formatEntityType(activity.entity_type).toLowerCase()}</span>
                              {entityDisplayName && (
                                <span className="ml-2 text-emerald-600 font-medium">
                                  {entityDisplayName}
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                        
                        {/* Show entity info for DELETED actions - only if we have a name */}
                        {activity.action === 'DELETED' && entityDisplayName && (
                          <div className="mt-2 pl-3 border-l-2 border-red-200">
                            <p className="text-xs text-red-600 font-medium">
                              Deleted {formatEntityType(activity.entity_type).toLowerCase()}: {entityDisplayName}
                            </p>
                          </div>
                        )}
                        
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <span className="h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 border border-slate-200">
                            {(activity.performed_by?.full_name || 'S')[0]}
                          </span>
                          {activity.performed_by?.full_name || 'System'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
