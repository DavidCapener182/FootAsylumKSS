'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface AuditStats {
  totalStores: number
  firstAuditsComplete: number
  secondAuditsComplete: number
  totalAuditsComplete: number
  firstAuditPercentage: number
  secondAuditPercentage: number
  totalAuditPercentage: number
}

interface AuditCompletionStatsProps {
  stats: AuditStats
}

export function AuditCompletionStats({ stats }: AuditCompletionStatsProps) {
  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-emerald-600'
    if (percentage >= 70) return 'text-amber-600'
    return 'text-rose-600'
  }

  const getBgColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-emerald-50'
    if (percentage >= 70) return 'bg-amber-50'
    return 'bg-rose-50'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-emerald-600'
    if (percentage >= 70) return 'bg-amber-600'
    return 'bg-rose-600'
  }

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-gray-900">Audit Completion</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="first" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="first">First Audits</TabsTrigger>
            <TabsTrigger value="second">Second Audits</TabsTrigger>
            <TabsTrigger value="total">Total Complete</TabsTrigger>
          </TabsList>

          <TabsContent value="first" className="mt-6">
            <div className={cn('rounded-lg p-6', getBgColor(stats.firstAuditPercentage))}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">First Audits Complete</p>
                  <p className={cn('text-4xl font-bold', getPercentageColor(stats.firstAuditPercentage))}>
                    {stats.firstAuditPercentage}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{stats.firstAuditsComplete}</p>
                  <p className="text-xs text-gray-500">of {stats.totalStores} stores</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={cn('h-full transition-all duration-500', getProgressColor(stats.firstAuditPercentage))}
                  style={{ width: `${stats.firstAuditPercentage}%` }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="second" className="mt-6">
            <div className={cn('rounded-lg p-6', getBgColor(stats.secondAuditPercentage))}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Second Audits Complete</p>
                  <p className={cn('text-4xl font-bold', getPercentageColor(stats.secondAuditPercentage))}>
                    {stats.secondAuditPercentage}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{stats.secondAuditsComplete}</p>
                  <p className="text-xs text-gray-500">of {stats.totalStores} stores</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={cn('h-full transition-all duration-500', getProgressColor(stats.secondAuditPercentage))}
                  style={{ width: `${stats.secondAuditPercentage}%` }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="total" className="mt-6">
            <div className={cn('rounded-lg p-6', getBgColor(stats.totalAuditPercentage))}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Audits Complete</p>
                  <p className={cn('text-4xl font-bold', getPercentageColor(stats.totalAuditPercentage))}>
                    {stats.totalAuditPercentage}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{stats.totalAuditsComplete}</p>
                  <p className="text-xs text-gray-500">of {stats.totalStores} stores</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={cn('h-full transition-all duration-500', getProgressColor(stats.totalAuditPercentage))}
                  style={{ width: `${stats.totalAuditPercentage}%` }}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

