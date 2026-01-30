'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Save, Loader2, Upload, X } from 'lucide-react'

// Dynamically import the map component to avoid SSR issues
const StoreMap = dynamic(() => import('./store-map'), { ssr: false })

interface FRAData {
  clientName: string
  premises: string
  address: string
  responsiblePerson: string
  ultimateResponsiblePerson: string
  appointedPerson: string
  assessorName: string
  assessmentDate: string | null
  assessmentStartTime: string | null
  assessmentEndTime: string | null
  assessmentReviewDate: string | null
  buildDate: string
  storeOpeningTimes: string | null
  accessDescription: string | null
  hasSprinklers: boolean
  propertyType: string
  description: string
  numberOfFloors: string
  floorArea: string
  floorAreaComment: string | null
  occupancy: string
  occupancyComment: string | null
  operatingHours: string
  operatingHoursComment: string | null
  photos: any[] | null
  sleepingRisk: string
  internalFireDoors: string
  historyOfFires: string
  fireAlarmDescription: string
  fireAlarmPanelLocation: string
  fireAlarmPanelLocationComment: string | null
  fireAlarmPanelFaults: string
  fireAlarmPanelFaultsComment: string | null
  fireAlarmMaintenance: string
  emergencyLightingDescription: string
  emergencyLightingTestSwitchLocation: string
  emergencyLightingTestSwitchLocationComment: string | null
  emergencyLightingMaintenance: string
  fireExtinguishersDescription: string
  fireExtinguisherService: string
  sprinklerDescription: string
  sprinklerClearance: string
  sourcesOfIgnition: string[]
  sourcesOfFuel: string[]
  sourcesOfOxygen: string[]
  peopleAtRisk: string[]
  significantFindings: string[]
  recommendedControls: string[]
  store: any
  hsAuditDate: string | null
  fraInstance: any
  _sources?: Record<string, string>
  riskRatingLikelihood?: 'Low' | 'Normal' | 'High'
  riskRatingConsequences?: 'Slight Harm' | 'Moderate Harm' | 'Extreme Harm'
  summaryOfRiskRating?: string
  actionPlanLevel?: string
  actionPlanItems?: Array<{ recommendation: string; priority: 'Low' | 'Medium' | 'High'; dueNote?: string }>
  sitePremisesPhotos?: any[]
  /** Uploaded photos per placeholder (from storage), so they appear after refresh and in PDF */
  placeholderPhotos?: Record<string, { file_path: string; public_url: string }[]>
}

interface FRAReportViewProps {
  data: FRAData
  onDataUpdate?: () => void
  /** When true, show print header/footer on screen (for print preview) */
  showPrintHeaderFooter?: boolean
}

