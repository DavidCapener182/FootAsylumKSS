import { requireRole } from '@/lib/auth'
import { can } from '@/lib/role-capabilities'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { ActionsTableRow } from '@/components/shared/actions-table-row'
import { ActionMobileCard } from '@/components/shared/action-mobile-card'
import { DateFilterInput } from '@/components/shared/date-filter-input'
import { Search, CheckSquare2, FileText, Clock, AlertCircle, SlidersHorizontal, CalendarClock, TimerReset } from 'lucide-react'
import Link from 'next/link'
import { formatStoreActionQuestionForDisplay } from '@/lib/store-action-titles'
import { buildStoreSummaryBullets as buildPersistedStoreSummaryBullets } from '@/lib/actions/action-summary'
import { getUnifiedActions } from '@/features/actions/query-service'
import type { ActionFilters, UnifiedAction } from '@/features/actions/types'

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: {
    assigned_to?: string
    status?: string
    overdue?: string
    priority?: string
    store_question?: string
    q?: string
    date_from?: string
    date_to?: string
    view?: string
  }
}) {
  const { profile } = await requireRole(['admin', 'ops', 'client', 'readonly'])
  const canManageActions = can(profile?.role, 'manageActions')
  const filters: ActionFilters = {
    assigned_to: searchParams.assigned_to || undefined,
    status: searchParams.status && searchParams.status !== 'all' ? searchParams.status : undefined,
    overdue: searchParams.overdue === 'true',
    priority: searchParams.priority && searchParams.priority !== 'all' ? searchParams.priority : undefined,
    store_question:
      searchParams.store_question && searchParams.store_question !== 'all'
        ? searchParams.store_question
        : undefined,
    q: searchParams.q?.trim() || undefined,
    date_from: searchParams.date_from || undefined,
    date_to: searchParams.date_to || undefined,
    view: searchParams.view || undefined,
  }
  const { actions, storeQuestionOptions } = await getUnifiedActions(filters)

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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const dueTodayCount = actions.filter((action) => {
    if (['complete', 'cancelled'].includes(action.status)) return false
    const dueDate = new Date(action.due_date)
    if (Number.isNaN(dueDate.getTime())) return false
    dueDate.setHours(0, 0, 0, 0)
    return dueDate.getTime() === today.getTime()
  }).length
  const dueSoonCount = actions.filter((action) => {
    if (['complete', 'cancelled'].includes(action.status)) return false
    const dueDate = new Date(action.due_date)
    if (Number.isNaN(dueDate.getTime())) return false
    dueDate.setHours(0, 0, 0, 0)
    return dueDate >= tomorrow && dueDate <= nextWeek
  }).length
  const hasActiveFilters = Boolean(
    filters.q ||
      filters.status ||
      filters.priority ||
      filters.store_question ||
      filters.overdue ||
      filters.date_from ||
      filters.date_to
  )
  const activeFilterCount = [
    filters.q,
    filters.status,
    filters.priority,
    filters.store_question,
    filters.overdue ? 'overdue' : null,
    filters.date_from,
    filters.date_to,
  ].filter(Boolean).length
  const dateFilterSummary =
    filters.date_from || filters.date_to
      ? `Date filter active${filters.date_from ? ` from ${filters.date_from}` : ''}${filters.date_to ? ` to ${filters.date_to}` : ''}`
      : 'Date filter inactive'

  const getLatestStoreScore = (action: UnifiedAction): number | null => {
    const scores = [
      action.store?.compliance_audit_2_overall_pct,
      action.store?.compliance_audit_1_overall_pct,
    ].filter((score): score is number => typeof score === 'number' && Number.isFinite(score))
    return scores.length > 0 ? scores[0] : null
  }

  const groupedActions = Array.from(
    actions.reduce((groups, action) => {
      const isStoreAction = action.source_type === 'store'
      const groupKey = isStoreAction
        ? `store:${action.store?.id || action.id}`
        : `incident:${action.incident_id || action.id}`
      const groupLabel = isStoreAction
        ? action.store?.store_code
          ? `${action.store.store_code} - ${action.store.store_name}`
          : action.store?.store_name || action.incident?.reference_no || 'Store Action'
        : action.incident?.reference_no || 'Incident Action'

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          label: groupLabel,
          isStoreGroup: isStoreAction,
          actions: [] as UnifiedAction[],
        })
      }

      groups.get(groupKey)!.actions.push(action)
      return groups
    }, new Map<string, { key: string; label: string; isStoreGroup: boolean; actions: UnifiedAction[] }>())
  )
    .map(([, value]) => ({
      ...value,
      summaryBullets: value.isStoreGroup ? buildPersistedStoreSummaryBullets(value.actions) : [],
      activeCount: value.actions.filter((action) => !['complete', 'cancelled'].includes(action.status)).length,
      highPriorityCount: value.actions.filter((action) => ['urgent', 'high'].includes(String(action.priority).toLowerCase())).length,
      nextDueTime: Math.min(
        ...value.actions
          .map((action) => new Date(action.due_date).getTime())
          .filter((time) => Number.isFinite(time))
      ),
      lowestComplianceScore: Math.min(
        ...value.actions
          .map(getLatestStoreScore)
          .filter((score): score is number => typeof score === 'number')
      ),
    }))
    .sort((a, b) => {
      if (filters.view === 'most_actions') {
        return b.activeCount - a.activeCount || a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
      }
      if (filters.view === 'lowest_compliance') {
        const aScore = Number.isFinite(a.lowestComplianceScore) ? a.lowestComplianceScore : Number.MAX_SAFE_INTEGER
        const bScore = Number.isFinite(b.lowestComplianceScore) ? b.lowestComplianceScore : Number.MAX_SAFE_INTEGER
        return aScore - bScore || b.activeCount - a.activeCount
      }
      if (filters.view === 'high_priority') {
        return b.highPriorityCount - a.highPriorityCount || a.nextDueTime - b.nextDueTime
      }
      if (filters.view === 'due_soon') {
        return a.nextDueTime - b.nextDueTime || b.activeCount - a.activeCount
      }
      if (filters.view === 'recently_updated') {
        const latestA = Math.max(
          ...a.actions
            .map((action) => new Date(action.updated_at || action.created_at || action.due_date).getTime())
            .filter((time) => Number.isFinite(time))
        )
        const latestB = Math.max(
          ...b.actions
            .map((action) => new Date(action.updated_at || action.created_at || action.due_date).getTime())
            .filter((time) => Number.isFinite(time))
        )
        return latestB - latestA || a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
      }
      return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
    })

  const quickViews = [
    {
      id: 'high_priority',
      title: 'High Priority',
      count: actions.filter((action) => ['urgent', 'high'].includes(String(action.priority).toLowerCase()) && !['complete', 'cancelled'].includes(action.status)).length,
      href: '/actions?view=high_priority',
      detail: 'High and urgent work first',
    },
    {
      id: 'due_soon',
      title: 'Due Soon',
      count: dueSoonCount + dueTodayCount,
      href: `/actions?view=due_soon&date_from=${today.toISOString().split('T')[0]}&date_to=${nextWeek.toISOString().split('T')[0]}`,
      detail: 'Due today through next 7 days',
    },
    {
      id: 'most_actions',
      title: 'Most Actions',
      count: groupedActions.filter((group) => group.activeCount > 0).length,
      href: '/actions?view=most_actions',
      detail: 'Stores with the largest active workload',
    },
    {
      id: 'lowest_compliance',
      title: 'Lowest Compliance',
      count: groupedActions.filter((group) => Number.isFinite(group.lowestComplianceScore)).length,
      href: '/actions?view=lowest_compliance',
      detail: 'Action groups sorted by latest audit score',
    },
    {
      id: 'recently_updated',
      title: 'Recently Updated',
      count: groupedActions.length,
      href: '/actions?view=recently_updated',
      detail: 'Newest action changes first',
    },
  ]

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-slate-50 px-0 py-0 sm:gap-6 sm:px-6 sm:py-5 lg:px-8">
      
      {/* Header Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5 md:p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-lime-600">
            <CheckSquare2 className="h-4 w-4" />
            Action Management
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:mt-2 sm:text-3xl">Actions</h1>
          <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-slate-500 sm:block">
            Track audit, FRA and store follow-up actions, monitor due dates, and manage completion evidence.
          </p>
        </div>
      </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-4">
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="flex h-full flex-col justify-between gap-3 p-3 md:flex-row md:items-center md:p-6">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:text-xs">Total Actions</p>
              <p className="text-xl md:text-2xl font-bold text-slate-900">{totalActions}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 md:ml-2 md:h-10 md:w-10">
              <FileText className="h-4 w-4 md:h-5 md:w-5 text-slate-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="flex h-full flex-col justify-between gap-3 p-3 md:flex-row md:items-center md:p-6">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:text-xs">Active</p>
              <p className="text-xl md:text-2xl font-bold text-blue-600">{activeActions}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 md:ml-2 md:h-10 md:w-10">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="flex h-full flex-col justify-between gap-3 p-3 md:flex-row md:items-center md:p-6">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:text-xs">Overdue</p>
              <p className="text-xl md:text-2xl font-bold text-rose-600">{overdueCount}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 md:ml-2 md:h-10 md:w-10">
              <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="flex h-full flex-col justify-between gap-3 p-3 md:flex-row md:items-center md:p-6">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:text-xs">Due Today</p>
              <p className="text-xl md:text-2xl font-bold text-amber-600">{dueTodayCount}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 md:ml-2 md:h-10 md:w-10">
              <CalendarClock className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="flex h-full flex-col justify-between gap-3 p-3 md:flex-row md:items-center md:p-6">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:text-xs">Due Soon</p>
              <p className="text-xl md:text-2xl font-bold text-blue-600">{dueSoonCount}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 md:ml-2 md:h-10 md:w-10">
              <TimerReset className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {quickViews.map((view) => {
          const isActive = filters.view === view.id
          return (
            <Link
              key={view.id}
              href={view.href}
              className={`min-w-0 rounded-xl border p-2.5 transition sm:rounded-2xl sm:p-4 ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 text-xs font-bold leading-tight sm:text-sm">{view.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {view.count}
                </span>
              </div>
              <p className={`mt-1 hidden text-xs sm:block ${isActive ? 'text-white/70' : 'text-slate-500'}`}>{view.detail}</p>
            </Link>
          )
        })}
      </div>

      {/* Main Table Card */}
      <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
        <CardHeader className="border-b bg-slate-50/40 px-3 py-3 sm:px-4 sm:py-4 md:px-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm font-semibold text-slate-800 sm:text-base">
                Action Items {overdueCount > 0 && <span className="text-rose-600">({overdueCount} overdue)</span>}
              </CardTitle>
              {hasActiveFilters ? (
                <span className="text-xs text-slate-500">Filtered results</span>
              ) : null}
            </div>
            <p className="hidden text-xs text-slate-500 sm:block">
              Grouped by store/reference. Blank date fields mean no date filter is active.
            </p>
            <div className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              filters.date_from || filters.date_to
                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {dateFilterSummary}
            </div>

            <form method="get" className="space-y-2.5 md:hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  name="q"
                  defaultValue={searchParams.q || ''}
                  placeholder="Search action groups"
                  className="bg-white pl-10"
                />
              </div>

              <details open={hasActiveFilters} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                    Filters
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                    {activeFilterCount > 0 ? `${activeFilterCount} active` : 'Optional'}
                  </span>
                </summary>

                <div className="space-y-2.5 border-t border-slate-200 bg-white px-3 py-3">
                  <select
                    name="store_question"
                    defaultValue={searchParams.store_question || 'all'}
                    className="min-h-[48px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-base"
                  >
                    <option value="all">All store questions</option>
                    {storeQuestionOptions.map((question) => (
                      <option key={question} value={question}>
                        {formatStoreActionQuestionForDisplay(question)}
                      </option>
                    ))}
                  </select>

                  <select
                    name="status"
                    defaultValue={searchParams.status || 'all'}
                    className="min-h-[48px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-base"
                  >
                    <option value="all">All statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="complete">Complete</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <select
                    name="priority"
                    defaultValue={searchParams.priority || 'all'}
                    className="min-h-[48px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-base"
                  >
                    <option value="all">All priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <DateFilterInput
                      name="date_from"
                      defaultValue={searchParams.date_from || ''}
                      placeholder="From date"
                      ariaLabel="From date"
                      className="bg-white"
                    />
                    <DateFilterInput
                      name="date_to"
                      defaultValue={searchParams.date_to || ''}
                      placeholder="To date"
                      ariaLabel="To date"
                      className="bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button type="submit" className="w-full">
                      Apply
                    </Button>
                    <Button
                      type="submit"
                      name="overdue"
                      value="true"
                      variant={filters.overdue ? 'default' : 'outline'}
                      className="w-full"
                    >
                      Overdue Only
                    </Button>
                  </div>

                  <Button asChild variant="outline" className="w-full">
                    <Link href="/actions">Reset</Link>
                  </Button>
                </div>
              </details>
            </form>

            <form method="get" className="hidden grid-cols-1 gap-2 md:grid md:grid-cols-8">
              <div className="relative md:col-span-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  name="q"
                  defaultValue={searchParams.q || ''}
                  placeholder="Search actions"
                  className="pl-9 bg-white"
                />
              </div>

              <select
                name="store_question"
                defaultValue={searchParams.store_question || 'all'}
                className="h-10 min-h-[44px] rounded-md border border-slate-200 bg-white px-3 text-sm md:col-span-2"
              >
                <option value="all">All store questions</option>
                {storeQuestionOptions.map((question) => (
                  <option key={question} value={question}>
                    {formatStoreActionQuestionForDisplay(question)}
                  </option>
                ))}
              </select>

              <select
                name="status"
                defaultValue={searchParams.status || 'all'}
                className="h-10 min-h-[44px] rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                name="priority"
                defaultValue={searchParams.priority || 'all'}
                className="h-10 min-h-[44px] rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="all">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <DateFilterInput
                name="date_from"
                defaultValue={searchParams.date_from || ''}
                placeholder="From date"
                ariaLabel="From date"
                className="bg-white"
              />
              <DateFilterInput
                name="date_to"
                defaultValue={searchParams.date_to || ''}
                placeholder="To date"
                ariaLabel="To date"
                className="bg-white"
              />

              <div className="md:col-span-6 flex flex-wrap gap-2">
                <Button type="submit" size="sm" className="h-9 min-h-[44px] md:min-h-0">
                  Apply Filters
                </Button>
                <Button
                  type="submit"
                  name="overdue"
                  value="true"
                  variant={filters.overdue ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 min-h-[44px] md:min-h-0"
                >
                  Overdue Only
                </Button>
                <Button asChild variant="outline" size="sm" className="h-9 min-h-[44px] md:min-h-0">
                  <Link href="/actions">Reset</Link>
                </Button>
              </div>
            </form>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="space-y-2.5 p-3 md:hidden">
            {actions.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-500 py-12">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>
                <p className="font-medium text-slate-900">No actions found</p>
                <p className="text-sm mt-1 text-center">Actions will appear here when created from audits, FRAs, incidents or stores.</p>
              </div>
            ) : (
              groupedActions.map((group) => (
                <details
                  key={group.key}
                  className="rounded-xl border border-slate-200 bg-white"
                >
                  <summary className="cursor-pointer list-none px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-700">{group.label}</span>
                      <span className="text-[11px] text-slate-500">{group.actions.length} tasks</span>
                    </div>
                  </summary>
                  <div className="space-y-2.5 border-t p-2.5">
                    {group.actions.map((action: any) => (
                      <ActionMobileCard key={action.id} action={action} canManageActions={canManageActions} />
                    ))}
                    {group.isStoreGroup && group.summaryBullets.length > 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Ops copy summary
                        </p>
                        <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-5 text-slate-700">{group.summaryBullets.map((bullet: string) => `- ${bullet}`).join('\n')}</pre>
                      </div>
                    ) : null}
                  </div>
                </details>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block p-4 space-y-3">
            {actions.length === 0 ? (
              <div className="h-40 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <FileText className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="font-medium text-slate-900">No actions found</p>
                  <p className="text-sm mt-1">Actions will appear here when created from audits, FRAs, incidents or stores.</p>
                </div>
              </div>
            ) : (
              groupedActions.map((group) => (
                <details
                  key={group.key}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <summary className="cursor-pointer list-none bg-slate-50 px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-slate-700">{group.label}</span>
                      <span className="text-xs text-slate-500">{group.actions.length} tasks</span>
                    </div>
                  </summary>
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold text-slate-500">Title</TableHead>
                        <TableHead className="font-semibold text-slate-500 w-[130px]">Reference</TableHead>
                        <TableHead className="font-semibold text-slate-500">Assigned To</TableHead>
                        <TableHead className="w-[100px] font-semibold text-slate-500">Priority</TableHead>
                        <TableHead className="font-semibold text-slate-500 w-[130px]">Due Date</TableHead>
                        <TableHead className="w-[120px] font-semibold text-slate-500">Status</TableHead>
                        <TableHead className="w-[160px] text-right font-semibold text-slate-500">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.actions.map((action: any) => (
                        <ActionsTableRow key={action.id} action={action} canManageActions={canManageActions} />
                      ))}
                    </TableBody>
                  </Table>
                  {group.isStoreGroup && group.summaryBullets.length > 0 ? (
                    <div className="border-t bg-slate-50/60 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Ops copy summary
                      </p>
                      <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-700">{group.summaryBullets.map((bullet: string) => `- ${bullet}`).join('\n')}</pre>
                    </div>
                  ) : null}
                </details>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
