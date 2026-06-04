'use client'

import { useMemo } from 'react'
import { ClipboardCheck, Store, TrendingUp } from 'lucide-react'
import { getInternalAreaDisplayName } from '@/lib/areas'
import { formatPercent } from '@/lib/utils'
import { AuditRow, getCompletedAuditCount, getLatestPct } from './audit-table-helpers'

interface AuditStatsCardsProps {
  stores: AuditRow[]
  selectedArea: string
}

export function AuditStatsCards({ stores, selectedArea }: AuditStatsCardsProps) {
  // Filter stores by selected area
  const filteredStores = useMemo(() => {
    if (selectedArea === 'all') return stores
    return stores.filter(store => store.region === selectedArea)
  }, [stores, selectedArea])

  // Calculate stats for filtered stores
  const stats = useMemo(() => {
    if (!filteredStores || !filteredStores.length) return { avgScore: 0, activeStores: 0, auditsCompleted: 0 }
    
    const activeStores = filteredStores.filter(s => s.is_active).length
    
    // Calculate average of latest audit scores for active stores
    const scores = filteredStores
      .filter(s => s.is_active)
      .map(s => getLatestPct(s))
      .filter((score): score is number => score !== null)
      
    const avgScore = scores.length 
      ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length 
      : 0

    // Warehouses can have completed audits without a percentage score.
    const auditsCompleted = filteredStores.reduce((acc, store) => {
      return acc + getCompletedAuditCount(store)
    }, 0)

    return { avgScore, activeStores, auditsCompleted }
  }, [filteredStores])

  // Get label based on selected area
  const areaLabel = selectedArea === 'all' 
    ? 'All Stores' 
    : getInternalAreaDisplayName(selectedArea, { fallback: 'All Stores' })

  return (
    <>
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:col-span-2 sm:rounded-2xl md:col-span-1 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-[10px] font-bold uppercase tracking-wide text-slate-500 md:text-xs md:tracking-wider">
              {areaLabel} Average
            </p>
            <p className="mt-0.5 text-2xl font-black text-emerald-600 md:mt-1 md:text-4xl">{formatPercent(stats.avgScore)}</p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 md:h-12 md:w-12">
            <TrendingUp className="h-4 w-4 md:h-6 md:w-6" />
          </div>
        </div>
      </div>
      
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-[10px] font-bold uppercase tracking-wide text-slate-500 md:text-xs md:tracking-wider">
              Active Stores
            </p>
            <p className="mt-0.5 text-2xl font-black text-blue-600 md:mt-1 md:text-4xl">{stats.activeStores}</p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 md:h-12 md:w-12">
            <Store className="h-4 w-4 md:h-6 md:w-6" />
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-[10px] font-bold uppercase tracking-wide text-slate-500 md:text-xs md:tracking-wider">
              Audits Completed
            </p>
            <p className="mt-0.5 text-2xl font-black text-teal-600 md:mt-1 md:text-4xl">{stats.auditsCompleted}</p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600 md:h-12 md:w-12">
            <ClipboardCheck className="h-4 w-4 md:h-6 md:w-6" />
          </div>
        </div>
      </div>
    </>
  )
}
