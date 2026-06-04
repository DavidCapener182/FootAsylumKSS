'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuditTable, AuditRow } from './audit-table'
import { AuditLeagueTable } from './audit-league-table'
import { AuditStatsCards } from './audit-stats-cards'
import { ClipboardCheck, Download, Map, Trophy } from 'lucide-react'
import { UserRole } from '@/lib/auth'

interface AuditTrackerClientProps {
  stores: AuditRow[]
  userRole: UserRole
}

export function AuditTrackerClient({ stores, userRole }: AuditTrackerClientProps) {
  const [activeView, setActiveView] = useState<'by-area' | 'league'>('by-area')
  const [areaFilter, setAreaFilter] = useState<string>('all')

  return (
    <div className="max-w-full space-y-6 overflow-x-hidden">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-lime-600 md:text-xs">
                <ClipboardCheck size={14} />
                Compliance Monitoring
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Audit Tracker</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Track compliance scores, view audit history, and monitor network performance across all regions.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 sm:w-auto"
            >
              <Download size={16} />
              Export Data
            </button>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <AuditStatsCards stores={stores} selectedArea={areaFilter} />
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:rounded-3xl">
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'by-area' | 'league')} className="w-full">
          <div className="border-b border-slate-100 p-4 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-1">
                <h2 className="text-lg font-bold text-slate-800 md:text-xl">Detailed Audit Reports</h2>
                <p className="text-sm leading-5 text-slate-500">Switch between grouped area cards and a ranked league table.</p>
              </div>
              <TabsList className="grid h-auto min-h-[44px] w-full min-w-0 grid-cols-2 rounded-2xl bg-slate-100 p-1 lg:w-auto lg:min-w-[320px] lg:rounded-xl">
                <TabsTrigger
                  value="by-area"
                  className="flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-xl px-2 text-xs font-bold text-slate-500 transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm sm:gap-2 sm:text-sm"
                >
                  <Map className="h-4 w-4 shrink-0" />
                  <span className="truncate">By Area</span>
                </TabsTrigger>
                <TabsTrigger
                  value="league"
                  className="flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-xl px-2 text-xs font-bold text-slate-500 transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm sm:gap-2 sm:text-sm"
                >
                  <Trophy className="h-4 w-4 shrink-0" />
                  <span className="truncate">League Table</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <div className="min-w-0 p-3 sm:p-4 md:p-6">
            <TabsContent value="by-area" className="mt-0">
              <AuditTable rows={stores} userRole={userRole} areaFilter={areaFilter} onAreaFilterChange={setAreaFilter} />
            </TabsContent>

            <TabsContent value="league" className="mt-0">
              <AuditLeagueTable
                rows={stores}
                userRole={userRole}
                areaFilter={areaFilter}
                onAreaFilterChange={setAreaFilter}
              />
            </TabsContent>
          </div>
        </Tabs>
        </div>
    </div>
  )
}
