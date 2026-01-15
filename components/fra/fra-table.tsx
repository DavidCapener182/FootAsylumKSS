'use client'

import { useMemo, useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/auth'
import { uploadFRAPDF, getFRAPDFDownloadUrl, deleteFRAPDF } from '@/app/actions/fra-pdfs'
import { updateFRA } from '@/app/actions/stores'
import { Upload, FileText, Eye, EyeOff, Download, File, Trash2 } from 'lucide-react'
import { PDFViewerModal } from '@/components/shared/pdf-viewer-modal'
import { 
  FRARow, 
  formatDate,
  calculateNextDueDate,
  getFRAStatus,
  getDaysUntilDue,
  statusBadge,
  storeNeedsFRA,
  pctBadge
} from './fra-table-helpers'

// Re-export for backward compatibility
export type { FRARow }

interface EditState {
  storeId: string
  date: string
  percentage: string
  notes: string
  pdfFile: File | null
}

export function FRATable({ 
  rows, 
  userRole, 
  areaFilter: externalAreaFilter, 
  onAreaFilterChange 
}: { 
  rows: FRARow[]
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
  const [localRows, setLocalRows] = useState<FRARow[]>(rows)
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [selectedPdfRow, setSelectedPdfRow] = useState<FRARow | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null)
  const [deletingPdf, setDeletingPdf] = useState<string | null>(null)

  // Sync localRows with rows prop when it changes
  useEffect(() => {
    setLocalRows(rows)
  }, [rows])

  const areaOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.region && set.add(r.region))
    return Array.from(set).sort()
  }, [rows])

  // Filter stores that need FRA (not completed yet - completed ones go to separate tab)
  const filtered = useMemo(() => {
    return localRows.filter((row) => {
      const needsFRA = storeNeedsFRA(row)
      const status = getFRAStatus(row.fire_risk_assessment_date, needsFRA)
      
      // Only show stores that need FRA and are NOT "up_to_date"
      // "Up to date" stores should go to the Completed tab
      if (!needsFRA) return false
      if (status === 'up_to_date') return false // Up to date FRAs go to the Completed tab
      
      const matchesArea = area === 'all' || row.region === area
      const term = search.trim().toLowerCase()
      const matchesSearch =
        term.length === 0 ||
        row.store_name.toLowerCase().includes(term) ||
        (row.store_code || '').toLowerCase().includes(term)
      
      return matchesArea && matchesSearch
    })
  }, [localRows, area, search])
  
  // Debug: Log stores that need FRA
  useMemo(() => {
    const currentYear = new Date().getFullYear()
    const storesNeedingFRA = localRows.filter(row => storeNeedsFRA(row))
    const storesUpToDate = localRows.filter(row => {
      const needsFRA = storeNeedsFRA(row)
      const status = getFRAStatus(row.fire_risk_assessment_date, needsFRA)
      return status === 'up_to_date'
    })
    const storesInRequiredTab = localRows.filter(row => {
      const needsFRA = storeNeedsFRA(row)
      const status = getFRAStatus(row.fire_risk_assessment_date, needsFRA)
      return needsFRA && status !== 'up_to_date'
    })
    console.log('FRA Debug - Required Tab:', {
      currentYear,
      totalStores: localRows.length,
      storesNeedingFRA: storesNeedingFRA.length,
      storesUpToDate: storesUpToDate.length,
      storesInRequiredTab: storesInRequiredTab.length,
      sampleRequired: storesInRequiredTab.slice(0, 3).map(s => {
        const needsFRA = storeNeedsFRA(s)
        const status = getFRAStatus(s.fire_risk_assessment_date, needsFRA)
        return {
          name: s.store_name,
          code: s.store_code,
          hasDate: s.fire_risk_assessment_date !== null,
          hasPct: s.fire_risk_assessment_pct !== null,
          needsFRA,
          status
        }
      })
    })
  }, [localRows])

  const grouped = useMemo(() => {
    const map = new Map<string, FRARow[]>()
    
    // 1. Group by Region
    filtered.forEach((row) => {
      const key = row.region || 'Unassigned'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    })

    // 2. Sort STORES within each area by status (overdue first, then due, then up to date)
    map.forEach((storeRows) => {
      storeRows.sort((a, b) => {
        const needsA = storeNeedsFRA(a)
        const needsB = storeNeedsFRA(b)
        const statusA = getFRAStatus(a.fire_risk_assessment_date, needsA)
        const statusB = getFRAStatus(b.fire_risk_assessment_date, needsB)
        
        const statusOrder = { 'overdue': 0, 'due': 1, 'required': 2, 'up_to_date': 3, 'not_required': 4 }
        const orderA = statusOrder[statusA] ?? 4
        const orderB = statusOrder[statusB] ?? 4
        
        if (orderA !== orderB) return orderA - orderB
        
        // Same status, sort by store name
        return a.store_name.localeCompare(b.store_name)
      })
    })

    // 3. Sort AREAS alphabetically
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const handleAddFRA = (row: FRARow) => {
    setEditing({
      storeId: row.id,
      date: row.fire_risk_assessment_date || new Date().toISOString().split('T')[0],
      percentage: row.fire_risk_assessment_pct?.toString() || '',
      notes: row.fire_risk_assessment_notes || '',
      pdfFile: null
    })
  }

  const handleCancelEdit = () => {
    setEditing(null)
  }

  const handleSaveFRA = async () => {
    if (!editing) return

    const { storeId, date, percentage, notes, pdfFile } = editing

    // Validate
    if (!date) {
      alert('Please enter an FRA date')
      return
    }
    
    // Validate percentage if provided
    let pctNum: number | null = null
    if (percentage && percentage.trim() !== '') {
      pctNum = Number(percentage)
      if (isNaN(pctNum) || pctNum < 0 || pctNum > 100) {
        alert('Percentage must be between 0 and 100')
        return
      }
    }

    setSaving(true)

    try {
      // Upload PDF if provided
      let pdfPath: string | null = null
      if (pdfFile) {
        try {
          // Use FormData to upload via API route
          const formData = new FormData()
          formData.append('storeId', storeId)
          formData.append('file', pdfFile)

          const response = await fetch('/api/fra-pdfs/upload', {
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

      // Update FRA data
      await updateFRA(storeId, date, notes || null, pctNum, pdfPath)

      // Update local state
      setLocalRows(prevRows => 
        prevRows.map(row => {
          if (row.id === storeId) {
            return {
              ...row,
              fire_risk_assessment_date: date,
              fire_risk_assessment_pct: pctNum,
              fire_risk_assessment_notes: notes || null,
              fire_risk_assessment_pdf_path: pdfPath || row.fire_risk_assessment_pdf_path,
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
      console.error('Error saving FRA:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save FRA. Please try again.'
      alert(`Error: ${errorMessage}`)
      setSaving(false)
    }
  }

  const handleViewPDF = (row: FRARow) => {
    if (!row.fire_risk_assessment_pdf_path) return
    setSelectedPdfRow(row)
    setPdfViewerOpen(true)
  }

  const handleGetPDFUrl = async () => {
    if (!selectedPdfRow?.fire_risk_assessment_pdf_path) return null
    try {
      return await getFRAPDFDownloadUrl(selectedPdfRow.fire_risk_assessment_pdf_path)
    } catch (error) {
      console.error('Error fetching PDF URL:', error)
      return null
    }
  }

  const handleUploadPDFStandalone = async (row: FRARow, file: File) => {
    setUploadingPdf(row.id)
    try {
      // Use FormData to upload via API route
      const formData = new FormData()
      formData.append('storeId', row.id)
      formData.append('file', file)

      const response = await fetch('/api/fra-pdfs/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload PDF')
      }

      // Update local state
      setLocalRows(prevRows => prevRows.map(r => {
        if (r.id === row.id) {
          return { ...r, fire_risk_assessment_pdf_path: result.filePath }
        }
        return r
      }))
      
      // Refresh page to show updated data
      setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      console.error('Error uploading PDF:', error)
      alert(`Failed to upload PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploadingPdf(null)
    }
  }

  const handleDeletePDF = async (row: FRARow) => {
    if (!confirm('Are you sure you want to delete the Fire Risk Assessment PDF?')) {
      return
    }

    setDeletingPdf(row.id)
    try {
      await deleteFRAPDF(row.id)
      
      // Update local state immediately - clear PDF and all FRA data
      setLocalRows(prevRows => prevRows.map(r => {
        if (r.id === row.id) {
          return { 
            ...r, 
            fire_risk_assessment_pdf_path: null,
            fire_risk_assessment_date: null,
            fire_risk_assessment_pct: null,
            fire_risk_assessment_notes: null
          }
        }
        return r
      }))
      
      // Close PDF viewer if it's open for this row
      if (selectedPdfRow?.id === row.id) {
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

  const renderDateCell = (date: string | null, storeId: string) => {
    const isEditing = editing?.storeId === storeId
    
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
    
    return <span className="text-sm text-muted-foreground">{formatDate(date)}</span>
  }

  const renderNotesCell = (notes: string | null, storeId: string) => {
    const isEditing = editing?.storeId === storeId
    
    if (isEditing) {
      return (
        <Textarea
          value={editing.notes}
          onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
          className="h-16 text-xs min-w-[200px]"
          placeholder="Optional notes..."
        />
      )
    }
    
    return (
      <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
        {notes || '—'}
      </span>
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
                <col style={{ width: '180px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '200px' }} />
              </colgroup>
              <TableHeader className="bg-white">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center bg-white">#</TableHead>
                  <TableHead className="bg-white">Area</TableHead>
                  <TableHead className="bg-white">Store Code</TableHead>
                  <TableHead className="bg-white">Store Name</TableHead>
                  <TableHead className="bg-white">Last FRA Date</TableHead>
                  <TableHead className="bg-white">Next Due Date</TableHead>
                  <TableHead className="bg-white">Status</TableHead>
                  <TableHead className="bg-white">%</TableHead>
                  <TableHead className="bg-white">PDF</TableHead>
                  <TableHead className="bg-white">Notes</TableHead>
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
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '200px' }} />
                </colgroup>
                <TableBody>
              {grouped.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-10">
                    No FRA data found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                grouped.map(([groupKey, areaRows]) => {
                  return (
                    <>
                      {/* Area Divider Row */}
                      <TableRow key={`hdr-${groupKey}`} className="bg-slate-100/80 hover:bg-slate-100/80">
                        <TableCell 
                          colSpan={11} 
                          className="py-2 px-4 bg-slate-50 border-b border-t"
                        >
                          <span className="font-bold text-slate-700">{groupKey}</span>
                        </TableCell>
                      </TableRow>

                      {/* Store Rows */}
                      {areaRows.map((row, idx) => {
                        const needsFRA = storeNeedsFRA(row)
                        const status = getFRAStatus(row.fire_risk_assessment_date, needsFRA)
                        const days = getDaysUntilDue(row.fire_risk_assessment_date)
                        const nextDue = calculateNextDueDate(row.fire_risk_assessment_date)
                        
                        return (
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
                            
                            <TableCell className="border-b bg-white group-hover:bg-slate-50">
                              {renderDateCell(row.fire_risk_assessment_date, row.id)}
                            </TableCell>
                            
                            <TableCell className="border-b bg-white group-hover:bg-slate-50">
                              <span className="text-sm text-muted-foreground">
                                {nextDue ? formatDate(nextDue.toISOString().split('T')[0]) : '—'}
                              </span>
                            </TableCell>
                            
                            <TableCell className="border-b bg-white group-hover:bg-slate-50">
                              {statusBadge(status, days)}
                            </TableCell>
                            
                            <TableCell className="border-b bg-white group-hover:bg-slate-50">
                              {editing?.storeId === row.id ? (
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
                              ) : (
                                pctBadge(row.fire_risk_assessment_pct)
                              )}
                            </TableCell>
                            
                            <TableCell className="border-b bg-white group-hover:bg-slate-50">
                              <div className="flex items-center gap-1">
                                {row.fire_risk_assessment_pdf_path ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleViewPDF(row)}
                                      className="h-7 px-2 text-xs"
                                      title="View PDF"
                                    >
                                      <File className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeletePDF(row)}
                                      disabled={deletingPdf === row.id}
                                      className="h-7 px-1 text-red-600 hover:text-red-700"
                                      title="Delete PDF"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                ) : (row.fire_risk_assessment_date || row.fire_risk_assessment_pct !== null) ? (
                                  <div className="relative">
                                    <input
                                      type="file"
                                      id={`pdf-upload-fra-${row.id}`}
                                      accept=".pdf,application/pdf"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0] || null
                                        if (file) {
                                          handleUploadPDFStandalone(row, file)
                                        }
                                      }}
                                      className="hidden"
                                      disabled={uploadingPdf === row.id}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => document.getElementById(`pdf-upload-fra-${row.id}`)?.click()}
                                      disabled={uploadingPdf === row.id}
                                      className="h-7 px-2 text-xs"
                                      title="Upload PDF"
                                    >
                                      {uploadingPdf === row.id ? (
                                        <span className="text-xs">Uploading...</span>
                                      ) : (
                                        <Upload className="h-3 w-3 text-slate-500" />
                                      )}
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </div>
                            </TableCell>
                            
                            <TableCell className="border-b bg-white group-hover:bg-slate-50">
                              {renderNotesCell(row.fire_risk_assessment_notes, row.id)}
                            </TableCell>
                            
                            <TableCell className="border-b bg-white group-hover:bg-slate-50">
                              {editing?.storeId === row.id ? (
                                <div className="flex flex-col gap-1.5 min-w-[180px]">
                                  <div className="flex gap-1 flex-wrap">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={handleSaveFRA}
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
                                // In Required tab, all stores need FRA and haven't completed it, so always show button
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddFRA(row)}
                                  className="h-7 px-2 text-xs whitespace-nowrap"
                                >
                                  {row.fire_risk_assessment_date ? 'Edit FRA' : 'Add FRA'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
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
        title={selectedPdfRow ? `Fire Risk Assessment - ${selectedPdfRow.store_name}` : 'Fire Risk Assessment PDF'}
        getDownloadUrl={handleGetPDFUrl}
      />
    </div>
  )
}
