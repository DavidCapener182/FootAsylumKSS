'use client'

import { useMemo, useState, type ChangeEvent } from 'react'
import { ArrowLeft, Download, Loader2, Save, Sparkles, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatAppDateTime } from '@/lib/utils'
import type { EmpEditorField, EmpPlanEditorData, EmpSourceDocumentSummary } from '@/lib/emp/data'
import {
  buildInitialGuidedAnswers,
  EMP_GUIDED_GROUPS,
  generateEmpFieldValuesFromGuidedAnswers,
  type EmpGuidedAnswerValue,
} from '@/lib/emp/guided-flow'
import {
  EMP_ANNEX_DEFINITIONS,
  EMP_DOCUMENT_KIND_OPTIONS,
  EMP_MASTER_TEMPLATE_SECTIONS,
  isEmpFieldVisibleInEditor,
} from '@/lib/emp/master-template'

const EMP_SECTION_DESCRIPTION_MAP = new Map(
  EMP_MASTER_TEMPLATE_SECTIONS.map((section) => [section.key, section.description || ''])
)
const EMP_DOCUMENT_KIND_LABEL_MAP = new Map<string, string>(
  EMP_DOCUMENT_KIND_OPTIONS.map((option) => [option.value, option.label])
)
const EMP_ANNEX_GUIDED_ANSWER_KEYS: Record<string, string> = {
  bar_operations: 'has_bars',
  search_screening: 'has_search_screening',
  front_of_stage_pit: 'has_front_of_stage',
  traffic_pedestrian_routes: 'has_traffic_routes',
  camping_security: 'has_camping',
  vip_backstage_security: 'has_vip_backstage',
  stewarding_deployment: 'has_stewarding_deployment',
  emergency_action_cards: 'has_emergency_action_cards',
}
const EMP_GUIDED_ANSWER_ANNEX_KEYS = Object.fromEntries(
  Object.entries(EMP_ANNEX_GUIDED_ANSWER_KEYS).map(([annexKey, answerKey]) => [answerKey, annexKey])
) as Record<string, string>

function initialFieldValues(data: EmpPlanEditorData) {
  return Object.fromEntries(
    data.fields.map((field) => {
      const existing = data.values.find((valueRow) => valueRow.fieldKey === field.key)
      return [field.key, existing?.valueText ?? field.defaultValueText ?? '']
    })
  )
}

type EmpSectionAttachmentConfig = {
  sectionKey: string
  documentKind: string
  title: string
  description: string
  accept?: string
}

const EMP_SECTION_ATTACHMENT_CONFIGS: EmpSectionAttachmentConfig[] = [
  {
    sectionKey: 'site_design',
    documentKind: 'site_map',
    title: 'Attach site map or site plan',
    description: 'Upload the current event site layout, zoning plan, or public-area overview used for DIM-ALICED and route review.',
    accept: '.pdf,.png,.jpg,.jpeg,.webp,.gif',
  },
  {
    sectionKey: 'ingress_operations',
    documentKind: 'ingress_map',
    title: 'Attach ingress map or queue plan',
    description: 'Upload queue layouts, holding pen plans, searchable lane drawings, or public approach diagrams for ingress operations.',
    accept: '.pdf,.png,.jpg,.jpeg,.webp,.gif',
  },
  {
    sectionKey: 'egress_dispersal',
    documentKind: 'egress_map',
    title: 'Attach egress or dispersal map',
    description: 'Upload egress route plans, exit drawings, dispersal diagrams, or route-split maps for end-of-show operations.',
    accept: '.pdf,.png,.jpg,.jpeg,.webp,.gif',
  },
  {
    sectionKey: 'egress_dispersal',
    documentKind: 'route_map',
    title: 'Attach traffic or pedestrian route map',
    description: 'Upload transport-interface diagrams, crossing-point layouts, external route plans, or pedestrian-management drawings.',
    accept: '.pdf,.png,.jpg,.jpeg,.webp,.gif',
  },
  {
    sectionKey: 'emergency_procedures',
    documentKind: 'emergency_map',
    title: 'Attach emergency or evacuation map',
    description: 'Upload part-evac, full-evac, invacuation, shelter, rendezvous-point, or emergency-route diagrams for the live plan.',
    accept: '.pdf,.png,.jpg,.jpeg,.webp,.gif',
  },
]

