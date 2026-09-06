'use client'

import { WorkspaceMetrics } from '@/components/product/workspace-metrics'
import { useMemo } from 'react'
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

  return <WorkspaceMetrics label="Audit overview" items={[{ label: `${areaLabel} average`, value: formatPercent(stats.avgScore), detail: 'Latest scored audits at active stores' }, { label: 'Active stores', value: stats.activeStores }, { label: 'Audits completed', value: stats.auditsCompleted, detail: 'Includes completed warehouse audits' }]} />
}
