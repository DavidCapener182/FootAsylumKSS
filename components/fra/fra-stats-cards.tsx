'use client'

import { WorkspaceMetrics } from '@/components/product/workspace-metrics'
import { useMemo } from 'react'
import { FRARow, storeNeedsFRA, getFRAStatus } from './fra-table-helpers'

interface FRAStatsCardsProps {
  stores: FRARow[]
  selectedArea: string
}

export function FRAStatsCards({ stores, selectedArea }: FRAStatsCardsProps) {
  // Filter stores by selected area
  const filteredStores = useMemo(() => {
    if (selectedArea === 'all') return stores
    return stores.filter(store => store.region === selectedArea)
  }, [stores, selectedArea])

  // Calculate stats for filtered stores
  const stats = useMemo(() => {
    if (!filteredStores || !filteredStores.length) {
      return { 
        storesRequiringFRA: 0, 
        frasCompleted: 0, 
        frasDueOrOverdue: 0 
      }
    }
    
    const activeStores = filteredStores.filter(s => s.is_active)
    
    // Count stores requiring FRA (need FRA and status is NOT "up_to_date")
    const storesRequiringFRA = activeStores.filter(store => {
      const needsFRA = storeNeedsFRA(store)
      if (!needsFRA) return false
      const status = getFRAStatus(store.fire_risk_assessment_date, needsFRA)
      return status !== 'up_to_date' // Exclude "up_to_date" stores
    }).length
    
    // Count only in-date completed FRAs (not due/overdue)
    const frasCompleted = activeStores.filter(store => {
      const needsFRA = storeNeedsFRA(store)
      if (!needsFRA) return false
      const status = getFRAStatus(store.fire_risk_assessment_date, needsFRA)
      return status === 'up_to_date'
    }).length
    
    // Count FRAs that are due or overdue
    const frasDueOrOverdue = activeStores.filter(store => {
      if (!storeNeedsFRA(store)) return false
      const status = getFRAStatus(store.fire_risk_assessment_date, true)
      return status === 'due' || status === 'overdue'
    }).length

    return { storesRequiringFRA, frasCompleted, frasDueOrOverdue }
  }, [filteredStores])

  return <WorkspaceMetrics label="Fire safety overview" items={[{ label: 'Stores requiring FRA', value: stats.storesRequiringFRA, attention: stats.storesRequiringFRA > 0 }, { label: 'FRAs completed', value: stats.frasCompleted, detail: 'In-date assessments' }, { label: 'Due / overdue', value: stats.frasDueOrOverdue, attention: stats.frasDueOrOverdue > 0 }]} />
}
