'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, TrendingUp, Clock, AlertCircle, Store, FileCheck, Sparkles, X, Loader2, Calendar, Flame } from 'lucide-react'
import { format } from 'date-fns'
import { ComplianceVisitsTracking } from '@/components/dashboard/compliance-visits-tracking'
import { PlannedRounds } from '@/components/dashboard/planned-rounds'

// --- Helper Components ---

function MetricCard({ title, value, icon: Icon, colorClass, bgClass, href }: any) {
  const cardContent = (
    <Card className={`flex flex-row items-center justify-between p-4 md:p-6 bg-white shadow-sm border-slate-200 transition-all hover:shadow-md ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <span className="text-2xl md:text-3xl font-bold text-slate-900">{value}</span>
      </div>
      <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl ${bgClass} flex items-center justify-center transition-colors flex-shrink-0 ml-2`}>
        <Icon className={`h-5 w-5 md:h-6 md:w-6 ${colorClass}`} />
      </div>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {cardContent}
      </Link>
    )
  }

  return cardContent
}

function ProgressBar({ value, colorClass = "bg-blue-600", heightClass = "h-2" }: { value: number, colorClass?: string, heightClass?: string }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-100 ${heightClass}`}>
      <div
        className={`h-full ${colorClass} transition-all duration-700 ease-out`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

function LabeledProgressBar({ label, value, total, colorClass }: { label: string, value: number, total: number, colorClass: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="text-xs font-bold text-slate-500">{value}</span>
      </div>
      <ProgressBar value={percentage} colorClass={colorClass} heightClass="h-1.5" />
    </div>
  )
}

// --- Report Modal Component ---
function ReportModal({ isOpen, onClose, content, isLoading }: { isOpen: boolean, onClose: () => void, content: string, isLoading: boolean }) {
  if (!isOpen) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .ai-report-content h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 0;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .ai-report-content h3:first-child {
          margin-top: 0;
        }
        .ai-report-content h3::before {
          content: '';
          width: 4px;
          height: 1.25rem;
          background: linear-gradient(to bottom, #3b82f6, #6366f1);
          border-radius: 2px;
        }
        .ai-report-content p {
          color: #475569;
          line-height: 1.7;
          margin-bottom: 1rem;
          font-size: 0.95rem;
        }
        .ai-report-content ul {
          list-style: none;
          padding-left: 0;
          margin: 1rem 0;
        }
        .ai-report-content li {
          color: #475569;
          line-height: 1.7;
          padding-left: 1.5rem;
          position: relative;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }
        .ai-report-content li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #6366f1;
          font-weight: bold;
          font-size: 1.25rem;
          line-height: 1.4;
        }
        .ai-report-content strong {
          color: #1e293b;
          font-weight: 600;
        }
      `}} />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:w-full md:max-w-2xl md:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 md:p-5 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 safe-top">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="bg-blue-600 p-1.5 rounded-lg flex-shrink-0">
                <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base md:text-lg text-slate-900 truncate">AI Intelligence Report</h3>
                <p className="text-xs text-slate-500 hidden sm:block">Powered by OpenAI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 ml-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 md:p-8 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              <p className="text-slate-500 font-medium text-sm md:text-base">Analyzing dashboard metrics...</p>
            </div>
          ) : (
            <div 
              className="space-y-4 md:space-y-6 ai-report-content"
              dangerouslySetInnerHTML={{ __html: content }} 
            />
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end safe-bottom">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[120px] w-full md:w-auto"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// --- Main Client Component ---

interface DashboardClientProps {
  initialData: any
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [data] = useState(initialData)
  
  // AI State
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportContent, setReportContent] = useState("")

  const handleGenerateReport = async () => {
    setIsReportOpen(true)
    if (!reportContent) { // Only generate if not already generated this session
      setReportLoading(true)
      try {
        const response = await fetch('/api/ai/compliance-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dashboardData: data }),
        })

        if (!response.ok) {
          throw new Error('Failed to generate report')
        }

        const result = await response.json()
        setReportContent(result.content || '<p>Error generating report. Please check your API configuration.</p>')
      } catch (error) {
        console.error('Error generating report:', error)
        setReportContent('<p>Error generating report. Please check your API configuration.</p>')
      } finally {
        setReportLoading(false)
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      
      <ReportModal 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        content={reportContent} 
        isLoading={reportLoading} 
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">Overview of compliance status and store performance</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
            <button 
                onClick={handleGenerateReport}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm font-medium transition-all hover:shadow-md active:scale-95 min-h-[44px]"
            >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Generate Report</span>
                <span className="sm:hidden">Report</span>
            </button>
            <div className="text-xs sm:text-sm font-medium text-slate-500 bg-white px-3 sm:px-4 py-2 rounded-md shadow-sm border border-slate-200 text-center sm:text-left min-h-[44px] flex items-center justify-center">
                Updated: {format(new Date(), 'HH:mm')}
            </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-5">
        <MetricCard 
          title="Open Incidents" 
          value={data.openIncidents} 
          icon={AlertTriangle} 
          colorClass="text-blue-600" 
          bgClass="bg-blue-50" 
        />
        <MetricCard 
          title="Investigating" 
          value={data.underInvestigation} 
          icon={TrendingUp} 
          colorClass="text-purple-600" 
          bgClass="bg-purple-50" 
        />
        <MetricCard 
          title="Overdue Actions" 
          value={data.overdueActions} 
          icon={Clock} 
          colorClass="text-orange-600" 
          bgClass="bg-orange-50" 
        />
        <MetricCard 
          title="High Risk (30d)" 
          value={data.highCritical} 
          icon={AlertCircle} 
          colorClass="text-rose-600" 
          bgClass="bg-rose-50" 
        />
        <MetricCard 
          title="Stores Requiring FRA" 
          value={data.storesRequiringFRA || 0} 
          icon={Flame} 
          colorClass="text-orange-600" 
          bgClass="bg-orange-50"
          href="/fire-risk-assessment"
        />
      </div>

      {/* Bento Grid: Planned Visits, Audit Completion, Top Stores */}
      <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Planned Visits - Small card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm md:col-span-1 h-[170px]">
          <div className="pb-1.5 px-3 pt-3">
            <h3 className="text-emerald-900 flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4" />
              Planned Visits
            </h3>
          </div>
          <div className="px-3 pb-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-3xl font-bold text-emerald-900">
                {data.plannedRoutes?.reduce((total: number, route: any) => total + (route.stores?.length || route.storeCount || 0), 0) || 0}
              </p>
              <p className="text-xs text-emerald-700">
                {data.plannedRoutes?.reduce((total: number, route: any) => total + (route.stores?.length || route.storeCount || 0), 0) === 1 ? 'store' : 'stores'} with planned visits
              </p>
              <p className="text-sm font-semibold text-emerald-700 mt-1">
                {data.plannedRoutes?.length || 0} {data.plannedRoutes?.length === 1 ? 'route' : 'routes'} planned
              </p>
            </div>
          </div>
        </div>

        {/* Audit Completion Rates - Large card spanning 2 columns */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm md:col-span-2 lg:col-span-2 h-[170px] flex flex-col">
          <div className="pb-1.5 px-3 pt-3">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-slate-800">Audit Completion Rates</h3>
            </div>
          </div>
          <div className="px-3 pb-3 flex-1 overflow-y-auto">
            <div className="grid gap-2 grid-cols-1 md:grid-cols-3">
              {/* First Audit */}
              <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">First Audit</span>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-slate-900">{data.auditStats.firstAuditPercentage}%</span>
                  <span className="text-xs font-medium text-slate-400">{data.auditStats.firstAuditsComplete}/{data.auditStats.totalStores}</span>
                </div>
                <ProgressBar value={data.auditStats.firstAuditPercentage} colorClass="bg-emerald-500" />
              </div>

              {/* Second Audit */}
              <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                 <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Second Audit</span>
                 <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-slate-900">{data.auditStats.secondAuditPercentage}%</span>
                  <span className="text-xs font-medium text-slate-400">{data.auditStats.secondAuditsComplete}/{data.auditStats.totalStores}</span>
                </div>
                <ProgressBar value={data.auditStats.secondAuditPercentage} colorClass="bg-blue-500" />
              </div>

              {/* Total Complete */}
              <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-purple-200 transition-colors">
                 <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Fully Compliant</span>
                 <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-slate-900">{data.auditStats.totalAuditPercentage}%</span>
                  <span className="text-xs font-medium text-slate-400">{data.auditStats.totalAuditsComplete}/{data.auditStats.totalStores}</span>
                </div>
                <ProgressBar value={data.auditStats.totalAuditPercentage} colorClass="bg-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Stores - Medium card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm md:col-span-1 h-[170px] flex flex-col">
          <div className="pb-1.5 border-b bg-slate-50/40 px-3 pt-3">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <h3 className="text-sm font-bold text-slate-800">Top Stores (Open Incidents)</h3>
            </div>
          </div>
          <div className="pt-2 px-3 pb-3 flex-1 overflow-y-auto">
            {data.topStores.length === 0 ? (
              <p className="text-slate-400 text-sm py-1 italic">No data available</p>
            ) : (
              <div className="space-y-2">
                {data.topStores.map((store: any, idx: number) => (
                  <div key={store.id} className="group">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-700 truncate w-2/3 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                          {idx + 1}
                        </span>
                        {store.name}
                      </span>
                      <span className="font-bold text-slate-800">{store.count}</span>
                    </div>
                    {/* Visual Bar relative to Max */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${(store.count / data.maxStoreCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Compliance Visits Due & Planned Rounds row */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 lg:grid-cols-[10fr_3fr]">
        <div className="h-full min-w-0">
          <ComplianceVisitsTracking 
            stores={data.storesNeedingSecondVisit} 
            profiles={data.profiles} 
          />
        </div>
        <div className="h-full min-w-0">
          <PlannedRounds 
            plannedRoutes={data.plannedRoutes || []} 
          />
        </div>
      </div>

      {/* Incident Breakdown - Full width below compliance visits */}
      {data.totalIncidents > 0 && (
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader className="pb-3 border-b bg-slate-50/40 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-sm font-bold text-slate-800">Incident Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 md:pt-5 space-y-4 md:space-y-6 px-3 md:px-6 pb-4 md:pb-6">
            
            {/* By Status */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">By Status</h4>
              {Object.keys(data.statusCounts).length === 0 ? (
                <p className="text-slate-400 text-xs italic">No data available</p>
              ) : (
                Object.entries(data.statusCounts).map(([status, count]) => (
                  <LabeledProgressBar 
                    key={status} 
                    label={status} 
                    value={count as number} 
                    total={data.totalIncidents} 
                    colorClass="bg-purple-500" 
                  />
                ))
              )}
            </div>

            <div className="border-t border-slate-100 my-4" />

            {/* By Severity */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">By Severity</h4>
               {Object.keys(data.severityCounts).length === 0 ? (
                <p className="text-slate-400 text-xs italic">No data available</p>
              ) : (
                Object.entries(data.severityCounts).map(([severity, count]) => (
                  <LabeledProgressBar 
                    key={severity} 
                    label={severity} 
                    value={count as number} 
                    total={data.totalIncidents} 
                    colorClass={
                      severity === 'critical' ? 'bg-red-600' : 
                      severity === 'high' ? 'bg-orange-500' : 'bg-slate-500'
                    } 
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

