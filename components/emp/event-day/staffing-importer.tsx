'use client'

import { useMemo, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StaffingImportPreviewTable } from '@/components/emp/event-day/staffing-import-preview-table'
import type { EmpEventStaffingImportPreview } from '@/lib/emp/event-day-import'
import type { EmpEventImportMapping, EmpEventStaffingImportMode } from '@/lib/emp/event-day-schema'

const MAPPING_FIELDS: Array<{ key: keyof EmpEventImportMapping; label: string; required?: boolean }> = [
  { key: 'staffName', label: 'Staff name', required: true },
  { key: 'agency', label: 'Agency / employer' },
  { key: 'position', label: 'Position' },
  { key: 'area', label: 'Area / zone' },
  { key: 'shiftStart', label: 'Shift start' },
  { key: 'shiftEnd', label: 'Shift end' },
  { key: 'siaBadgeNumber', label: 'SIA badge' },
  { key: 'siaExpiryDate', label: 'SIA expiry' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'notes', label: 'Notes' },
]

export function StaffingImporter({
  planId,
  onImported,
}: {
  planId: string
  onImported: (data: any) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<EmpEventStaffingImportPreview | null>(null)
  const [mapping, setMapping] = useState<Partial<EmpEventImportMapping>>({})
  const [mode, setMode] = useState<EmpEventStaffingImportMode>('add')
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const headers = useMemo(() => preview?.headers || [], [preview])
  const isMasterDeploymentPreview = preview?.sourceType === 'master_deployment_xlsx'

  function isMasterDeploymentFile(nextFile: File | null) {
    const name = nextFile?.name.toLowerCase() || ''
    return name.endsWith('.xlsx') || name.endsWith('.xlsm') || nextFile?.type.includes('spreadsheet')
  }

  async function previewFile(nextMapping = mapping) {
    if (!file) return
    setIsBusy(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.set('file', file)
      if (Object.keys(nextMapping).length) formData.set('mapping', JSON.stringify(nextMapping))
      const response = await fetch(`/api/emp/event-day/${planId}/staffing/preview`, {
        method: 'POST',
        body: formData,
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Preview failed')
      setPreview(body)
      setMapping(body.mapping)
    } catch (error: any) {
      setMessage(error?.message || 'Preview failed')
    } finally {
      setIsBusy(false)
    }
  }

  async function commitImport() {
    if (!file || !preview) return
    setIsBusy(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.set('file', file)
      formData.set('mapping', JSON.stringify(mapping))
      formData.set('mode', mode)
      const response = await fetch(`/api/emp/event-day/${planId}/staffing/import`, {
        method: 'POST',
        body: formData,
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Import failed')
      setMessage(`Imported ${body.importedCount} staff rows. Skipped ${body.skippedCount}.`)
      setPreview(null)
      setFile(null)
      onImported(body.data)
    } catch (error: any) {
      setMessage(error?.message || 'Import failed')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="event-day-staffing-file">Staffing file</Label>
          <Input
            id="event-day-staffing-file"
            type="file"
            accept=".csv,text/csv,.xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null
              setFile(nextFile)
              setPreview(null)
              setMapping({})
              setMode(isMasterDeploymentFile(nextFile) ? 'replace_unstarted' : 'add')
            }}
          />
          <p className="text-xs text-slate-500">
            Upload the master deployment workbook to use the MASTER tab day-by-day, or upload a CSV for manual mapping.
          </p>
        </div>
        <Button type="button" onClick={() => previewFile()} disabled={!file || isBusy}>
          <Upload className="mr-2 h-4 w-4" />
          Preview
        </Button>
      </div>

      {preview ? (
        <div className="space-y-4">
          {isMasterDeploymentPreview ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="mb-3 text-sm font-semibold text-emerald-900">
                {preview.sourceLabel || 'Master deployment workbook'} detected. Event Day will import only rows with a named person and a shift time.
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {(preview.dayCounts || []).map((day) => (
                  <div key={day.date} className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                    <div className="font-bold text-slate-950">{day.label}</div>
                    <div className="text-slate-600">{day.validCount} named shifts</div>
                    {day.skippedBlankNameCount ? (
                      <div className="text-xs text-amber-700">{day.skippedBlankNameCount} blank-name rows skipped</div>
                    ) : null}
                    {day.skippedNoShowCount ? (
                      <div className="text-xs text-amber-700">{day.skippedNoShowCount} no-show rows skipped</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {MAPPING_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}{field.required ? ' *' : ''}</Label>
                  <Select
                    value={mapping[field.key] || '__none'}
                    onValueChange={(value) => {
                      const nextMapping = {
                        ...mapping,
                        [field.key]: value === '__none' ? null : value,
                      }
                      setMapping(nextMapping)
                      void previewFile(nextMapping)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not mapped" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Not mapped</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={`${field.key}-${header}`} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 rounded-lg bg-slate-50 p-3 text-sm md:grid-cols-4">
            <div><strong>{preview.rowCount}</strong> rows</div>
            <div><strong>{preview.validRows.length}</strong> valid</div>
            <div><strong>{preview.errorCount}</strong> with errors</div>
            <div><strong>{preview.duplicateCount}</strong> duplicates flagged</div>
          </div>

          <StaffingImportPreviewTable preview={preview} />

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Select value={mode} onValueChange={(value) => setMode(value as EmpEventStaffingImportMode)}>
              <SelectTrigger className="w-full md:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add to existing roster</SelectItem>
                <SelectItem value="replace_unstarted">Replace existing unstarted roster</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" onClick={commitImport} disabled={isBusy || preview.validRows.length === 0}>
              Confirm import
            </Button>
          </div>
        </div>
      ) : null}

      {message ? <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</div> : null}
    </div>
  )
}
