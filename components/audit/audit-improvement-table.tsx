'use client'

import { useMemo, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { getInternalAreaDisplayName } from '@/lib/areas'
import { cn, getDisplayStoreCode } from '@/lib/utils'
import {
  AuditComparison,
  AuditRow,
  changeBadge,
  formatDate,
  getCompletedAuditCount,
  getLatestAuditComparison,
  pctBadge,
} from './audit-table-helpers'
import { StoreActionsModal } from './store-actions-modal'
import { Minus, Search, TrendingDown, TrendingUp } from 'lucide-react'
import { UserRole } from '@/lib/auth'

interface RankedImprovementRow extends AuditRow {
  comparison: AuditComparison
}

function formatAuditLabel(auditNumber: number): string {
  return `Audit ${auditNumber}`
}

function getMovementLabel(change: number): string {
  if (change > 0) return 'Improved'
  if (change < 0) return 'Worse'
  return 'No change'
}

function getMovementTone(change: number): string {
  if (change > 0) return 'border-emerald-200 bg-emerald-50/60 text-emerald-700'
  if (change < 0) return 'border-rose-200 bg-rose-50/60 text-rose-700'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function MovementIcon({ change, className }: { change: number; className?: string }) {
  if (change > 0) return <TrendingUp className={className} />
  if (change < 0) return <TrendingDown className={className} />
  return <Minus className={className} />
}

export function AuditImprovementTable({
  rows,
  userRole,
  areaFilter: externalAreaFilter,
  onAreaFilterChange,
}: {
  rows: AuditRow[]
  userRole: UserRole
  areaFilter?: string
  onAreaFilterChange?: (area: string) => void
}) {
  const [search, setSearch] = useState('')
  const [internalArea, setInternalArea] = useState<string>('all')
  const area = externalAreaFilter !== undefined ? externalAreaFilter : internalArea
  const setArea = onAreaFilterChange || setInternalArea
  const [storeActionsModalOpen, setStoreActionsModalOpen] = useState(false)
  const [storeActionsRow, setStoreActionsRow] = useState<AuditRow | null>(null)

  const areaOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((row) => row.region && set.add(row.region))
    return Array.from(set).sort()
  }, [rows])

  const comparableRows = useMemo<RankedImprovementRow[]>(() => {
    return rows.flatMap((row) => {
      const comparison = getLatestAuditComparison(row)
      return comparison ? [{ ...row, comparison }] : []
    })
  }, [rows])

  const rankedStores = useMemo(() => {
    const term = search.trim().toLowerCase()

    return comparableRows
      .filter((row) => {
        const matchesArea = area === 'all' || row.region === area
        const matchesSearch =
          term.length === 0 ||
          row.store_name.toLowerCase().includes(term) ||
          (row.store_code || '').toLowerCase().includes(term)

        return matchesArea && matchesSearch
      })
      .sort((a, b) => {
        if (b.comparison.change !== a.comparison.change) {
          return b.comparison.change - a.comparison.change
        }
        if (b.comparison.latest.pct !== a.comparison.latest.pct) {
          return b.comparison.latest.pct - a.comparison.latest.pct
        }
        return a.store_name.localeCompare(b.store_name)
      })
  }, [comparableRows, area, search])

  const movementStats = useMemo(() => {
    return rankedStores.reduce(
      (acc, row) => {
        if (row.comparison.change > 0) acc.improved += 1
        else if (row.comparison.change < 0) acc.worse += 1
        else acc.unchanged += 1
        return acc
      },
      { improved: 0, worse: 0, unchanged: 0 }
    )
  }, [rankedStores])

  const hasActiveFilters = search.trim().length > 0 || area !== 'all'
  const resetFilters = () => {
    setSearch('')
    setArea('all')
  }

  const handleOpenStoreActionsModal = (row: AuditRow) => {
    setStoreActionsRow(row)
    setStoreActionsModalOpen(true)
  }

  return (
    <div className="max-w-full space-y-4 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search stores"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-[44px] bg-white pl-9"
            />
          </div>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="min-h-[44px] w-full bg-white sm:w-44">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              {areaOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {getInternalAreaDisplayName(option, { fallback: option })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="min-h-[44px] text-slate-500 hover:text-slate-700"
          >
            Reset
          </Button>
        </div>
        <div className="text-sm text-slate-500">
          Showing {rankedStores.length} of {comparableRows.length} stores with 2+ scored audits
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Improved</p>
          <p className="mt-0.5 font-mono text-lg font-black text-emerald-800">{movementStats.improved}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">Worse</p>
          <p className="mt-0.5 font-mono text-lg font-black text-rose-800">{movementStats.worse}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">No change</p>
          <p className="mt-0.5 font-mono text-lg font-black text-slate-800">{movementStats.unchanged}</p>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {rankedStores.length === 0 ? (
          <div className="rounded-2xl border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            No stores have two scored audits matching your filters.
          </div>
        ) : (
          rankedStores.map((row, index) => {
            const rank = index + 1
            const change = row.comparison.change
            const tone = getMovementTone(change)

            return (
              <article key={`mobile-improvement-${row.id}`} className="rounded-2xl border bg-white p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                        tone
                      )}
                    >
                      <MovementIcon change={change} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => handleOpenStoreActionsModal(row)}
                        className="max-w-full truncate text-left text-sm font-semibold text-slate-900 underline-offset-2 hover:text-blue-700 hover:underline"
                        title="Open store actions"
                      >
                        {row.store_name}
                      </button>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono">
                          {getDisplayStoreCode(row.store_code) || '-'}
                        </span>
                        <span className="min-w-0 truncate">
                          {getInternalAreaDisplayName(row.region, { fallback: 'Unassigned' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-[11px] font-semibold text-slate-400">#{rank}</span>
                    {changeBadge(change)}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-3 text-xs">
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-slate-400">
                      {formatAuditLabel(row.comparison.previous.auditNumber)}
                    </p>
                    <div className="mt-1">{pctBadge(row.comparison.previous.pct)}</div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold uppercase tracking-wide text-slate-400">
                      {formatAuditLabel(row.comparison.latest.auditNumber)}
                    </p>
                    <div className="mt-1">{pctBadge(row.comparison.latest.pct)}</div>
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-slate-400">Latest date</p>
                    <p className="mt-1 text-slate-700">{formatDate(row.comparison.latest.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold uppercase tracking-wide text-slate-400">Movement</p>
                    <p className={cn('mt-1 font-semibold', change > 0 ? 'text-emerald-700' : change < 0 ? 'text-rose-700' : 'text-slate-600')}>
                      {getMovementLabel(change)}
                    </p>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border bg-white shadow-sm md:flex md:flex-col">
        <div className="border-b bg-white">
          <Table className="w-full border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col className="w-[76px]" />
              <col className="w-[96px]" />
              <col className="w-[260px]" />
              <col className="w-[190px]" />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[130px]" />
              <col className="w-[100px]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="bg-white text-center">Rank</TableHead>
                <TableHead className="bg-white">Store Code</TableHead>
                <TableHead className="bg-white">Store Name</TableHead>
                <TableHead className="bg-white">Area</TableHead>
                <TableHead className="bg-white">Comparison</TableHead>
                <TableHead className="bg-white text-right">Previous</TableHead>
                <TableHead className="bg-white text-right">Latest</TableHead>
                <TableHead className="bg-white text-right">Change</TableHead>
                <TableHead className="bg-white">Latest Date</TableHead>
                <TableHead className="bg-white text-center">Audits</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
        </div>

        <div className="h-[70vh] overflow-y-auto overflow-x-auto">
          <Table className="w-full border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col className="w-[76px]" />
              <col className="w-[96px]" />
              <col className="w-[260px]" />
              <col className="w-[190px]" />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[130px]" />
              <col className="w-[100px]" />
            </colgroup>
            <TableBody>
              {rankedStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    No stores have two scored audits matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                rankedStores.map((row, index) => {
                  const rank = index + 1
                  const change = row.comparison.change
                  const movementTone = getMovementTone(change)

                  return (
                    <TableRow key={row.id} className="group transition-colors hover:bg-slate-50">
                      <TableCell className="border-b bg-white text-center font-mono text-xs font-bold text-slate-500 group-hover:bg-slate-50">
                        #{rank}
                      </TableCell>
                      <TableCell className="border-b bg-white font-mono text-xs font-medium group-hover:bg-slate-50">
                        {getDisplayStoreCode(row.store_code) || '-'}
                      </TableCell>
                      <TableCell className="border-b bg-white text-sm font-semibold group-hover:bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleOpenStoreActionsModal(row)}
                          className="max-w-full truncate text-left text-sm font-semibold text-slate-900 underline-offset-2 hover:text-blue-700 hover:underline"
                          title="Open store actions"
                        >
                          {row.store_name}
                        </button>
                      </TableCell>
                      <TableCell className="border-b bg-white text-xs leading-snug text-muted-foreground group-hover:bg-slate-50">
                        {getInternalAreaDisplayName(row.region, { fallback: 'Unassigned' })}
                      </TableCell>
                      <TableCell className="border-b bg-white group-hover:bg-slate-50">
                        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', movementTone)}>
                          <MovementIcon change={change} className="h-3 w-3" />
                          {formatAuditLabel(row.comparison.latest.auditNumber)} vs {formatAuditLabel(row.comparison.previous.auditNumber)}
                        </span>
                      </TableCell>
                      <TableCell className="border-b bg-white text-right group-hover:bg-slate-50">
                        {pctBadge(row.comparison.previous.pct)}
                      </TableCell>
                      <TableCell className="border-b bg-white text-right group-hover:bg-slate-50">
                        {pctBadge(row.comparison.latest.pct)}
                      </TableCell>
                      <TableCell className="border-b bg-white text-right group-hover:bg-slate-50">
                        {changeBadge(change)}
                      </TableCell>
                      <TableCell className="border-b bg-white text-sm text-muted-foreground group-hover:bg-slate-50">
                        {formatDate(row.comparison.latest.date)}
                      </TableCell>
                      <TableCell className="border-b bg-white text-center font-mono text-xs text-muted-foreground group-hover:bg-slate-50">
                        {getCompletedAuditCount(row)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <StoreActionsModal
        open={storeActionsModalOpen}
        onOpenChange={setStoreActionsModalOpen}
        row={storeActionsRow}
        userRole={userRole}
      />
    </div>
  )
}
