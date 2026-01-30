'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FRAReportView } from '@/components/fra/fra-report-view'
import { Button } from '@/components/ui/button'
import { Loader2, Printer, X, Download } from 'lucide-react'
import { getFraReportFilename } from '@/lib/utils'

/**
 * Standalone print view for FRA report – no sidebar/layout wrapper.
 * Used for print preview and PDF generation so content can flow across A4 pages.
 */
export default function FRAPrintReportPage({
  searchParams,
}: {
  searchParams: { instanceId?: string }
}) {
  const router = useRouter()
  const instanceId = searchParams?.instanceId
  const [fraData, setFraData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const fetchData = async () => {
    if (!instanceId) {
      setError('Missing audit instance ID')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const response = await fetch(`/api/fra-reports/view?instanceId=${instanceId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load FRA report')
      }
      let data = await response.json()
      if (data.store?.id) {
        try {
          const storeInfoResponse = await fetch(`/api/fra-reports/store-info?storeId=${data.store.id}`)
          if (storeInfoResponse.ok) {
            const storeInfo = await storeInfoResponse.json()
            if ((!storeInfo.store.build_date || storeInfo.store.build_date === '2009') && data.store?.store_name && data.address) {
              try {
                const searchResponse = await fetch('/api/fra-reports/search-store-data', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    storeName: data.store.store_name,
                    address: data.address,
                    city: data.store.city || '',
                  }),
                })
                if (searchResponse.ok) {
                  const searchData = await searchResponse.json()
                  if (searchData.buildDate) data.buildDate = searchData.buildDate
                  if (searchData.openingTimes) data.storeOpeningTimes = searchData.openingTimes
                }
              } catch (_) {}
            }
            data = {
              ...data,
              storeOpeningTimes: storeInfo.store.opening_times ?? data.storeOpeningTimes,
              buildDate: storeInfo.store.build_date && storeInfo.store.build_date !== '2009' ? storeInfo.store.build_date : data.buildDate,
            }
          }
        } catch (_) {}
        if (data.address && !data.accessDescription) {
          try {
            const descResponse = await fetch('/api/fra-reports/generate-access-description', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                storeAddress: data.address,
                auditInfo: { fireExits: data.numberOfFloors, storeName: data.premises },
              }),
            })
            if (descResponse.ok) {
              const descData = await descResponse.json()
              data.accessDescription = descData.description
            }
          } catch (_) {}
        }
      }
      setFraData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load FRA report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [instanceId])

  useEffect(() => {
    document.body.classList.add('fra-print-document')
    return () => document.body.classList.remove('fra-print-document')
  }, [])

  const handlePrint = () => window.print()
  const handleDownloadPDF = async () => {
    if (!instanceId) return
    setGeneratingPdf(true)
    try {
      const response = await fetch(`/api/fra-reports/generate-pdf?instanceId=${instanceId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const msg = errorData.details || errorData.error || 'Failed to generate PDF'
        throw new Error(msg)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = getFraReportFilename(fraData?.premises, fraData?.assessmentDate, `fra-report-${instanceId.slice(-8)}.pdf`)
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      alert(`Failed to download PDF: ${err?.message || 'Unknown error'}`)
    } finally {
      setGeneratingPdf(false)
    }
  }
  const handleClosePreview = () => {
    if (instanceId) router.push(`/audit-lab/view-fra-report?instanceId=${instanceId}`)
  }

  return (
    <div className="fra-print-page-root min-h-screen flex flex-col bg-white">
      <div className="no-print flex items-center justify-center gap-4 bg-slate-200 py-2 px-4 border-b border-slate-300 shrink-0">
        <span className="text-sm text-slate-600">
          Use <strong>Print</strong> (or Cmd+P / Ctrl+P) to print multiple A4 pages. Use <strong>Download PDF</strong> for a PDF. This toolbar will not appear on the printed document.
        </span>
        <Button variant="default" size="sm" onClick={handleDownloadPDF} disabled={generatingPdf} className="bg-indigo-600 hover:bg-indigo-500">
          {generatingPdf ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>) : (<><Download className="h-4 w-4 mr-2" />Download PDF</>)}
        </Button>
        <Button variant="default" size="sm" onClick={handlePrint} className="bg-slate-700 hover:bg-slate-600">
          <Printer className="h-4 w-4 mr-2" />Print
        </Button>
        <Button variant="ghost" size="sm" onClick={handleClosePreview} className="text-slate-600 hover:text-slate-900">
          <X className="h-4 w-4 mr-2" />Close preview
        </Button>
      </div>
      <div className="fra-print-page-content flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : fraData ? (
          <FRAReportView data={fraData} onDataUpdate={fetchData} showPrintHeaderFooter />
        ) : (
          <div className="p-6 text-sm text-slate-600">No data available.</div>
        )}
      </div>
    </div>
  )
}
