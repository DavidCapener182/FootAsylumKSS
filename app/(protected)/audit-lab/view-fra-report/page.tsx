'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FRAReportView } from '@/components/fra/fra-report-view'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Printer, X, Download } from 'lucide-react'
import { getFraReportFilename } from '@/lib/utils'

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const GENERIC_PLACEHOLDERS = [/^to\s+be\s+confirmed$/i, /^unknown$/i, /^n\/?a$/i, /^na$/i]
const BUILD_DATE_PLACEHOLDERS = [...GENERIC_PLACEHOLDERS, /^2009$/i]
const ADJACENT_PLACEHOLDERS = [...GENERIC_PLACEHOLDERS, /^see\s+description$/i]

const normalizeFieldText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value).trim()
  return ''
}

const isMeaningfulValue = (value: unknown, placeholders: RegExp[] = GENERIC_PLACEHOLDERS): boolean => {
  const normalized = normalizeFieldText(value)
  if (!normalized) return false
  return !placeholders.some((pattern) => pattern.test(normalized))
}

const toDisplayDay = (day: string): string => day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()

const normalizeHoursLabel = (value: string): string => {
  const cleaned = value.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  if (/^closed$/i.test(cleaned)) return 'Closed'
  if (/^open\s*24\s*hours$/i.test(cleaned)) return 'Open 24 hours'
  return cleaned.replace(/\s*-\s*/g, ' - ')
}

const formatOpeningTimesMap = (map: Record<string, unknown>): string | null => {
  type OpeningDay = typeof DAY_ORDER[number]
  const entries: Array<{ day: OpeningDay; hours: string }> = []
  for (const day of DAY_ORDER) {
    const value = map[day] ?? map[toDisplayDay(day)] ?? map[day.slice(0, 3)]
    if (typeof value !== 'string') continue
    const hours = normalizeHoursLabel(value)
    if (!hours) continue
    entries.push({ day, hours })
  }

  if (!entries.length) return null

  const groups: Array<{ start: OpeningDay; end: OpeningDay; hours: string }> = []
  for (const entry of entries) {
    const previous = groups[groups.length - 1]
    if (previous && previous.hours === entry.hours) {
      previous.end = entry.day
    } else {
      groups.push({ start: entry.day, end: entry.day, hours: entry.hours })
    }
  }

  return groups
    .map((group) => {
      const label = group.start === group.end
        ? toDisplayDay(group.start)
        : `${toDisplayDay(group.start)} to ${toDisplayDay(group.end)}`
      return `${label}: ${group.hours}`
    })
    .join('; ')
}

const normalizeOpeningTimesValue = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (/^\{[\s\S]*\}$/.test(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return formatOpeningTimesMap(parsed as Record<string, unknown>) || trimmed
        }
      } catch {
        // keep original string when parsing fails
      }
    }
    return trimmed
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return formatOpeningTimesMap(value as Record<string, unknown>)
  }
  return null
}

