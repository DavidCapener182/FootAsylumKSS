import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import Link from 'next/link'
import { format } from 'date-fns'

async function getActions(filters?: { assigned_to?: string; status?: string; overdue?: boolean }) {
  const supabase = createClient()
  let query = supabase
    .from('fa_actions')
    .select(`
      *,
      assigned_to:fa_profiles!fa_actions_assigned_to_user_id_fkey(*),
      incident:fa_incidents!fa_actions_incident_id_fkey(reference_no)
    `)
    .order('due_date', { ascending: true })

  if (filters?.assigned_to) {
    query = query.eq('assigned_to_user_id', filters.assigned_to)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.overdue) {
    const today = new Date().toISOString().split('T')[0]
    query = query
      .lt('due_date', today)
      .not('status', 'in', '(complete,cancelled)')
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching actions:', error)
    return []
  }

  return data || []
}

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: { assigned_to?: string; status?: string; overdue?: string }
}) {
  await requireAuth()
  const actions = await getActions({
    assigned_to: searchParams.assigned_to,
    status: searchParams.status,
    overdue: searchParams.overdue === 'true',
  })

  const overdueCount = actions.filter(action => {
    const isOverdue = new Date(action.due_date) < new Date() && 
      !['complete', 'cancelled'].includes(action.status)
    return isOverdue
  }).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Actions</h1>
        <p className="text-muted-foreground mt-1">Track and manage all actions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Actions {overdueCount > 0 && `(${overdueCount} overdue)`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Incident</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No actions found
                    </TableCell>
                  </TableRow>
                ) : (
                  actions.map((action: any) => {
                    const isOverdue = new Date(action.due_date) < new Date() && 
                      !['complete', 'cancelled'].includes(action.status)
                    
                    return (
                      <TableRow key={action.id} className={isOverdue ? 'bg-red-50' : ''}>
                        <TableCell className="font-medium">{action.title}</TableCell>
                        <TableCell>
                          <Link href={`/incidents/${action.incident_id}`} className="hover:underline">
                            {action.incident?.reference_no || 'Unknown'}
                          </Link>
                        </TableCell>
                        <TableCell>{action.assigned_to?.full_name || 'Unknown'}</TableCell>
                        <TableCell>
                          <StatusBadge status={action.priority} type="severity" />
                        </TableCell>
                        <TableCell className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {format(new Date(action.due_date), 'dd MMM yyyy')}
                          {isOverdue && ' (Overdue)'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={action.status} type="action" />
                        </TableCell>
                        <TableCell>
                          <Link href={`/incidents/${action.incident_id}`}>
                            <button className="text-primary hover:underline">View</button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

