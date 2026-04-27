'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

import { ComplianceByRegionPanel } from './compliance-by-region-panel'
import { ComplianceProgressPanel } from './compliance-progress-panel'
import { DashboardHeader } from './dashboard-header'
import type { DashboardData } from './dashboard-types'
import { normalisePriorityStores } from './dashboard-utils'
import { KpiGrid } from './kpi-grid'
import { NeedsAttentionSection } from './needs-attention-section'
import { PriorityStoresPanel } from './priority-stores-panel'
import { QuickLinksPanel } from './quick-links-panel'
import { RecentActivityPanel } from './recent-activity-panel'
import { UpcomingVisitsPanel } from './upcoming-visits-panel'

const ReportModal = dynamic(
  () => import('./report-modal').then((mod) => mod.ReportModal),
  { ssr: false }
)

interface DashboardClientProps {
  initialData: DashboardData
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [data] = useState<DashboardData>(initialData)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportContent, setReportContent] = useState('')
  const [reportSnapshot, setReportSnapshot] = useState<unknown>(null)
  const [reportGeneratedAt, setReportGeneratedAt] = useState<string | null>(null)

  const handleGenerateReport = async () => {
    setIsReportOpen(true)
    if (!reportContent || !reportSnapshot) {
      setReportLoading(true)
      try {
        const response = await fetch('/api/ai/compliance-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dashboardData: data }),
        })

        if (!response.ok) throw new Error('Failed to generate report')

        const result = await response.json()
        setReportContent(result.content || '<p>Error generating report. Please check your API configuration.</p>')
        setReportSnapshot(result.snapshot || null)
        setReportGeneratedAt(result.generatedAt || null)
      } catch (error) {
        console.error('Error generating report:', error)
        setReportContent('<p>Error generating report. Please check your API configuration.</p>')
        setReportSnapshot(null)
        setReportGeneratedAt(null)
      } finally {
        setReportLoading(false)
      }
    }
  }

  return (
    <div className="min-h-full bg-slate-50">
      {isReportOpen ? (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          content={reportContent}
          isLoading={reportLoading}
          snapshot={reportSnapshot as any}
          generatedAt={reportGeneratedAt}
        />
      ) : null}

      <DashboardHeader onGenerateReport={handleGenerateReport} reportLoading={reportLoading} />

      <div className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        <NeedsAttentionSection data={data} />
        <KpiGrid data={data} />

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <ComplianceProgressPanel data={data} />
          </div>
          <div className="xl:col-span-4">
            <PriorityStoresPanel stores={normalisePriorityStores(data).slice(0, 4)} />
          </div>
          <div className="xl:col-span-3">
            <UpcomingVisitsPanel routes={Array.isArray(data.plannedRoutes) ? data.plannedRoutes : []} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <RecentActivityPanel activity={Array.isArray(data.recentActivity) ? data.recentActivity : []} />
          </div>
          <div className="xl:col-span-4">
            <ComplianceByRegionPanel data={data} />
          </div>
          <div className="xl:col-span-4">
            <QuickLinksPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
