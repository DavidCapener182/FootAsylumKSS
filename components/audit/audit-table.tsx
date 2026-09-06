'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { getInternalAreaDisplayName } from '@/lib/areas'
import { cn, getDisplayStoreCode, formatPercent } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/auth'
import { getAuditPDFDownloadUrl, deleteAuditPDF } from '@/app/actions/audit-pdfs'
import { saveComplianceAudit, updateComplianceAuditScore } from '@/app/actions/stores'
import { can } from '@/lib/role-capabilities'
import { getAuditLifecycle } from '@/lib/compliance-ui'
import { Upload, Eye, EyeOff, File, SlidersHorizontal, ChevronDown, ChevronUp, BellRing, Search } from 'lucide-react'
import { PDFViewerModal } from '@/components/shared/pdf-viewer-modal'
import { StatusBadge } from '@/components/shared/status-badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StoreActionsModal } from './store-actions-modal'
import { 
  AuditRow, 
  pctBadge, 
  formatDate, 
  getLatestPct, 
  getCompletedAuditCount,
  getLatestPctForSort,
  hasCompletedAudit,
  isWarehouseAuditRow
} from './audit-table-helpers'

// Re-export for backward compatibility
export type { AuditRow }

interface AddAuditState {
  storeId: string
  storeName: string
  auditNumber: 1 | 2
  date: string
  percentage: string
  pdfFile: File | null
  isRevisit: boolean
}

interface UpdateScoreState {
  storeId: string
  auditNumber: 1 | 2
  storeName: string
  currentDate: string | null
  percentage: string
}

interface DeleteAuditPdfState {
  row: AuditRow
  auditNumber: 1 | 2
}

const HS_AUDIT_INTERVAL_MONTHS = 3
const PREVISIT_ACTION_FLAG_DAYS = 14

// Temporary debug preview to show how the pre-visit flag will look in advance.
const ENABLE_PREVISIT_FLAG_DEBUG_PREVIEW = false

type UpcomingActionFlag = {
  actionCount: number
  daysUntilDue: number
  dueDate: Date
  isDebugPreview: boolean
  title: string
}

function getLatestCompletedHSAuditDate(row: AuditRow): Date | null {
  const candidateDates = [row.compliance_audit_1_date, row.compliance_audit_2_date, row.compliance_audit_3_date]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))

  if (candidateDates.length === 0) {
    return null
  }

  return new Date(Math.max(...candidateDates.map((date) => date.getTime())))
}

function getNextHSAuditDueDate(row: AuditRow): Date | null {
  const latestDate = getLatestCompletedHSAuditDate(row)
  if (!latestDate) {
    return null
  }

  const dueDate = new Date(latestDate)
  dueDate.setMonth(dueDate.getMonth() + HS_AUDIT_INTERVAL_MONTHS)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate
}

