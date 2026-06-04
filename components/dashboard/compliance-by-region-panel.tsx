import { MapPin } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

import { EmptyState } from '@/components/ui/empty-state'
import type { DashboardData } from './dashboard-types'
import { chartColours, clampPercentage, getAreaDisplayName, percent, safeNumber } from './dashboard-utils'
import { Panel } from './panel'

export function ComplianceByRegionPanel({ data }: { data: DashboardData }) {
  const validRegions = (data.regionalCompliance || [])
    .map((region) => ({
      name: getAreaDisplayName(region.region),
      percentage: clampPercentage(safeNumber(region.inDatePercentage)),
      inDate: safeNumber(region.inDate),
      total: safeNumber(region.total),
    }))
    .filter((region) => region.total > 0)

  const totalStores = validRegions.reduce((total, region) => total + region.total, 0)
  const totalInDate = validRegions.reduce((total, region) => total + region.inDate, 0)
  const overall = totalStores > 0 ? percent(totalInDate, totalStores) : safeNumber(data.fraStats?.inDateCoveragePercentage)

  return (
    <Panel title="Compliance by Region" icon={MapPin}>
      {validRegions.length === 0 ? (
        <EmptyState icon={MapPin} title="Regional compliance data unavailable" description="Region-level compliance will appear once the dashboard receives regional store status data." />
      ) : (
        <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[180px_1fr] sm:gap-5 xl:grid-cols-1 2xl:grid-cols-[180px_1fr]">
          <div className="relative h-28 sm:h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={validRegions} dataKey="inDate" nameKey="name" innerRadius="56%" outerRadius="82%" paddingAngle={2} strokeWidth={0}>
                  {validRegions.map((region, index) => (
                    <Cell key={region.name} fill={chartColours[index % chartColours.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl font-bold text-slate-900 sm:text-3xl">{overall}%</p>
              <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">Overall</p>
            </div>
          </div>

          <div className="min-w-0 space-y-1.5 sm:space-y-2">
            {validRegions.slice(0, 6).map((region, index) => (
              <div key={region.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-[11px] sm:text-sm">
                <span className="flex min-w-0 items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: chartColours[index % chartColours.length] }} />
                  <span className="truncate">{region.name}</span>
                </span>
                <span className="shrink-0 text-right font-semibold tabular-nums text-slate-900">{region.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}
