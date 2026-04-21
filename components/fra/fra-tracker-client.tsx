'use client'

import { useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FRATable, FRARow } from './fra-table'
import { FRACompletedTable } from './fra-completed-table'
import { FRAStatsCards } from './fra-stats-cards'
import { UserRole } from '@/lib/auth'
import { CheckCircle2, Download, Flame } from 'lucide-react'
import { getFRAStatus, storeNeedsFRA } from './fra-table-helpers'
import { useToast } from '@/hooks/use-toast'

interface FRATrackerClientProps {
  stores: FRARow[]
  userRole: UserRole
}

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
      <div className="relative overflow-hidden rounded-xl bg-[#0f172a] p-3 text-white shadow-xl shadow-slate-200/50 sm:p-4 md:rounded-3xl md:p-8">
        <div className="absolute right-0 top-0 h-96 w-96 translate-x-1/3 -translate-y-1/2 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/3 translate-y-1/3 rounded-full bg-rose-500/10 blur-3xl" />

        <div className="relative z-10 space-y-3 md:space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-orange-400 md:text-xs">
                <Flame size={14} />
                Fire Compliance Monitoring
              </div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">Fire Risk Assessment</h1>
              <p className="mt-1 max-w-2xl text-xs leading-snug text-slate-400 sm:text-sm">
                Track Fire Risk Assessments for stores that have completed audits. FRAs must be renewed every 12 months.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadAllCompleted}
              disabled={isDownloadingAll || downloadableCompletedRows.length === 0}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100 sm:min-h-[44px] sm:w-auto md:hidden"
            >
              <Download size={16} />
              {isDownloadingAll ? 'Preparing ZIP...' : `Download Completed FRAs (${downloadableCompletedRows.length})`}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4">
            <FRAStatsCards stores={stores} selectedArea={areaFilter} />
          </div>
        </div>
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