const isManualSource = (sources: Record<string, string> | undefined, fieldName: string): boolean => {
  const source = normalizeFieldText(sources?.[fieldName]).toUpperCase()
  return source === 'CUSTOM' || source === 'REVIEW'
}

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

  // Persist last location so "Active Audits → Edit" can resume where the user left off.
  useEffect(() => {
    if (!instanceId || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(`fra:last_location:${instanceId}`, window.location.pathname + window.location.search)
    } catch {
      // ignore storage failures
    }
  }, [instanceId])
  const [fraData, setFraData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [saveDraftBeforeComplete, setSaveDraftBeforeComplete] = useState<(() => Promise<boolean>) | null>(null)

  const fetchData = async () => {
    if (!instanceId) {
      setError('Missing audit instance ID')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setNeedsSetup(false)
      const response = await fetch(`/api/fra-reports/view?instanceId=${instanceId}`)
      if (!response.ok) {
        const errorData = await response.json()
        const message = errorData.error || 'Failed to load FRA report'
        // If the report isn't ready yet, prompt the user to continue the setup flow.
        if (message.toLowerCase().includes('failed to generate fra report')) {
          setNeedsSetup(true)
          setError(null)
          return
        }
        throw new Error(message)
      }
      let data = await response.json()

      data.storeOpeningTimes = normalizeOpeningTimesValue(data.storeOpeningTimes) ?? data.storeOpeningTimes
      data.operatingHours = normalizeOpeningTimesValue(data.operatingHours) ?? data.operatingHours
      
      // Fetch additional store info (opening times, build date)
      if (data.store?.id) {
        try {
          const storeInfoResponse = await fetch(`/api/fra-reports/store-info?storeId=${data.store.id}`)
          if (storeInfoResponse.ok) {
            const storeInfo = await storeInfoResponse.json()
            const storeBuildDate = normalizeFieldText(storeInfo.store.build_date)
            const storeOpeningTimes = normalizeOpeningTimesValue(storeInfo.store.opening_times)

            let hasBuildDate = isManualSource(data._sources, 'buildDate') || isMeaningfulValue(data.buildDate, BUILD_DATE_PLACEHOLDERS)
            let hasOpeningTimes = isManualSource(data._sources, 'storeOpeningTimes')
              || isManualSource(data._sources, 'operatingHours')
              || isMeaningfulValue(normalizeOpeningTimesValue(data.storeOpeningTimes) || normalizeOpeningTimesValue(data.operatingHours))
            let hasFloorArea = isManualSource(data._sources, 'floorArea') || isMeaningfulValue(data.floorArea)
            let hasAdjacentOccupancies = isManualSource(data._sources, 'adjacentOccupancies') || isMeaningfulValue(data.adjacentOccupancies, ADJACENT_PLACEHOLDERS)

            const missingBuildDate = !hasBuildDate && !isMeaningfulValue(storeBuildDate, BUILD_DATE_PLACEHOLDERS)
            const missingOpeningTimes = !hasOpeningTimes && !isMeaningfulValue(storeOpeningTimes)
            const missingFloorArea = !hasFloorArea
            const missingAdjacentOccupancies = !hasAdjacentOccupancies
            // If key About Property values are missing, try web search
            if ((missingBuildDate || missingOpeningTimes || missingFloorArea || missingAdjacentOccupancies) && data.store?.store_name && data.address) {
              try {
                const searchResponse = await fetch('/api/fra-reports/search-store-data', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    storeName: data.store.store_name,
                    address: data.address,
                    city: data.store.city || '',
                    storeId: data.store.id,
                  }),
                })
                if (searchResponse.ok) {
                  const searchData = await searchResponse.json()
                  if (searchData.buildDate && !hasBuildDate) {
                    data.buildDate = searchData.buildDate
                    data._sources = { ...data._sources, buildDate: 'WEB_SEARCH' }
                    hasBuildDate = true
                  }
                  const normalizedSearchOpeningTimes = normalizeOpeningTimesValue(searchData.openingTimes)
                  if (normalizedSearchOpeningTimes && !hasOpeningTimes) {
                    data.storeOpeningTimes = normalizedSearchOpeningTimes
                    data._sources = { ...data._sources, storeOpeningTimes: 'WEB_SEARCH' }
                    hasOpeningTimes = true
                  }
                  if (searchData.squareFootage && !hasFloorArea) {
                    data.floorArea = searchData.squareFootage
                    data._sources = { ...data._sources, floorArea: 'WEB_SEARCH' }
                    hasFloorArea = true
                  }
                  if (searchData.adjacentOccupancies && !hasAdjacentOccupancies) {
                    data.adjacentOccupancies = searchData.adjacentOccupancies
                    data._sources = { ...data._sources, adjacentOccupancies: 'WEB_SEARCH' }
                    hasAdjacentOccupancies = true
                  }
                }
              } catch (searchErr) {
                console.error('Error searching store data:', searchErr)
              }
            }

            const shouldApplyStoreOpeningTimes = isMeaningfulValue(storeOpeningTimes) && !hasOpeningTimes
            const shouldApplyStoreBuildDate = isMeaningfulValue(storeBuildDate, BUILD_DATE_PLACEHOLDERS) && !hasBuildDate
            data = {
              ...data,
              storeOpeningTimes: shouldApplyStoreOpeningTimes ? storeOpeningTimes : data.storeOpeningTimes,
              buildDate: shouldApplyStoreBuildDate
                ? storeBuildDate
                : data.buildDate,
              _sources: {
                ...(data._sources || {}),
                ...(shouldApplyStoreOpeningTimes ? { storeOpeningTimes: 'DATABASE' } : {}),
                ...(shouldApplyStoreBuildDate ? { buildDate: 'DATABASE' } : {}),
              },
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
                  fireExits: data.numberOfFireExits,
                  numberOfFloors: data.numberOfFloors,
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
      if (saveDraftBeforeComplete) {
        const saved = await saveDraftBeforeComplete()
        if (!saved) {
          throw new Error('Could not save your latest report edits. Please resolve any save errors and try again.')
        }
      }

      const res = await fetch('/api/fra-reports/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSaveSuccess(true)
      // After marking the FRA as complete, return to the main Audit Lab page
      // so you can immediately start another assessment.
      router.push('/audit-lab')
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save FRA')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    // Open standalone print URL so print always runs in print-document context (no scroll clipping)
    if (instanceId && typeof window !== 'undefined') {
      window.open(`${window.location.origin}/print/fra-report?instanceId=${instanceId}`, '_blank', 'noopener,noreferrer')
    } else {
      window.print()
    }
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
      a.download = getFraReportFilename(fraData?.premises, fraData?.assessmentDate, 'pdf')
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
    <div className="min-h-screen bg-white print:bg-white print:min-h-0">
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
      <div className="fra-view-scroll-container h-[calc(100vh-48px)] bg-white print:block print:h-auto">
        <div className="mx-auto h-full w-full max-w-[1200px] overflow-auto px-2 py-3 print:w-full print:max-w-none print:h-auto print:overflow-visible print:min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : needsSetup ? (
            <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">This FRA is not ready to view yet</h2>
              <p className="mt-2 text-sm text-slate-600">
                We still need to extract and review the H&S audit text before the full document can be generated.
              </p>
              <div className="mt-4">
                <Button
                  onClick={() => {
                    if (!instanceId) return
                    router.push(`/audit-lab/review-fra-data?instanceId=${instanceId}`)
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  Continue setup
                </Button>
              </div>
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : fraData ? (
            <FRAReportView
              data={fraData}
              onDataUpdate={fetchData}
              onRegisterSaveHandler={(handler) => {
                setSaveDraftBeforeComplete(() => handler)
              }}
            />
          ) : (
            <div className="p-6 text-sm text-slate-600">No data available.</div>
          )}
        </div>
      </div>
    </div>
  )
}