export function FRAReportView({ data, onDataUpdate, showPrintHeaderFooter }: FRAReportViewProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDebug, setShowDebug] = useState(false) // Data source badges hidden by default
  const [customData, setCustomData] = useState({
    floorArea: data.floorArea,
    occupancy: data.occupancy,
    operatingHours: data.operatingHours,
  })
  const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({})
  const [placeholderPhotos, setPlaceholderPhotos] = useState<Record<string, any[]>>({})
  const [logoError, setLogoError] = useState(false)

  // Rehydrate placeholder photos from server (so PDF and refresh show uploaded photos)
  useEffect(() => {
    if (data.placeholderPhotos && Object.keys(data.placeholderPhotos).length > 0) {
      setPlaceholderPhotos(data.placeholderPhotos)
    }
  }, [data.placeholderPhotos])

  // Debug badge component
  const DebugBadge = ({ source, fieldName }: { source?: string, fieldName: string }) => {
    if (!showDebug || !source) return null
    
    const sourceColors: Record<string, string> = {
      'H&S_AUDIT': 'bg-blue-100 text-blue-800 border-blue-300',
      'CUSTOM': 'bg-green-100 text-green-800 border-green-300',
      'DATABASE': 'bg-purple-100 text-purple-800 border-purple-300',
      'CHATGPT': 'bg-orange-100 text-orange-800 border-orange-300',
      'WEB_SEARCH': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'DEFAULT': 'bg-gray-100 text-gray-800 border-gray-300',
      'FRA_INSTANCE': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'H&S_AUDIT_CALCULATED': 'bg-blue-50 text-blue-700 border-blue-200',
      'FRA_INSTANCE_CALCULATED': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'H&S_AUDIT_MIXED': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'N/A': 'bg-slate-100 text-slate-600 border-slate-300',
    }
    
    const sourceLabels: Record<string, string> = {
      'H&S_AUDIT': 'H&S Audit',
      'CUSTOM': 'Custom Entry',
      'DATABASE': 'Database',
      'CHATGPT': 'ChatGPT',
      'WEB_SEARCH': 'Web Search',
      'DEFAULT': 'Default',
      'FRA_INSTANCE': 'FRA Instance',
      'H&S_AUDIT_CALCULATED': 'H&S Audit (Calculated)',
      'FRA_INSTANCE_CALCULATED': 'FRA Instance (Calculated)',
      'H&S_AUDIT_MIXED': 'H&S Audit (Mixed)',
      'N/A': 'N/A',
    }
    
    const colorClass = sourceColors[source] || 'bg-gray-100 text-gray-800 border-gray-300'
    const label = sourceLabels[source] || source
    
    return (
      <span 
        className={`ml-2 px-1.5 py-0.5 text-xs rounded border print:hidden ${colorClass}`}
        title={`${fieldName}: ${label}`}
      >
        {label}
      </span>
    )
  }

  // Traffic-light colours for risk badges: green = low, amber = normal/medium, red = high
  const getLikelihoodBadgeClass = (value: string | undefined) => {
    const v = (value ?? 'Normal').toLowerCase()
    if (v === 'low') return 'bg-green-600 text-white border-green-800'
    if (v === 'high') return 'bg-red-600 text-white border-red-800'
    return 'bg-amber-500 text-slate-900 border-amber-700'
  }
  const getConsequencesBadgeClass = (value: string | undefined) => {
    const v = (value ?? 'Moderate Harm').toLowerCase()
    if (v.includes('slight')) return 'bg-green-600 text-white border-green-800'
    if (v.includes('extreme')) return 'bg-red-600 text-white border-red-800'
    return 'bg-amber-500 text-slate-900 border-amber-700'
  }
  const getOverallRiskBadgeClass = (value: string | undefined) => {
    const v = (value ?? 'Tolerable').toLowerCase()
    if (v.includes('intolerable') || v.includes('unacceptable') || v === 'high') return 'bg-red-600 text-white border-red-800'
    if (v === 'tolerable' || v === 'low' || v === 'acceptable') return 'bg-green-600 text-white border-green-800'
    return 'bg-amber-500 text-slate-900 border-amber-700'
  }

  // Update local state when data prop changes
  useEffect(() => {
    setCustomData({
      floorArea: data.floorArea,
      occupancy: data.occupancy,
      operatingHours: data.operatingHours,
    })
  }, [data.floorArea, data.occupancy, data.operatingHours])

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/fra-reports/save-custom-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceId: data.fraInstance.id,
          customData: customData,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save data')
      }

      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
      
      // Refresh data if callback provided
      if (onDataUpdate) {
        onDataUpdate()
      } else {
        // Fallback: reload the page data
        window.location.reload()
      }
    } catch (error: any) {
      console.error('Error saving custom data:', error)
      alert(`Failed to save: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (placeholderId: string, files: FileList | null, maxPhotos: number = 5) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files).slice(0, maxPhotos)
    
    setUploadingPhotos(prev => ({ ...prev, [placeholderId]: true }))
    
    try {
      const formData = new FormData()
      formData.append('instanceId', data.fraInstance.id)
      formData.append('placeholderId', placeholderId)
      fileArray.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/fra-reports/upload-photo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload photos')
      }

      const result = await response.json()
      setPlaceholderPhotos(prev => ({
        ...prev,
        [placeholderId]: [...(prev[placeholderId] || []), ...result.files]
      }))

      if (onDataUpdate) {
        onDataUpdate()
      }
    } catch (error: any) {
      console.error('Error uploading photos:', error)
      alert(`Failed to upload photos: ${error.message}`)
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [placeholderId]: false }))
    }
  }

  const PhotoPlaceholder = ({ placeholderId, label, maxPhotos = 5 }: { placeholderId: string, label: string, maxPhotos?: number }) => {
    const photos = placeholderPhotos[placeholderId] || []
    const isUploading = uploadingPhotos[placeholderId]

    const isGrid = (maxPhotos ?? 5) > 1
    return (
      <div className="mt-4">
        {photos.length > 0 ? (
          <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 ${isGrid ? 'fra-photo-grid' : ''}`}>
            {photos.map((photo: any, idx: number) => (
              <div key={idx} className={`relative fra-photo-block ${isGrid ? '' : ''}`}>
                <img 
                  src={photo.public_url || photo.file_path} 
                  alt={`${label} ${idx + 1}`}
                  className="w-full h-48 object-cover rounded border border-slate-300 print:object-cover print:w-full print:h-full"
                />
                <button
                  onClick={() => {
                    setPlaceholderPhotos(prev => ({
                      ...prev,
                      [placeholderId]: prev[placeholderId]?.filter((_, i) => i !== idx) || []
                    }))
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-300 rounded p-4 h-48 flex flex-col items-center justify-center text-slate-400 text-sm fra-photo-block">
            <p className="mb-2">{label}</p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoUpload(placeholderId, e.target.files, maxPhotos)}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Add Photos (1–{maxPhotos})
                  </>
                )}
              </Button>
            </label>
          </div>
        )}
        {photos.length > 0 && photos.length < maxPhotos && (
          <label className="mt-2 inline-block">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotoUpload(placeholderId, e.target.files, maxPhotos)}
              className="hidden"
              disabled={isUploading}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Add More Photos
                </>
              )}
            </Button>
          </label>
        )}
      </div>
    )
  }

  const showHeaderFooter = showPrintHeaderFooter === true
  const headerFooterStyle: React.CSSProperties | undefined = showHeaderFooter
    ? {
        display: 'flex',
        position: 'fixed',
        left: 0,
        right: 0,
        background: '#fff',
        borderColor: '#cbd5e1',
        zIndex: 9999,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }
    : undefined
  const headerStyle: React.CSSProperties | undefined = showHeaderFooter
    ? {
        ...headerFooterStyle,
        top: 48, /* below print preview toolbar (preview uses full-screen overlay) */
        height: 44,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        fontSize: '11pt',
        fontWeight: 600,
        color: '#0f172a',
        borderBottom: '1px solid #cbd5e1',
      }
    : undefined
  const footerStyle: React.CSSProperties | undefined = showHeaderFooter
    ? {
        ...headerFooterStyle,
        bottom: 0,
        height: 28,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        fontSize: '9pt',
        color: '#64748b',
        borderTop: '1px solid #cbd5e1',
        boxShadow: '0 -1px 3px rgba(0,0,0,0.08)',
      }
    : undefined

  const printHeaderContent = (
    <>
      <span className="fra-report-print-logo flex items-center shrink-0">
        {logoError ? (
          <span className="font-semibold text-slate-800">KSS NW Ltd</span>
        ) : (
          <img
            src="/kss-logo.png"
            alt="KSS"
            className="h-8 w-auto object-contain"
            onError={() => setLogoError(true)}
          />
        )}
      </span>
      <span className="fra-report-print-title flex-1 text-center mx-3">Fire Risk Assessment – {data.premises}</span>
      <span className="w-[80px] shrink-0" aria-hidden="true" />
    </>
  )
  const printFooterContent = (
    <>
      <span>{data.assessorName} – KSS NW Ltd</span>
      <span>{data.assessmentDate ? new Date(data.assessmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
    </>
  )

  const pdfFooterDate = data.assessmentDate ? new Date(data.assessmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  return (
    <div
      id="print-root"
      className={`print-root min-h-screen bg-slate-100 print:bg-white fra-report-print-wrapper ${showHeaderFooter ? 'fra-print-preview-mode' : ''}`}
      data-pdf-premises={data.premises ?? ''}
      data-pdf-assessor={data.assessorName ?? ''}
      data-pdf-date={pdfFooterDate}
    >
      {/* On-screen preview: fixed header. Omit in print/PDF context so only per-page headers show (avoids double header on page 1). */}
      {!showHeaderFooter && (
        <header
          className="fra-report-print-header no-print"
          aria-hidden={!showHeaderFooter}
          style={headerStyle}
        >
          {printHeaderContent}
        </header>
      )}
      <div className="fra-report-print-content" style={showHeaderFooter ? { paddingTop: 92, paddingBottom: 36 } : undefined}>
      {/* Debug Toggle - only show in development, and never in print preview so preview matches print/PDF */}
      {process.env.NODE_ENV === 'development' && !showHeaderFooter && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-slate-300 rounded-lg shadow-lg p-3 print:hidden">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
              className="rounded"
            />
            <span>Show Data Sources</span>
          </label>
        </div>
      )}
      {/* Cover Page */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Fire Risk Assessment - Review</h1>
          <p className="text-sm text-slate-600">Page 1</p>
        </div>

        <div className="space-y-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">{data.premises}</h2>
            <div className="space-y-2 text-sm">
              <div><span className="font-semibold">Client Name:</span> {data.clientName}</div>
              <div><span className="font-semibold">Premises:</span> {data.premises}</div>
              <div className="whitespace-pre-line"><span className="font-semibold">Address:</span> {data.address}</div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">Responsible person (as defined by the Regulatory Reform (Fire Safety) Order 2025):</span> {data.responsiblePerson}
            </div>
            <div>
              <span className="font-semibold">Ultimate responsible person:</span> {data.ultimateResponsiblePerson}
            </div>
            <div>
              <span className="font-semibold">Appointed Person at {data.premises}:</span> {data.appointedPerson}
              <DebugBadge source={data._sources?.appointedPerson} fieldName="Appointed Person" />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Responsibilities of Appointed Person</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Ensuring effective communication and coordination of emergency response arrangements</li>
              <li>Oversight of Fire Wardens and Fire Marshals</li>
              <li>Ensuring fire drills are conducted and recorded</li>
              <li>Ensuring staff fire safety training is completed and maintained</li>
              <li>Communicating non-compliance and concerns to Head Office</li>
              <li>Implementing and maintaining the site Fire Safety Plan</li>
            </ul>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">Name of person undertaking the assessment:</span> {data.assessorName} – KSS NW Ltd
            </div>
            <div>
              <span className="font-semibold">Assessment date:</span> {data.assessmentDate || 'Not specified'}
              <DebugBadge source={data._sources?.assessmentDate} fieldName="Assessment Date" />
            </div>
            {data.assessmentStartTime && (
              <div>
                <span className="font-semibold">Assessment start time:</span> {data.assessmentStartTime}
                <DebugBadge source={data._sources?.assessmentStartTime} fieldName="Assessment Start Time" />
              </div>
            )}
            {data.assessmentEndTime && (
              <div>
                <span className="font-semibold">Assessment end time:</span> {data.assessmentEndTime}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo of Site / Building / Premises + Table of Contents (one printed page) */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Photo of Site / Building / Premises</h2>
        <p className="text-sm text-slate-600 mb-4">Add screenshots or photos of the site, building and premises (e.g. from pages 3–6 of the reference FRA).</p>
        <PhotoPlaceholder placeholderId="site-premises-photos" label="Site / Building / Premises (Photo 1–6)" maxPhotos={6} />
        <h2 className="text-xl font-semibold mb-4 mt-8">Table of Contents</h2>
        <div className="fra-toc">
          <div className="fra-toc-list space-y-2 text-sm">
            <div className="fra-toc-item flex items-center justify-between"><span>Purpose of This Assessment</span><span className="ml-auto">2</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Regulatory Reform (Fire Safety) Order 2005 – Fire Risk Assessment</span><span className="ml-auto">3</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Travel Distances</span><span className="ml-auto">4</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Category L Fire Alarm Systems - Life Protection</span><span className="ml-auto">5</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Fire Resistance</span><span className="ml-auto">6</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Fire Risk Assessment – Terms, Conditions and Limitations</span><span className="ml-auto">7</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Scope of Assessment</span><span className="ml-auto">7</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Limitations</span><span className="ml-auto">7</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Enforcement and Insurers</span><span className="ml-auto">8</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Specialist Advice</span><span className="ml-auto">8</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Liability</span><span className="ml-auto">8</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>About the Property:</span><span className="ml-auto">9</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Stage 1 – Fire Hazards</span><span className="ml-auto">10</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Stage 2 – People at Risk</span><span className="ml-auto">10</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Stage 3 – Evaluate, remove, reduce and protect from risk</span><span className="ml-auto">10</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Fire Plan</span><span className="ml-auto">12</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Risk Rating</span><span className="ml-auto">14</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Action Plan</span><span className="ml-auto">15</span></div>
            <div className="fra-toc-item flex items-center justify-between"><span>Fire Risk Assessment Report</span><span className="ml-auto">13</span></div>
          </div>
        </div>
      </div>

      {/* Purpose of This Assessment */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Purpose of This Assessment</h2>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            The purpose of this Fire Risk Assessment is to provide a suitable and sufficient assessment of the risk
            to life from fire within the above premises and to confirm that appropriate fire safety measures are
            in place to comply with current fire safety legislation.
          </p>
          <p>
            This assessment relates solely to life safety and does not address business continuity or property
            protection.
          </p>
          <p>
            This document represents a live, operational Fire Risk Assessment and supersedes the pre-opening
            assumptions contained within the previous assessment.
          </p>
        </div>
      </div>

      {/* Regulatory Reform (Fire Safety) Order 2005 – FIRE RISK ASSESSMENT (5 steps) */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <div className="bg-slate-100 border border-slate-300 rounded-lg p-6 mb-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">Regulatory Reform (Fire Safety) Order 2005</h2>
          <h2 className="text-xl font-bold text-slate-900 mt-2">FIRE RISK ASSESSMENT</h2>
        </div>
        <div className="space-y-4 text-sm">
          <div className="border border-slate-300 rounded-lg p-4 bg-white">
            <div className="flex gap-3">
              <span className="font-bold text-slate-700 shrink-0">STEP 1:</span>
              <div>
                <p className="font-semibold uppercase text-slate-800">Identify fire hazards</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700">
                  <li>Sources of ignition</li>
                  <li>Sources of fuel</li>
                  <li>Work processes</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border border-slate-300 rounded-lg p-4 bg-white">
            <div className="flex gap-3">
              <span className="font-bold text-slate-700 shrink-0">STEP 2:</span>
              <p className="font-semibold uppercase text-slate-800">Identify the location of people at significant risk in case of fire</p>
            </div>
          </div>
          <div className="border border-slate-300 rounded-lg p-4 bg-white">
            <div className="flex gap-3">
              <span className="font-bold text-slate-700 shrink-0">STEP 3:</span>
              <div>
                <p className="font-semibold uppercase text-slate-800">Evaluate the risk</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700">
                  <li>Are existing fire safety measures adequate?</li>
                  <li>Control of ignition sources / sources of fuel</li>
                  <li>Fire detection / warning</li>
                  <li>Means of escape</li>
                  <li>Means of fighting fire</li>
                  <li>Maintenance and testing of fire precautions</li>
                  <li>Fire safety training for employees</li>
                  <li>Emergency services provisions and information</li>
                </ul>
                <p className="font-semibold uppercase text-slate-800 mt-3">Carry out any improvements needed</p>
              </div>
            </div>
          </div>
          <div className="border border-slate-300 rounded-lg p-4 bg-white">
            <div className="flex gap-3">
              <span className="font-bold text-slate-700 shrink-0">STEP 4:</span>
              <div>
                <p className="font-semibold uppercase text-slate-800">Record findings and action taken</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700">
                  <li>Prepare emergency plan</li>
                  <li>Inform, instruct and train employees in fire precautions</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border border-slate-300 rounded-lg p-4 bg-white">
            <div className="flex gap-3">
              <span className="font-bold text-slate-700 shrink-0">STEP 5:</span>
              <div>
                <p className="font-semibold uppercase text-slate-800">Keep assessment under review</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700">
                  <li>Revise if situation changes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Travel Distances */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Travel Distances:</h2>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            The distance of travel should be measured as being the actual distance to be travelled between any point in the building and the nearest storey exit.
          </p>
          <p>
            The distance of travel for escape are governed by recommended maximum distances and these are detailed below:
          </p>
        </div>
        <div className="fra-travel-distances-tables overflow-x-auto mt-6 space-y-6">
          <table className="fra-print-table w-full border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">No.</th>
                <th className="border border-slate-300 p-2 text-left">Category of risk</th>
                <th className="border border-slate-300 p-2 text-left">Distance of travel within room, work-room or enclosure</th>
                <th className="border border-slate-300 p-2 text-left">Total distance of travel</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={4} className="border border-slate-300 p-2 font-semibold bg-slate-50">TABLE A: Escape in more than one direction (Factories)</td></tr>
              <tr><td className="border border-slate-300 p-2">1</td><td className="border border-slate-300 p-2">High</td><td className="border border-slate-300 p-2">12m</td><td className="border border-slate-300 p-2">25m</td></tr>
              <tr><td className="border border-slate-300 p-2">2</td><td className="border border-slate-300 p-2">Normal</td><td className="border border-slate-300 p-2">25m</td><td className="border border-slate-300 p-2">45m</td></tr>
              <tr><td className="border border-slate-300 p-2">3</td><td className="border border-slate-300 p-2">Low</td><td className="border border-slate-300 p-2">35m</td><td className="border border-slate-300 p-2">60m</td></tr>
            </tbody>
          </table>
          <table className="fra-print-table w-full border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">No.</th>
                <th className="border border-slate-300 p-2 text-left">Category of risk</th>
                <th className="border border-slate-300 p-2 text-left">Distance of travel within room, work-room or enclosure</th>
                <th className="border border-slate-300 p-2 text-left">Total distance of travel</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={4} className="border border-slate-300 p-2 font-semibold bg-slate-50">TABLE B: Escape in one direction only (Factories)</td></tr>
              <tr><td className="border border-slate-300 p-2">4</td><td className="border border-slate-300 p-2">High</td><td className="border border-slate-300 p-2">6m</td><td className="border border-slate-300 p-2">12m</td></tr>
              <tr><td className="border border-slate-300 p-2">5</td><td className="border border-slate-300 p-2">Normal</td><td className="border border-slate-300 p-2">12m</td><td className="border border-slate-300 p-2">25m</td></tr>
              <tr><td className="border border-slate-300 p-2">6</td><td className="border border-slate-300 p-2">Low</td><td className="border border-slate-300 p-2">25m</td><td className="border border-slate-300 p-2">45m</td></tr>
            </tbody>
          </table>
          <table className="fra-print-table w-full border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">No.</th>
                <th className="border border-slate-300 p-2 text-left">Category of risk</th>
                <th className="border border-slate-300 p-2 text-left">Distance of travel within room, work-room or enclosure</th>
                <th className="border border-slate-300 p-2 text-left">Total distance of travel</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={4} className="border border-slate-300 p-2 font-semibold bg-slate-50">TABLE C: Escape in more than one direction (Shops)</td></tr>
              <tr><td className="border border-slate-300 p-2">1</td><td className="border border-slate-300 p-2">High</td><td className="border border-slate-300 p-2">12m</td><td className="border border-slate-300 p-2">25m</td></tr>
              <tr><td className="border border-slate-300 p-2">2</td><td className="border border-slate-300 p-2">Normal</td><td className="border border-slate-300 p-2">25m</td><td className="border border-slate-300 p-2">45m</td></tr>
            </tbody>
          </table>
          <table className="fra-print-table w-full border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">No.</th>
                <th className="border border-slate-300 p-2 text-left">Category of risk</th>
                <th className="border border-slate-300 p-2 text-left">Distance of travel within room, work-room or enclosure</th>
                <th className="border border-slate-300 p-2 text-left">Total distance of travel</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={4} className="border border-slate-300 p-2 font-semibold bg-slate-50">TABLE D: Escape in one direction only (Shops)</td></tr>
              <tr><td className="border border-slate-300 p-2">3</td><td className="border border-slate-300 p-2">High</td><td className="border border-slate-300 p-2">6m</td><td className="border border-slate-300 p-2">12m</td></tr>
              <tr><td className="border border-slate-300 p-2">4</td><td className="border border-slate-300 p-2">Normal</td><td className="border border-slate-300 p-2">12m</td><td className="border border-slate-300 p-2">25m</td></tr>
            </tbody>
          </table>
          <table className="fra-print-table w-full border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">No.</th>
                <th className="border border-slate-300 p-2 text-left">Category of risk</th>
                <th className="border border-slate-300 p-2 text-left">Distance of travel within room, work-room or enclosure</th>
                <th className="border border-slate-300 p-2 text-left">Total distance of travel</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={4} className="border border-slate-300 p-2 font-semibold bg-slate-50">TABLE E: Escape in more than one direction (Offices)</td></tr>
              <tr><td className="border border-slate-300 p-2">1</td><td className="border border-slate-300 p-2">Normal</td><td className="border border-slate-300 p-2">25m</td><td className="border border-slate-300 p-2">45m</td></tr>
            </tbody>
          </table>
          <table className="fra-print-table w-full border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">No.</th>
                <th className="border border-slate-300 p-2 text-left">Category of risk</th>
                <th className="border border-slate-300 p-2 text-left">Distance of travel within room, work-room or enclosure</th>
                <th className="border border-slate-300 p-2 text-left">Total distance of travel</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={4} className="border border-slate-300 p-2 font-semibold bg-slate-50">TABLE F: Escape in one direction only (Offices)</td></tr>
              <tr><td className="border border-slate-300 p-2">2</td><td className="border border-slate-300 p-2">Normal</td><td className="border border-slate-300 p-2">12m</td><td className="border border-slate-300 p-2">25m</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-6 text-sm">
          <p className="mb-2">
            Where a room is an inner room (i.e. a room accessible only via an access room) the distance to the exit from the access room should be a maximum of:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>If the inner room is of &apos;high risk&apos; 6m</li>
            <li>If the access room is of &apos;normal risk&apos; 12m</li>
            <li>If the access room is of &apos;low risk&apos; 25m</li>
          </ul>
        </div>
      </div>

      {/* Category L Fire Alarm Systems - Life Protection */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Category L Fire Alarm Systems - Life Protection</h2>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            Life protection systems can be divided into various categories, L1, L2, L3, L4, L5.
          </p>
          <p>
            <strong>L1</strong> provides for Automatic Fire Detection (AFD) to be installed into all areas of a building.
          </p>
          <p>
            <strong>L2</strong> provides Automatic Fire Detection (AFD) as defined in L3 as well as high risk or hazardous areas. Examples of this could be Kitchens, boiler rooms, sleeping risk, storerooms if not fire resistant or if smoke could affect escape routes.
          </p>
          <p>
            <strong>L3</strong> Automatic Fire Detection (AFD) with smoke detection should be installed on escape routes with detection in rooms opening onto escape routes.
          </p>
          <p>
            <strong>L4</strong> provides Automatic Fire Detection (AFD) within escape routes only.
          </p>
          <p>
            <strong>L5</strong> is installed in building with a specific risk that has been identified. An example of this would be if there was an area of high risk that requires detection the category would be L5/M.
          </p>
        </div>
        <div className="mt-8">
          <img
            src="/fra-category-l-fire-alarm-systems.png"
            alt="Category L1, L2, L3, L4 and L5 fire alarm system floor plans showing smoke detector and manual call point placement"
            className="w-full max-w-4xl mx-auto rounded border border-slate-200 print:max-w-full"
          />
          <p className="text-xs text-slate-500 mt-2 text-center">
            L1–L5 fire alarm system coverage: detector and manual call point placement by category.
          </p>
        </div>
      </div>

      {/* Fire Resistance */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Fire Resistance:</h2>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            There are standards recommended for the fire resistance of the elements of a building structure (e.g. floors, walls etc.) and these are given in the table below.
          </p>
        </div>
        <div className="overflow-x-auto mt-6">
          <table className="fra-print-table w-full border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">Element being separated or protected</th>
                <th className="border border-slate-300 p-2 text-left">Walls (mins)</th>
                <th className="border border-slate-300 p-2 text-left">Fire-resisting doors (mins)</th>
                <th className="border border-slate-300 p-2 text-left">Floors (mins)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-slate-300 p-2">Floor immediately over a basement</td><td className="border border-slate-300 p-2">—</td><td className="border border-slate-300 p-2">—</td><td className="border border-slate-300 p-2">60</td></tr>
              <tr><td className="border border-slate-300 p-2">All separating floors</td><td className="border border-slate-300 p-2">—</td><td className="border border-slate-300 p-2">—</td><td className="border border-slate-300 p-2">30 (1)</td></tr>
              <tr><td className="border border-slate-300 p-2">Separating a stairway</td><td className="border border-slate-300 p-2">30</td><td className="border border-slate-300 p-2">30 (2)</td><td className="border border-slate-300 p-2">—</td></tr>
              <tr><td className="border border-slate-300 p-2">Separating a protected lobby</td><td className="border border-slate-300 p-2">30</td><td className="border border-slate-300 p-2">30</td><td className="border border-slate-300 p-2">—</td></tr>
              <tr><td className="border border-slate-300 p-2">Separating a lift well</td><td className="border border-slate-300 p-2">30 (4)</td><td className="border border-slate-300 p-2">30 (3)</td><td className="border border-slate-300 p-2">—</td></tr>
              <tr><td className="border border-slate-300 p-2">Separating a lift motor room</td><td className="border border-slate-300 p-2">30</td><td className="border border-slate-300 p-2">30</td><td className="border border-slate-300 p-2">—</td></tr>
              <tr><td className="border border-slate-300 p-2">Separating a protected route</td><td className="border border-slate-300 p-2">30</td><td className="border border-slate-300 p-2">30 (2)</td><td className="border border-slate-300 p-2">—</td></tr>
              <tr><td className="border border-slate-300 p-2">Separating compartments</td><td className="border border-slate-300 p-2">60</td><td className="border border-slate-300 p-2">60</td><td className="border border-slate-300 p-2">—</td></tr>
              <tr><td className="border border-slate-300 p-2">In a corridor to sub-divide it</td><td className="border border-slate-300 p-2">30</td><td className="border border-slate-300 p-2">30</td><td className="border border-slate-300 p-2">—</td></tr>
              <tr><td className="border border-slate-300 p-2">In a stairway from ground floor to basement</td><td className="border border-slate-300 p-2">—</td><td className="border border-slate-300 p-2">2 x 30 or 1 x 60</td><td className="border border-slate-300 p-2">—</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm space-y-1">
          <p>(1) Fire/smoke stopping cavity barriers and fire dampers in ductwork</p>
          <p>(2) Excluding incomplete floors e.g. a gallery floor</p>
          <p>(3) Except a door to a WC containing no fire risk</p>
          <p>(4) Except a lift well contained within a stairway enclosure</p>
        </div>
      </div>

      {/* Terms, Conditions and Limitations */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Fire Risk Assessment – Terms, Conditions and Limitations</h2>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            This Fire Risk Assessment has been undertaken in accordance with the requirements of the
            Regulatory Reform (Fire Safety) Order 2005 (as applicable in Scotland) and relevant supporting
            guidance.
          </p>
          <p>
            It is agreed that, in order to enable a thorough inspection and assessment, the Fire Risk Assessor was
            permitted open and free access to all areas of the premises reasonably accessible at the time of the
            assessment and review.
          </p>
          <p>
            It is the responsibility of the Responsible Person to ensure that all relevant personnel are aware of
            the Fire Risk Assessor&apos;s visit and that the assessor is not hindered in the carrying out of their duties.
          </p>

          <h3 className="font-semibold mt-6 mb-2">Scope of Assessment</h3>
          <p>
            This Fire Risk Assessment is based on:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>A visual inspection of the premises</li>
            <li>Review of fire safety arrangements in place at the time of the assessment</li>
            <li>Consideration of documented records made available, including fire alarm testing,
            emergency lighting tests and fire drill records</li>
            <li>Observations made during a Health & Safety and Fire Safety audit conducted on {data.assessmentDate || 'the assessment date'}</li>
          </ul>
          <p className="mt-4">
            No intrusive inspection, destructive testing, or specialist testing of fire systems, structural elements,
            luminance levels, alarm sound pressure levels or HVAC systems has been undertaken as part of this
            assessment.
          </p>

          <h3 className="font-semibold mt-6 mb-2">Limitations</h3>
          <p>
            Whilst all reasonable care has been taken to identify matters that may give rise to fire risk, this
            assessment cannot be regarded as a guarantee that all fire hazards or deficiencies have been
            identified.
          </p>
          <p>
            The assessment is based on a sample of conditions observed at the time of inspection. It is possible
            that this may not be fully representative of all conditions present at all times.
          </p>
          <p>
            The Fire Risk Assessor cannot be held responsible for:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Failure to implement recommendations</li>
            <li>Deterioration in standards following the assessment</li>
            <li>Changes in use, layout, occupancy or management practices after the date of assessment</li>
            <li>Acts or omissions of employees, contractors or third parties</li>
          </ul>
        </div>
      </div>

      {/* Enforcement and Insurers, Specialist Advice, Liability */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <div className="space-y-6 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold mb-2">Enforcement and Insurers</h3>
            <p>
              The Fire Risk Assessor should be notified of any visit, or intended visit, by an enforcing authority or
              insurer relating to fire safety matters.
            </p>
            <p>
              Where requirements or recommendations are made by an enforcing authority, insurer or competent
              third party, it is the responsibility of the Responsible Person to ensure compliance within appropriate
              timescales.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Specialist Advice</h3>
            <p>
              Where hazards are identified that, in the opinion of the Fire Risk Assessor, require specialist advice or
              further investigation, this will be highlighted. The decision to appoint specialist contractors or
              consultants, and any associated costs, remains the responsibility of the Responsible Person.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Liability</h3>
            <p>
              KSS NW Ltd limits its liability for any loss, damage or injury (including consequential or indirect loss)
              arising from the performance of this Fire Risk Assessment to the extent permitted by law and as
              defined by the company&apos;s professional indemnity insurance.
            </p>
          </div>
        </div>
      </div>

      {/* About the Property */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">About the Property:</h2>
        
        <div className="space-y-4 text-sm">
          <div>
            <span className="font-semibold">Approximate build date:</span> {data.buildDate}
            <DebugBadge source={data._sources?.buildDate} fieldName="Build Date" />
          </div>
          <div>
            <span className="font-semibold">Property type:</span> {data.propertyType}
            <DebugBadge source={data._sources?.propertyType} fieldName="Property Type" />
          </div>
          {data.storeOpeningTimes && (
            <div>
              <span className="font-semibold">Store Opening Times:</span>
              <p className="mt-1 whitespace-pre-line">{data.storeOpeningTimes}</p>
              <DebugBadge source={data._sources?.storeOpeningTimes} fieldName="Store Opening Times" />
            </div>
          )}
          <div>
            <span className="font-semibold">Description of the Premises</span>
            <p className="mt-2 whitespace-pre-line">{data.description}</p>
            <DebugBadge source={data._sources?.description} fieldName="Description" />
          </div>
          <div>
            <span className="font-semibold">Number of Floors:</span> {data.numberOfFloors}
            <DebugBadge source={data._sources?.numberOfFloors} fieldName="Number of Floors" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Approximate Floor Area:</span>
              {!editing && (data.floorArea === 'To be confirmed' || data.floorAreaComment) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="text-xs"
                >
                  Edit
                </Button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={customData.floorArea}
                  onChange={(e) => setCustomData({ ...customData, floorArea: e.target.value })}
                  className="min-h-[60px]"
                  placeholder="Enter floor area (e.g., Approximately 650 m²)"
                />
              </div>
            ) : (
              <p className="mt-2">{customData.floorArea}</p>
            )}
            {!editing && <DebugBadge source={data._sources?.floorArea} fieldName="Floor Area" />}
            {data.floorAreaComment && !editing && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Note:</strong> {data.floorAreaComment}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Occupancy and Capacity:</span>
              {!editing && (data.occupancy === 'To be calculated based on floor area' || data.occupancyComment) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="text-xs"
                >
                  Edit
                </Button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={customData.occupancy}
                  onChange={(e) => setCustomData({ ...customData, occupancy: e.target.value })}
                  className="min-h-[60px]"
                  placeholder="Enter occupancy information (e.g., Approximately 251 persons based on 2 m² per person)"
                />
              </div>
            ) : (
              <p className="mt-2">{customData.occupancy}</p>
            )}
            {!editing && <DebugBadge source={data._sources?.occupancy} fieldName="Occupancy" />}
            {data.occupancyComment && !editing && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Note:</strong> {data.occupancyComment}
              </div>
            )}
          </div>
          {editing && (
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false)
                  setCustomData({
                    floorArea: data.floorArea,
                    occupancy: data.occupancy,
                    operatingHours: data.operatingHours,
                  })
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              {saved && (
                <span className="text-sm text-green-600">Saved successfully!</span>
              )}
            </div>
          )}
          <div>
            <span className="font-semibold">Sleeping Risk</span>
            <p className="mt-2">{data.sleepingRisk}</p>
            <DebugBadge source="DEFAULT" fieldName="Sleeping Risk" />
          </div>
          <div>
            <span className="font-semibold">Internal Fire Doors:</span>
            <p className="mt-2">{data.internalFireDoors}</p>
            <DebugBadge source={data._sources?.internalFireDoors} fieldName="Internal Fire Doors" />
            {/* Fire Doors Photo Placeholder */}
            <PhotoPlaceholder placeholderId="fire-doors" label="Fire Doors Photo" maxPhotos={1} />
            <p className="mt-4">
              It is the ongoing responsibility of store management to ensure that internal fire doors
              are maintained in good working order and kept closed when not in use, in accordance
              with fire safety procedures and routine management checks.
            </p>
          </div>
          <div>
            <span className="font-semibold">History of Fires or Fire-Related Incidents in the Previous 12 Months:</span>
            <p className="mt-2">{data.historyOfFires}</p>
            <DebugBadge source={data._sources?.historyOfFires} fieldName="History of Fires" />
          </div>
        </div>
      </div>

      {/* Fire Alarm System */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Brief description of any fire alarm or automatic fire/heat/smoke detection:</h2>
        <div className="space-y-4 text-sm leading-relaxed whitespace-pre-line">
          {data.fireAlarmDescription}
          <DebugBadge source={data._sources?.fireAlarmDescription} fieldName="Fire Alarm Description" />
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div>
            <span className="font-semibold">Location of Fire Panel:</span>
            <p className="mt-1">{data.fireAlarmPanelLocation}</p>
            <DebugBadge source={data._sources?.fireAlarmPanelLocation} fieldName="Fire Panel Location" />
            {data.fireAlarmPanelLocationComment && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Note:</strong> {data.fireAlarmPanelLocationComment}
              </div>
            )}
          </div>
          <div>
            <span className="font-semibold">Is panel free of faults:</span>
            <p className="mt-1">{data.fireAlarmPanelFaults}</p>
            <DebugBadge source={data._sources?.fireAlarmPanelFaults} fieldName="Fire Panel Faults" />
            {data.fireAlarmPanelFaultsComment && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Note:</strong> {data.fireAlarmPanelFaultsComment}
              </div>
            )}
          </div>
          {/* Fire Alarm Panel Photo Placeholder */}
          <PhotoPlaceholder placeholderId="fire-alarm-panel" label="Fire Alarm Panel Photo" maxPhotos={1} />
          <div className="mt-4">
            <p>{data.fireAlarmMaintenance}</p>
            <DebugBadge source={data._sources?.fireAlarmMaintenance} fieldName="Fire Alarm Maintenance" />
            <p className="mt-2 italic">
              (NB: This assessment is based on visual inspection and review of available records. No physical testing
              of the fire alarm or emergency lighting systems was undertaken as part of this Fire Risk Assessment.)
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Lighting */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Brief description of any emergency lighting systems:</h2>
        <div className="space-y-4 text-sm leading-relaxed">
          <p className="whitespace-pre-line">{data.emergencyLightingDescription}</p>
          <DebugBadge source={data._sources?.emergencyLightingDescription} fieldName="Emergency Lighting Description" />
          <div className="mt-4">
            <p>{data.emergencyLightingMaintenance}</p>
            <DebugBadge source={data._sources?.emergencyLightingMaintenance} fieldName="Emergency Lighting Maintenance" />
          </div>
          <div className="mt-4">
            <span className="font-semibold">Location of Emergency Lighting Test Switch:</span>
            <p className="mt-1">{data.emergencyLightingTestSwitchLocation}</p>
            <DebugBadge source={data._sources?.emergencyLightingTestSwitchLocation} fieldName="Emergency Lighting Switch Location" />
            {data.emergencyLightingTestSwitchLocationComment && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Note:</strong> {data.emergencyLightingTestSwitchLocationComment}
              </div>
            )}
          </div>
          {/* Emergency Lighting Test Switch Photo Placeholder */}
          <PhotoPlaceholder placeholderId="emergency-lighting-switch" label="Emergency Lighting Test Switch Photo" maxPhotos={1} />
          <p className="mt-2 italic">
            (NB: This assessment is based on visual inspection and review of available records only. No physical
            testing of the emergency lighting system was undertaken as part of this assessment.)
          </p>
        </div>
      </div>

      {/* Portable Fire-Fighting Equipment */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Brief description of any portable fire-fighting equipment:</h2>
        <div className="space-y-4 text-sm leading-relaxed">
          <p className="whitespace-pre-line">{data.fireExtinguishersDescription}</p>
          <DebugBadge source={data._sources?.fireExtinguishersDescription} fieldName="Fire Extinguishers Description" />
          <p>{data.fireExtinguisherService}</p>
          <DebugBadge source={data._sources?.fireExtinguisherService} fieldName="Fire Extinguisher Service" />
          {/* Fire Extinguisher Photo Placeholder */}
          <PhotoPlaceholder placeholderId="fire-extinguisher" label="Fire Extinguisher Photo" maxPhotos={1} />
          <p className="mt-4">
            Staff receive fire safety awareness training as part of their induction and
            refresher training, which includes instruction on the purpose of fire
            extinguishers. Company fire safety arrangements place emphasis on raising
            the alarm and evacuation, rather than firefighting.
          </p>
        </div>
      </div>

      {/* Sprinkler & Smoke Extraction - only show if sprinklers exist */}
      {data.hasSprinklers && (
        <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
          <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
            {printHeaderContent}
          </div>
          <h2 className="text-xl font-semibold mb-4">Brief Description of Sprinkler & Smoke Extraction Strategy:</h2>
          <div className="space-y-4 text-sm leading-relaxed whitespace-pre-line">
            {data.sprinklerDescription}
            <DebugBadge source={data._sources?.sprinklerDescription} fieldName="Sprinkler Description" />
          </div>
          <div className="mt-4">
            <p>
              <span className="font-semibold">Sprinkler clearance:</span> {data.sprinklerClearance}
              <DebugBadge source={data._sources?.sprinklerClearance} fieldName="Sprinkler Clearance" />
            </p>
          </div>
        {/* Sprinkler Photo Placeholder */}
        <PhotoPlaceholder placeholderId="sprinkler-system" label="Sprinkler System Photo" maxPhotos={1} />
        </div>
      )}

      {/* Fire and Rescue Services Access */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Brief description of access for Fire and Rescue Services:</h2>
        <div className="space-y-4 text-sm leading-relaxed">
          {data.accessDescription ? (
            <>
              <p className="whitespace-pre-line">{data.accessDescription}</p>
              <DebugBadge source={data._sources?.accessDescription} fieldName="Access Description" />
            </>
          ) : (
            <>
              <p>
                Entry to the site can be gained via the main front entrance doors and via the rear service
                entry/loading bay, which is clearly signposted externally. There is suitable access for Fire and Rescue
                Services from the surrounding road network serving the shopping centre. No issues
                were identified at the time of assessment.
              </p>
              <DebugBadge source="DEFAULT" fieldName="Access Description" />
            </>
          )}
          {/* Store Location Map - constrained for print so it fits on one page */}
          <div className="mt-4 fra-map-print">
            <StoreMap
              storeName={data.premises}
              address={data.address}
              latitude={data.store?.latitude || null}
              longitude={data.store?.longitude || null}
            />
          </div>
          <div className="space-y-2 mt-4">
            <div><span className="font-semibold">Fire lift:</span> – N/A</div>
            <div><span className="font-semibold">Dry / wet riser:</span> – N/A</div>
            <div><span className="font-semibold">Fire hydrant:</span> – N/A</div>
            <div><span className="font-semibold">Open water:</span> – N/A</div>
          </div>
        </div>
      </div>

      {/* Stage 1 - Fire Hazards */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Stage 1 – Fire Hazards</h2>
        <div className="fra-hazards-table-wrapper overflow-x-auto">
          <table className="fra-print-table w-full border-collapse border border-slate-300 text-sm fra-hazards-table">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left font-semibold w-40">Hazard category</th>
                <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Details</th>
                <th className="border border-slate-300 px-3 py-2 text-left font-semibold w-48">Photo(s)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-2 align-top font-medium">Sources of ignition</td>
                <td className="border border-slate-300 px-3 py-2 align-top">
                  <DebugBadge source={data._sources?.sourcesOfIgnition} fieldName="Sources of Ignition" />
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    {data.sourcesOfIgnition.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </td>
                <td className="border border-slate-300 px-3 py-2 align-top" rowSpan={3}>
                  <PhotoPlaceholder placeholderId="fire-hazards" label="Hazard photos" maxPhotos={5} />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2 align-top font-medium">Sources of fuel</td>
                <td className="border border-slate-300 px-3 py-2 align-top">
                  <DebugBadge source={data._sources?.sourcesOfFuel} fieldName="Sources of Fuel" />
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    {data.sourcesOfFuel.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2 align-top font-medium">Sources of oxygen</td>
                <td className="border border-slate-300 px-3 py-2 align-top">
                  <DebugBadge source={data._sources?.sourcesOfOxygen} fieldName="Sources of Oxygen" />
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    {data.sourcesOfOxygen.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-semibold mb-4 mt-4">Stage 2 – People at Risk</h2>
        <p className="text-sm mb-4">
          The following persons may be at risk in the event of a fire within the premises:
        </p>
        <DebugBadge source={data._sources?.peopleAtRisk} fieldName="People at Risk" />
        <ul className="list-disc list-inside space-y-2 text-sm">
          {data.peopleAtRisk.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p className="text-sm mt-4">There are no sleeping occupants within the premises.</p>
      </div>

      {/* Stage 3 – Evaluate, remove, reduce and protect */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Stage 3 – Evaluate, remove, reduce and protect from risk</h2>
        
        {/* Stage 3 Photo Placeholder */}
        <PhotoPlaceholder placeholderId="stage-3" label="Fire Safety Measures Photo" maxPhotos={1} />
        
        <div className="space-y-6 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold mb-2">Evaluate the risk of a fire occurring</h3>
            <p>
              Considering the nature of the premises, the activities undertaken, the fire load associated with retail stock, and the fire
              protection measures in place, the likelihood of a fire occurring is normal for this type of retail environment.
              Ignition sources are typical of retail premises and are subject to appropriate controls.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Evaluate the risk to people from a fire starting in the premises</h3>
            <p>
              In the event of a fire, there is a potential risk to staff and members of the public; however, the overall risk to life is
              reduced by the presence of automatic fire detection, emergency lighting, protected escape routes and established
              evacuation procedures. Based on the controls observed, the risk to people is acceptable and manageable.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Remove and reduce the hazards that may cause a fire</h3>
            <p>Measures in place to remove or reduce fire hazards include:</p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Control and maintenance of electrical installations and equipment</li>
              <li>Good housekeeping practices to prevent the accumulation of combustible materials</li>
              <li>Appropriate storage and management of stock and packaging</li>
              <li>Control of ignition sources</li>
              <li>Staff training in fire safety awareness and procedures</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Remove and reduce the risk to people from a fire</h3>
            <p>Measures in place to reduce the risk to people include:</p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Automatic fire detection and alarm systems providing early warning</li>
              <li>Clearly defined and unobstructed escape routes</li>
              <li>Emergency lighting to support evacuation during lighting failure</li>
              <li>Fire-resisting construction and internal fire doors to limit fire and smoke spread</li>
              <li>Regular testing, inspection and maintenance of fire safety systems and Staff training and fire drills</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Outline how people will be protected from the risk of a fire:</h3>
            <p>
              People within the premises are protected from the risk of fire through a combination of physical fire protection
              measures, fire safety systems and management controls.
            </p>
            <p className="mt-2">
              The building is provided with fire-resisting construction, including compartmentation and internal fire doors,
              designed to restrict the spread of fire and smoke and to provide sufficient time for occupants to evacuate safely.
              Fire doors are fitted with appropriate self-closing devices and intumescent protection where required.
            </p>
            <p className="mt-2">
              Automatic fire detection and alarm systems are installed throughout the premises to provide early warning of fire
              and to initiate evacuation. Emergency lighting is provided to illuminate escape routes and exits in the event of a
              failure of the normal lighting supply.
            </p>
            <p className="mt-2">
              Clearly defined escape routes are provided and are required to be always kept clear and unobstructed. Final exits
              open in the direction of travel and discharge to a place of relative safety.
            </p>
            <p className="mt-2">
              Fire safety management arrangements include staff fire safety training, regular testing and maintenance of fire
              safety systems, routine inspections and fire drills. These measures collectively ensure that persons within the
              premises are afforded an appropriate level of protection from the risk of fire.
            </p>
          </div>
        </div>
      </div>

      {/* Fire Plan */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Fire Plan</h2>
        
        {/* Fire Plan Photo Placeholder */}
        <PhotoPlaceholder placeholderId="fire-plan" label="Fire Plan / Evacuation Route Photo" maxPhotos={1} />
        
        <div className="space-y-6 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold mb-2">Roles and identity of employees with specific responsibilities in the event of a fire</h3>
            <p>
              Store management are designated as Fire Wardens and have overall responsibility for coordinating
              the emergency response within the premises. This includes ensuring that the alarm is raised,
              evacuation procedures are followed and that all persons are directed to leave the premises safely.
            </p>
            <p className="mt-2">
              Supervisory staff may act as Fire Marshals, assisting with the evacuation of designated areas and
              ensuring that escape routes are clear. All staff are responsible for following fire safety instructions
              and evacuating immediately on hearing the fire alarm.
            </p>
            <p className="mt-2">
              No person is permitted to re-enter the premises until authorised to do so by the Fire and Rescue
              Service or the appropriate responsible authority.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Arrangements for the safe evacuation of people identified at risk</h3>
            <p>
              All persons within the premises will be instructed to evacuate immediately via the nearest available
              fire exit upon activation of the fire alarm. Escape routes are clearly identified and lead to a place of
              relative safety.
            </p>
            <p className="mt-2">
              Visitors and contractors will be accompanied or directed by staff to ensure their safe evacuation.
              Where persons require additional assistance to evacuate, suitable arrangements must be
              implemented and managed by store management, including the use of Personal Emergency
              Evacuation Plans where applicable.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How the Fire and Rescue Service will be contacted</h3>
            <p>
              The Fire and Rescue Service will be contacted via the emergency services by dialling 999 or 112.
              Where applicable, the fire alarm system may also interface with external monitoring arrangements.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Procedures for liaising with the Fire and Rescue Service</h3>
            <p>
              On arrival of the Fire and Rescue Service, store management will liaise with the attending officers,
              providing relevant information regarding the premises, fire alarm activation and any known hazards.
              Store management will assist as required until the incident is formally handed over.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Arrangements for fire safety training and drills</h3>
            <p>
              All staff receive fire safety training as part of their induction and refresher training. Fire drills are
              conducted at appropriate intervals and records are maintained. Training and drills are designed to
              ensure staff are familiar with evacuation procedures and their responsibilities in the event of a fire.
            </p>
          </div>

          <div className="mt-8">
            <h3 className="font-semibold mb-4">Assessment review</h3>
            <table className="fra-print-table w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left">Assessment review date</th>
                  <th className="border border-slate-300 p-2 text-left">Completed by</th>
                  <th className="border border-slate-300 p-2 text-left">Signature</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2">{data.assessmentDate || ''}</td>
                  <td className="border border-slate-300 p-2">{data.assessorName}</td>
                  <td className="border border-slate-300 p-2"></td>
                </tr>
                {data.assessmentReviewDate && (
                  <tr>
                    <td className="border border-slate-300 p-2">
                      {data.assessmentReviewDate}
                      <DebugBadge source={data._sources?.assessmentReviewDate} fieldName="Assessment Review Date" />
                    </td>
                    <td className="border border-slate-300 p-2"></td>
                    <td className="border border-slate-300 p-2"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fire Risk Assessment Report */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Fire Risk Assessment Report</h2>
        
        <div className="space-y-2 text-sm mb-6">
          <div><span className="font-semibold">Assessor:</span> {data.assessorName}</div>
          <div><span className="font-semibold">Company name:</span> KSS NW LTD</div>
          <div><span className="font-semibold">Date of assessment:</span> {data.assessmentDate || ''}</div>
        </div>
        
        {/* Assessment Overview Photo Placeholder */}
        <PhotoPlaceholder placeholderId="premises-overview" label="Premises Overview Photo" maxPhotos={1} />
        
        <div className="space-y-6 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold mb-2">Introduction</h3>
            <p>
              The client is Footasylum Ltd, a national branded fashion apparel and footwear retailer. This Fire
              Risk Assessment relates solely to their retail premises at {data.premises}. The premises is situated within an established managed shopping centre
              environment.
            </p>
            <p className="mt-2 whitespace-pre-line">
              {data.description.split('\n').slice(0, 1).join('\n') || 'The premises operates over one level (Ground Floor) and comprises a main sales floor to the front of the unit with associated back-of-house areas to the rear, including stockroom, office and staff welfare facilities.'}
            </p>
            <p className="mt-2">
              The premises is provided with designated fire exit routes serving the sales floor and back-of-house
              areas, which discharge to a place of relative safety via the shopping centre&apos;s managed evacuation
              routes. Escape routes and final exits were observed
              to be available and in use at the time of assessment.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Overview of the workplace being assessed</h3>
            <p>
              The primary function of the premises is the retail sale of branded fashion apparel and footwear to
              members of the public. The store operates as a standard high-street retail environment with a
              public sales area and associated back-of-house accommodation, including stockroom, staff welfare
              facilities and a management office.
            </p>
            <p className="mt-2">
              The premises operates over a single ground floor level. Staffing levels vary depending on trading
              periods, with a mix of management, supervisory and sales staff present during opening hours. The
              premises is open to the public during scheduled trading hours, with staff also present outside
              these hours for opening, closing, deliveries, replenishment and general operational activities.
            </p>
            <p className="mt-2">
              Members of the public access the premises during trading hours, and contractors or third-party
              personnel may attend the site periodically for maintenance or servicing activities. There are no
              sleeping occupants within the premises.
            </p>
            <p className="mt-2">
              The activities undertaken within the premises are typical of a retail environment and do not
              involve any high-risk processes. Fire loads are primarily associated with retail stock, packaging
              materials and fixtures and fittings. Fire safety arrangements observed during the assessment
              indicate that the premises is managed in line with expected standards for this type of retail
              operation.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Overview of the significant findings related to fire hazards</h3>
            <p>
              A systematic and methodical assessment of the premises was undertaken, including a walkthrough
              of all accessible areas, a review of fire safety arrangements and consideration of available records.
              The following significant findings were identified:
            </p>
            <DebugBadge source={data._sources?.significantFindings} fieldName="Significant Findings" />
            <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
              {data.significantFindings.map((finding, idx) => (
                <li key={idx}>{finding}</li>
              ))}
            </ul>
            {data.hsAuditDate && (
              <p className="mt-4">
                The audit identified a small number of management-related matters requiring attention,
                including:
              </p>
            )}
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              {data.recommendedControls.filter(c => c.includes('training') || c.includes('contractor') || c.includes('COSHH') || c.includes('ladders')).map((control, idx) => (
                <li key={idx}>{control}</li>
              ))}
            </ul>
            <p className="mt-4">
              These matters do not present an immediate risk to life but require continued management
              attention to ensure ongoing compliance and consistency.
            </p>
            <p className="mt-2">
              No significant deficiencies were identified that would prevent the safe evacuation of occupants in
              the event of a fire, provided existing control measures are maintained, and management actions
              are completed.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Outline of those who may be at risk</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Staff</li>
              <li>Visitors</li>
              <li>Contractors</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Proposed Recommended Controls</h3>
            <p>
              To maintain and further improve fire safety standards within the premises, the following control
              measures are recommended:
            </p>
            <DebugBadge source={data._sources?.recommendedControls} fieldName="Recommended Controls" />
            <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
              {data.recommendedControls.map((control, idx) => (
                <li key={idx}>{control}</li>
              ))}
            </ul>
            <p className="mt-4">
              These measures are intended to support ongoing compliance and do not indicate a failure of
              existing fire safety arrangements. Continued active management and monitoring will ensure that
              fire risks remain controlled.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Summary</h3>
            <p>
              A systematic and methodical approach to assessing the risk of this site was undertaken.
              Walk through of external areas of the premises.
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Internal walk through of all accessible areas.</li>
              <li>Collation of relevant data and available records.</li>
              <li>Calculation of capacity (where applicable).</li>
              <li>Consideration of compartmentation and fire separation features.</li>
              <li>Liaison with store management and relevant site representatives, and liaison with staff on
              site as required.</li>
              <li>Compliance with the legislation.</li>
              <li>HM Government Fire Risk Assessment guidance (Offices and Shops) (where applicable).</li>
              <li>Approved Document B – Fire Safety – Volume 2 (as a reference framework where
              relevant).</li>
            </ul>
            <p className="mt-4">
              At the time of conducting this assessment, fire escape routes were found to be generally clear and
              unobstructed internally and externally (as required under Article 14(1) of the Regulatory Reform
              (Fire Safety) Order 2005, herein referred to as the FSO 2005), and provision and accessibility to
              portable fire extinguishers was found to be satisfactory (as required under Article 13(1)(b)). The
              premises is fully operational and it remains important for store management to ensure that these
              standards are always maintained during trading and non-trading periods, including deliveries,
              replenishment and peak trading activity.
            </p>
            <p className="mt-2">
              Signage throughout was installed and clearly visible
              and exit route doors opened in the direction of travel
              and were secured by means of appropriate &quot;push bar
              to open&quot; door devices were fitted and could be
              opened easily. Fire doors are subject to routine
              management checks to ensure standards are
              maintained and any issues identified dynamically.
            </p>
            <p className="mt-2">
              Emergency lighting (EEL), as previously detailed, was
              installed and found suitable and sufficient in
              accordance with Article 14(2)(e–h) of the FSO 2005.
              Fire doors, as prescribed, were found to be in good
              condition, with suitable door sets, intumescent strips
              and fixed door closers where required (BS EN 1154).
              Door gaps were observed to be within acceptable
              tolerances, consistent with AD-B Volume 2 Appendix
              C guidance. Final exit doors were installed with &quot;push
              bar to open&quot; door devices where applicable and
              were found to be in good condition and
              appropriately signed in line with relevant standards
              (including BS EN 1125 and BS EN 179).
            </p>
            <p className="mt-2">
              Other than low level cleaning products which are sourced centrally and sent to the store, all
              COSHH-related products are expected to be low risk level and stored in a designated cupboard
              away from sources of ignition.
            </p>
            <p className="mt-2">
              <span className="font-semibold">Note:</span> There will be no dangerous or flammable substances or liquids used or stored on the
              premises.
            </p>
            <p className="mt-4 font-semibold">Overall:</p>
            <p className="mt-2">
              The fire management controls in the site are good with some minor observations, which have
              been submitted as recommendations as suitable control measures. I would further recommend
              that under Article 9 of the FSO 2005, a review of the fire risk associated with this site be
              conducted at a suitable period or if there are any significant changes to the premises or processes
              within, or if this Fire Risk Assessment is no longer valid due to experiencing a fire for example. In
              view of the fact that Footasylum Ltd employ more than 5 persons, under Article 9(6)(a) of the
              Regulatory Reform (Fire Safety) Order 2005, there is a requirement for the Responsible Person to
              record the findings in writing. I would recommend a review of this assessment within 12 months.
            </p>
            <p className="mt-4">
              <span className="font-semibold">Submitted by:</span> {data.assessorName} – KSS NW LTD
            </p>
            <p className="mt-2">{data.assessmentDate || ''}</p>
          </div>
        </div>
      </div>

      {/* Risk Rating */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">7. Risk Rating</h2>
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="font-semibold mb-2">7.1.1 Likelihood of Fire</h3>
            <p className="mb-2">Taking into account the fire prevention measures observed at the time of this risk assessment, it is considered that the hazard from fire (likelihood of fire) at these premises is:</p>
            <p className="mt-2 mb-2">
              <span className={`inline-block px-3 py-1.5 font-bold text-base rounded border ${getLikelihoodBadgeClass(data.riskRatingLikelihood)}`}>
                {data.riskRatingLikelihood ?? 'Normal'}
              </span>
            </p>
            <ul className="list-disc list-inside mt-2 text-slate-600 space-y-1">
              <li><strong>Low:</strong> Unusually low likelihood of fire as a result of negligible potential sources of ignition.</li>
              <li><strong>Normal:</strong> Normal fire hazards for this type of occupancy, with fire hazards generally subject to appropriate controls.</li>
              <li><strong>High:</strong> Lack of adequate controls applied to one or more significant fire hazards.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">7.1.2 Potential Consequences of Fire</h3>
            <p className="mt-2 mb-2">
              <span className={`inline-block px-3 py-1.5 font-bold text-base rounded border ${getConsequencesBadgeClass(data.riskRatingConsequences)}`}>
                {data.riskRatingConsequences ?? 'Moderate Harm'}
              </span>
            </p>
            <ul className="list-disc list-inside mt-2 text-slate-600 space-y-1">
              <li><strong>Slight Harm:</strong> Outbreak of fire unlikely to result in serious injury or death.</li>
              <li><strong>Moderate Harm:</strong> Outbreak of fire could foreseeably result in injury but unlikely to involve multiple fatalities.</li>
              <li><strong>Extreme Harm:</strong> Significant potential for serious injury or death of one or more occupants.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">7.1.3 Summary of Risk Rating</h3>
            <p className="mb-2 whitespace-pre-line">{data.summaryOfRiskRating ?? 'Taking into account the nature of the building and the occupants, as well as the fire protection and procedural arrangements observed at the time of this fire risk assessment, it is considered that the consequences for life safety in the event of fire would be: Moderate Harm. Accordingly, it is considered that the risk from fire at these premises is: Tolerable.'}</p>
            <p className="mt-2">
              <span className="text-slate-600 text-sm">Overall risk level: </span>
              <span className={`inline-block px-3 py-1.5 font-bold text-base rounded border mt-1 ${getOverallRiskBadgeClass(data.actionPlanLevel)}`}>
                {data.actionPlanLevel ?? 'Tolerable'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Action Plan */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">8. Action Plan</h2>
        <p className="text-sm mb-4">It is considered that the following recommendations should be implemented in order to reduce fire risk to, or maintain it at, the following level: <span className={`inline-block px-2 py-0.5 font-bold text-sm rounded border align-middle ${getOverallRiskBadgeClass(data.actionPlanLevel)}`}>{data.actionPlanLevel ?? 'Tolerable'}</span>.</p>
        <p className="text-sm font-semibold mb-2">The priority given for each recommendation should be acted upon as follows:</p>
        <ul className="list-disc list-inside text-sm text-slate-700 mb-6 space-y-1">
          <li><strong>Low:</strong> Remedy when next refurbishing or next reviewing management policy.</li>
          <li><strong>Medium:</strong> Action required over next 1–6 months.</li>
          <li><strong>High:</strong> Act on immediately.</li>
        </ul>
        <h3 className="font-semibold mb-2">Recommended Actions:</h3>
        {data.actionPlanItems && data.actionPlanItems.length > 0 ? (
          <ul className="list-disc list-inside text-sm space-y-2">
            {data.actionPlanItems.map((item: any, idx: number) => (
              <li key={idx}>
                <span className="font-medium">[{item.priority}]</span> {item.recommendation}
                {item.dueNote && <span className="text-slate-600"> — {item.dueNote}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600 italic">No specific actions required at this time. Continue to maintain existing fire safety measures.</p>
        )}
      </div>

      {/* Additional Site Pictures */}
      <div className="fra-a4-page fra-print-page page-break-after-always p-12 max-w-4xl mx-auto">
        <div className="fra-print-page-header hidden print:flex print:items-center print:justify-between print:border-b print:border-slate-300 print:pb-2 print:mb-4 print:text-[11pt] print:font-semibold print:text-slate-900">
          {printHeaderContent}
        </div>
        <h2 className="text-xl font-semibold mb-4">Additional Site Pictures</h2>
        {data.photos && data.photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 fra-photo-grid">
            {data.photos.map((photo: any, idx: number) => (
              <div key={idx} className="border border-slate-200 rounded p-2 fra-photo-block">
                {photo.file_path ? (
                  <img 
                    src={photo.file_path} 
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-48 object-cover rounded print:w-full print:h-full"
                  />
                ) : (
                  <div className="w-full h-48 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-sm">
                    Photo {idx + 1}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 fra-photo-grid">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <div key={num} className="border-2 border-dashed border-slate-300 rounded p-4 h-48 flex items-center justify-center text-slate-400 text-sm fra-photo-block">
                  Photo Placeholder {num}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600 italic mt-4">
              (Photos from H&S audit will be displayed here when available)
            </p>
          </div>
        )}
      </div>

      {/* On-screen preview: fixed footer (hidden in print; PDF uses Puppeteer footer) */}
      <footer
        className="fra-report-print-footer no-print"
        aria-hidden={!showHeaderFooter}
        style={footerStyle}
      >
        {printFooterContent}
      </footer>

      {/* Print Styles */}
      <style jsx>{`
        @media screen {
          .fra-print-page {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
          }
          .fra-report-print-content {
            padding-bottom: 48px;
          }
        }
        @media print {
          .page-break-after-always {
            page-break-after: always;
          }
          body {
            background: white;
          }
          .fra-print-page {
            border: none;
            border-radius: 0;
            box-shadow: none;
          }
          .fra-report-print-header,
          .fra-report-print-footer {
            display: none !important;
          }
        }
      `}</style>
      </div>
    </div>
  )
}
