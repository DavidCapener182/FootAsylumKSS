'use client'

import { useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FRATable, FRARow } from './fra-table'
import { FRACompletedTable } from './fra-completed-table'
import { FRAStatsCards } from './fra-stats-cards'
import { UserRole } from '@/lib/auth'
import { CheckCircle2, Download, Flame } from 'lucide-react'
import { getFRAPDFDownloadUrl } from '@/app/actions/fra-pdfs'
import { getFRAStatus, storeNeedsFRA } from './fra-table-helpers'
import { useToast } from '@/hooks/use-toast'

interface FRATrackerClientProps {
  stores: FRARow[]
  userRole: UserRole
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

    let successCount = 0
    let failedCount = 0

    for (const row of downloadableCompletedRows) {
      if (!row.fire_risk_assessment_pdf_path) continue

      try {
        const signedUrl = await getFRAPDFDownloadUrl(row.fire_risk_assessment_pdf_path)
        if (!signedUrl) {
          failedCount += 1
          continue
        }

        const anchor = document.createElement('a')
        anchor.href = signedUrl
        const storeCode = row.store_code?.trim() ? `${row.store_code.trim()}-` : ''
        const safeStoreName = row.store_name.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '')
        const fraDate = row.fire_risk_assessment_date || 'fra'
        anchor.download = `${storeCode}${safeStoreName}-FRA-${fraDate}.pdf`
        anchor.rel = 'noopener noreferrer'
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)

        successCount += 1
      } catch (error) {
        console.error('Failed to download FRA PDF:', row.id, error)
        failedCount += 1
      }
    }

    setIsDownloadingAll(false)

    if (failedCount === 0) {
      toast({
        title: 'Downloads started',
        description: `Started ${successCount} FRA PDF download${successCount === 1 ? '' : 's'}.`,
        variant: 'success',
      })
      return
    }

    toast({
      title: 'Download completed with issues',
      description: `Started ${successCount} download${successCount === 1 ? '' : 's'}, ${failedCount} failed.`,
      variant: 'destructive',
    })
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
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100 sm:min-h-[44px] sm:w-auto md:rounded-lg md:px-4 md:py-2"
            >
              <Download size={16} />
              {isDownloadingAll
                ? 'Starting downloads...'
                : `Download Completed FRAs (${downloadableCompletedRows.length})`}
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
              <FRACompletedTable rows={stores} areaFilter={areaFilter} onAreaFilterChange={setAreaFilter} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
