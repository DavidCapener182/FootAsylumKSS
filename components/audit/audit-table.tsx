'use client'

import { useMemo, useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/auth'
import { uploadAuditPDF, getAuditPDFDownloadUrl, deleteAuditPDF } from '@/app/actions/audit-pdfs'
import { Upload, FileText, Eye, EyeOff, File, Trash2, X } from 'lucide-react'
import { PDFViewerModal } from '@/components/shared/pdf-viewer-modal'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  AuditRow, 
  pctBadge, 
  boolBadge, 
  formatDate, 
  getLatestPct, 
  getLatestPctForSort 
} from './audit-table-helpers'

// Re-export for backward compatibility
export type { AuditRow }

interface EditState {
  storeId: string
  auditNumber: 1 | 2
  date: string
  percentage: string
  actionPlan: 'Yes' | 'No' | undefined
  pdfFile: File | null
}

interface UpdateScoreState {
  storeId: string
  auditNumber: 1 | 2
  storeName: string
  currentDate: string | null
  percentage: string
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
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [localRows, setLocalRows] = useState<AuditRow[]>(rows)
  const canEdit = true // All logged-in users can edit
  
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

  const areaOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.region && set.add(r.region))
    return Array.from(set).sort()
  }, [rows])

  // Helper to check if both audits are complete
  const areBothAuditsComplete = (row: AuditRow): boolean => {
    const audit1Complete = !!(row.compliance_audit_1_date && row.compliance_audit_1_overall_pct !== null)
    const audit2Complete = !!(row.compliance_audit_2_date && row.compliance_audit_2_overall_pct !== null)
    return audit1Complete && audit2Complete
  }

  const filtered = useMemo(() => {
    return localRows.filter((row) => {
      const matchesArea = area === 'all' || row.region === area
      const term = search.trim().toLowerCase()
      const matchesSearch =
        term.length === 0 ||
        row.store_name.toLowerCase().includes(term) ||
        (row.store_code || '').toLowerCase().includes(term)
      const matchesCompletedFilter = !hideCompleted || !areBothAuditsComplete(row)
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

  const getNextAuditNumber = (row: AuditRow): 1 | 2 | null => {
    // Check if audit 1 has been completed (has both date and percentage)
    const audit1Complete = !!(row.compliance_audit_1_date && row.compliance_audit_1_overall_pct !== null)
    
    // Check if audit 2 has been completed (has both date and percentage)
    const audit2Complete = !!(row.compliance_audit_2_date && row.compliance_audit_2_overall_pct !== null)
    
    // If audit 1 hasn't been done yet, add audit 1
    if (!audit1Complete) {
      return 1
    }
    
    // If audit 1 is complete but audit 2 hasn't been done, add audit 2
    if (audit1Complete && !audit2Complete) {
      return 2
    }
    
    // Both audits are complete
    return null
  }

  const handleAddAudit = (row: AuditRow) => {
    const auditNum = getNextAuditNumber(row)
    if (!auditNum) return // Both audits complete
    
    const currentDate = auditNum === 1 ? row.compliance_audit_1_date : row.compliance_audit_2_date
    const currentPct = auditNum === 1 ? row.compliance_audit_1_overall_pct : row.compliance_audit_2_overall_pct
    const currentActionPlan = auditNum === 1 ? row.action_plan_1_sent : row.action_plan_2_sent

    setEditing({
      storeId: row.id,
      auditNumber: auditNum,
      date: currentDate || new Date().toISOString().split('T')[0],
      percentage: currentPct?.toString() || '',
      actionPlan: currentActionPlan === true ? 'Yes' : currentActionPlan === false ? 'No' : undefined,
      pdfFile: null
    })
  }

  const handleCancelEdit = () => {
    setEditing(null)
  }

  const handleSaveAudit = async () => {
    if (!editing) return

    const { storeId, auditNumber, date, percentage, actionPlan, pdfFile } = editing

    // Validate
    if (!date) {
      alert('Please enter an audit date')
      return
    }
    if (!percentage || isNaN(Number(percentage))) {
      alert('Please enter a valid percentage (0-100)')
      return
    }
    const pctNum = Number(percentage)
    if (pctNum < 0 || pctNum > 100) {
      alert('Percentage must be between 0 and 100')
      return
    }
    if (!actionPlan || actionPlan === undefined) {
      alert('Please select whether action plan was sent')
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()
      
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
        } catch (uploadError) {
          console.error('PDF upload error:', uploadError)
          alert(`Failed to upload PDF: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`)
          setSaving(false)
          return
        }
      }
      
      // Build update object
      const updateData: any = {}
      
      if (auditNumber === 1) {
        updateData.compliance_audit_1_date = date
        updateData.compliance_audit_1_overall_pct = pctNum
        updateData.action_plan_1_sent = actionPlan === 'Yes'
        if (pdfPath) {
          updateData.compliance_audit_1_pdf_path = pdfPath
        }
      } else {
        updateData.compliance_audit_2_date = date
        updateData.compliance_audit_2_overall_pct = pctNum
        updateData.action_plan_2_sent = actionPlan === 'Yes'
        if (pdfPath) {
          updateData.compliance_audit_2_pdf_path = pdfPath
        }
      }

      // Calculate total_audits_to_date
      const row = localRows.find(r => r.id === storeId)
      if (row) {
        let totalAudits = 0
        // Count audit 1 if it will be complete after this save
        const audit1Complete = auditNumber === 1 ? true : (row.compliance_audit_1_date && row.compliance_audit_1_overall_pct !== null)
        if (audit1Complete) totalAudits++
        // Count audit 2 if it will be complete after this save
        const audit2Complete = auditNumber === 2 ? true : (row.compliance_audit_2_date && row.compliance_audit_2_overall_pct !== null)
        if (audit2Complete) totalAudits++
        updateData.total_audits_to_date = totalAudits
      }

      const { data, error } = await supabase
        .from('fa_stores')
        .update(updateData)
        .eq('id', storeId)
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message || 'Failed to save audit data')
      }

      if (!data) {
        throw new Error('No data returned from update')
      }

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

      setEditing(null)
      
      // Small delay before refresh to ensure state is updated
      setTimeout(() => {
        window.location.reload()
      }, 100)
    } catch (error) {
      console.error('Error saving audit:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save audit. Please try again.'
      alert(`Error: ${errorMessage}`)
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
    setPdfUploadRow(row)
    setPdfUploadFile(null)
    
    if (auditNumber) {
      // If audit number is provided, use it
      setSelectedAuditForUpload(auditNumber)
    } else {
      // Otherwise, auto-select if only one audit exists
      const hasAudit1 = !!(row.compliance_audit_1_date && row.compliance_audit_1_overall_pct !== null)
      const hasAudit2 = !!(row.compliance_audit_2_date && row.compliance_audit_2_overall_pct !== null)
      
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
    if (!pdfUploadRow || !pdfUploadFile || !selectedAuditForUpload) {
      alert('Please select an audit and PDF file')
      return
    }

    setUploadingPdf(true)
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

      setPdfUploadDialogOpen(false)
      setPdfUploadRow(null)
      setPdfUploadFile(null)
      setSelectedAuditForUpload(null)
      
      // Reset file input
      const fileInput = document.getElementById(`pdf-upload-standalone-${pdfUploadRow.id}`) as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      // Refresh page to show updated data
      setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      console.error('Error uploading PDF:', error)
      alert(`Failed to upload PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploadingPdf(false)
    }
  }

  const handleDeletePDF = async (row: AuditRow, auditNumber: 1 | 2) => {
    if (!confirm(`Are you sure you want to delete the PDF for Audit ${auditNumber}?`)) {
      return
    }

    setDeletingPdf(`${row.id}-${auditNumber}`)
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
      
      // Refresh page to show updated data from server
      window.location.reload()
    } catch (error) {
      console.error('Error deleting PDF:', error)
      alert(`Failed to delete PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeletingPdf(null)
    }
  }

  const handleOpenUpdateScore = (row: AuditRow, auditNumber: 1 | 2) => {
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
    setUpdateDialogOpen(true)
  }

  const handleUpdateScore = async () => {
    if (!updateScoreState) return

    const pctNum = Number(updateScoreState.percentage)
    if (!updateScoreState.percentage || isNaN(pctNum)) {
      alert('Please enter a valid percentage (0-100)')
      return
    }
    if (pctNum < 0 || pctNum > 100) {
      alert('Percentage must be between 0 and 100')
      return
    }

    setUpdatingScore(true)

    try {
      const supabase = createClient()
      const updateData: Record<string, number> = {}

      if (updateScoreState.auditNumber === 1) {
        updateData.compliance_audit_1_overall_pct = pctNum
      } else {
        updateData.compliance_audit_2_overall_pct = pctNum
      }

      const { data, error } = await supabase
        .from('fa_stores')
        .update(updateData)
        .eq('id', updateScoreState.storeId)
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message || 'Failed to update audit score')
      }

      if (!data) {
        throw new Error('No data returned from update')
      }

      setLocalRows(prevRows => 
        prevRows.map(row => {
          if (row.id === updateScoreState.storeId) {
            return {
              ...row,
              compliance_audit_1_overall_pct: data.compliance_audit_1_overall_pct,
              compliance_audit_2_overall_pct: data.compliance_audit_2_overall_pct,
            }
          }
          return row
        })
      )

      setUpdateDialogOpen(false)
      setUpdateScoreState(null)

      setTimeout(() => {
        window.location.reload()
      }, 100)
    } catch (error) {
      console.error('Error updating audit score:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update audit score. Please try again.'
      alert(`Error: ${errorMessage}`)
      setUpdatingScore(false)
    }
  }

  const renderDateCell = (date: string | null, pct: number | null, storeId: string, auditNum: 1 | 2, row: AuditRow) => {
    const isEditing = editing?.storeId === storeId && editing?.auditNumber === auditNum
    
    if (isEditing) {
      return (
        <Input
          type="date"
          value={editing.date}
          onChange={(e) => setEditing({ ...editing, date: e.target.value })}
          className="h-8 text-xs"
        />
      )
    }
    
    // Only show date if percentage is also present (audit is complete)
    // For audit 2, don't show date unless the audit is actually complete
    if (auditNum === 2 && pct === null) {
      return <span className="text-sm text-muted-foreground">—</span>
    }
    
    return <span className="text-sm text-muted-foreground">{formatDate(date)}</span>
  }

  const renderActionPlanCell = (value: boolean | null, storeId: string, auditNum: 1 | 2) => {
    const isEditing = editing?.storeId === storeId && editing?.auditNumber === auditNum
    
    if (isEditing) {
      return (
        <Select
          value={editing.actionPlan || undefined}
          onValueChange={(val) => setEditing({ ...editing, actionPlan: val as 'Yes' | 'No' })}
        >
          <SelectTrigger className="h-8 text-xs w-20">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Yes">Yes</SelectItem>
            <SelectItem value="No">No</SelectItem>
          </SelectContent>
        </Select>
      )
    }
    
    return boolBadge(value)
  }

  const renderPercentageCell = (value: number | null, storeId: string, auditNum: 1 | 2) => {
    const isEditing = editing?.storeId === storeId && editing?.auditNumber === auditNum
    
    if (isEditing) {
      return (
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={editing.percentage}
          onChange={(e) => setEditing({ ...editing, percentage: e.target.value })}
          className="h-8 text-xs w-20"
          placeholder="0-100"
        />
      )
    }
    
    if (value === null || value === undefined) {
      return pctBadge(value)
    }

    return (
      <button
        type="button"
        onClick={() => {
          const row = localRows.find(r => r.id === storeId)
          if (row) handleOpenUpdateScore(row, auditNum)
        }}
        className="inline-flex items-center justify-center hover:opacity-80 transition-opacity"
        title="Update audit score"
      >
        {pctBadge(value)}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Input
            placeholder="Search store name or code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 md:w-64 bg-white min-h-[44px]"
          />
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="w-full sm:w-40 bg-white min-h-[44px]">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              {areaOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={hideCompleted ? "default" : "outline"}
            onClick={() => setHideCompleted(!hideCompleted)}
            className="min-h-[44px]"
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
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filtered.length} of {localRows.length} stores
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="min-w-[1000px]">
            <Table className="w-full border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '40px' }} />
                <col style={{ width: '60px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '50px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '50px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '140px' }} />
              </colgroup>
              <TableHeader className="bg-white">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center bg-white">#</TableHead>
                  <TableHead className="bg-white">Area</TableHead>
                  <TableHead className="bg-white">Store Code</TableHead>
                  <TableHead className="bg-white">Store Name</TableHead>
                  <TableHead className="bg-white">Audit 1 Date</TableHead>
                  <TableHead className="bg-white">Action Plan 1</TableHead>
                  <TableHead className="bg-white">Audit 1 %</TableHead>
                  <TableHead className="bg-white text-center">PDF</TableHead>
                  <TableHead className="bg-white">Audit 2 Date</TableHead>
                  <TableHead className="bg-white">Action Plan 2</TableHead>
                  <TableHead className="bg-white">Audit 2 %</TableHead>
                  <TableHead className="bg-white text-center">PDF</TableHead>
                  <TableHead className="text-right pr-4 bg-white">Total Audits</TableHead>
                  <TableHead className="bg-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
            <div className="h-[70vh] overflow-y-auto">
              <Table className="w-full border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '60px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '140px' }} />
                </colgroup>
                <TableBody>
              {grouped.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center text-muted-foreground py-10">
                    No audit data found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                grouped.map(([groupKey, areaRows]) => {
                  
                  // --- CALCULATE AREA AVERAGE DYNAMICALLY ---
                  // 1. Map rows to their latest percentage
                  const validScores = areaRows
                    .map(r => getLatestPct(r))
                    .filter((score): score is number => score !== null);
                  
                  // 2. Calculate Average
                  const totalScore = validScores.reduce((acc, cur) => acc + cur, 0);
                  const calculatedAverage = validScores.length > 0 
                    ? totalScore / validScores.length 
                    : null;
                  
                  return (
                    <>
                      {/* Area Divider Row */}
                      <TableRow key={`hdr-${groupKey}`} className="bg-slate-100/80 hover:bg-slate-100/80">
                        <TableCell 
                          colSpan={14} 
                          className="py-2 px-4 bg-slate-50 border-b border-t"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-slate-700">{groupKey}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Area Average ({validScores.length} stores)
                              </span>
                              {pctBadge(calculatedAverage)}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Store Rows */}
                      {areaRows.map((row, idx) => (
                        <TableRow
                          key={row.id}
                          className="group hover:bg-slate-50 transition-colors"
                        >
                          <TableCell className="font-mono text-xs text-center text-muted-foreground border-b bg-white group-hover:bg-slate-50">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground border-b bg-white group-hover:bg-slate-50">
                            {row.region || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium border-b bg-white group-hover:bg-slate-50">
                            {row.store_code || '—'}
                          </TableCell>
                          <TableCell className="font-semibold text-sm border-b bg-white group-hover:bg-slate-50">
                            {row.store_name}
                          </TableCell>
                          
                          <TableCell className="border-b bg-white group-hover:bg-slate-50">{renderDateCell(row.compliance_audit_1_date, row.compliance_audit_1_overall_pct, row.id, 1, row)}</TableCell>
                          <TableCell className="border-b bg-white group-hover:bg-slate-50">{renderActionPlanCell(row.action_plan_1_sent, row.id, 1)}</TableCell>
                          <TableCell className="border-b bg-white group-hover:bg-slate-50">{renderPercentageCell(row.compliance_audit_1_overall_pct, row.id, 1)}</TableCell>
                          <TableCell className="border-b bg-white group-hover:bg-slate-50 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {row.compliance_audit_1_pdf_path ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewPDF(row, 1)}
                                    className="h-7 px-2"
                                    title="View Audit 1 PDF"
                                  >
                                    <File className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeletePDF(row, 1)}
                                    disabled={deletingPdf === `${row.id}-1`}
                                    className="h-7 px-1 text-red-600 hover:text-red-700"
                                    title="Delete Audit 1 PDF"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (row.compliance_audit_1_date && row.compliance_audit_1_overall_pct !== null) ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenPDFUpload(row, 1)}
                                  className="h-7 px-2 text-xs"
                                  title="Upload Audit 1 PDF"
                                >
                                  <Upload className="h-3 w-3 text-slate-500" />
                                </Button>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell className="border-b bg-white group-hover:bg-slate-50">{renderDateCell(row.compliance_audit_2_date, row.compliance_audit_2_overall_pct, row.id, 2, row)}</TableCell>
                          <TableCell className="border-b bg-white group-hover:bg-slate-50">{renderActionPlanCell(row.action_plan_2_sent, row.id, 2)}</TableCell>
                          <TableCell className="border-b bg-white group-hover:bg-slate-50">{renderPercentageCell(row.compliance_audit_2_overall_pct, row.id, 2)}</TableCell>
                          <TableCell className="border-b bg-white group-hover:bg-slate-50 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {row.compliance_audit_2_pdf_path ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewPDF(row, 2)}
                                    className="h-7 px-2"
                                    title="View Audit 2 PDF"
                                  >
                                    <File className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeletePDF(row, 2)}
                                    disabled={deletingPdf === `${row.id}-2`}
                                    className="h-7 px-1 text-red-600 hover:text-red-700"
                                    title="Delete Audit 2 PDF"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (row.compliance_audit_2_date && row.compliance_audit_2_overall_pct !== null) ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenPDFUpload(row, 2)}
                                  className="h-7 px-2 text-xs"
                                  title="Upload Audit 2 PDF"
                                >
                                  <Upload className="h-3 w-3 text-slate-500" />
                                </Button>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-right pr-4 font-mono text-xs text-muted-foreground border-b bg-white group-hover:bg-slate-50">
                            {(() => {
                              let count = 0
                              if (row.compliance_audit_1_date && row.compliance_audit_1_overall_pct !== null) count++
                              if (row.compliance_audit_2_date && row.compliance_audit_2_overall_pct !== null) count++
                              return count
                            })()}
                          </TableCell>
                          
                          <TableCell className="border-b bg-white group-hover:bg-slate-50">
                            {editing?.storeId === row.id ? (
                              <div className="flex flex-col gap-1.5 min-w-[180px]">
                                <div className="flex gap-1 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={handleSaveAudit}
                                    disabled={saving}
                                    className="h-7 px-2 text-xs whitespace-nowrap"
                                  >
                                    {saving ? 'Saving...' : 'Save'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    disabled={saving}
                                    className="h-7 px-2 text-xs whitespace-nowrap"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                                <div className="relative">
                                  <input
                                    type="file"
                                    id={`pdf-upload-${row.id}`}
                                    accept=".pdf,application/pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null
                                      if (editing) {
                                        setEditing({ ...editing, pdfFile: file })
                                      }
                                    }}
                                    className="hidden"
                                    disabled={saving}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    type="button"
                                    onClick={() => document.getElementById(`pdf-upload-${row.id}`)?.click()}
                                    disabled={saving}
                                    className="h-6 px-1.5 text-[11px] w-fit"
                                  >
                                    <Upload className="h-2.5 w-2.5 mr-1" />
                                    {editing?.pdfFile ? editing.pdfFile.name.substring(0, 12) + '...' : 'Upload PDF'}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              getNextAuditNumber(row) !== null && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddAudit(row)}
                                  className="h-7 px-2 text-xs whitespace-nowrap"
                                >
                                  Add Audit
                                </Button>
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  </div>
      
      {/* PDF Viewer Modal */}
      <PDFViewerModal
        open={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
        pdfUrl={null}
        title={selectedPdfRow ? `Audit ${selectedPdfRow.auditNumber} - ${selectedPdfRow.row.store_name}` : 'Audit PDF'}
        getDownloadUrl={handleGetPDFUrl}
      />

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
            {pdfUploadRow && 
             (pdfUploadRow.compliance_audit_1_date && pdfUploadRow.compliance_audit_1_overall_pct !== null) &&
             (pdfUploadRow.compliance_audit_2_date && pdfUploadRow.compliance_audit_2_overall_pct !== null) ? (
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

      {/* Update Score Dialog */}
      <Dialog
        open={updateDialogOpen}
        onOpenChange={(open) => {
          setUpdateDialogOpen(open)
          if (!open) {
            setUpdateScoreState(null)
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpdateDialogOpen(false)
                setUpdateScoreState(null)
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
    </div>
  )
}