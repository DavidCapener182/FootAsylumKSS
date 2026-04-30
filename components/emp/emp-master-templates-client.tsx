'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ClipboardCheck,
  Download,
  Edit3,
  Eye,
  FileText,
  Map,
  MessageSquare,
  Phone,
  Printer,
  Radio,
  ScrollText,
  Shield,
  Clock,
  UserMinus,
  Users,
  Save,
  Trash2,
} from 'lucide-react'
import { EmpMasterTemplateDocument } from '@/components/emp/emp-master-template-document'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  EMP_MASTER_TEMPLATES,
  groupEmpMasterTemplatesByCategory,
  type EmpMasterTemplateDefinition,
  type EmpMasterTemplateIconKey,
} from '@/lib/emp/master-templates'
import { cn } from '@/lib/utils'

const TEMPLATE_GROUPS = groupEmpMasterTemplatesByCategory()
const PREFILL_STORAGE_KEY = 'emp-master-template-prefill-v1'

type EmpMasterTemplateEventProfile = {
  id: string
  event_name: string
  event_date: string | null
  prefill_data: {
    eventName?: string
    eventDate?: string
    templateFieldValues?: Record<string, Record<string, string>>
    templateTableCellValues?: Record<string, Record<string, string>>
  } | null
}

const iconMap: Record<EmpMasterTemplateIconKey, typeof Shield> = {
  shield: Shield,
  radio: Radio,
  users: ClipboardCheck,
  list: ScrollText,
  alert: AlertTriangle,
  map: Map,
  phone: Phone,
  clock: Clock,
  message: MessageSquare,
  clipboard: ClipboardCheck,
  'user-minus': UserMinus,
  eye: Eye,
  document: FileText,
  team: Users,
}

