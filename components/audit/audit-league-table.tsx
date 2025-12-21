'use client'

import { useMemo, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { AuditRow, pctBadge, formatDate, getLatestPct } from './audit-table-helpers'

// Helper: Get the most recent audit date
function getLatestDate(row: AuditRow): string | null {
  if (row.compliance_audit_2_date) return row.compliance_audit_2_date
  if (row.compliance_audit_1_date) return row.compliance_audit_1_date
  return null
}

export function AuditLeagueTable({ rows }: { rows: AuditRow[] }) {
  const [search, setSearch] = useState('')
  const [area, setArea] = useState<string>('all')

  const areaOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.region && set.add(r.region))
    return Array.from(set).sort()
  }, [rows])

  // Rank all stores by their latest compliance percentage
  const rankedStores = useMemo(() => {
    const filtered = rows.filter((row) => {
      const matchesArea = area === 'all' || row.region === area
      const term = search.trim().toLowerCase()
      const matchesSearch =
        term.length === 0 ||
        row.store_name.toLowerCase().includes(term) ||
        (row.store_code || '').toLowerCase().includes(term)
      return matchesArea && matchesSearch
    })

    // Sort by latest percentage (descending), then by store name
    return filtered
      .map(row => ({
        ...row,
        latestPct: getLatestPct(row),
        latestDate: getLatestDate(row),
      }))
      .sort((a, b) => {
        // Stores with percentages come first
        if (a.latestPct === null && b.latestPct !== null) return 1
        if (a.latestPct !== null && b.latestPct === null) return -1
        if (a.latestPct === null && b.latestPct === null) {
          // Both have no percentage, sort by name
          return a.store_name.localeCompare(b.store_name)
        }
        // Both have percentages, sort by percentage descending
        if (b.latestPct! - a.latestPct! !== 0) {
          return b.latestPct! - a.latestPct!
        }
        // Same percentage, sort by name
        return a.store_name.localeCompare(b.store_name)
      })
  }, [rows, area, search])

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Input
            placeholder="Search store name or code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 md:w-64 bg-white min-h-[44px]"
          />
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="w-full sm:w-40 bg-white min-h-[44px]">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              {areaOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {rankedStores.length} of {rows.length} stores
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col">
        {/* Fixed Header - OUTSIDE scroll container on desktop, INSIDE on mobile */}
        <div className="hidden md:block border-b bg-white overflow-x-auto">
          <Table className="w-full border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col className="w-16 md:w-20" />
              <col className="w-20 md:w-24" />
              <col />
              <col className="w-24 md:table-column hidden" />
              <col className="hidden md:table-column" />
              <col className="w-32 md:w-32" />
              <col className="w-24 md:table-column hidden" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-center bg-white">Rank</TableHead>
                <TableHead className="bg-white">Store Code</TableHead>
                <TableHead className="bg-white">Store Name</TableHead>
                <TableHead className="bg-white hidden md:table-cell">Area</TableHead>
                <TableHead className="bg-white hidden md:table-cell">Latest Audit Date</TableHead>
                <TableHead className="bg-white text-right md:text-left">Latest Compliance %</TableHead>
                <TableHead className="bg-white hidden md:table-cell">Total Audits</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
        </div>

        {/* Scrollable Body - Headers inside on mobile, body only on desktop */}
        <div className="h-[70vh] overflow-y-auto overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 relative">
          {/* Mobile Header - Inside scroll container, sticky */}
          <div className="md:hidden sticky top-0 z-10 bg-white border-b">
            <Table className="w-full border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col className="w-16 md:w-20" />
                <col className="w-20 md:w-24" />
                <col />
                <col className="w-24 md:table-column hidden" />
                <col className="hidden md:table-column" />
                <col className="w-32 md:w-32" />
                <col className="w-24 md:table-column hidden" />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center bg-white">Rank</TableHead>
                  <TableHead className="bg-white">Store Code</TableHead>
                  <TableHead className="bg-white">Store Name</TableHead>
                  <TableHead className="bg-white hidden md:table-cell">Area</TableHead>
                  <TableHead className="bg-white hidden md:table-cell">Latest Audit Date</TableHead>
                  <TableHead className="bg-white text-right md:text-left">Latest Compliance %</TableHead>
                  <TableHead className="bg-white hidden md:table-cell">Total Audits</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>
          <Table className="w-full border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col className="w-16 md:w-20" />
              <col className="w-20 md:w-24" />
              <col />
              <col className="w-24 md:table-column hidden" />
              <col className="hidden md:table-column" />
              <col className="w-32 md:w-32" />
              <col className="w-24 md:table-column hidden" />
            </colgroup>
            <TableBody>
              {rankedStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="md:col-span-7 text-center text-muted-foreground py-10">
                    No stores found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                rankedStores.map((row, index) => {
                  const rank = index + 1
                  const isTopThree = rank <= 3
                  
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "group hover:bg-slate-50 transition-colors",
                        isTopThree && "bg-emerald-50/30"
                      )}
                    >
                      <TableCell className="text-center font-bold border-b bg-white group-hover:bg-slate-50">
                        <div className="flex items-center justify-center gap-2">
                          {rank <= 3 && (
                            <span className="text-lg">
                              {rank === 1 && '🥇'}
                              {rank === 2 && '🥈'}
                              {rank === 3 && '🥉'}
                            </span>
                          )}
                          <span className={cn(
                            "font-mono text-sm",
                            isTopThree ? "text-emerald-700" : "text-muted-foreground"
                          )}>
                            #{rank}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium border-b bg-white group-hover:bg-slate-50">
                        {row.store_code || '—'}
                      </TableCell>
                      <TableCell className="font-semibold text-sm border-b bg-white group-hover:bg-slate-50">
                        {row.store_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground border-b bg-white group-hover:bg-slate-50 hidden md:table-cell">
                        {row.region || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground border-b bg-white group-hover:bg-slate-50 hidden md:table-cell">
                        {formatDate(row.latestDate)}
                      </TableCell>
                      <TableCell className="border-b bg-white group-hover:bg-slate-50 text-right md:text-left">
                        {pctBadge(row.latestPct)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground border-b bg-white group-hover:bg-slate-50 hidden md:table-cell">
                        {row.total_audits_to_date ?? '0'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

