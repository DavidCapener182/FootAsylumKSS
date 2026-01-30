'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FRAReportView } from '@/components/fra/fra-report-view'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Printer, X, Download } from 'lucide-react'
import { getFraReportFilename } from '@/lib/utils'

export default function FRAReportViewPage({
  searchParams,
}: {
  searchParams: { instanceId?: string; print?: string }
}) {
  const router = useRouter()
  const instanceId = searchParams?.instanceId
  const isPrintPreview = searchParams?.print === '1'
  // Redirect ?print=1 to standalone print route (no layout = proper page breaks)
  useEffect(() => {
    if (isPrintPreview && instanceId && typeof window !== 'undefined') {
      window.location.replace(`/print/fra-report?instanceId=${instanceId}`)
    }
  }, [isPrintPreview, instanceId])
  const [fraData, setFraData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
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
      
      // Fetch additional store info (opening times, build date)
      if (data.store?.id) {
        try {
          const storeInfoResponse = await fetch(`/api/fra-reports/store-info?storeId=${data.store.id}`)
          if (storeInfoResponse.ok) {
            const storeInfo = await storeInfoResponse.json()
            // If build date or opening times are missing, try web search
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
                  if (searchData.buildDate) {
                    data.buildDate = searchData.buildDate
                    data._sources = { ...data._sources, buildDate: 'WEB_SEARCH' }
                  }
                  if (searchData.openingTimes) {
                    data.storeOpeningTimes = searchData.openingTimes
                    data._sources = { ...data._sources, storeOpeningTimes: 'WEB_SEARCH' }
                  }
                }
              } catch (searchErr) {
                console.error('Error searching store data:', searchErr)
              }
            }
            data = {
              ...data,
              storeOpeningTimes: storeInfo.store.opening_times || data.storeOpeningTimes,
              buildDate: storeInfo.store.build_date && storeInfo.store.build_date !== '2009' 
                ? storeInfo.store.build_date 
                : data.buildDate,
            }
          }
        } catch (err) {
          console.error('Error fetching store info:', err)
        }

        // Generate access description if we have store address
        if (data.address && !data.accessDescription) {
          try {
            const descResponse = await fetch('/api/fra-reports/generate-access-description', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                storeAddress: data.address,
                auditInfo: {
                  fireExits: data.numberOfFloors,
                  storeName: data.premises,
                },
              }),
            })
            if (descResponse.ok) {
              const descData = await descResponse.json()
              data.accessDescription = descData.description
            }
          } catch (err) {
            console.error('Error generating access description:', err)
          }
        }
      }
      
      setFraData(data)
    } catch (err: any) {
      console.error('Error loading FRA report:', err)
      setError(err.message || 'Failed to load FRA report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [instanceId])

  const handleSave = async () => {
    if (!instanceId) return
    setSaving(true)
    setSaveSuccess(false)
    setSaveError(null)
    try {
      const res = await fetch('/api/fra-reports/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save FRA')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!instanceId) return
    setGeneratingPdf(true)
    try {
      const response = await fetch(`/api/fra-reports/generate-pdf?instanceId=${instanceId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Failed to generate PDF')
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
      console.error('Error downloading PDF:', err)
      alert(`Failed to download PDF: ${err.message || 'Unknown error'}`)
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handlePrintPreview = () => {
    if (!instanceId) return
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    window.open(`${base}/print/fra-report?instanceId=${instanceId}`, '_blank', 'noopener,noreferrer')
  }

  const handleClosePreview = () => {
    if (!instanceId) return
    router.push(`/audit-lab/view-fra-report?instanceId=${instanceId}`)
  }

  if (isPrintPreview && instanceId) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-600">
        <span>Redirecting to print view…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white print:min-h-0">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-4 bg-slate-900 text-white px-4 py-3 shadow">
        <div className="flex items-center gap-4">
          <Link href="/audit-lab" className="text-sm font-semibold uppercase tracking-wide">
            ← Back to Audits
          </Link>
          <span className="text-xs text-slate-300">
            View FRA Report
          </span>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {saveError && (
            <span className="text-red-400 text-sm mr-2">{saveError}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintPreview}
            className="bg-slate-800 hover:bg-slate-700 text-white border-slate-600"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print preview
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={generatingPdf || !fraData}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            {generatingPdf ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="bg-slate-700 hover:bg-slate-600 text-white border-0"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={saving || !fraData?.fraInstance}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {!saving && !saveSuccess && <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save & mark done'}
          </Button>
        </div>
      </div>
      <div className="h-[calc(100vh-48px)] overflow-auto print:h-auto print:overflow-visible print:min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : fraData ? (
          <FRAReportView data={fraData} onDataUpdate={fetchData} />
        ) : (
          <div className="p-6 text-sm text-slate-600">No data available.</div>
        )}
      </div>
    </div>
  )
}