export function EmpMasterTemplatesClient() {
  const [activeTemplateId, setActiveTemplateId] = useState(EMP_MASTER_TEMPLATES[0]?.id ?? '')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [templateFieldValues, setTemplateFieldValues] = useState<Record<string, Record<string, string>>>({})
  const [templateTableCellValues, setTemplateTableCellValues] = useState<Record<string, Record<string, string>>>({})
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
  const [isBulkDownloading, setIsBulkDownloading] = useState(false)
  const [eventProfiles, setEventProfiles] = useState<EmpMasterTemplateEventProfile[]>([])
  const [activeEventProfileId, setActiveEventProfileId] = useState('')
  const [isSavingEventProfile, setIsSavingEventProfile] = useState(false)

  const activeTemplate = useMemo<EmpMasterTemplateDefinition | null>(
    () => EMP_MASTER_TEMPLATES.find((template) => template.id === activeTemplateId) ?? EMP_MASTER_TEMPLATES[0] ?? null,
    [activeTemplateId]
  )

  const templateInputLabels = (() => {
    if (!activeTemplate) return []
    if (activeTemplate.kind === 'table') return activeTemplate.infoFields.map((field) => field.label)
    if (activeTemplate.kind === 'narrative_form') return activeTemplate.headerFields.map((field) => field.label)
    if (activeTemplate.kind === 'incident_form' || activeTemplate.kind === 'emergency_action_plan' || activeTemplate.kind === 'suspicious_item_report') {
      return activeTemplate.infoRows.flatMap((row) => [row[0], row[1]])
    }
    return []
  })()

  const uniqueTemplateInputLabels = Array.from(new Set(templateInputLabels.map((label) => String(label || '').trim()).filter(Boolean)))
  const activeTemplateFields = activeTemplate ? templateFieldValues[activeTemplate.id] || {} : {}

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFILL_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        eventName?: string
        eventDate?: string
        templateFieldValues?: Record<string, Record<string, string>>
        templateTableCellValues?: Record<string, Record<string, string>>
      }
      if (typeof parsed.eventName === 'string') setEventName(parsed.eventName)
      if (typeof parsed.eventDate === 'string') setEventDate(parsed.eventDate)
      if (parsed.templateFieldValues && typeof parsed.templateFieldValues === 'object') {
        setTemplateFieldValues(parsed.templateFieldValues)
      }
      if (parsed.templateTableCellValues && typeof parsed.templateTableCellValues === 'object') {
        setTemplateTableCellValues(parsed.templateTableCellValues)
      }
    } catch {
      // ignore invalid local state
    }
  }, [])

  const loadEventProfiles = async () => {
    const response = await fetch('/api/emp/master-templates/events', { cache: 'no-store' })
    if (!response.ok) return
    const payload = await response.json().catch(() => ({}))
    const profiles = Array.isArray(payload?.events) ? payload.events : []
    setEventProfiles(profiles)
  }

  useEffect(() => {
    loadEventProfiles().catch(() => {})
  }, [])

  useEffect(() => {
    const payload = JSON.stringify({
      eventName,
      eventDate,
      templateFieldValues,
      templateTableCellValues,
    })
    window.localStorage.setItem(PREFILL_STORAGE_KEY, payload)
  }, [eventDate, eventName, templateFieldValues, templateTableCellValues])

  if (!activeTemplate) {
    return null
  }

  const updateActiveTemplateField = (label: string, value: string) => {
    setTemplateFieldValues((previous) => ({
      ...previous,
      [activeTemplate.id]: {
        ...(previous[activeTemplate.id] || {}),
        [label]: value,
      },
    }))
  }

  const getPrefillPayloadForActiveTemplate = () => ({
    eventName: eventName.trim(),
    eventDate,
    fields: activeTemplateFields,
    tableCells: templateTableCellValues[activeTemplate.id] || {},
  })

  const getPrefillPayloadForLinks = () => ({
    eventName: eventName.trim(),
    eventDate,
    fields: activeTemplateFields,
  })

  const updateActiveTemplateTableCell = (rowIndex: number, columnKey: string, value: string) => {
    const cellKey = `${rowIndex}:${columnKey}`
    setTemplateTableCellValues((previous) => ({
      ...previous,
      [activeTemplate.id]: {
        ...(previous[activeTemplate.id] || {}),
        [cellKey]: value,
      },
    }))
  }

  const buildTemplateHrefForTemplate = (basePath: string, templateId: string) => {
    const params = new URLSearchParams({ templateId })
    const prefillPayload = {
      eventName: eventName.trim(),
      eventDate,
      fields: templateFieldValues[templateId] || {},
    }
    params.set('prefill', JSON.stringify(prefillPayload))

    return `${basePath}?${params.toString()}`
  }

  const buildTemplateHref = (basePath: string) => buildTemplateHrefForTemplate(basePath, activeTemplate.id)

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplateIds((previous) =>
      previous.includes(templateId) ? previous.filter((id) => id !== templateId) : [...previous, templateId]
    )
  }

  const openBulkModal = () => {
    setSelectedTemplateIds((previous) => (previous.length ? previous : [activeTemplate.id]))
    setBulkModalOpen(true)
  }

  const selectAllTemplates = () => {
    setSelectedTemplateIds(EMP_MASTER_TEMPLATES.map((template) => template.id))
  }

  const clearTemplateSelection = () => {
    setSelectedTemplateIds([])
  }

  const openSelectedPrintViews = () => {
    selectedTemplateIds.forEach((templateId) => {
      window.open(buildTemplateHrefForTemplate('/print/emp-master-template', templateId), '_blank', 'noopener,noreferrer')
    })
  }

  const downloadSelectedPdfs = async () => {
    if (!selectedTemplateIds.length || isBulkDownloading) return
    setIsBulkDownloading(true)
    try {
      const response = await fetch('/api/emp/master-templates/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateIds: selectedTemplateIds,
          prefill: {
            eventName: eventName.trim(),
            eventDate,
            templateFieldValues,
            templateTableCellValues,
          },
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to prepare selected PDFs for download')
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('Content-Disposition') || ''
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i)
      const filename = filenameMatch?.[1] || 'emp-master-templates.zip'
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      window.alert(error?.message || 'Failed to prepare selected PDFs for download')
    } finally {
      setIsBulkDownloading(false)
    }
  }

  const hasBulkSelection = selectedTemplateIds.length > 0

  const applyEventProfile = (profileId: string) => {
    setActiveEventProfileId(profileId)
    const profile = eventProfiles.find((item) => item.id === profileId)
    if (!profile) return
    const prefill = profile.prefill_data || {}
    setEventName(String(prefill.eventName || profile.event_name || ''))
    setEventDate(String(prefill.eventDate || profile.event_date || ''))
    if (prefill.templateFieldValues && typeof prefill.templateFieldValues === 'object') {
      setTemplateFieldValues(prefill.templateFieldValues)
    }
    if (prefill.templateTableCellValues && typeof prefill.templateTableCellValues === 'object') {
      setTemplateTableCellValues(prefill.templateTableCellValues)
    }
  }

  const saveEventProfile = async () => {
    const trimmedEventName = eventName.trim()
    if (!trimmedEventName) {
      window.alert('Please add an event name before saving.')
      return
    }

    setIsSavingEventProfile(true)
    try {
      const response = await fetch('/api/emp/master-templates/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeEventProfileId || undefined,
          eventName: trimmedEventName,
          eventDate: eventDate || null,
          prefillData: {
            eventName: trimmedEventName,
            eventDate,
            templateFieldValues,
            templateTableCellValues,
          },
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save event profile')
      }

      setActiveEventProfileId(String(payload?.event?.id || ''))
      await loadEventProfiles()
    } catch (error: any) {
      window.alert(error?.message || 'Failed to save event profile')
    } finally {
      setIsSavingEventProfile(false)
    }
  }

  const deleteEventProfile = async () => {
    if (!activeEventProfileId) return
    if (!window.confirm('Delete this saved EMP event profile?')) return

    try {
      const response = await fetch(`/api/emp/master-templates/events?id=${encodeURIComponent(activeEventProfileId)}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to delete event profile')
      }
      setActiveEventProfileId('')
      await loadEventProfiles()
    } catch (error: any) {
      window.alert(error?.message || 'Failed to delete event profile')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Master Templates</h1>
                <Badge variant="outline">{EMP_MASTER_TEMPLATES.length} documents</Badge>
              </div>
              <p className="max-w-3xl text-sm text-slate-600">
                Blank event-day plans, checklists, logs, and briefing sheets ready for live-event printing.
              </p>
            </div>
            <a
              href={buildTemplateHref('/api/emp/master-templates/generate-pdf')}
              className={cn(buttonVariants({ variant: 'default' }), 'bg-emerald-700 hover:bg-emerald-800')}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Active PDF
            </a>
            <Button type="button" variant="outline" onClick={openBulkModal}>
              <Printer className="mr-2 h-4 w-4" />
              Select Documents
            </Button>
          </div>

          <div className="grid gap-3 rounded-md border border-emerald-200 bg-white/80 p-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="emp-master-template-event-profile" className="text-xs uppercase tracking-[0.12em] text-slate-600">
                Saved EMP Event Profile
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  id="emp-master-template-event-profile"
                  value={activeEventProfileId}
                  onChange={(event) => applyEventProfile(event.target.value)}
                  className="h-10 min-w-[260px] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">New event profile</option>
                  {eventProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.event_name}
                      {profile.event_date ? ` - ${profile.event_date}` : ''}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" onClick={saveEventProfile} disabled={isSavingEventProfile}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSavingEventProfile ? 'Saving...' : 'Save Event'}
                </Button>
                <Button type="button" variant="outline" onClick={deleteEventProfile} disabled={!activeEventProfileId}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="emp-master-template-event-name" className="text-xs uppercase tracking-[0.12em] text-slate-600">
                Event Name
              </Label>
              <Input
                id="emp-master-template-event-name"
                value={eventName}
                onChange={(event) => {
                  const value = event.target.value
                  setEventName(value)
                  const eventLikeLabels = uniqueTemplateInputLabels.filter((label) => label.toLowerCase().includes('event'))
                  eventLikeLabels.forEach((label) => updateActiveTemplateField(label, value))
                }}
                placeholder="e.g. Footasylum Summer Event"
                className="h-10 min-h-0 rounded-md bg-white"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="emp-master-template-event-date" className="text-xs uppercase tracking-[0.12em] text-slate-600">
                Date
              </Label>
              <Input
                id="emp-master-template-event-date"
                type="date"
                value={eventDate}
                onChange={(event) => {
                  const value = event.target.value
                  setEventDate(value)
                  const dateLikeLabels = uniqueTemplateInputLabels.filter((label) => label.toLowerCase().includes('date'))
                  dateLikeLabels.forEach((label) => updateActiveTemplateField(label, value))
                }}
                className="h-10 min-h-0 rounded-md bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
        <aside className="overflow-hidden rounded-lg border border-slate-200 bg-white xl:sticky xl:top-6 xl:flex xl:max-h-[calc(100vh-3rem)] xl:flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Event Management
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Event Documents</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Choose a master document, then print or download the PDF when you need it.
            </p>
          </div>

          <div className="px-3 py-4 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain">
            {TEMPLATE_GROUPS.map((group) => (
              <div key={group.category} className="mb-5 last:mb-0">
                <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {group.category}
                </div>

                <div className="space-y-1">
                  {group.templates.map((template) => {
                    const Icon = iconMap[template.icon]
                    const isActive = template.id === activeTemplate.id

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setActiveTemplateId(template.id)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors',
                          isActive
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border',
                            isActive
                              ? 'border-emerald-200 bg-white text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-500'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-950">{template.title}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">{template.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-950">{activeTemplate.title}</h2>
                  <Badge variant="outline">{activeTemplate.category}</Badge>
                  <Badge variant="secondary">
                    {activeTemplate.orientation === 'landscape' ? 'A4 Landscape' : 'A4 Portrait'}
                  </Badge>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">{activeTemplate.description}</p>
                <p className="text-sm font-medium text-slate-500">{activeTemplate.filename}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setDetailsModalOpen(true)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Document Details
                </Button>
                <a
                  href={buildTemplateHref('/print/emp-master-template')}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: 'outline' }))}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print / Save as PDF
                </a>
                <a
                  href={buildTemplateHref('/api/emp/master-templates/generate-pdf')}
                  className={cn(buttonVariants({ variant: 'default' }), 'bg-emerald-700 hover:bg-emerald-800')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </a>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
              Live Preview
            </div>
            <div className="overflow-auto bg-slate-200 p-4 md:p-6">
              <EmpMasterTemplateDocument
                template={activeTemplate}
                prefillValues={getPrefillPayloadForActiveTemplate()}
              />
            </div>
          </section>
        </div>
      </div>

      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="md:max-w-[96vw] md:w-[96vw] lg:max-w-[95vw] lg:w-[95vw] xl:max-w-[92vw] xl:w-[92vw]">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>
              Add template-specific details for {activeTemplate.title}. These values are saved locally and used in preview, print, and PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            {uniqueTemplateInputLabels.length ? (
              uniqueTemplateInputLabels.map((label) => {
                const inputId = `emp-template-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                const lowerLabel = label.toLowerCase()
                const isDateField = lowerLabel.includes('date')
                return (
                  <div key={label} className="space-y-2">
                    <Label htmlFor={inputId} className="text-xs uppercase tracking-[0.08em] text-slate-600">
                      {label}
                    </Label>
                    <Input
                      id={inputId}
                      type={isDateField ? 'date' : 'text'}
                      value={activeTemplateFields[label] || ''}
                      onChange={(event) => {
                        const value = event.target.value
                        updateActiveTemplateField(label, value)
                        if (lowerLabel.includes('event')) setEventName(value)
                        if (isDateField) setEventDate(value)
                      }}
                      className="h-10 min-h-0 rounded-md bg-white"
                    />
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-slate-600">No additional fields are defined for this template.</p>
            )}
          </div>

          {activeTemplate.kind === 'table' ? (
            <div className="space-y-3 rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Table Cells (optional)</p>
              <div className="max-h-[62vh] overflow-auto rounded-md border border-slate-200">
                <table className="w-full min-w-[1400px] border-collapse text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-left font-semibold text-slate-700">
                        Row
                      </th>
                      {activeTemplate.columns.map((column) => (
                        <th key={column.key} className="border-b border-slate-200 px-2 py-2 text-left font-semibold text-slate-700">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: activeTemplate.emptyRows }).map((_, rowIndex) => (
                      <tr key={`modal-row-${rowIndex}`} className="align-top">
                        <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-2 py-2 font-medium text-slate-600">
                          {rowIndex + 1}
                        </td>
                        {activeTemplate.columns.map((column) => {
                          const cellKey = `${rowIndex}:${column.key}`
                          return (
                            <td key={`modal-cell-${rowIndex}-${column.key}`} className="border-l border-slate-100 px-1 py-1">
                              <Input
                                value={(templateTableCellValues[activeTemplate.id] || {})[cellKey] || ''}
                                onChange={(event) => updateActiveTemplateTableCell(rowIndex, column.key, event.target.value)}
                                className="h-9 min-h-0 rounded-md bg-white text-xs"
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" onClick={() => setDetailsModalOpen(false)}>
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Documents</DialogTitle>
            <DialogDescription>
              Choose the templates you want to print or download. Event details you entered are applied automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAllTemplates}>
              Select all
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearTemplateSelection}>
              Clear
            </Button>
            <span className="text-sm text-slate-500">{selectedTemplateIds.length} selected</span>
          </div>

          <div className="max-h-[48vh] overflow-auto rounded-md border border-slate-200">
            <div className="divide-y divide-slate-100">
              {EMP_MASTER_TEMPLATES.map((template) => {
                const checked = selectedTemplateIds.includes(template.id)
                const checkboxId = `emp-bulk-${template.id}`
                return (
                  <label key={template.id} htmlFor={checkboxId} className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-slate-50">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTemplateSelection(template.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{template.title}</p>
                      <p className="text-xs text-slate-500">{template.documentCode} - {template.filename}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={openSelectedPrintViews} disabled={!hasBulkSelection}>
              <Printer className="mr-2 h-4 w-4" />
              Print selected
            </Button>
            <Button type="button" onClick={downloadSelectedPdfs} disabled={!hasBulkSelection || isBulkDownloading}>
              <Download className="mr-2 h-4 w-4" />
              {isBulkDownloading ? 'Preparing download...' : 'Download selected PDFs'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