const EMP_ATTACHMENT_DOCUMENT_KINDS = new Set(
  EMP_SECTION_ATTACHMENT_CONFIGS.map((config) => config.documentKind)
)
const EMP_SOURCE_DOCUMENT_OPTIONS = EMP_DOCUMENT_KIND_OPTIONS.filter(
  (option) => !EMP_ATTACHMENT_DOCUMENT_KINDS.has(option.value)
)

function getSectionAttachmentConfigs(sectionKey: string) {
  return EMP_SECTION_ATTACHMENT_CONFIGS.filter((config) => config.sectionKey === sectionKey)
}

function isImageDocument(document: EmpSourceDocumentSummary) {
  const fileType = String(document.fileType || '').toLowerCase()
  const fileName = String(document.fileName || '').toLowerCase()

  return (
    fileType.startsWith('image/')
    || ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((extension) => fileName.endsWith(extension))
  )
}

function sourceLabel(source: string | undefined) {
  const normalized = String(source || 'default').toLowerCase()
  switch (normalized) {
    case 'manual':
      return 'Manual'
    case 'source_doc':
      return 'Source doc'
    default:
      return 'Default'
  }
}

function sourceBadgeClass(source: string | undefined) {
  const normalized = String(source || 'default').toLowerCase()
  switch (normalized) {
    case 'manual':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'source_doc':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600'
  }
}

function formatDateTime(value: string) {
  return formatAppDateTime(
    value,
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    },
    value
  )
}

