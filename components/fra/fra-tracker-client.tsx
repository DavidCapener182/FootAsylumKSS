'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FRATable, FRARow } from './fra-table'
import { FRACompletedTable } from './fra-completed-table'
import { FRAStatsCards } from './fra-stats-cards'
import { UserRole } from '@/lib/auth'
import { CheckCircle2 } from 'lucide-react'

interface FRATrackerClientProps {
  stores: FRARow[]
  userRole: UserRole
}

export function FRATrackerClient({ stores, userRole }: FRATrackerClientProps) {
  const [areaFilter, setAreaFilter] = useState<string>('all')

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Overview Grid - now reactive to area filter */}
      <div className="grid gap-4 md:grid-cols-3">
        <FRAStatsCards stores={stores} selectedArea={areaFilter} />
      </div>

      {/* Main Content Area */}
      <div className="border border-slate-200 rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="border-b bg-slate-50/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Fire Risk Assessment Tracker</h2>
        </div>
        <div className="p-4 md:p-6">
          <Tabs defaultValue="required" className="w-full">
            <div className="flex items-center justify-center md:justify-start mb-4 md:mb-6">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-slate-100 p-1 min-h-[44px]">
                <TabsTrigger 
                  value="required"
                  className="data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm transition-all"
                >
                  Required
                </TabsTrigger>
                <TabsTrigger 
                  value="completed"
                  className="data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Completed</span>
                  <span className="sm:hidden">Done</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="required" className="mt-0">
              <FRATable rows={stores} userRole={userRole} areaFilter={areaFilter} onAreaFilterChange={setAreaFilter} />
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              <FRACompletedTable rows={stores} areaFilter={areaFilter} onAreaFilterChange={setAreaFilter} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
