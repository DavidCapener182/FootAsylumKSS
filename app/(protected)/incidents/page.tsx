import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { format } from 'date-fns'

async function getIncidents(filters?: { store_id?: string; status?: string; date_from?: string; date_to?: string }) {
  const supabase = createClient()
  let query = supabase
    .from('fa_incidents')
    .select(`
      *,
      fa_stores!inner(store_name, store_code),
      reporter:fa_profiles!fa_incidents_reported_by_user_id_fkey(full_name),
      investigator:fa_profiles!fa_incidents_assigned_investigator_user_id_fkey(full_name)
    `)
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

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: { store_id?: string; status?: string; date_from?: string; date_to?: string }
}) {
  await requireAuth()
  const incidents = await getIncidents(searchParams)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Incidents</h1>
          <p className="text-gray-500 mt-2 text-sm">Manage and track all incidents</p>
        </div>
        <Link href="/incidents/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Incident
          </Button>
        </Link>
      </div>

      <Card className="bg-white border-0">
        <CardHeader>
          <CardTitle>All Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Occurred</TableHead>
                  <TableHead>Investigator</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                      No incidents found
                    </TableCell>
                  </TableRow>
                ) : (
                  incidents.map((incident: any) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-semibold text-gray-900">
                        <Link href={`/incidents/${incident.id}`} className="hover:text-gray-700 transition-colors">
                          {incident.reference_no}
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {incident.fa_stores?.store_name || 'Unknown'}
                        {incident.fa_stores?.store_code && (
                          <span className="text-gray-500 text-xs ml-1">
                            ({incident.fa_stores.store_code})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-700">
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
                      <TableCell className="text-gray-600 text-sm">
                        {format(new Date(incident.occurred_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {incident.investigator?.full_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Link href={`/incidents/${incident.id}`}>
                          <Button variant="ghost" size="sm" className="rounded-full">View</Button>
                        </Link>
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