export function EmpPlanEditor({ initialData }: { initialData: EmpPlanEditorData }) {
  const [editorData, setEditorData] = useState(initialData)
  const [values, setValues] = useState<Record<string, string>>(() => initialFieldValues(initialData))
  const [guidedAnswers, setGuidedAnswers] = useState(() =>
    buildInitialGuidedAnswers(initialFieldValues(initialData), initialData.plan.selectedAnnexes)
  )
  const [selectedAnnexes, setSelectedAnnexes] = useState<string[]>(initialData.plan.selectedAnnexes)
  const [includeKssProfileAppendix, setIncludeKssProfileAppendix] = useState(
    initialData.plan.includeKssProfileAppendix
  )
  const [documentKind, setDocumentKind] = useState('previous_emp')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [uploadingKind, setUploadingKind] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false)
  const uploading = Boolean(uploadingKind)

  const valueRowMap = useMemo(
    () => new Map(editorData.values.map((valueRow) => [valueRow.fieldKey, valueRow])),
    [editorData.values]
  )
  const sourceDocuments = useMemo(
    () => editorData.documents.filter((document) => !EMP_ATTACHMENT_DOCUMENT_KINDS.has(document.documentKind)),
    [editorData.documents]
  )

  const sections = useMemo(
    () =>
      editorData.sections
        .map((section) => ({
          ...section,
          description: EMP_SECTION_DESCRIPTION_MAP.get(section.key) || '',
          fields: editorData.fields.filter(
            (field) =>
              field.sectionId === section.id
              && isEmpFieldVisibleInEditor(field.key, selectedAnnexes, showAdvancedEditor)
          ),
        }))
        .filter((section) => section.fields.length > 0 || getSectionAttachmentConfigs(section.key).length > 0),
    [editorData.fields, editorData.sections, selectedAnnexes, showAdvancedEditor]
  )

  const applyEditorData = (nextEditorData: EmpPlanEditorData) => {
    setEditorData(nextEditorData)
    setSelectedAnnexes(nextEditorData.plan.selectedAnnexes)
    setIncludeKssProfileAppendix(nextEditorData.plan.includeKssProfileAppendix)
    const nextValues = initialFieldValues(nextEditorData)
    setValues(nextValues)
    setGuidedAnswers(buildInitialGuidedAnswers(nextValues, nextEditorData.plan.selectedAnnexes))
  }

  const persist = async () => {
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const generated = showAdvancedEditor
        ? { values, selectedAnnexes }
        : generateEmpFieldValuesFromGuidedAnswers(guidedAnswers, values)

      if (!showAdvancedEditor) {
        setValues(generated.values)
        setSelectedAnnexes(generated.selectedAnnexes)
      }

      const response = await fetch('/api/emp/save-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: editorData.plan.id,
          values: generated.values,
          selectedAnnexes: generated.selectedAnnexes,
          includeKssProfileAppendix,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || data.details || `Failed to save (${response.status})`)
      }

      applyEditorData(data)
      setNotice('Changes saved.')
      return true
    } catch (saveError: any) {
      setError(saveError.message || 'Failed to save changes')
      return false
    } finally {
      setSaving(false)
    }
  }

  const updateGuidedAnswer = (key: string, value: EmpGuidedAnswerValue) => {
    setGuidedAnswers((current) => ({ ...current, [key]: value }))
  }

  const generateGuidedWording = () => {
    const generated = generateEmpFieldValuesFromGuidedAnswers(guidedAnswers, values)
    setValues(generated.values)
    setSelectedAnnexes(generated.selectedAnnexes)
    setNotice('Guided plan wording updated. Review the preview or save the generated wording.')
    setError(null)
  }

  const handleExtract = async () => {
    setExtracting(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch('/api/emp/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: editorData.plan.id }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || data.details || `Failed to extract (${response.status})`)
      }

      applyEditorData(data.editorData)
      setNotice(
        data.updatedKeys?.length
          ? `Extraction updated ${data.updatedKeys.length} fields.`
          : 'No new source-document values were found.'
      )
    } catch (extractError: any) {
      setError(extractError.message || 'Failed to extract source document data')
    } finally {
      setExtracting(false)
    }
  }

  const uploadSourceFile = async (
    nextDocumentKind: string,
    file: File,
    successMessage = 'Source document uploaded.',
    options: { replaceExisting?: boolean } = {}
  ) => {
    setUploadingKind(nextDocumentKind)
    setError(null)
    setNotice(null)

    try {
      const formData = new FormData()
      formData.append('planId', editorData.plan.id)
      formData.append('documentKind', nextDocumentKind)
      formData.append('file', file)
      if (options.replaceExisting) {
        formData.append('replaceExisting', 'true')
      }

      const response = await fetch('/api/emp/upload-source', {
        method: 'POST',
        body: formData,
      })

      const uploaded = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(uploaded.error || uploaded.details || `Failed to upload (${response.status})`)
      }

      setEditorData((current) => ({
        ...current,
        documents: [
          uploaded as EmpSourceDocumentSummary,
          ...current.documents.filter(
            (document) =>
              !(options.replaceExisting && document.documentKind === nextDocumentKind)
          ),
        ],
      }))
      if (nextDocumentKind === 'kss_profile') {
        setIncludeKssProfileAppendix(true)
      }
      setNotice(successMessage)
      return true
    } catch (uploadError: any) {
      setError(uploadError.message || 'Failed to upload source document')
      return false
    } finally {
      setUploadingKind(null)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    const uploaded = await uploadSourceFile(documentKind, uploadFile)
    if (uploaded) {
      setUploadFile(null)
    }
  }

  const handleSectionAttachmentUpload = async (nextDocumentKind: string, file: File) => {
    await uploadSourceFile(nextDocumentKind, file, 'Attachment updated.', {
      replaceExisting: true,
    })
  }

  const renderField = (field: EmpEditorField) => {
    const valueRow = valueRowMap.get(field.key)
    const value = values[field.key] ?? ''

    return (
      <div key={field.key} className="space-y-2 rounded-md border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={field.key} className="text-sm font-semibold text-slate-900">
            {field.label}
          </Label>
          <Badge variant="outline" className={sourceBadgeClass(valueRow?.valueSource)}>
            {sourceLabel(valueRow?.valueSource)}
          </Badge>
          {field.editMode === 'generic_framework' ? (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
              Generic framework
            </Badge>
          ) : null}
        </div>
        {field.description ? <p className="text-xs text-slate-500">{field.description}</p> : null}
        {valueRow?.sourceExcerpt ? (
          <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {valueRow.sourceExcerpt}
          </div>
        ) : null}
        {field.fieldType === 'textarea' ? (
          <Textarea
            id={field.key}
            value={value}
            rows={5}
            placeholder={field.placeholder || undefined}
            onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
          />
        ) : field.fieldType === 'select' ? (
          <select
            id={field.key}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={value}
            onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
          >
            <option value="">Select</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id={field.key}
            type={field.fieldType === 'date' ? 'date' : field.fieldType === 'number' ? 'number' : 'text'}
            value={value}
            placeholder={field.placeholder || undefined}
            onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
          />
        )}
      </div>
    )
  }

  const renderGuidedQuestion = (question: (typeof EMP_GUIDED_GROUPS)[number]['questions'][number]) => {
    const value = guidedAnswers[question.key]

    if (question.type === 'checkbox') {
      return (
        <label key={question.key} className="flex gap-3 rounded-md border border-slate-200 bg-white px-4 py-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={value === true}
            onChange={(event) => {
              updateGuidedAnswer(question.key, event.target.checked)
              const annexKey = EMP_GUIDED_ANSWER_ANNEX_KEYS[question.key]
              if (annexKey) {
                setSelectedAnnexes((current) =>
                  event.target.checked
                    ? Array.from(new Set([...current, annexKey]))
                    : current.filter((value) => value !== annexKey)
                )
              }
            }}
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">{question.label}</span>
            {question.help ? <span className="mt-1 block text-xs text-slate-500">{question.help}</span> : null}
          </span>
        </label>
      )
    }

    const commonProps = {
      id: `guided-${question.key}`,
      value: typeof value === 'string' ? value : '',
      placeholder: question.placeholder || undefined,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        updateGuidedAnswer(question.key, event.target.value),
    }

    return (
      <div key={question.key} className="space-y-2 rounded-md border border-slate-200 bg-white p-4">
        <Label htmlFor={`guided-${question.key}`} className="text-sm font-semibold text-slate-900">
          {question.label}
        </Label>
        {question.help ? <p className="text-xs text-slate-500">{question.help}</p> : null}
        {question.type === 'textarea' ? (
          <Textarea {...commonProps} rows={4} />
        ) : question.type === 'select' ? (
          <select
            id={`guided-${question.key}`}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => updateGuidedAnswer(question.key, event.target.value)}
          >
            <option value="">Select</option>
            {(question.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <Input
            {...commonProps}
            type={question.type === 'number' ? 'number' : question.type === 'date' ? 'date' : 'text'}
          />
        )}
      </div>
    )
  }

  const renderDocumentCard = (
    document: EmpSourceDocumentSummary,
    options: { compact?: boolean; showKind?: boolean } = {}
  ) => {
    const compact = options.compact ?? false
    const showKind = options.showKind ?? true

    return (
      <div
        key={document.id}
        className={`rounded-md border border-slate-200 ${compact ? 'bg-white p-3' : 'px-4 py-3'}`}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">{document.fileName}</span>
              {showKind ? (
                <Badge variant="outline">
                  {EMP_DOCUMENT_KIND_LABEL_MAP.get(document.documentKind) || document.documentKind}
                </Badge>
              ) : null}
            </div>
            <div className="text-xs text-slate-500">
              Uploaded {formatDateTime(document.createdAt)} · {(document.extractedText || '').length.toLocaleString()} extracted chars
            </div>
          </div>
          {document.signedUrl ? (
            <a
              href={document.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
            >
              Open attachment
            </a>
          ) : null}
        </div>
        {isImageDocument(document) && document.signedUrl ? (
          <div className="mt-3 overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-2">
            <img
              src={document.signedUrl}
              alt={document.fileName}
              className={`w-full rounded object-contain ${compact ? 'max-h-36' : 'max-h-48'}`}
            />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-500">
              <a href="/admin/event-management-plans" className="inline-flex items-center gap-2 text-sm hover:text-slate-700">
                <ArrowLeft className="h-4 w-4" />
                Back to EMP workspace
              </a>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{editorData.plan.title}</h1>
            <p className="text-sm text-slate-500">{editorData.template.title}</p>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              This is the KSS master EMP. Generic operational wording is prefilled so you only need
              to confirm or replace the event-specific detail, then review the report preview before
              export.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={persist} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
            <Button variant="outline" onClick={handleExtract} disabled={extracting || editorData.documents.length === 0}>
              {extracting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Extract From Sources
            </Button>
            <a
              href={`/admin/event-management-plans/${editorData.plan.id}/preview`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Preview
              <Download className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>

        {notice ? <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div> : null}
        {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Guided EMP Builder</CardTitle>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Answer the short event-specific questions, then generate the plan wording. Generic KSS framework
                text is added automatically and optional annexes stay off until selected here.
              </p>
            </div>
            <Button type="button" onClick={generateGuidedWording}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate / Update Plan Wording
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {EMP_GUIDED_GROUPS.map((group) => (
            <details
              key={group.key}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              open={group.key === 'event_identity'}
            >
              <summary className="cursor-pointer select-none">
                <span className="block text-base font-semibold text-slate-900">{group.title}</span>
                <span className="mt-1 block text-sm text-slate-500">{group.description}</span>
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {group.questions.map(renderGuidedQuestion)}
              </div>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Source Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="emp-document-kind">Source document kind</Label>
              <select
                id="emp-document-kind"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={documentKind}
                onChange={(event) => setDocumentKind(event.target.value)}
              >
                {EMP_SOURCE_DOCUMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-5 text-slate-500">
                Use this area for text-bearing source material that should inform extraction and
                reviewed plan fields. Maps and route images are attached directly inside the
                relevant EMP sections below.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-upload-file">Upload file</Label>
              <Input
                id="emp-upload-file"
                type="file"
                accept=".pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.gif"
                onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleUpload} disabled={uploading || !uploadFile}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {sourceDocuments.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No source documents uploaded yet.
              </div>
            ) : (
              sourceDocuments.map((document) => renderDocumentCard(document))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Annexes and Supporting Appendix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {EMP_ANNEX_DEFINITIONS.map((annex) => {
              const checked = selectedAnnexes.includes(annex.key)
              const guidedAnswerKey = EMP_ANNEX_GUIDED_ANSWER_KEYS[annex.key]
              return (
                <label key={annex.key} className="flex gap-3 rounded-md border border-slate-200 px-4 py-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={(event) => {
                      setSelectedAnnexes((current) =>
                        event.target.checked
                          ? [...current, annex.key]
                          : current.filter((value) => value !== annex.key)
                      )
                      if (guidedAnswerKey) {
                        updateGuidedAnswer(guidedAnswerKey, event.target.checked)
                      }
                    }}
                  />
                  <div>
                    <div className="font-medium text-slate-900">{annex.label}</div>
                    <p className="text-sm text-slate-500">{annex.description}</p>
                  </div>
                </label>
              )
            })}
          </div>

          <label className="flex gap-3 rounded-md border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={includeKssProfileAppendix}
              onChange={(event) => setIncludeKssProfileAppendix(event.target.checked)}
            />
            <div>
              <div className="font-medium text-slate-900">Include KSS profile appendix</div>
              <p className="text-sm text-slate-500">
                Only include provider credentials as a supporting appendix, not in the live operational plan body.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Advanced Editor</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {showAdvancedEditor
                  ? 'Advanced mode is showing generated and generic wording. Manual edits here may be overwritten if you regenerate from the guided flow.'
                  : 'The guided flow is the default editor. Open Advanced only when you need to manually override generated wording.'}
              </p>
            </div>
            <Button
              type="button"
              variant={showAdvancedEditor ? 'default' : 'outline'}
              onClick={() => setShowAdvancedEditor((current) => !current)}
            >
              {showAdvancedEditor ? 'Hide Advanced Editor' : 'Advanced: Edit Generated Wording'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {showAdvancedEditor ? sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            {section.description ? (
              <p className="text-sm leading-6 text-slate-500">{section.description}</p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {getSectionAttachmentConfigs(section.key).length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {getSectionAttachmentConfigs(section.key).map((config) => {
                  const sectionDocuments = editorData.documents.filter(
                    (document) => document.documentKind === config.documentKind
                  )

                  return (
                    <div
                      key={`${section.id}-${config.documentKind}`}
                      className="space-y-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{config.title}</div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{config.description}</p>
                      </div>
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          accept={config.accept}
                          disabled={uploading}
                          className="sr-only"
                          onChange={async (event) => {
                            const file = event.target.files?.[0] || null
                            event.currentTarget.value = ''
                            if (!file) return
                            await handleSectionAttachmentUpload(config.documentKind, file)
                          }}
                        />
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-center transition hover:border-slate-400 hover:bg-slate-50">
                          <Upload className="mx-auto h-5 w-5 text-slate-500" />
                          <div className="mt-2 text-sm font-semibold text-slate-900">
                            {sectionDocuments.length ? 'Change attachment' : 'Select file or photo'}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Click here to choose a file or image from your computer for this part of
                            the EMP.
                          </p>
                        </div>
                      </label>
                      {uploadingKind === config.documentKind ? (
                        <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Uploading attachment...
                        </div>
                      ) : null}
                      {sectionDocuments.length ? (
                        <div className="space-y-2">
                          {sectionDocuments.map((document) =>
                            renderDocumentCard(document, { compact: true, showKind: false })
                          )}
                        </div>
                      ) : (
                        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                          No attachment uploaded for this section yet.
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : null}
            {section.fields.map(renderField)}
          </CardContent>
        </Card>
      )) : null}
    </div>
  )
}
