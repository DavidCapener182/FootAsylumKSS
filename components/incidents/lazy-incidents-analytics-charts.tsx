'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'

const IncidentsAnalyticsCharts = dynamic(
  () =>
    import('./incidents-analytics-charts').then(
      (mod) => mod.IncidentsAnalyticsCharts
    ),
  {
    ssr: false,
    loading: () => (
      <Card className="border-slate-200">
        <CardContent className="py-10 text-center text-sm text-slate-500">
          Loading analytics charts...
        </CardContent>
      </Card>
    ),
  }
)

type MonthlyTrendPoint = {
  month: string
  incidents: number
  riddor: number
  nearMiss: number
  open: number
  closed: number
}

type CategoryPoint = {
  name: string
  value: number
}

type ClaimsTrendPoint = {
  month: string
  claims: number
}

interface LazyIncidentsAnalyticsChartsProps {
  mode?: 'overview' | 'detailed'
  monthlyData: MonthlyTrendPoint[]
  personData: CategoryPoint[]
  rootCauseData: CategoryPoint[]
  accidentTypeData: CategoryPoint[]
  claimsMonthlyData: ClaimsTrendPoint[]
}

export function LazyIncidentsAnalyticsCharts(
  props: LazyIncidentsAnalyticsChartsProps
) {
  return <IncidentsAnalyticsCharts {...props} />
}

