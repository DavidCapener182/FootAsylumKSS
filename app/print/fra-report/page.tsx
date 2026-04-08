'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FRAReportView } from '@/components/fra/fra-report-view'
import { Button } from '@/components/ui/button'
import { Loader2, Printer, X, Download } from 'lucide-react'
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

/**
 * Standalone print view for FRA report – no sidebar/layout wrapper.
 * Used for print preview and PDF generation so content can flow across A4 pages.
 * Print: use Cmd+P / Ctrl+P from this page for correct A4 pagination.
 * PDF: generated server-side via Puppeteer loading this URL with print media.
 */
export default function FRAPrintReportPage({
  searchParams,
}: {
  searchParams: { instanceId?: string; forPdf?: string }
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
      const forPdf = searchParams?.forPdf === '1'
      const response = await fetch(`/api/fra-reports/view?instanceId=${instanceId}${forPdf ? '&forPdf=1' : ''}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load FRA report')
      }
      let data = await response.json()
      data.storeOpeningTimes = normalizeOpeningTimesValue(data.storeOpeningTimes) ?? data.storeOpeningTimes
      data.operatingHours = normalizeOpeningTimesValue(data.operatingHours) ?? data.operatingHours
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
              } catch (_) {}
            }
            const shouldApplyStoreOpeningTimes = isMeaningfulValue(storeOpeningTimes) && !hasOpeningTimes
            const shouldApplyStoreBuildDate = isMeaningfulValue(storeBuildDate, BUILD_DATE_PLACEHOLDERS) && !hasBuildDate
            data = {
              ...data,
              storeOpeningTimes: shouldApplyStoreOpeningTimes ? storeOpeningTimes : data.storeOpeningTimes,
              buildDate: shouldApplyStoreBuildDate ? storeBuildDate : data.buildDate,
              _sources: {
                ...(data._sources || {}),
                ...(shouldApplyStoreOpeningTimes ? { storeOpeningTimes: 'DATABASE' } : {}),
                ...(shouldApplyStoreBuildDate ? { buildDate: 'DATABASE' } : {}),
              },
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
    const existing = document.head.querySelector('link[data-fra-print-css="true"]')
    if (existing) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/print.css'
    link.media = 'print'
    link.setAttribute('data-fra-print-css', 'true')
    document.head.appendChild(link)

    return () => {
      link.remove()
    }
  }, [])

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
      a.download = getFraReportFilename(fraData?.premises, fraData?.assessmentDate, 'pdf')
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
          Use <strong>Print</strong> (or Cmd+P / Ctrl+P) to print multiple A4 pages. Use <strong>Download PDF</strong> to export. This toolbar will not appear on the printed document.
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
      <div className="fra-print-page-content flex-1 min-h-0 overflow-auto bg-white">
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
