'use client'

import { useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FRATable, FRARow } from './fra-table'
import { FRACompletedTable } from './fra-completed-table'
import { FRAStatsCards } from './fra-stats-cards'
import { UserRole } from '@/lib/auth'
import { AlertTriangle, CalendarClock, CheckCircle2, Download, Flame } from 'lucide-react'
import { calculateNextDueDate, formatDate, getDaysUntilDue, getFRAStatus, statusBadge, storeNeedsFRA } from './fra-table-helpers'
import { useToast } from '@/hooks/use-toast'

interface FRATrackerClientProps {
  stores: FRARow[]
  userRole: UserRole
}

type FRAAttentionStatus = 'overdue' | 'required' | 'due'

function getDownloadFileName(response: Response, fallback: string): string {
  const disposition = response.headers.get('content-disposition') || ''
  const match = disposition.match(/filename\*?=(?:UTF-8''|\"?)([^\";]+)/i)

  if (!match?.[1]) {
    return fallback
  }

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function FRATrackerClient({ stores, userRole }: FRATrackerClientProps) {
  const [activeView, setActiveView] = useState<'required' | 'completed'>('required')
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const { toast } = useToast()

  const attentionRows = useMemo(() => {
    const priority: Record<FRAAttentionStatus, number> = {
      overdue: 0,
      required: 1,
      due: 2,
    }

    return stores
      .map((row) => {
        const needsFRA = storeNeedsFRA(row)
        const status = getFRAStatus(row.fire_risk_assessment_date, needsFRA)
        const daysUntilDue = getDaysUntilDue(row.fire_risk_assessment_date)
        const nextDueDate = calculateNextDueDate(row.fire_risk_assessment_date)

        return {
          row,
          status,
          daysUntilDue,
          nextDueDate: nextDueDate ? nextDueDate.toISOString() : null,
        }
      })
      .filter((item): item is typeof item & { status: FRAAttentionStatus } =>
        item.status === 'overdue' || item.status === 'required' || item.status === 'due'
      )
      .sort((a, b) => {
        const priorityDiff = priority[a.status] - priority[b.status]
        if (priorityDiff !== 0) return priorityDiff

        const aDays = a.daysUntilDue ?? Number.MAX_SAFE_INTEGER
        const bDays = b.daysUntilDue ?? Number.MAX_SAFE_INTEGER
        return aDays - bDays
      })
  }, [stores])

  const attentionStats = useMemo(() => {
    return attentionRows.reduce(
      (stats, item) => {
        stats[item.status] += 1
        return stats
      },
      { overdue: 0, required: 0, due: 0 }
    )
  }, [attentionRows])

  const downloadableCompletedRows = useMemo(() => {
    return stores.filter((row) => {
      const needsFRA = storeNeedsFRA(row)
      const status = getFRAStatus(row.fire_risk_assessment_date, needsFRA)
      const areaMatches = areaFilter === 'all' || row.region === areaFilter
      return areaMatches && status === 'up_to_date' && Boolean(row.fire_risk_assessment_pdf_path)
    })
  }, [stores, areaFilter])

  const handleDownloadAllCompleted = async () => {
    if (downloadableCompletedRows.length === 0) {
      toast({
        title: 'No completed FRA PDFs',
        description: 'There are no uploaded completed FRA files to download for the current filter.',
        variant: 'destructive',
      })
      return
    }

    setIsDownloadingAll(true)

    try {
      const response = await fetch('/api/fra-pdfs/download-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeIds: downloadableCompletedRows.map((row) => row.id),
        }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Failed to prepare FRA download bundle.')
      }

      const includedCount = Number(response.headers.get('x-fra-files-count') || '0')
      const skippedCount = Number(response.headers.get('x-fra-skipped-count') || '0')
      const blob = await response.blob()
      const fileName = getDownloadFileName(response, 'completed-fra-pdfs.zip')
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')

      anchor.href = objectUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)

      if (skippedCount === 0) {
        toast({
          title: 'Download ready',
          description: `Saved ${includedCount} completed FRA PDF${includedCount === 1 ? '' : 's'} in one ZIP file.`,
          variant: 'success',
        })
        return
      }

      toast({
        title: 'Download ready with issues',
        description: `Saved ${includedCount} FRA PDF${includedCount === 1 ? '' : 's'} in the ZIP file, ${skippedCount} skipped.`,
        variant: 'destructive',
      })
    } catch (error) {
      console.error('Failed to download FRA archive:', error)
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Failed to prepare FRA download bundle.',
        variant: 'destructive',
      })
    } finally {
      setIsDownloadingAll(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-600 md:text-xs">
                <Flame size={14} />
                Fire Compliance Monitoring
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Fire Risk Assessment</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Track Fire Risk Assessments for stores that have completed audits. FRAs must be renewed every 12 months.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadAllCompleted}
              disabled={isDownloadingAll || downloadableCompletedRows.length === 0}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto md:hidden"
            >
              <Download size={16} />
              {isDownloadingAll ? 'Preparing ZIP...' : `Download Completed FRAs (${downloadableCompletedRows.length})`}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <FRAStatsCards stores={stores} selectedArea={areaFilter} />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                Attention Required
              </div>
              <h2 className="text-lg font-bold text-slate-900 md:text-xl">FRA follow-ups to prioritise</h2>
              <p className="text-sm text-slate-500">Overdue, due soon and required assessments are grouped before the main tracker.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
              <button
                type="button"
                onClick={() => setActiveView('required')}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 transition hover:bg-rose-100"
              >
                <div className="text-lg font-black tabular-nums">{attentionStats.overdue}</div>
                <div className="text-[11px] font-bold uppercase tracking-wide">Overdue</div>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('required')}
                className="rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-orange-800 transition hover:bg-orange-100"
              >
                <div className="text-lg font-black tabular-nums">{attentionStats.required}</div>
                <div className="text-[11px] font-bold uppercase tracking-wide">Required</div>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('required')}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 transition hover:bg-amber-100"
              >
                <div className="text-lg font-black tabular-nums">{attentionStats.due}</div>
                <div className="text-[11px] font-bold uppercase tracking-wide">Due Soon</div>
              </button>
            </div>
          </div>
        </div>

        {attentionRows.length > 0 ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-3">
            {attentionRows.slice(0, 6).map(({ row, status, daysUntilDue, nextDueDate }) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900">{row.store_name}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[row.store_code, row.region].filter(Boolean).join(' · ') || 'Store details pending'}
                    </p>
                  </div>
                  {statusBadge(status, daysUntilDue)}
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                  <CalendarClock className="h-4 w-4 text-slate-400" />
                  <span>
                    {status === 'required'
                      ? 'No FRA completion recorded'
                      : `Next review ${formatDate(nextDueDate)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 text-sm text-emerald-700 md:p-6">
            <CheckCircle2 className="h-5 w-5" />
            <span>No overdue, due soon or required FRAs are currently showing.</span>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'required' | 'completed')} className="w-full">
          <div className="border-b border-slate-100 p-4 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-800 md:text-xl">Fire Risk Assessment Tracker</h2>
                <p className="text-sm text-slate-500">Move between outstanding FRA work and completed assessments without leaving mobile view.</p>
              </div>
              <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-100 p-1 lg:w-auto lg:min-w-[320px] lg:rounded-xl">
                <TabsTrigger
                  value="required"
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-bold text-slate-500 transition-all data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
                >
                  <Flame className="h-4 w-4" />
                  Required
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-bold text-slate-500 transition-all data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Completed
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <div className="p-4 md:p-6">
            <TabsContent value="required" className="mt-0">
              <FRATable rows={stores} userRole={userRole} areaFilter={areaFilter} onAreaFilterChange={setAreaFilter} />
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              <FRACompletedTable
                rows={stores}
                areaFilter={areaFilter}
                onAreaFilterChange={setAreaFilter}
                onDownloadAllCompleted={handleDownloadAllCompleted}
                downloadAllCount={downloadableCompletedRows.length}
                isDownloadingAll={isDownloadingAll}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
