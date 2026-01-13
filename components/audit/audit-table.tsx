'use client'

import { useMemo, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/auth'
import { uploadAuditPDF } from '@/app/actions/audit-pdfs'
import { Upload, FileText, Eye, EyeOff } from 'lucide-react'
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
          pdfPath = await uploadAuditPDF(storeId, auditNumber, pdfFile)
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
    
    return pctBadge(value)
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
        {/* Fixed Header - OUTSIDE scroll container on desktop, INSIDE on mobile */}
        <div className="hidden md:block border-b bg-white overflow-x-auto">
          <Table className="w-full border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '60px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '140px' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-center bg-white">#</TableHead>
                <TableHead className="bg-white">Area</TableHead>
                <TableHead className="bg-white">Store Code</TableHead>
                <TableHead className="bg-white">Store Name</TableHead>
                <TableHead className="bg-white">Audit 1 Date</TableHead>
                <TableHead className="bg-white">Action Plan 1</TableHead>
                <TableHead className="bg-white">Audit 1 %</TableHead>
                <TableHead className="bg-white">Audit 2 Date</TableHead>
                <TableHead className="bg-white">Action Plan 2</TableHead>
                <TableHead className="bg-white">Audit 2 %</TableHead>
                <TableHead className="text-right pr-4 bg-white">Total Audits</TableHead>
                <TableHead className="bg-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
        </div>

        {/* Scrollable Body - Headers inside on mobile, body only on desktop */}
        <div className="h-[70vh] overflow-y-auto overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 relative">
          {/* Mobile Header - Inside scroll container, sticky */}
          <div className="md:hidden sticky top-0 z-10 bg-white border-b">
            <Table className="w-full border-separate border-spacing-0 min-w-[1000px]" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '40px' }} />
                <col style={{ width: '60px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '140px' }} />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center bg-white">#</TableHead>
                  <TableHead className="bg-white">Area</TableHead>
                  <TableHead className="bg-white">Store Code</TableHead>
                  <TableHead className="bg-white">Store Name</TableHead>
                  <TableHead className="bg-white">Audit 1 Date</TableHead>
                  <TableHead className="bg-white">Action Plan 1</TableHead>
                  <TableHead className="bg-white">Audit 1 %</TableHead>
                  <TableHead className="bg-white">Audit 2 Date</TableHead>
                  <TableHead className="bg-white">Action Plan 2</TableHead>
                  <TableHead className="bg-white">Audit 2 %</TableHead>
                  <TableHead className="text-right pr-4 bg-white">Total Audits</TableHead>
                  <TableHead className="bg-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>
          <Table className="w-full border-separate border-spacing-0 min-w-[1000px]" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '60px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '140px' }} />
            </colgroup>
            <TableBody>
              {grouped.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-10">
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
                          colSpan={12} 
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
                          
                          <TableCell className="border-b bg-white group-hover:bg-slate-50">{renderDateCell(row.compliance_audit_2_date, row.compliance_audit_2_overall_pct, row.id, 2, row)}</TableCell>
                          <TableCell className="border-b bg-white group-hover:bg-slate-50">{renderActionPlanCell(row.action_plan_2_sent, row.id, 2)}</TableCell>
                          <TableCell className="border-b bg-white group-hover:bg-slate-50">{renderPercentageCell(row.compliance_audit_2_overall_pct, row.id, 2)}</TableCell>
                          
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
  )
}