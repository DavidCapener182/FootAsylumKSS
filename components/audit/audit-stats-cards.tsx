'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ClipboardCheck, Store, TrendingUp } from 'lucide-react'
import { formatPercent } from '@/lib/utils'
import { AuditRow, getLatestPct } from './audit-table-helpers'

// Area name mapping
const areaNames: Record<string, string> = {
  'A1': 'Scotland & North East',
  'A2': 'Yorkshire & Midlands',
  'A3': 'Manchester',
  'A4': 'Lancashire & Merseyside',
  'A5': 'Birmingham',
  'A6': 'Wales',
  'A7': 'South',
  'A8': 'London',
}

function getAreaDisplayName(areaCode: string | null): string {
  if (!areaCode) return 'All Stores'
  const name = areaNames[areaCode]
  return name ? `${areaCode} - ${name}` : areaCode
}

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

    // Only count COMPLETED audits (both date AND percentage)
    const auditsCompleted = filteredStores.reduce((acc, store) => {
      let count = 0
      if (store.compliance_audit_1_date && store.compliance_audit_1_overall_pct !== null) count++
      if (store.compliance_audit_2_date && store.compliance_audit_2_overall_pct !== null) count++
      return acc + count
    }, 0)

    return { avgScore, activeStores, auditsCompleted }
  }, [filteredStores])

  // Get label based on selected area
  const areaLabel = selectedArea === 'all' 
    ? 'All Stores' 
    : getAreaDisplayName(selectedArea)

  return (
    <>
      <Card className="hidden md:block shadow-sm border-slate-200 bg-white">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              {areaLabel} Average
            </p>
            <p className="text-3xl font-bold text-slate-900">{formatPercent(stats.avgScore)}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="hidden md:block shadow-sm border-slate-200 bg-white">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Active Stores
            </p>
            <p className="text-3xl font-bold text-slate-900">{stats.activeStores}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Store className="h-6 w-6 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200 bg-white">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Audits Completed
            </p>
            <p className="text-3xl font-bold text-slate-900">{stats.auditsCompleted}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
            <ClipboardCheck className="h-6 w-6 text-purple-600" />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