function getDaysUntil(date: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function hasAssignedArea(row: AuditRow): row is AuditRow & { region: string } {
  return typeof row.region === 'string' && row.region.trim().length > 0
}

function isWithinMonths(dateValue: string | null, months: number): boolean {
  if (!dateValue) return false
  const start = new Date(dateValue)
  if (Number.isNaN(start.getTime())) return false
  const deadline = new Date(start)
  deadline.setMonth(deadline.getMonth() + months)
  return Date.now() <= deadline.getTime()
}

function getAreaAccordionId(groupKey: string, index: number): string {
  const slug = groupKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `audit-area-${slug || 'unassigned'}-${index}`
}

export function AuditTable({ 
  rows, 
  userRole, 
  areaFilter: externalAreaFilter, 
  onAreaFilterChange 
}: { 
  rows: AuditRow[]
  userRole: UserRole
  areaFilter?: string
  onAreaFilterChange?: (area: string) => void
}) {
  const [search, setSearch] = useState('')
  const [internalArea, setInternalArea] = useState<string>('all')
  const area = externalAreaFilter !== undefined ? externalAreaFilter : internalArea
  const setArea = onAreaFilterChange || setInternalArea
  const [hideCompleted, setHideCompleted] = useState(false)
  const [addAuditState, setAddAuditState] = useState<AddAuditState | null>(null)
  const [addAuditDialogOpen, setAddAuditDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localRows, setLocalRows] = useState<AuditRow[]>(rows)
  
  // Sync localRows with rows prop when it changes
  useEffect(() => {
    setLocalRows(rows)
  }, [rows])

  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [selectedPdfRow, setSelectedPdfRow] = useState<{ row: AuditRow; auditNumber: 1 | 2 } | null>(null)
  const [pdfUploadDialogOpen, setPdfUploadDialogOpen] = useState(false)
  const [pdfUploadRow, setPdfUploadRow] = useState<AuditRow | null>(null)
  const [selectedAuditForUpload, setSelectedAuditForUpload] = useState<1 | 2 | null>(null)
  const [pdfUploadFile, setPdfUploadFile] = useState<File | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [deletingPdf, setDeletingPdf] = useState<string | null>(null)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [updateScoreState, setUpdateScoreState] = useState<UpdateScoreState | null>(null)
  const [updatingScore, setUpdatingScore] = useState(false)
  const [updateScoreError, setUpdateScoreError] = useState<string | null>(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [deletePdfDialog, setDeletePdfDialog] = useState<DeleteAuditPdfState | null>(null)
  const [tableMessage, setTableMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [storeActionsModalOpen, setStoreActionsModalOpen] = useState(false)
  const [storeActionsRow, setStoreActionsRow] = useState<AuditRow | null>(null)
  const [storeActionCounts, setStoreActionCounts] = useState<Record<string, number>>({})
  const [expandedMobileAreas, setExpandedMobileAreas] = useState<Set<string>>(() => new Set())
  const canManageAudits = can(userRole, 'manageAudits')

  useEffect(() => {
    if (!tableMessage) return
    const timer = window.setTimeout(() => setTableMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [tableMessage])

  const areaOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => {
      if (hasAssignedArea(r)) {
        const region = r.region
        set.add(region.trim())
      }
    })
    return Array.from(set).sort()
  }, [rows])

  const loadStoreActionCounts = useCallback(async () => {
    const storeIds = localRows.map((row) => row.id).filter(Boolean)
    if (storeIds.length === 0) {
      setStoreActionCounts({})
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('fa_current_store_actions')
        .select('store_id, status')
        .in('store_id', storeIds)

      if (error) {
        console.error('Failed to load store action counts:', error)
        return
      }

      const counts: Record<string, number> = {}
      ;(data || []).forEach((action: any) => {
        const storeId = action?.store_id as string | null
        const status = String(action?.status || '').toLowerCase()
        if (!storeId) return
        if (status === 'cancelled') return
        counts[storeId] = (counts[storeId] || 0) + 1
      })

      setStoreActionCounts(counts)
    } catch (error) {
      console.error('Failed to load store action counts:', error)
    }
  }, [localRows])

  useEffect(() => {
    void loadStoreActionCounts()
  }, [loadStoreActionCounts])

  // Helper to check if a store has any completed audit.
  // "Hide Completed" should surface stores with no completed audits yet.
  const hasAnyCompletedAudit = (row: AuditRow): boolean => {
    return getCompletedAuditCount(row) > 0
  }

  const filtered = useMemo(() => {
    return localRows.filter((row) => {
      if (!hasAssignedArea(row)) {
        return false
      }

      const matchesArea = area === 'all' || row.region === area
      const term = search.trim().toLowerCase()
      const matchesSearch =
        term.length === 0 ||
        row.store_name.toLowerCase().includes(term) ||
        (row.store_code || '').toLowerCase().includes(term)
      const matchesCompletedFilter = !hideCompleted || !hasAnyCompletedAudit(row)
      return matchesArea && matchesSearch && matchesCompletedFilter
    })
  }, [localRows, area, search, hideCompleted])

  const grouped = useMemo(() => {
    const map = new Map<string, AuditRow[]>()
    
    // 1. Group by Region
    filtered.forEach((row) => {
      const key = row.region || 'Unassigned'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    })

    // 2. Sort STORES within each area by Latest % (Descending)
    map.forEach((storeRows) => {
      storeRows.sort((a, b) => getLatestPctForSort(b) - getLatestPctForSort(a))
    })

    // 3. Sort AREAS alphabetically
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const debugPreviewStoreIds = useMemo(() => {
    const ids = new Set<string>()
    if (!ENABLE_PREVISIT_FLAG_DEBUG_PREVIEW) {
      return ids
    }

    // Prefer visible rows so debug matches what the user is currently looking at.
    filtered.forEach((row) => {
      if ((storeActionCounts[row.id] || 0) > 0) {
        ids.add(row.id)
      }
    })

    // Fallback in case filters hide all actionable rows.
    if (ids.size === 0) {
      localRows.forEach((row) => {
        if ((storeActionCounts[row.id] || 0) > 0) {
          ids.add(row.id)
        }
      })
    }

    return ids
  }, [filtered, localRows, storeActionCounts])

  const getUpcomingActionFlag = useCallback((row: AuditRow): UpcomingActionFlag | null => {
    const actionCount = storeActionCounts[row.id] || 0
    if (actionCount === 0) {
      return null
    }

    const dueDate = getNextHSAuditDueDate(row)
    if (!dueDate) {
      return null
    }

    const daysUntilDue = getDaysUntil(dueDate)
    const withinWindow = daysUntilDue <= PREVISIT_ACTION_FLAG_DAYS
    const isDebugPreview = !withinWindow && debugPreviewStoreIds.has(row.id)

    if (!withinWindow && !isDebugPreview) {
      return null
    }

    const actionLabel = `${actionCount} previous action${actionCount === 1 ? '' : 's'}`
    let title = `${actionLabel}. Next H&S audit due ${dueDate.toLocaleDateString('en-GB')}.`

    if (isDebugPreview) {
      title = `Debug preview: ${actionLabel}. Next H&S audit due ${dueDate.toLocaleDateString('en-GB')}.`
    } else if (daysUntilDue < 0) {
      title = `${actionLabel}. Next H&S audit is ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} overdue.`
    } else if (daysUntilDue === 0) {
      title = `${actionLabel}. Next H&S audit is due today.`
    } else {
      title = `${actionLabel}. Next H&S audit due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}.`
    }

    return {
      actionCount,
      daysUntilDue,
      dueDate,
      isDebugPreview,
      title,
    }
  }, [storeActionCounts, debugPreviewStoreIds])

  const getNextAuditNumber = (row: AuditRow): 1 | 2 | null => {
    const audit1Complete = hasCompletedAudit(row, 1)
    const audit2Complete = hasCompletedAudit(row, 2)
    
    // If audit 1 hasn't been done yet, add audit 1
    if (!audit1Complete) {
      return 1
    }

    if (isWarehouseAuditRow(row)) {
      return null
    }
    
    // If audit 1 is complete but audit 2 hasn't been done, add audit 2
    if (audit1Complete && !audit2Complete) {
      return 2
    }
    
    // Both audits are complete
    return null
  }

  const hasActiveFilters = search.trim().length > 0 || area !== 'all' || hideCompleted
  const activeFilterCount = Number(search.trim().length > 0) + Number(area !== 'all') + Number(hideCompleted)

  const resetFilters = () => {
    setSearch('')
    setArea('all')
    setHideCompleted(false)
  }

  const toggleMobileArea = (groupKey: string) => {
    setExpandedMobileAreas((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  const handleAddAudit = (row: AuditRow) => {
    const auditNum = getNextAuditNumber(row)
    if (!auditNum) {
      setTableMessage({ type: 'error', text: `${row.store_name} already has Audit 1 and Audit 2 completed.` })
      return
    }

    let isRevisit = false
    if (auditNum === 2) {
      const audit1Score = row.compliance_audit_1_overall_pct
      const audit1Date = row.compliance_audit_1_date

      if (typeof audit1Score === 'number') {
        if (audit1Score > 80 && isWithinMonths(audit1Date, HS_AUDIT_INTERVAL_MONTHS)) {
          const confirmed = window.confirm(
            `${row.store_name} scored ${audit1Score.toFixed(1)}% on Audit 1 within the last ${HS_AUDIT_INTERVAL_MONTHS} months.\n\nConfirm this is an actual second audit.`
          )
          if (!confirmed) return
        } else if (audit1Score < 80 && isWithinMonths(audit1Date, 2)) {
          isRevisit = true
        }
      }
    }

    setAddAuditState({
      storeId: row.id,
      storeName: row.store_name,
      auditNumber: auditNum,
      date: new Date().toISOString().split('T')[0],
      percentage: '',
      pdfFile: null,
      isRevisit,
    })
    setAddAuditDialogOpen(true)
  }

  const handleCloseAddAuditDialog = () => {
    setAddAuditDialogOpen(false)
    setAddAuditState(null)
  }

  const handleSaveAudit = async () => {
    if (!addAuditState) return
    if (!canManageAudits) {
      setTableMessage({ type: 'error', text: 'You do not have permission to manage audits.' })
      return
    }

    const { storeId, storeName, auditNumber, date, percentage, pdfFile } = addAuditState

    // Validate
    if (!date) {
      setTableMessage({ type: 'error', text: 'Please enter an audit date.' })
      return
    }
    if (!percentage || isNaN(Number(percentage))) {
      setTableMessage({ type: 'error', text: 'Please enter a valid percentage (0-100).' })
      return
    }
    const pctNum = Number(percentage)
    if (pctNum < 0 || pctNum > 100) {
      setTableMessage({ type: 'error', text: 'Percentage must be between 0 and 100.' })
      return
    }
    const autoActionPlanSent = pctNum < 80

    setSaving(true)
    setTableMessage(null)
    let actionImportMessage = ''

    try {
      // Upload PDF if provided
      let pdfPath: string | null = null
      if (pdfFile) {
        try {
          // Use FormData to upload via API route
          const formData = new FormData()
          formData.append('storeId', storeId)
          formData.append('auditNumber', auditNumber.toString())
          formData.append('file', pdfFile)

          const response = await fetch('/api/audit-pdfs/upload', {
            method: 'POST',
            body: formData,
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Failed to upload PDF')
          }

          pdfPath = result.filePath
          actionImportMessage = result.actionImport?.warning ? ` PDF saved; action import needs review: ${result.actionImport.warning}` : ` ${result.actionImport?.count || 0} actions imported.`
        } catch (uploadError) {
          console.error('PDF upload error:', uploadError)
          const uploadErrorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error'
          setTableMessage({ type: 'error', text: `Failed to upload PDF: ${uploadErrorMessage}` })
          return
        }
      }
      
      const row = localRows.find(r => r.id === storeId)
      const data = await saveComplianceAudit({
        storeId,
        auditNumber,
        date,
        percentage: pctNum,
        pdfPath,
        currentAudit1Complete: row ? hasCompletedAudit(row, 1) : false,
        currentAudit2Complete: row ? hasCompletedAudit(row, 2) : false,
      })

      // Update local state with the returned data
      setLocalRows(prevRows => 
        prevRows.map(row => {
          if (row.id === storeId) {
            return {
              ...row,
              compliance_audit_1_date: data.compliance_audit_1_date,
              compliance_audit_1_overall_pct: data.compliance_audit_1_overall_pct,
              action_plan_1_sent: data.action_plan_1_sent,
              compliance_audit_1_pdf_path: data.compliance_audit_1_pdf_path,
              compliance_audit_2_date: data.compliance_audit_2_date,
              compliance_audit_2_overall_pct: data.compliance_audit_2_overall_pct,
              action_plan_2_sent: data.action_plan_2_sent,
              compliance_audit_2_pdf_path: data.compliance_audit_2_pdf_path,
              total_audits_to_date: data.total_audits_to_date,
            }
          }
          return row
        })
      )

      handleCloseAddAuditDialog()
      const auditLabel = auditNumber === 2 && addAuditState.isRevisit ? 'Revisit (Audit 2)' : `Audit ${auditNumber}`
      setTableMessage({
        type: 'success',
        text: `${auditLabel} saved for ${storeName}. Action Plan set to ${autoActionPlanSent ? 'Yes' : 'No'}.${actionImportMessage}`,
      })
    } catch (error) {
      console.error('Error saving audit:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save audit. Please try again.'
      setTableMessage({ type: 'error', text: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  const handleViewPDF = (row: AuditRow, auditNumber: 1 | 2) => {
    const pdfPath = auditNumber === 1 
      ? row.compliance_audit_1_pdf_path 
      : row.compliance_audit_2_pdf_path
    
    if (!pdfPath) return
    
    setSelectedPdfRow({ row, auditNumber })
    setPdfViewerOpen(true)
  }

  const handleGetPDFUrl = async () => {
    if (!selectedPdfRow) return null
    
    const pdfPath = selectedPdfRow.auditNumber === 1
      ? selectedPdfRow.row.compliance_audit_1_pdf_path
      : selectedPdfRow.row.compliance_audit_2_pdf_path
    
    if (!pdfPath) return null
    
    try {
      return await getAuditPDFDownloadUrl(pdfPath)
    } catch (error) {
      console.error('Error fetching PDF URL:', error)
      return null
    }
  }

  const handleOpenPDFUpload = (row: AuditRow, auditNumber?: 1 | 2) => {
    if (!canManageAudits) {
      setTableMessage({ type: 'error', text: 'You do not have permission to upload audit PDFs.' })
      return
    }
    setPdfUploadRow(row)
    setPdfUploadFile(null)
    
    if (auditNumber) {
      // If audit number is provided, use it
      setSelectedAuditForUpload(auditNumber)
    } else {
      // Otherwise, auto-select if only one audit exists
      const hasAudit1 = hasCompletedAudit(row, 1)
      const hasAudit2 = hasCompletedAudit(row, 2)
      
      if (hasAudit1 && !hasAudit2) {
        setSelectedAuditForUpload(1)
      } else if (hasAudit2 && !hasAudit1) {
        setSelectedAuditForUpload(2)
      } else {
        // Both exist or neither exists - user must select
        setSelectedAuditForUpload(null)
      }
    }
    
    setPdfUploadDialogOpen(true)
  }

  const handlePDFFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setPdfUploadFile(file)
  }

  const handleUploadPDF = async () => {
    if (!canManageAudits) {
      setTableMessage({ type: 'error', text: 'You do not have permission to upload audit PDFs.' })
      return
    }
    if (!pdfUploadRow || !pdfUploadFile || !selectedAuditForUpload) {
      setTableMessage({ type: 'error', text: 'Please select an audit and PDF file.' })
      return
    }

    const storeName = pdfUploadRow.store_name
    const selectedAudit = selectedAuditForUpload
    setUploadingPdf(true)
    setTableMessage(null)
    try {
      // Use FormData to upload via API route
      const formData = new FormData()
      formData.append('storeId', pdfUploadRow.id)
      formData.append('auditNumber', selectedAuditForUpload.toString())
      formData.append('file', pdfUploadFile)

      const response = await fetch('/api/audit-pdfs/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload PDF')
      }

      // Update local state
      setLocalRows(prevRows => prevRows.map(row => {
        if (row.id === pdfUploadRow.id) {
          return {
            ...row,
            compliance_audit_1_pdf_path: selectedAuditForUpload === 1 ? result.filePath : row.compliance_audit_1_pdf_path,
            compliance_audit_2_pdf_path: selectedAuditForUpload === 2 ? result.filePath : row.compliance_audit_2_pdf_path,
          }
        }
        return row
      }))

      await loadStoreActionCounts()
      setPdfUploadDialogOpen(false)
      setPdfUploadRow(null)
      setPdfUploadFile(null)
      setSelectedAuditForUpload(null)
      
      // Reset file input
      const fileInput = document.getElementById(`pdf-upload-standalone-${pdfUploadRow.id}`) as HTMLInputElement
      if (fileInput) fileInput.value = ''
      setTableMessage({
        type: 'success',
        text: `Audit ${selectedAudit} PDF uploaded for ${storeName}. ${result.actionImport?.warning ? `Action import needs review: ${result.actionImport.warning}` : `${result.actionImport?.count || 0} actions imported.`}`,
      })
    } catch (error) {
      console.error('Error uploading PDF:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setTableMessage({ type: 'error', text: `Failed to upload PDF: ${errorMessage}` })
    } finally {
      setUploadingPdf(false)
    }
  }

  const handleDeletePDF = (row: AuditRow, auditNumber: 1 | 2) => {
    if (!canManageAudits) {
      setTableMessage({ type: 'error', text: 'You do not have permission to delete audit PDFs.' })
      return
    }
    setDeletePdfDialog({ row, auditNumber })
  }

  const handleConfirmDeletePDF = async () => {
    if (!deletePdfDialog) return
    if (!canManageAudits) {
      setTableMessage({ type: 'error', text: 'You do not have permission to delete audit PDFs.' })
      return
    }
    const { row, auditNumber } = deletePdfDialog

    setDeletingPdf(`${row.id}-${auditNumber}`)
    setTableMessage(null)
    try {
      await deleteAuditPDF(row.id, auditNumber)
      
      // Update local state immediately
      setLocalRows(prevRows => prevRows.map(r => {
        if (r.id === row.id) {
          return {
            ...r,
            compliance_audit_1_pdf_path: auditNumber === 1 ? null : r.compliance_audit_1_pdf_path,
            compliance_audit_2_pdf_path: auditNumber === 2 ? null : r.compliance_audit_2_pdf_path,
          }
        }
        return r
      }))
      
      // Close PDF viewer if it's open for this row/audit
      if (selectedPdfRow?.row.id === row.id && selectedPdfRow.auditNumber === auditNumber) {
        setPdfViewerOpen(false)
        setSelectedPdfRow(null)
      }
      setDeletePdfDialog(null)
      setTableMessage({
        type: 'success',
        text: `Audit ${auditNumber} PDF deleted for ${row.store_name}.`,
      })
    } catch (error) {
      console.error('Error deleting PDF:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setTableMessage({ type: 'error', text: `Failed to delete PDF: ${errorMessage}` })
    } finally {
      setDeletingPdf(null)
    }
  }

  const handleOpenUpdateScore = (row: AuditRow, auditNumber: 1 | 2) => {
    if (!canManageAudits) {
      setTableMessage({ type: 'error', text: 'You do not have permission to update audit scores.' })
      return
    }
    const currentPct = auditNumber === 1 ? row.compliance_audit_1_overall_pct : row.compliance_audit_2_overall_pct
    const currentDate = auditNumber === 1 ? row.compliance_audit_1_date : row.compliance_audit_2_date

    if (currentPct === null || currentPct === undefined) return

    setUpdateScoreState({
      storeId: row.id,
      auditNumber,
      storeName: row.store_name,
      currentDate,
      percentage: currentPct.toString(),
    })
    setUpdateScoreError(null)
    setUpdateDialogOpen(true)
  }

  const handleUpdateScore = async () => {
    if (!updateScoreState) return
    if (!canManageAudits) {
      setUpdateScoreError('You do not have permission to update audit scores.')
      return
    }

    const pctNum = Number(updateScoreState.percentage)
    if (!updateScoreState.percentage || isNaN(pctNum)) {
      setUpdateScoreError('Please enter a valid percentage (0-100).')
      return
    }
    if (pctNum < 0 || pctNum > 100) {
      setUpdateScoreError('Percentage must be between 0 and 100.')
      return
    }

    setUpdateScoreError(null)
    setUpdatingScore(true)

    try {
      const autoActionPlanSent = pctNum < 80
      const data = await updateComplianceAuditScore(updateScoreState.storeId, updateScoreState.auditNumber, pctNum)

      setLocalRows(prevRows => 
        prevRows.map(row => {
          if (row.id === updateScoreState.storeId) {
            return {
              ...row,
              compliance_audit_1_overall_pct: data.compliance_audit_1_overall_pct,
              compliance_audit_2_overall_pct: data.compliance_audit_2_overall_pct,
              action_plan_1_sent: data.action_plan_1_sent,
              action_plan_2_sent: data.action_plan_2_sent,
            }
          }
          return row
        })
      )

      setUpdateDialogOpen(false)
      setUpdateScoreState(null)
      setTableMessage({
        type: 'success',
        text: `Audit ${updateScoreState.auditNumber} score updated for ${updateScoreState.storeName}. Action Plan set to ${autoActionPlanSent ? 'Yes' : 'No'}.`,
      })
    } catch (error) {
      console.error('Error updating audit score:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update audit score. Please try again.'
      setUpdateScoreError(errorMessage)
      setTableMessage({ type: 'error', text: errorMessage })
    } finally {
      setUpdatingScore(false)
    }
  }

  const handleOpenStoreActionsModal = (row: AuditRow) => {
    setStoreActionsRow(row)
    setStoreActionsModalOpen(true)
  }

  const handleStoreActionsCreated = (count: number, storeName: string) => {
    setTableMessage({
      type: 'success',
      text: count === 1 ? `1 action created for ${storeName}.` : `${count} actions created for ${storeName}.`,
    })
    void loadStoreActionCounts()
  }

  const renderAuditSummary = (row: AuditRow, auditNumber: 1 | 2) => {
    const date = auditNumber === 1 ? row.compliance_audit_1_date : row.compliance_audit_2_date
    const score = auditNumber === 1 ? row.compliance_audit_1_overall_pct : row.compliance_audit_2_overall_pct
    const pdf = auditNumber === 1 ? row.compliance_audit_1_pdf_path : row.compliance_audit_2_pdf_path
    const planSent = auditNumber === 1 ? row.action_plan_1_sent : row.action_plan_2_sent
    const complete = hasCompletedAudit(row, auditNumber)
    const scoreTone = score === null ? 'unscored' : score >= 90 ? 'good' : score >= 80 ? 'watch' : 'attention'

    return (
      <div className="audit-record">
        <div className="audit-record-top">
          {score !== null ? (
            canManageAudits ? (
              <button type="button" className={`audit-score audit-score-${scoreTone}`}
                onClick={() => handleOpenUpdateScore(row, auditNumber)}
                title="Update audit score" aria-label={`Update Audit ${auditNumber} score for ${row.store_name}: ${formatPercent(score)}`}>
                {formatPercent(score)}
              </button>
            ) : <span className={`audit-score audit-score-${scoreTone}`}>{formatPercent(score)}</span>
          ) : <span className="audit-unrecorded">{complete ? 'Completed' : date ? 'Awaiting score' : 'Not recorded'}</span>}
          {pdf ? (
            <button type="button" className="audit-document" onClick={() => handleViewPDF(row, auditNumber)}
              title={`View Audit ${auditNumber} PDF`} aria-label={`View Audit ${auditNumber} PDF for ${row.store_name}`}>
              <File className="h-3.5 w-3.5" /><span>PDF</span>
            </button>
          ) : canManageAudits && complete ? (
            <button type="button" className="audit-document" onClick={() => handleOpenPDFUpload(row, auditNumber)}
              title={`Upload Audit ${auditNumber} PDF`} aria-label={`Upload Audit ${auditNumber} PDF for ${row.store_name}`}>
              <Upload className="h-3.5 w-3.5" /><span>PDF</span>
            </button>
          ) : null}
        </div>
        {date ? <span className="audit-record-date">{formatDate(date)}</span> : null}
        {complete ? <span className={cn('audit-plan-note', planSent && 'audit-plan-sent')}>
          Plan sent: {planSent === null ? 'Not recorded' : planSent ? 'Yes' : 'No'}
        </span> : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mobile Sticky Controls */}
      <div className="xl:hidden sticky top-2 z-20 px-0.5">
        <div className={cn('mobile-sticky-shell rounded-2xl border px-3 py-2.5', mobileFiltersOpen && 'shadow-md')}>
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              className="h-8 px-2.5 text-xs border-slate-200 bg-white/80"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] text-white">
                  {activeFilterCount}
                </span>
              ) : null}
              {mobileFiltersOpen ? (
                <ChevronUp className="h-3.5 w-3.5 ml-1.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
              )}
            </Button>
            <div className="rounded-full bg-white/80 border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 font-medium">
              {filtered.length} of {localRows.length}
            </div>
          </div>

          {mobileFiltersOpen ? (
            <div className="mt-3 space-y-2 border-t pt-3">
              <Input
                placeholder="Search store name or code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white min-h-[var(--touch-target-min)]"
              />
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="w-full bg-white min-h-[var(--touch-target-min)]">
                  <SelectValue placeholder="Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All areas</SelectItem>
                  {areaOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {getInternalAreaDisplayName(opt, { fallback: opt })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  variant={hideCompleted ? 'default' : 'outline'}
                  onClick={() => setHideCompleted(!hideCompleted)}
                  className={cn(
                    'flex-1 min-h-[var(--touch-target-min)]',
                    hideCompleted ? 'bg-slate-900 text-white hover:bg-slate-800' : 'border-slate-200 bg-white'
                  )}
                >
                  {hideCompleted ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Show Completed
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Hide Completed
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className="min-h-[var(--touch-target-min)] text-slate-600"
                >
                  Reset
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Desktop Controls */}
      <div className="audit-filter-bar hidden xl:flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search store name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-[var(--touch-target-min)] bg-white pl-9"
            />
          </div>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="w-full sm:w-44 bg-white min-h-[var(--touch-target-min)]">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                  {areaOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {getInternalAreaDisplayName(opt, { fallback: opt })}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
          <Button
            variant={hideCompleted ? "default" : "outline"}
            onClick={() => setHideCompleted(!hideCompleted)}
            className={cn(
              'min-h-[var(--touch-target-min)]',
              hideCompleted ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            )}
          >
            {hideCompleted ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Show Completed</span>
                <span className="sm:hidden">Show</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Hide Completed</span>
                <span className="sm:hidden">Hide</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="min-h-[var(--touch-target-min)] text-slate-500 hover:text-slate-700"
          >
            Reset
          </Button>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-sm text-slate-500">
            <strong className="text-slate-800">{filtered.length}</strong> of {localRows.length} stores
          </div>
        </div>
      </div>

      {tableMessage ? (
        <div
          className={cn(
            'rounded-lg border px-3 py-2 text-sm',
            tableMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          )}
        >
          {tableMessage.text}
        </div>
      ) : null
      }

      {/* Mobile Card View */}
      <div className="xl:hidden space-y-3">
        {grouped.length === 0 ? (
          <div className="rounded-2xl border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            No audit data found matching your filters.
          </div>
        ) : (
          grouped.map(([groupKey, areaRows], groupIndex) => {
            const validScores = areaRows
              .map((row) => getLatestPct(row))
              .filter((score): score is number => score !== null)
            const totalScore = validScores.reduce((acc, cur) => acc + cur, 0)
            const calculatedAverage = validScores.length > 0 ? totalScore / validScores.length : null
            const isCollapsed = !expandedMobileAreas.has(groupKey)
            const areaLabel = getInternalAreaDisplayName(groupKey, { fallback: groupKey })
            const accordionId = getAreaAccordionId(groupKey, groupIndex)

            return (
              <section key={`mob-${groupKey}`} className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => toggleMobileArea(groupKey)}
                  aria-expanded={!isCollapsed}
                  aria-controls={accordionId}
                  className="mobile-group-bar flex min-h-[56px] w-full items-center justify-between rounded-xl border px-3 py-2 text-left shadow-sm transition-colors active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {areaLabel}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {areaRows.length} store{areaRows.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Avg
                    </span>
                    {pctBadge(calculatedAverage)}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-slate-500 transition-transform duration-200',
                        !isCollapsed && 'rotate-180'
                      )}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                <div id={accordionId} className={cn('space-y-2.5', isCollapsed && 'hidden')}>
                  {areaRows.map((row) => {
                    const nextAudit = getNextAuditNumber(row)
                    const upcomingActionFlag = getUpcomingActionFlag(row)
                    const auditLifecycle = getAuditLifecycle(row)

                    return (
                      <div key={row.id} className="audit-mobile-card rounded-2xl border p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleOpenStoreActionsModal(row)}
                              className="text-left text-sm font-semibold text-slate-900 truncate leading-tight underline-offset-2 hover:underline"
                              title="Open store actions"
                            >
                              {row.store_name}
                            </button>
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono">
                                {getDisplayStoreCode(row.store_code) || '—'}
                              </span>
                              <span>{getInternalAreaDisplayName(row.region, { fallback: 'Unassigned' })}</span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            <StatusBadge type="audit" status={auditLifecycle.status} label={auditLifecycle.label} />
                          </div>
                        </div>

                        <div className="audit-mobile-records mt-3 grid grid-cols-2 gap-3">
                          {([1, 2] as const).map((number) => (
                            <div key={number} className="min-w-0">
                              <div className="audit-record-label">Audit {number}</div>
                              {renderAuditSummary(row, number)}
                            </div>
                          ))}
                        </div>

                        <div className={cn("audit-mobile-actions", (upcomingActionFlag || (canManageAudits && nextAudit !== null)) && "mt-3 flex flex-wrap gap-2 border-t border-slate-200/80 pt-3")}>
                          {upcomingActionFlag ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenStoreActionsModal(row)}
                              title={upcomingActionFlag.title}
                              className={cn(
                                'w-full text-xs',
                                upcomingActionFlag.isDebugPreview
                                  ? 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100'
                                  : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              )}
                            >
                              <BellRing className="h-3.5 w-3.5 mr-1.5" />
                              {upcomingActionFlag.isDebugPreview
                                ? `Debug Preview (${upcomingActionFlag.actionCount})`
                                : `Previous Actions (${upcomingActionFlag.actionCount})`}
                            </Button>
                          ) : null}

                          {canManageAudits && nextAudit !== null ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAddAudit(row)}
                              className="w-full bg-slate-900 text-white hover:bg-slate-800"
                            >
                              Add Audit
                            </Button>
                          ) : null}

                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })
        )}
      </div>

      {/* One semantic table keeps audit headings aligned with their records. */}
      <div className="audit-register hidden xl:block">
        <Table className="audit-register-table">
          <caption className="sr-only">Store audit records grouped by area. Scores, dates, action plans and PDF documents for each audit.</caption>
          <colgroup><col style={{ width: '23%' }} /><col style={{ width: '18%' }} /><col style={{ width: '21%' }} /><col style={{ width: '21%' }} /><col style={{ width: '17%' }} /></colgroup>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Store</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col">Audit 1</TableHead>
              <TableHead scope="col">Audit 2</TableHead>
              <TableHead scope="col">Follow-up</TableHead>
            </TableRow>
          </TableHeader>
          {grouped.length === 0 ? (
            <TableBody><TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No audit data found matching your filters.</TableCell></TableRow></TableBody>
          ) : grouped.map(([groupKey, areaRows]) => {
            const validScores = areaRows.map(getLatestPct).filter((score): score is number => score !== null)
            const average = validScores.length ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : null
            return (
              <TableBody key={groupKey}>
                <TableRow className="audit-area-row">
                  <TableHead scope="rowgroup" colSpan={5}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3"><span className="audit-area-marker" aria-hidden="true" />{getInternalAreaDisplayName(groupKey, { fallback: groupKey })}<span className="audit-area-count">{areaRows.length} store{areaRows.length === 1 ? '' : 's'}</span></div>
                      <span className="audit-area-average">Area average <strong>{average === null ? '—' : formatPercent(average)}</strong><span className="sr-only"> from {validScores.length} scored stores</span></span>
                    </div>
                  </TableHead>
                </TableRow>
                {areaRows.map((row) => {
                  const flag = getUpcomingActionFlag(row)
                  const lifecycle = getAuditLifecycle(row)
                  const nextAudit = getNextAuditNumber(row)
                  const count = getCompletedAuditCount(row)
                  return (
                    <TableRow key={row.id} className="audit-store-row">
                      <TableCell>
                        <button type="button" className="audit-store-name" onClick={() => handleOpenStoreActionsModal(row)} title="Open store actions">{row.store_name}</button>
                        <div className="audit-store-meta"><span>{getDisplayStoreCode(row.store_code) || '—'}</span><span>{count} audit{count === 1 ? '' : 's'}</span></div>
                      </TableCell>
                      <TableCell><StatusBadge type="audit" status={lifecycle.status} label={lifecycle.label} /></TableCell>
                      <TableCell>{renderAuditSummary(row, 1)}</TableCell>
                      <TableCell>{renderAuditSummary(row, 2)}</TableCell>
                      <TableCell>
                        <div className="audit-follow-up">
                          {flag ? <button type="button" className="audit-previous-actions" onClick={() => handleOpenStoreActionsModal(row)} title={flag.title}>
                            <BellRing className="h-3.5 w-3.5" />{flag.isDebugPreview ? 'Preview' : 'Previous actions'}<span>{flag.actionCount}</span>
                          </button> : null}
                          {canManageAudits && nextAudit !== null ? <Button type="button" size="sm" variant="outline" onClick={() => handleAddAudit(row)} className="audit-add-button">+ Add Audit {nextAudit}</Button> : null}
                          {!flag && (!canManageAudits || nextAudit === null) ? <span className="audit-unrecorded">—</span> : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            )
          })}
        </Table>
      </div>

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        open={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
        pdfUrl={null}
        title={selectedPdfRow ? `Audit ${selectedPdfRow.auditNumber} - ${selectedPdfRow.row.store_name}` : 'Audit PDF'}
        getDownloadUrl={handleGetPDFUrl}
        headerActions={selectedPdfRow && canManageAudits ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeletePDF(selectedPdfRow.row, selectedPdfRow.auditNumber)}
            disabled={deletingPdf === `${selectedPdfRow.row.id}-${selectedPdfRow.auditNumber}`}
          >
            {deletingPdf === `${selectedPdfRow.row.id}-${selectedPdfRow.auditNumber}` ? 'Deleting...' : 'Delete PDF'}
          </Button>
        ) : undefined}
      />

      {/* Add Audit Dialog */}
      <Dialog
        open={addAuditDialogOpen}
        onOpenChange={(open) => {
          setAddAuditDialogOpen(open)
          if (!open) {
            setAddAuditState(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Audit</DialogTitle>
            <DialogDescription>
              {addAuditState ? `Audit ${addAuditState.auditNumber} - ${addAuditState.storeName}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addAuditState?.auditNumber === 2 && addAuditState.isRevisit ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                This will be saved as a revisit second audit (Audit 1 was below 80% within the last 2 months).
              </div>
            ) : null}
            <div className="space-y-1">
              <label className="text-sm font-medium">Store</label>
              <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {addAuditState?.storeName || '—'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Audit date</label>
              <Input
                type="date"
                value={addAuditState?.date || ''}
                onChange={(e) => {
                  if (!addAuditState) return
                  setAddAuditState({ ...addAuditState, date: e.target.value })
                }}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Audit %</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={addAuditState?.percentage || ''}
                onChange={(e) => {
                  if (!addAuditState) return
                  setAddAuditState({ ...addAuditState, percentage: e.target.value })
                }}
                placeholder="0-100"
                disabled={saving}
              />
            </div>
            <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Action Plan will be set to{' '}
              <span className="font-semibold">
                {addAuditState && addAuditState.percentage !== '' && !Number.isNaN(Number(addAuditState.percentage))
                  ? Number(addAuditState.percentage) < 80
                    ? 'Yes'
                    : 'No'
                  : 'No'}
              </span>{' '}
              based on the score.
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">PDF file (optional)</label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  if (!addAuditState) return
                  setAddAuditState({ ...addAuditState, pdfFile: file })
                }}
                className="w-full text-sm"
                disabled={saving}
              />
              {addAuditState?.pdfFile ? (
                <p className="text-xs text-muted-foreground">{addAuditState.pdfFile.name}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseAddAuditDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveAudit} disabled={saving || !addAuditState}>
              {saving ? 'Saving...' : 'Save Audit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Upload Dialog */}
      <Dialog open={pdfUploadDialogOpen} onOpenChange={setPdfUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Audit PDF</DialogTitle>
            <DialogDescription>
              {pdfUploadRow?.store_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Select Audit Number - only show if both audits exist */}
            {pdfUploadRow && hasCompletedAudit(pdfUploadRow, 1) && hasCompletedAudit(pdfUploadRow, 2) ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Audit</label>
                <Select
                  value={selectedAuditForUpload?.toString() || ''}
                  onValueChange={(value) => setSelectedAuditForUpload(parseInt(value) as 1 | 2)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audit..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Audit 1</SelectItem>
                    <SelectItem value="2">Audit 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {selectedAuditForUpload === 1 && 'Uploading to Audit 1'}
                {selectedAuditForUpload === 2 && 'Uploading to Audit 2'}
                {!selectedAuditForUpload && 'Please select an audit'}
              </div>
            )}

            {/* File Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">PDF File</label>
              <input
                type="file"
                id={`pdf-upload-standalone-${pdfUploadRow?.id}`}
                accept=".pdf,application/pdf"
                onChange={handlePDFFileSelect}
                className="w-full text-sm"
              />
              {pdfUploadFile && (
                <p className="text-xs text-muted-foreground">{pdfUploadFile.name}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPdfUploadDialogOpen(false)
                setPdfUploadRow(null)
                setPdfUploadFile(null)
                setSelectedAuditForUpload(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadPDF}
              disabled={!pdfUploadFile || !selectedAuditForUpload || uploadingPdf}
            >
              {uploadingPdf ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete PDF Dialog */}
      <Dialog
        open={!!deletePdfDialog}
        onOpenChange={(open) => {
          if (!open) {
            setDeletePdfDialog(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Audit PDF</DialogTitle>
            <DialogDescription>
              {deletePdfDialog
                ? `Remove Audit ${deletePdfDialog.auditNumber} PDF for ${deletePdfDialog.row.store_name}?`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletePdfDialog(null)}
              disabled={!!deletingPdf}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeletePDF}
              disabled={
                !deletePdfDialog ||
                deletingPdf === `${deletePdfDialog.row.id}-${deletePdfDialog.auditNumber}`
              }
            >
              {deletePdfDialog &&
              deletingPdf === `${deletePdfDialog.row.id}-${deletePdfDialog.auditNumber}`
                ? 'Deleting...'
                : 'Delete PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Score Dialog */}
      <Dialog
        open={updateDialogOpen}
        onOpenChange={(open) => {
          setUpdateDialogOpen(open)
          if (!open) {
            setUpdateScoreState(null)
            setUpdateScoreError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Audit Score</DialogTitle>
            <DialogDescription>
              {updateScoreState ? `Audit ${updateScoreState.auditNumber} - ${updateScoreState.storeName}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {updateScoreState?.currentDate && (
              <div className="text-xs text-muted-foreground">
                Audit date: {formatDate(updateScoreState.currentDate)}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Score (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={updateScoreState?.percentage || ''}
                onChange={(e) => {
                  if (!updateScoreState) return
                  setUpdateScoreState({ ...updateScoreState, percentage: e.target.value })
                }}
              />
            </div>
            {updateScoreError ? (
              <p className="text-sm text-rose-600">{updateScoreError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpdateDialogOpen(false)
                setUpdateScoreState(null)
                setUpdateScoreError(null)
              }}
              disabled={updatingScore}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateScore} disabled={updatingScore}>
              {updatingScore ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StoreActionsModal
        open={storeActionsModalOpen}
        onOpenChange={setStoreActionsModalOpen}
        row={storeActionsRow}
        userRole={userRole}
        onActionsCreated={handleStoreActionsCreated}
      />
    </div>
  )
}
