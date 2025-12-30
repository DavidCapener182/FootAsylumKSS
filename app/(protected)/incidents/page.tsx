import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import { DeleteIncidentButton } from '@/components/shared/delete-incident-button'
import { NewIncidentButton } from '@/components/incidents/new-incident-button'
import { IncidentMobileCard } from '@/components/incidents/incident-mobile-card'
import { ClosedIncidentMobileCard } from '@/components/incidents/closed-incident-mobile-card'
import Link from 'next/link'
import { Search, AlertTriangle, Filter, FileText, Eye, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

async function getIncidents(filters?: { store_id?: string; status?: string; date_from?: string; date_to?: string }) {
  const supabase = createClient()
  let query = supabase
    .from('fa_incidents')
    .select(`
      *,
      fa_stores(store_name, store_code),
      reporter:fa_profiles!fa_incidents_reported_by_user_id_fkey(full_name),
      investigator:fa_profiles!fa_incidents_assigned_investigator_user_id_fkey(full_name)
    `)
    .neq('status', 'closed') // Exclude closed incidents (they're in fa_closed_incidents)
    .order('occurred_at', { ascending: false })
    .limit(100)

  if (filters?.store_id) {
    query = query.eq('store_id', filters.store_id)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.date_from) {
    query = query.gte('occurred_at', filters.date_from)
  }
  if (filters?.date_to) {
    query = query.lte('occurred_at', filters.date_to)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching incidents:', error)
    return []
  }

  return data || []
}

async function getClosedIncidents(filters?: { store_id?: string; date_from?: string; date_to?: string }) {
  const supabase = createClient()
  
  // First get closed incidents
  let query = supabase
    .from('fa_closed_incidents')
    .select('*')
    .order('closed_at', { ascending: false })
    .limit(100)

  if (filters?.store_id) {
    query = query.eq('store_id', filters.store_id)
  }
  if (filters?.date_from) {
    query = query.gte('occurred_at', filters.date_from)
  }
  if (filters?.date_to) {
    query = query.lte('occurred_at', filters.date_to)
  }

  const { data: incidents, error } = await query

  if (error) {
    console.error('Error fetching closed incidents:', error)
    return []
  }

  if (!incidents || incidents.length === 0) {
    return []
  }

  // Fetch related data
  const storeIds = [...new Set(incidents.map((i: any) => i.store_id))]
  const userIds = [
    ...new Set([
      ...incidents.map((i: any) => i.reported_by_user_id),
      ...incidents.map((i: any) => i.assigned_investigator_user_id).filter(Boolean)
    ])
  ]

  const { data: stores } = await supabase
    .from('fa_stores')
    .select('id, store_name, store_code')
    .in('id', storeIds)

  const { data: profiles } = await supabase
    .from('fa_profiles')
    .select('id, full_name')
    .in('id', userIds)

  const storeMap = new Map(stores?.map((s: any) => [s.id, s]) || [])
  const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || [])

  // Enrich incidents with related data
  return incidents.map((incident: any) => ({
    ...incident,
    fa_stores: storeMap.get(incident.store_id),
    reporter: profileMap.get(incident.reported_by_user_id) ? { full_name: profileMap.get(incident.reported_by_user_id).full_name } : null,
    investigator: incident.assigned_investigator_user_id && profileMap.get(incident.assigned_investigator_user_id) 
      ? { full_name: profileMap.get(incident.assigned_investigator_user_id).full_name } 
      : null,
  }))
}

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: { store_id?: string; status?: string; date_from?: string; date_to?: string }
}) {
  await requireAuth()
  const incidents = await getIncidents(searchParams)
  const closedIncidents = await getClosedIncidents(searchParams)

  // Calculate stats (only from open incidents)
  const totalIncidents = incidents.length
  const openIncidents = incidents.filter((i: any) => i.status === 'open' || i.status === 'under_investigation').length
  const criticalIncidents = incidents.filter((i: any) => i.severity === 'critical' || i.severity === 'high').length

  return (
    <div className="flex flex-col gap-4 md:gap-6 lg:gap-8 bg-slate-50/50 min-h-screen">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-sm flex-shrink-0">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Incidents</h1>
          </div>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl ml-9 sm:ml-11">
            Track safety incidents, manage investigations, and monitor resolution progress.
          </p>
        </div>
        <div className="flex-shrink-0">
          <NewIncidentButton />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-3 md:p-6 flex flex-col md:flex-row items-center md:items-center justify-between gap-2 md:gap-0">
            <div className="space-y-1 text-center md:text-left flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Reported</p>
              <p className="text-xl md:text-2xl font-bold text-slate-900">{totalIncidents}</p>
            </div>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 md:h-5 md:w-5 text-slate-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-3 md:p-6 flex flex-col md:flex-row items-center md:items-center justify-between gap-2 md:gap-0">
            <div className="space-y-1 text-center md:text-left flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Cases</p>
              <p className="text-xl md:text-2xl font-bold text-blue-600">{openIncidents}</p>
            </div>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-3 md:p-6 flex flex-col md:flex-row items-center md:items-center justify-between gap-2 md:gap-0">
            <div className="space-y-1 text-center md:text-left flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Critical/High Risk</p>
              <p className="text-xl md:text-2xl font-bold text-rose-600">{criticalIncidents}</p>
            </div>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Incidents Table */}
      <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
        <CardHeader className="border-b bg-slate-50/40 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base font-semibold text-slate-800">Open Incidents</CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Search - Placeholder for now */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <div className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-500 flex items-center">
                  Search reference, store...
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-9 px-3">
                <Filter className="h-4 w-4 mr-2 text-slate-500" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-5">
            {incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-500 py-12">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>
                <p className="font-medium text-slate-900">No open incidents found</p>
                <p className="text-sm mt-1 text-center">Adjust filters or log a new incident to get started.</p>
              </div>
            ) : (
              incidents.map((incident: any) => (
                <IncidentMobileCard key={incident.id} incident={incident} />
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[120px] font-semibold text-slate-500">Reference</TableHead>
                  <TableHead className="font-semibold text-slate-500">Store</TableHead>
                  <TableHead className="font-semibold text-slate-500">Category</TableHead>
                  <TableHead className="w-[100px] font-semibold text-slate-500">Severity</TableHead>
                  <TableHead className="w-[120px] font-semibold text-slate-500">Status</TableHead>
                  <TableHead className="font-semibold text-slate-500">Occurred</TableHead>
                  <TableHead className="font-semibold text-slate-500">Investigator</TableHead>
                  <TableHead className="w-[100px] text-right font-semibold text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                          <FileText className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-900">No open incidents found</p>
                        <p className="text-sm mt-1">Adjust filters or log a new incident to get started.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  incidents.map((incident: any) => (
                    <TableRow key={incident.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <Link href={`/incidents/${incident.id}`} className="hover:text-indigo-600 transition-colors">
                          <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {incident.reference_no}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{incident.fa_stores?.store_name || 'Unknown'}</span>
                          {incident.fa_stores?.store_code && (
                            <span className="text-xs text-slate-500">{incident.fa_stores.store_code}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {incident.incident_category.split('_').map((w: string) => 
                          w.charAt(0).toUpperCase() + w.slice(1)
                        ).join(' ')}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={incident.severity} type="severity" />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={incident.status} type="incident" />
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {format(new Date(incident.occurred_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {incident.investigator?.full_name ? (
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                              {incident.investigator.full_name[0]}
                            </div>
                            <span className="text-sm text-slate-600">{incident.investigator.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/incidents/${incident.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                          </Link>
                          <DeleteIncidentButton incidentId={incident.id} referenceNo={incident.reference_no} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Closed Incidents Table */}
      <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
        <CardHeader className="border-b bg-slate-50/40 px-6 py-4">
          <CardTitle className="text-base font-semibold text-slate-800">Closed Incidents Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-5">
            {closedIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-500 py-12">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>
                <p className="font-medium text-slate-900">No closed incidents found</p>
                <p className="text-sm mt-1 text-center">Closed incidents will appear here.</p>
              </div>
            ) : (
              closedIncidents.map((incident: any) => (
                <ClosedIncidentMobileCard key={incident.id} incident={incident} />
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[120px] font-semibold text-slate-500">Reference</TableHead>
                  <TableHead className="font-semibold text-slate-500">Store</TableHead>
                  <TableHead className="font-semibold text-slate-500">Category</TableHead>
                  <TableHead className="w-[100px] font-semibold text-slate-500">Severity</TableHead>
                  <TableHead className="font-semibold text-slate-500">Occurred</TableHead>
                  <TableHead className="font-semibold text-slate-500">Closed</TableHead>
                  <TableHead className="font-semibold text-slate-500">Investigator</TableHead>
                  <TableHead className="w-[100px] text-right font-semibold text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                          <FileText className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-900">No closed incidents found</p>
                        <p className="text-sm mt-1">Closed incidents will appear here.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  closedIncidents.map((incident: any) => (
                    <TableRow key={incident.id} className="hover:bg-slate-50/50 transition-colors bg-slate-50/30">
                      <TableCell>
                        <Link href={`/incidents/${incident.id}`} className="hover:text-indigo-600 transition-colors">
                          <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {incident.reference_no}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{incident.fa_stores?.store_name || 'Unknown'}</span>
                          {incident.fa_stores?.store_code && (
                            <span className="text-xs text-slate-500">{incident.fa_stores.store_code}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {incident.incident_category.split('_').map((w: string) => 
                          w.charAt(0).toUpperCase() + w.slice(1)
                        ).join(' ')}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={incident.severity} type="severity" />
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {format(new Date(incident.occurred_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {format(new Date(incident.closed_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {incident.investigator?.full_name ? (
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                              {incident.investigator.full_name[0]}
                            </div>
                            <span className="text-sm text-slate-600">{incident.investigator.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/incidents/${incident.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                          </Link>
                          <DeleteIncidentButton incidentId={incident.id} referenceNo={incident.reference_no} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

