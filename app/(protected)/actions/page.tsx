import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ActionsTableRow } from '@/components/shared/actions-table-row'
import { ActionMobileCard } from '@/components/shared/action-mobile-card'
import { Search, CheckSquare2, Filter, FileText, Clock, AlertCircle } from 'lucide-react'

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

  // Calculate stats
  const totalActions = actions.length
  const overdueCount = actions.filter(action => {
    const isOverdue = new Date(action.due_date) < new Date() && 
      !['complete', 'cancelled'].includes(action.status)
    return isOverdue
  }).length
  const activeActions = actions.filter(action => 
    !['complete', 'cancelled'].includes(action.status)
  ).length

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 bg-slate-50/50 min-h-screen">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm flex-shrink-0">
              <CheckSquare2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Actions</h1>
          </div>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl ml-9 sm:ml-11">
            Track action items, monitor due dates, and manage completion status across all incidents.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-4 md:p-6 flex items-center justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Actions</p>
              <p className="text-xl md:text-2xl font-bold text-slate-900">{totalActions}</p>
            </div>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 ml-2">
              <FileText className="h-4 w-4 md:h-5 md:w-5 text-slate-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-4 md:p-6 flex items-center justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</p>
              <p className="text-xl md:text-2xl font-bold text-blue-600">{activeActions}</p>
            </div>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 ml-2">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-4 md:p-6 flex items-center justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue</p>
              <p className="text-xl md:text-2xl font-bold text-rose-600">{overdueCount}</p>
            </div>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0 ml-2">
              <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
        <CardHeader className="border-b bg-slate-50/40 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base font-semibold text-slate-800">
              Action Items {overdueCount > 0 && <span className="text-rose-600">({overdueCount} overdue)</span>}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Search - Placeholder for now */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <div className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-500 flex items-center">
                  Search actions, incidents...
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-9 md:h-9 px-3 min-h-[44px] md:min-h-0">
                <Filter className="h-4 w-4 mr-2 text-slate-500" />
                <span className="hidden sm:inline">Filters</span>
                <span className="sm:hidden">Filter</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {actions.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-500 py-12">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>
                <p className="font-medium text-slate-900">No actions found</p>
                <p className="text-sm mt-1 text-center">Actions will appear here when created for incidents.</p>
              </div>
            ) : (
              actions.map((action: any) => (
                <ActionMobileCard key={action.id} action={action} />
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-500">Title</TableHead>
                  <TableHead className="font-semibold text-slate-500 w-[130px]">Incident</TableHead>
                  <TableHead className="font-semibold text-slate-500">Assigned To</TableHead>
                  <TableHead className="w-[100px] font-semibold text-slate-500">Priority</TableHead>
                  <TableHead className="font-semibold text-slate-500 w-[130px]">Due Date</TableHead>
                  <TableHead className="w-[120px] font-semibold text-slate-500">Status</TableHead>
                  <TableHead className="w-[160px] text-right font-semibold text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                          <FileText className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-900">No actions found</p>
                        <p className="text-sm mt-1">Actions will appear here when created for incidents.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  actions.map((action: any) => (
                    <ActionsTableRow key={action.id} action={action} />
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


