import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getEmpUserContext } from '@/lib/emp/access'
import {
  deriveEmpFieldCandidates,
  type EmpSourceDocumentForExtraction,
} from '@/lib/emp/extraction'
import {
  EMP_DEMO_EVENT_NAME,
  EMP_DEMO_PLAN_TITLE,
  EMP_DEMO_PLAN_VALUES,
  EMP_DEMO_SELECTED_ANNEXES,
} from '@/lib/emp/demo-plan'
import {
  EMP_DOWNLOAD_EVENT_NAME,
  EMP_DOWNLOAD_PLAN_TITLE,
  EMP_DOWNLOAD_PLAN_VALUES,
  EMP_DOWNLOAD_SELECTED_ANNEXES,
} from '@/lib/emp/download-plan'
import {
  EMP_ISLE_OF_WIGHT_EVENT_NAME,
  EMP_ISLE_OF_WIGHT_PLAN_TITLE,
  EMP_ISLE_OF_WIGHT_PLAN_VALUES,
  EMP_ISLE_OF_WIGHT_SELECTED_ANNEXES,
} from '@/lib/emp/isle-of-wight-plan'
import {
  EMP_PARKLIFE_EVENT_NAME,
  EMP_PARKLIFE_PLAN_TITLE,
  EMP_PARKLIFE_PLAN_VALUES,
  EMP_PARKLIFE_SELECTED_ANNEXES,
} from '@/lib/emp/parklife-plan'
import {
  EMP_STARTER_FESTIVAL_PLANS,
  getEmpStarterFestivalPlanByKey,
  type EmpFestivalStarterPlan,
} from '@/lib/emp/festival-starter-plans'
import {
  EMP_BUSINESS_TEMPLATE_VALUES,
  getEmpBusinessTemplatePlanMetadata,
} from '@/lib/emp/business-template'
import {
  buildEmpMasterTemplatePrefillFromFieldValues,
  type EmpMasterTemplatePlanPrefill,
} from '@/lib/emp/master-template-prefill'
import {
  EMP_EVENT_CONTROL_LOG_PRIORITY_OPTIONS,
  EMP_EVENT_CONTROL_LOG_STATUS_OPTIONS,
  getEmpEventControlLogPriorityLabel,
  getEmpEventControlLogStatusLabel,
  getEmpEventControlLogTypeLabel,
  normalizeEmpEventControlLogTypeValue,
  type EmpEventControlLogPriority,
  type EmpEventControlLogStatus,
  type EmpEventControlLogType,
} from '@/lib/emp/event-control-log-options'
import {
  EMP_MASTER_TEMPLATE_DESCRIPTION,
  EMP_MASTER_TEMPLATE_FIELDS,
  EMP_MASTER_TEMPLATE_SECTIONS,
  EMP_MASTER_TEMPLATE_TITLE,
  getEmpFieldEditMode,
  type EmpFieldEditMode,
  type EmpDocumentKind,
} from '@/lib/emp/master-template'
import { buildEmpPreviewModel, resolveEmpFieldValueMap } from '@/lib/emp/preview'
import { formatAppDate, formatAppDateTime, formatAppTime } from '@/lib/utils'

type EmpTemplateRow = {
  id: string
  title: string
  description: string | null
  is_active: boolean
}

type EmpPlanRow = {
  id: string
  template_id: string
  title: string
  event_name: string | null
  status: string
  document_status: string | null
  selected_annexes: string[] | null
  include_kss_profile_appendix: boolean
  created_at: string
  updated_at: string
}

type EmpEventControlLogEntryRow = {
  id: string
  plan_id: string
  log_number: number
  logged_at: string
  from_call_sign: string | null
  to_call_sign: string | null
  occurrence: string
  message_type: string
  action_taken: string | null
  owner: string | null
  priority: string
  status: string
  created_at: string
  updated_at: string
}

export type EmpPlanSummary = {
  id: string
  title: string
  eventName: string | null
  status: string
  documentStatus: string | null
  selectedAnnexes: string[]
  includeKssProfileAppendix: boolean
  createdAt: string
  updatedAt: string
}

export type EmpEventControlLogEntry = {
  id: string
  planId: string
  logNumber: number
  loggedAt: string
  fromCallSign: string | null
  toCallSign: string | null
  occurrence: string
  messageType: EmpEventControlLogType
  actionTaken: string | null
  owner: string | null
  priority: EmpEventControlLogPriority
  status: EmpEventControlLogStatus
  createdAt: string
  updatedAt: string
}

export type EmpEventControlLogSuggestions = {
  messageTypes: string[]
  contacts: string[]
}

export type EmpEventControlLogData = {
  plan: EmpPlanSummary
  entries: EmpEventControlLogEntry[]
  suggestions: EmpEventControlLogSuggestions
}

export type EmpEditorField = {
  id: string
  key: string
  sectionId: string
  sectionKey: string
  sectionTitle: string
  label: string
  description: string | null
  placeholder: string | null
  fieldType: string
  orderIndex: number
  isRequired: boolean
  options: string[]
  defaultValueText: string | null
  editMode: EmpFieldEditMode
}

export type EmpEditorValueRow = {
  id: string
  fieldId: string
  fieldKey: string
  valueText: string | null
  valueSource: string
  sourceDocumentId: string | null
  sourceExcerpt: string | null
  updatedAt: string
}

export type EmpSourceDocumentSummary = {
  id: string
  documentKind: string
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
  extractedText: string | null
  createdAt: string
  signedUrl: string | null
}

export type EmpPlanEditorData = {
  plan: EmpPlanSummary
  template: {
    id: string
    title: string
    description: string | null
  }
  sections: Array<{ id: string; key: string; title: string; orderIndex: number }>
  fields: EmpEditorField[]
  values: EmpEditorValueRow[]
  documents: EmpSourceDocumentSummary[]
}

const EMP_SETUP_REQUIRED_MESSAGE =
  'EMP database setup required. Apply supabase/migrations/048_add_emp_module.sql to the connected Supabase project, then refresh this page.'
const EVENT_CONTROL_LOG_FUTURE_TOLERANCE_MS = 2 * 60 * 1000

type EmpErrorLike = {
  message?: string | null
} | null | undefined

export class EmpSetupRequiredError extends Error {
  constructor(message = EMP_SETUP_REQUIRED_MESSAGE) {
    super(message)
    this.name = 'EmpSetupRequiredError'
  }
}

function clean(value: unknown) {
  return String(value || '').trim()
}

function isEmpSchemaMissingError(error: EmpErrorLike) {
  const message = clean(error?.message).toLowerCase()

  if (!message || !message.includes('emp_')) {
    return false
  }

  return (
    message.includes("could not find the table 'public.emp_") ||
    message.includes('schema cache') ||
    message.includes('relation "public.emp_') ||
    message.includes('relation "emp_') ||
    message.includes('does not exist')
  )
}

function throwEmpOperationError(context: string, error?: EmpErrorLike): never {
  if (isEmpSchemaMissingError(error)) {
    throw new EmpSetupRequiredError()
  }

  const details = clean(error?.message)
  throw new Error(details ? `${context}: ${details}` : context)
}

function normalizeSelectedAnnexes(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => clean(item))
    .filter(Boolean)
}

function buildPlanSummary(plan: EmpPlanRow): EmpPlanSummary {
  return {
    id: plan.id,
    title: plan.title,
    eventName: plan.event_name,
    status: plan.status,
    documentStatus: plan.document_status,
    selectedAnnexes: normalizeSelectedAnnexes(plan.selected_annexes),
    includeKssProfileAppendix: Boolean(plan.include_kss_profile_appendix),
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
  }
}

function isAllowedEventControlLogPriority(value: string): value is EmpEventControlLogPriority {
  return EMP_EVENT_CONTROL_LOG_PRIORITY_OPTIONS.some((option) => option.value === value)
}

function isAllowedEventControlLogStatus(value: string): value is EmpEventControlLogStatus {
  return EMP_EVENT_CONTROL_LOG_STATUS_OPTIONS.some((option) => option.value === value)
}

function normalizeEventControlLogType(value: unknown): EmpEventControlLogType {
  return normalizeEmpEventControlLogTypeValue(value)
}

function normalizeEventControlLogLoggedAt(value: unknown) {
  const raw = clean(value)
  const now = new Date()
  const date = raw ? new Date(raw) : now
  if (Number.isNaN(date.getTime())) return now.toISOString()
  return date.getTime() - now.getTime() > EVENT_CONTROL_LOG_FUTURE_TOLERANCE_MS
    ? now.toISOString()
    : date.toISOString()
}

function normalizeEventControlLogPriority(value: unknown): EmpEventControlLogPriority {
  const normalized = clean(value).toLowerCase()
  return isAllowedEventControlLogPriority(normalized) ? normalized : 'medium'
}

function normalizeEventControlLogStatus(value: unknown): EmpEventControlLogStatus {
  const normalized = clean(value).toLowerCase()
  return isAllowedEventControlLogStatus(normalized) ? normalized : 'open'
}

function buildEventControlLogEntry(row: EmpEventControlLogEntryRow): EmpEventControlLogEntry {
  const loggedAt = new Date(row.logged_at)
  const createdAt = new Date(row.created_at)
  const displayLoggedAt =
    !Number.isNaN(loggedAt.getTime()) &&
    !Number.isNaN(createdAt.getTime()) &&
    loggedAt.getTime() - createdAt.getTime() > EVENT_CONTROL_LOG_FUTURE_TOLERANCE_MS
      ? row.created_at
      : row.logged_at

  return {
    id: row.id,
    planId: row.plan_id,
    logNumber: Number(row.log_number || 0),
    loggedAt: displayLoggedAt,
    fromCallSign: row.from_call_sign,
    toCallSign: row.to_call_sign,
    occurrence: row.occurrence,
    messageType: normalizeEventControlLogType(row.message_type),
    actionTaken: row.action_taken,
    owner: row.owner,
    priority: normalizeEventControlLogPriority(row.priority),
    status: normalizeEventControlLogStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function throwEmpEventControlLogOperationError(context: string, error?: EmpErrorLike): never {
  if (isEmpSchemaMissingError(error)) {
    throw new EmpSetupRequiredError(
      'EMP Event Control Log database setup required. Apply supabase/migrations/054_add_emp_event_control_log.sql to the connected Supabase project, then refresh this page.'
    )
  }

  throwEmpOperationError(context, error)
}

function formatEventControlLogNumber(value: number) {
  return String(Math.max(0, Number(value || 0))).padStart(3, '0')
}

function sortEventControlLogEntriesNewestFirst(entries: EmpEventControlLogEntry[]) {
  return [...entries].sort((first, second) => {
    const logDiff = Number(second.logNumber || 0) - Number(first.logNumber || 0)
    if (logDiff !== 0) return logDiff

    const createdDiff = new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    if (createdDiff !== 0) return createdDiff

    return new Date(second.loggedAt).getTime() - new Date(first.loggedAt).getTime()
  })
}

function buildEventControlLogAmendment(input: {
  currentValue: string | null
  amendment: unknown
  amendedAt: string
  amendedBy: string | null | undefined
}) {
  const amendment = clean(input.amendment)
  if (!amendment) return input.currentValue

  const timestamp = formatAppDateTime(
    input.amendedAt,
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    },
    input.amendedAt
  )
  const author = clean(input.amendedBy) || 'Event Control'
  const auditBlock = `[Amended ${timestamp} by ${author}]\n${amendment}`
  const currentValue = clean(input.currentValue)

  return currentValue ? `${currentValue}\n\n${auditBlock}` : auditBlock
}

function buildEventControlLogTableCells(entries: EmpEventControlLogEntry[]) {
  const tableCells: Record<string, string> = {}

  sortEventControlLogEntriesNewestFirst(entries)
    .forEach((entry, rowIndex) => {
      tableCells[`${rowIndex}:log`] = formatEventControlLogNumber(entry.logNumber)
      tableCells[`${rowIndex}:time`] = formatAppTime(entry.loggedAt, {}, entry.loggedAt)
      tableCells[`${rowIndex}:from`] = clean(entry.fromCallSign)
      tableCells[`${rowIndex}:to`] = clean(entry.toCallSign)
      tableCells[`${rowIndex}:occurrence`] = entry.occurrence
      tableCells[`${rowIndex}:type`] = getEmpEventControlLogTypeLabel(entry.messageType)
      tableCells[`${rowIndex}:action`] = clean(entry.actionTaken)
      tableCells[`${rowIndex}:priority`] = getEmpEventControlLogPriorityLabel(entry.priority)
      tableCells[`${rowIndex}:status`] = getEmpEventControlLogStatusLabel(entry.status)
    })

  return tableCells
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-')
}

async function createEmpDocumentSignedUrl(
  supabase: ReturnType<typeof createClient>,
  filePath: string
) {
  const { data } = await supabase.storage
    .from('emp-documents')
    .createSignedUrl(filePath, 60 * 60 * 12)

  return data?.signedUrl || null
}

async function ensureEmpTemplateSeededForContext(
  supabase: ReturnType<typeof createClient>,
  profileId: string
) {
  const { data: existingTemplate, error: existingTemplateError } = await supabase
    .from('emp_templates')
    .select('id, title, description, is_active')
    .eq('title', EMP_MASTER_TEMPLATE_TITLE)
    .maybeSingle()

  if (existingTemplateError) {
    throwEmpOperationError('Failed to load EMP template', existingTemplateError)
  }

  let templateId = existingTemplate?.id || null

  if (!templateId) {
    const { data: createdTemplate, error: createTemplateError } = await supabase
      .from('emp_templates')
      .insert({
        title: EMP_MASTER_TEMPLATE_TITLE,
        description: EMP_MASTER_TEMPLATE_DESCRIPTION,
        created_by_user_id: profileId,
        is_active: true,
      })
      .select('id, title, description, is_active')
      .single()

    if (createTemplateError || !createdTemplate) {
      throwEmpOperationError('Failed to seed EMP template', createTemplateError)
    }

    templateId = createdTemplate.id
  } else if (
    existingTemplate
    && (
      existingTemplate.description !== EMP_MASTER_TEMPLATE_DESCRIPTION
      || existingTemplate.is_active !== true
    )
  ) {
    const { error: updateTemplateError } = await supabase
      .from('emp_templates')
      .update({
        description: EMP_MASTER_TEMPLATE_DESCRIPTION,
        is_active: true,
      })
      .eq('id', templateId)

    if (updateTemplateError) {
      throwEmpOperationError('Failed to update EMP template metadata', updateTemplateError)
    }
  }

  const sectionRecords = EMP_MASTER_TEMPLATE_SECTIONS.map((section) => ({
    template_id: templateId,
    key: section.key,
    title: section.title,
    order_index: section.order,
  }))

  const { error: upsertSectionsError } = await supabase
    .from('emp_template_sections')
    .upsert(sectionRecords, { onConflict: 'template_id,key' })

  if (upsertSectionsError) {
    throwEmpOperationError('Failed to seed EMP sections', upsertSectionsError)
  }

  const { data: seededSections, error: seededSectionsError } = await supabase
    .from('emp_template_sections')
    .select('id, key')
    .eq('template_id', templateId)

  if (seededSectionsError) {
    throwEmpOperationError('Failed to load EMP sections', seededSectionsError)
  }

  const sectionKeyToId = new Map((seededSections || []).map((section: any) => [section.key, section.id]))

  const templateFields = EMP_MASTER_TEMPLATE_FIELDS.map((field) => ({
      template_id: templateId,
      section_id: sectionKeyToId.get(field.sectionKey),
      key: field.key,
      label: field.label,
      description: field.description || null,
      placeholder: field.placeholder || null,
      field_type: field.type,
      order_index: field.order,
      is_required: Boolean(field.required),
      options: field.options || null,
      default_value_text: field.defaultValueText || null,
      default_value_json: field.defaultValueJson ?? null,
    }))

  if (templateFields.some((field) => !field.section_id)) {
    throw new Error('EMP template seeding failed because one or more sections are missing')
  }

  const { error: upsertFieldsError } = await supabase
    .from('emp_template_fields')
    .upsert(templateFields, { onConflict: 'template_id,key' })

  if (upsertFieldsError) {
    throwEmpOperationError('Failed to seed EMP fields', upsertFieldsError)
  }

  const { data: template, error: reloadTemplateError } = await supabase
    .from('emp_templates')
    .select('id, title, description, is_active')
    .eq('id', templateId)
    .single()

  if (reloadTemplateError || !template) {
    throwEmpOperationError('Failed to load EMP template', reloadTemplateError)
  }

  return template as EmpTemplateRow
}

async function getPlanOrThrow(
  supabase: ReturnType<typeof createClient>,
  planId: string
) {
  const { data, error } = await supabase
    .from('emp_plans')
    .select('id, template_id, title, event_name, status, document_status, selected_annexes, include_kss_profile_appendix, created_at, updated_at')
    .eq('id', planId)
    .single()

  if (error || !data) {
    throwEmpOperationError(`EMP plan not found: ${planId}`, error)
  }

  return data as EmpPlanRow
}

async function loadTemplateGraph(
  supabase: ReturnType<typeof createClient>,
  templateId: string
) {
  const { data: sections, error: sectionsError } = await supabase
    .from('emp_template_sections')
    .select('id, key, title, order_index')
    .eq('template_id', templateId)
    .order('order_index', { ascending: true })

  if (sectionsError) {
    throwEmpOperationError('Failed to load EMP sections', sectionsError)
  }

  const sectionMap = new Map((sections || []).map((section: any) => [section.id, section]))

  const { data: fields, error: fieldsError } = await supabase
    .from('emp_template_fields')
    .select('id, section_id, key, label, description, placeholder, field_type, order_index, is_required, options, default_value_text')
    .eq('template_id', templateId)
    .order('order_index', { ascending: true })

  if (fieldsError) {
    throwEmpOperationError('Failed to load EMP fields', fieldsError)
  }

  return {
    sections: (sections || []).map((section: any) => ({
      id: section.id,
      key: section.key,
      title: section.title,
      orderIndex: section.order_index,
    })),
    fields: (fields || []).map((field: any) => {
      const section = sectionMap.get(field.section_id)
      return {
        id: field.id,
        key: field.key,
        sectionId: field.section_id,
        sectionKey: section?.key || 'unknown',
        sectionTitle: section?.title || 'Unknown',
        label: field.label,
        description: field.description,
        placeholder: field.placeholder,
        fieldType: field.field_type,
        orderIndex: field.order_index,
        isRequired: Boolean(field.is_required),
        options: Array.isArray(field.options) ? field.options : [],
        defaultValueText: field.default_value_text,
        editMode: getEmpFieldEditMode(field.key),
      } satisfies EmpEditorField
    }),
  }
}

async function loadPlanValueRows(
  supabase: ReturnType<typeof createClient>,
  planId: string,
  fields: EmpEditorField[]
) {
  const { data, error } = await supabase
    .from('emp_plan_field_values')
    .select('id, field_id, value_text, value_source, source_document_id, source_excerpt, updated_at')
    .eq('plan_id', planId)

  if (error) {
    throwEmpOperationError('Failed to load EMP field values', error)
  }

  const fieldIdToKey = new Map(fields.map((field) => [field.id, field.key]))

  return (data || []).map((row: any) => ({
    id: row.id,
    fieldId: row.field_id,
    fieldKey: fieldIdToKey.get(row.field_id) || row.field_id,
    valueText: row.value_text,
    valueSource: row.value_source,
    sourceDocumentId: row.source_document_id,
    sourceExcerpt: row.source_excerpt,
    updatedAt: row.updated_at,
  })) satisfies EmpEditorValueRow[]
}

async function loadPlanDocuments(
  supabase: ReturnType<typeof createClient>,
  planId: string
) {
  const { data, error } = await supabase
    .from('emp_source_documents')
    .select('id, document_kind, file_name, file_path, file_type, file_size, extracted_text, created_at')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })

  if (error) {
    throwEmpOperationError('Failed to load EMP source documents', error)
  }

  const baseDocuments = (data || []).map((document: any) => ({
    id: document.id,
    documentKind: document.document_kind,
    fileName: document.file_name,
    filePath: document.file_path,
    fileType: document.file_type,
    fileSize: Number(document.file_size || 0),
    extractedText: document.extracted_text,
    createdAt: document.created_at,
    signedUrl: null,
  })) satisfies EmpSourceDocumentSummary[]

  return Promise.all(
    baseDocuments.map(async (document) => ({
      ...document,
      signedUrl: await createEmpDocumentSignedUrl(supabase, document.filePath),
    }))
  )
}

async function loadEventControlLogEntries(
  supabase: ReturnType<typeof createClient>,
  planId: string
) {
  const { data, error } = await (supabase as any)
    .from('emp_event_control_log_entries')
    .select('id, plan_id, log_number, logged_at, from_call_sign, to_call_sign, occurrence, message_type, action_taken, owner, priority, status, created_at, updated_at')
    .eq('plan_id', planId)
    .order('log_number', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throwEmpEventControlLogOperationError('Failed to load EMP event control log entries', error)
  }

  return sortEventControlLogEntriesNewestFirst(((data || []) as EmpEventControlLogEntryRow[]).map(buildEventControlLogEntry))
}

async function loadEventControlLogSuggestions(
  supabase: ReturnType<typeof createClient>
): Promise<EmpEventControlLogSuggestions> {
  const { data, error } = await (supabase as any)
    .from('emp_event_control_log_entries')
    .select('from_call_sign, to_call_sign, message_type, owner')
    .order('updated_at', { ascending: false })
    .limit(500)

  if (error) {
    throwEmpEventControlLogOperationError('Failed to load EMP event control log suggestions', error)
  }

  const messageTypes = new Set<string>()
  const contacts = new Map<string, string>()
  const suggestionRows = (data || []) as Array<Pick<
    EmpEventControlLogEntryRow,
    'from_call_sign' | 'to_call_sign' | 'message_type' | 'owner'
  >>

  suggestionRows.forEach((row) => {
    const messageType = normalizeEventControlLogType(row.message_type)
    if (messageType) messageTypes.add(messageType)

    const contactValues = [row.from_call_sign, row.to_call_sign, row.owner]
    contactValues.forEach((value) => {
      const contact = clean(value)
      const key = contact.toLowerCase()
      if (contact && !contacts.has(key)) contacts.set(key, contact)
    })
  })

  return {
    messageTypes: Array.from(messageTypes),
    contacts: Array.from(contacts.values()),
  }
}

async function getNextEventControlLogNumber(
  supabase: ReturnType<typeof createClient>,
  planId: string
) {
  const { data, error } = await (supabase as any)
    .from('emp_event_control_log_entries')
    .select('log_number')
    .eq('plan_id', planId)
    .order('log_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throwEmpEventControlLogOperationError('Failed to inspect EMP event control log numbering', error)
  }

  return Number(data?.log_number || 0) + 1
}

async function syncPlanSummaryFromValues(input: {
  supabase: ReturnType<typeof createClient>
  planId: string
  updatedByUserId: string
  values: Record<string, string | null | undefined>
  selectedAnnexes?: string[]
  includeKssProfileAppendix?: boolean
}) {
  const nextTitle = clean(input.values.plan_title) || clean(input.values.event_name) || 'Untitled Event Management Plan'
  const nextEventName = clean(input.values.event_name) || null
  const nextDocumentStatus = clean(input.values.document_status) || null

  const updatePayload: Record<string, unknown> = {
    title: nextTitle,
    event_name: nextEventName,
    document_status: nextDocumentStatus,
    updated_by_user_id: input.updatedByUserId,
    updated_at: new Date().toISOString(),
  }

  if (input.selectedAnnexes) {
    updatePayload.selected_annexes = input.selectedAnnexes
  }

  if (typeof input.includeKssProfileAppendix === 'boolean') {
    updatePayload.include_kss_profile_appendix = input.includeKssProfileAppendix
  }

  const { error } = await input.supabase
    .from('emp_plans')
    .update(updatePayload)
    .eq('id', input.planId)

  if (error) {
    throwEmpOperationError('Failed to update EMP plan summary', error)
  }
}

export async function ensureEmpTemplateSeeded() {
  const { supabase, profile } = await getEmpUserContext()
  return ensureEmpTemplateSeededForContext(supabase, profile.id)
}

export async function listEmpPlans() {
  const { supabase, profile } = await getEmpUserContext()
  await ensureEmpTemplateSeededForContext(supabase, profile.id)
  await createEmpDownloadPlan()
  await createEmpIsleOfWightPlan()
  await createEmpParklifePlan()
  await createEmpStarterFestivalPlans()

  const { data, error } = await supabase
    .from('emp_plans')
    .select('id, template_id, title, event_name, status, document_status, selected_annexes, include_kss_profile_appendix, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (error) {
    throwEmpOperationError('Failed to load EMP plans', error)
  }

  return ((data || []) as EmpPlanRow[]).map(buildPlanSummary)
}

export async function createEmpPlan() {
  const { supabase, profile } = await getEmpUserContext()
  const template = await ensureEmpTemplateSeededForContext(supabase, profile.id)

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('emp_plans')
    .insert({
      template_id: template.id,
      title: 'Untitled Event Management Plan',
      status: 'draft',
      created_by_user_id: profile.id,
      updated_by_user_id: profile.id,
      updated_at: nowIso,
      document_status: 'Draft',
      selected_annexes: [],
      include_kss_profile_appendix: false,
    })
    .select('id')
    .single()

  if (error || !data) {
    throwEmpOperationError('Failed to create EMP plan', error)
  }

  return data.id as string
}

export async function createEmpPlanFromBusinessTemplate() {
  const { supabase, profile } = await getEmpUserContext()
  const template = await ensureEmpTemplateSeededForContext(supabase, profile.id)
  const metadata = getEmpBusinessTemplatePlanMetadata()

  const nowIso = new Date().toISOString()
  const { data: createdPlan, error: createPlanError } = await supabase
    .from('emp_plans')
    .insert({
      template_id: template.id,
      title: metadata.title,
      event_name: metadata.eventName,
      status: metadata.status,
      created_by_user_id: profile.id,
      updated_by_user_id: profile.id,
      updated_at: nowIso,
      document_status: metadata.documentStatus,
      selected_annexes: metadata.selectedAnnexes,
      include_kss_profile_appendix: metadata.includeKssProfileAppendix,
    })
    .select('id')
    .single()

  if (createPlanError || !createdPlan) {
    throwEmpOperationError('Failed to create EMP from business template', createPlanError)
  }

  const templateGraph = await loadTemplateGraph(supabase, template.id)
  const upserts = templateGraph.fields
    .map((field) => {
      const valueText = clean(EMP_BUSINESS_TEMPLATE_VALUES[field.key])
      if (!valueText) return null

      return {
        plan_id: createdPlan.id,
        field_id: field.id,
        value_text: valueText,
        value_source: 'manual',
        source_document_id: null,
        source_excerpt: null,
        updated_by_user_id: profile.id,
        updated_at: nowIso,
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>

  if (upserts.length > 0) {
    const { error: upsertError } = await supabase
      .from('emp_plan_field_values')
      .upsert(upserts, { onConflict: 'plan_id,field_id' })

    if (upsertError) {
      await supabase.from('emp_plans').delete().eq('id', createdPlan.id)
      throwEmpOperationError('Failed to seed business-template EMP values', upsertError)
    }
  }

  return createdPlan.id as string
}

export const createEmpPlanFromRadioOneTemplate = createEmpPlanFromBusinessTemplate

const DOWNLOAD_STALE_DEPLOYMENT_FIELD_PATTERNS: Record<string, RegExp> = {
  document_status: /^Draft$/,
  named_command_roles: /KSS Co-Op Supervisor - TBC|KSS Accessibility Campsite Supervisor - TBC|KSS Operational Support - David Capener/,
  radio_channels_callsigns: /^TBC\. Radio channels and call signs will be inserted/,
  reporting_lines: /^KSS staff report to their KSS supervisor\. KSS supervisors escalate to the KSS Operational Lead and Event Control\./,
  specialist_teams_and_assets: /^Specialist KSS assets include SIA search-capable staff, bar support officers, queue marshals, sponsor activation support,/,
  staffing_by_zone_and_time: /^(Campsite ingress - Accessibility campsite search support,|Draft deployment source - supplied FAB \/ Live Nation security schedule screenshots\.|Monday 8 June\|Sponsorship Supervisor\|Day x1)/,
  response_teams: /^KSS response pair\/team - Support refusals, sponsor activation (?:pre(?:ssure)|demand),/,
  service_delivery_scope: /^KSS service delivery covers allocated bars, the Co-Op shop, Paddock, Accessible Campsite A4, Accessible Campsite D,/,
  escalation_staffing: /^Escalation staffing is requested where bar queues or Co-Op shop queues block routes,/,
  front_of_stage_roles: /^For sponsor activations, KSS roles include queue layout,/,
  camping_security_roles: /^KSS camping roles focus on Accessible Campsite A4 and Accessible Campsite D,/,
  circulation_controls: /^KSS protects circulation around bars, Co-Op shop, Paddock and accessibility campsites through fixed observation,/,
  ramp_arrival: /^(Arrival pre(?:ssure) is expected across|KSS operating areas include)/,
  ramp_movement: /^Movement pre(?:ssure) will build/,
  egress_operations: /^Egress operations include bar wind-down, queue clear-down, Co-Op shop closure,/,
  emergency_procedures: /^Emergency procedures are directed by the wider Download EMP and Event Control\./,
  partial_evacuation_procedure: /^For partial evacuation of a bar, Co-Op shop, Paddock or accessibility campsite area, KSS stops entry,/,
  full_evacuation_procedure: /^For full evacuation, KSS follows Event Control instructions,/,
  lockdown_invacuation_procedure: /^For lockdown or invacuation, KSS moves customers away from exposed areas where safe,/,
  rendezvous_points: /^RVPs are controlled by Event Control\. Offsite RVP1 is MOTO Donington Park;/,
  command_escalation: /^Emergency escalation goes from KSS staff to KSS supervisor, KSS Operational Lead and Event Control\./,
  ct_procedures: /^KSS staff are briefed on ACT, SCaN, hostile reconnaissance,/,
  suspicious_item_protocol: /^Do not touch or move suspicious items\. Use HOT assessment,/,
  hostile_recon_indicators: /^Indicators include repeated filming of search lanes,/,
  key_contacts_directory: /phone TBC|KSS Operational Support - David Capener/,
  contact_directory: /phone TBC|KSS Operational Support - David Capener/,
}

const DOWNLOAD_SYNC_IF_MISSING_FIELD_KEYS = new Set([
  'operational_assumptions_dependencies',
  'dynamic_escalation_triggers',
])

const ISLE_OF_WIGHT_PENDING_SOURCE_PATTERN =
  /pending source document|to be confirmed|draft deployment source pending|deployment source pending|pending (?:KSS )?deployment schedule|deployment schedule remains pending|deployment schedule.*pending|will be inserted from the deployment document|previous-festival emp scaffold/i

const ISLE_OF_WIGHT_STALE_DEPLOYMENT_SOURCE_PATTERN =
  /IOWF KSS Security Schedule 2026 V2|147 non-zero KSS deployment rows|peaking at 73|SPONSORS \(RECHARGE\)|STAGES - OTHER|stage-other/i

const ISLE_OF_WIGHT_STALE_DOWNLOAD_SCOPE_PATTERN =
  /accessibility campsite search|Accessible Campsite A4|Accessible Campsite D|Accessibility Black Campsite|Co-?op shop|Paddock|District X|Donington|Search is carried out only on behalf of and under instruction of the client|Accessibility customers will receive dignified/i

const ISLE_OF_WIGHT_SYNC_IF_MISSING_FIELD_KEYS = new Set([
  'staffing_by_zone_and_time',
])

const ISLE_OF_WIGHT_STALE_FIELD_PATTERNS: Record<string, RegExp> = {
  document_status: /^Draft$/,
  purpose_scope_summary: /This draft incorporates the supplied IWF ESOP/,
  operational_hours: /^KSS deployment:? operates to (?:IOWF KSS Security Schedule 2026 V2|E06 Master - IOW26 Security Schedule V1) and Event Control instructions\./,
  staffing_by_zone_and_time: /^(Saturday 13 June\|SPONSORS \(RECHARGE\)\|COOP Store guard|Thursday 18 June\|CAMPSITES\|Pink Moon C\/Site Supervisor|Tues 16 Jun\|OTHER DEPLOYMENTS\|IQOS)/,
  named_command_roles: /KSS Deputy \/ Escalation Lead - David Capener/,
  key_contacts_directory: /KSS Deputy \/ Escalation Lead - David Capener/,
  contact_directory: /KSS Deputy \/ Escalation Lead - David Capener/,
  briefing_and_induction: /search consent/,
  search_screening_roles: /^KSS search\/screening roles are only applicable/,
  camping_security_roles: /^General campsite security is not identified as KSS scope/,
  ingress_operations: /^KSS ingress activity is focused on accessibility campsite search/,
  queue_design: /^Queue design for bars, Co-?op shop and accessibility campsite search/i,
  search_policy: /^Searching is carried out by licensed security/,
  accessible_entry_arrangements: /Accessible searches follow the event search level/,
  ramp_arrival: /^(Key areas include|Arrival planning cov(?:ers))/,
  ramp_movement: /^Movement pre(?:ssure)/,
  emergency_search_zones: /^Emergency search zones for KSS/,
  hostile_recon_indicators: /observation of search lanes/,
  appendix_notes: /Search and Screening annex/,
}

function isEmpDownloadSeedPlan(plan: EmpPlanRow) {
  const planIdentity = `${clean(plan.title)} ${clean(plan.event_name)}`
  return (
    clean(plan.title) === EMP_DOWNLOAD_PLAN_TITLE
    || clean(plan.event_name) === EMP_DOWNLOAD_EVENT_NAME
    || /Download Festival|DLF26/i.test(planIdentity)
  )
}

function isEmpIsleOfWightSeedPlan(plan: EmpPlanRow) {
  const planIdentity = `${clean(plan.title)} ${clean(plan.event_name)}`
  return (
    clean(plan.title) === EMP_ISLE_OF_WIGHT_PLAN_TITLE
    || clean(plan.event_name) === EMP_ISLE_OF_WIGHT_EVENT_NAME
    || /Isle of Wight Festival|IWF|IOW26|IOW\s*Festival/i.test(planIdentity)
  )
}

function isEmpParklifeSeedPlan(plan: EmpPlanRow) {
  const planIdentity = `${clean(plan.title)} ${clean(plan.event_name)}`
  return (
    clean(plan.title) === EMP_PARKLIFE_PLAN_TITLE
    || clean(plan.event_name) === EMP_PARKLIFE_EVENT_NAME
    || /Parklife Festival|Pepsi MAX presents Parklife|Heaton Park/i.test(planIdentity)
  )
}

function getEmpStarterFestivalSeedPlan(plan: EmpPlanRow) {
  const planIdentity = `${clean(plan.title)} ${clean(plan.event_name)}`
  return EMP_STARTER_FESTIVAL_PLANS.find((starterPlan) => (
    clean(plan.title) === starterPlan.planTitle
    || clean(plan.event_name) === starterPlan.eventName
    || planIdentity.includes(starterPlan.eventName)
  )) || null
}

const PARKLIFE_STALE_FIELD_PATTERNS: Record<string, RegExp> = {
  document_version: /^V0\.[1234]$/,
  document_status: /^Draft$/,
  issue_date: /^2026-06-01$/,
  distribution_list: /Bar operator \/ licence holder representative - TBC|Client or organiser representative - TBC|Bar operator \/ licence holder representative/,
  purpose_scope_summary: /KSS scope is limited to bar-security support/,
  related_documents: /event management plan - pending issue to KSS|crowd and security management plan - pending issue to KSS|site plan, bar plan and route map - pending issue to KSS|Bar operator risk assessment and operating procedures - pending issue to KSS|supervisor briefing pack|KSS final deployment schedule - to be added (?:when supplied|later)/,
  operational_assumptions_dependencies: /KSS operates under Parklife Event Control direction|Bar footprints, queue lanes, bar compounds|Deployment numbers, bar names, call signs/,
  event_type: /^Two-day metropolitan music festival/,
  venue_address: /M25 0EG/,
  venue_reference: /Public entry and exit gates are understood/,
  organiser_name: /Parklife Festival \/ organiser TBC/,
  client_name: /Parklife Festival \/ bar operator TBC|bar operator or licence holder representative to be confirmed to KSS/,
  principal_contractor: /Lead event delivery partner TBC/,
  key_delivery_partners: /KSS NW LTD - bar-security support where allocated|Medical Solutions Ltd - medical provision; WELSafe/,
  build_dates: /^TBC - to be confirmed from Parklife build schedule/,
  break_dates: /^TBC - to be confirmed from Parklife break schedule/,
  public_ingress_time: /with last entry at 17:00 and event finish at 23:00/,
  operational_hours: /^KSS deployment operates[\s\S]*(Last entry: 17:00 on both days|Bar operating times, last orders and close-down timings|final KSS staffing schedule)/,
  client_objectives: /Support the bar operator with Challenge policy/,
  licensed_capacity: /^Overall event capacity and licensed occupancy/,
  expected_attendance: /^Expected attendance is TBC in client documents/,
  staff_and_contractor_count: /^KSS staff numbers are TBC|KSS staff numbers remain TBC/,
  audience_age_profile: /^Parklife is advertised as a 17\+ event/,
  travel_modes: /arrangements\. KSS will preserve routes around allocated bars/,
  family_presence: /^The event is 17\+/,
  alcohol_profile: /^Alcohol demand is expected to be significant/,
  camping_profile: /^No KSS camping-security scope is identified/,
  historic_issues: /^Event-specific historic issues and intelligence are pending/,
  mood_and_trigger_points: /inconsistent ID decisions, adverse weather, lost friends/,
  peak_periods: /bar operator schedule|Warehouse Project schedule/,
  site_layout_summary: /Final bar names, grid references and routes are TBC pending|Final KSS bar names and post allocations remain subject/,
  key_zones: /Allocated bars and licensed service points - TBC|KSS post allocation TBC by deployment sheet/,
  emergency_exits_holding_areas: /rendezvous points are controlled by the wider Parklife emergency plan\. KSS will keep/,
  dim_aliced_information: /Challenge policy, refusal process/,
  dim_aliced_management: /bar operator contact/,
  dim_aliced_location: /East\/West Gate flows/,
  ramp_routes: /welfare and medical handover routes, stock routes/,
  ramp_movement: /food traders, welfare routes, service gates/,
  ramp_profile: /^The profile includes young adults, 17-year-old attendees/,
  gross_area: /route interfaces when issued/,
  density_assumptions: /emergency route compromise or conflict/,
  zone_capacities: /Emergency and accessible route widths - TBC from site plan|Bar compound capacities - TBC from bar operator|KSS staffing per bar - TBC/,
  ingress_flow_assumptions: /^KSS does not own public ingress\. Bar queue flow assumptions/,
  egress_flow_assumptions: /final bar schedule\. KSS will clear queue lanes/,
  command_structure: /^KSS bar teams report[\s\S]*Parklife Event Control remains/,
  named_command_roles: /KSS Operational Lead - TBC|KSS Bar Supervisors - TBC|Parklife Event Control - TBC|Bar Operator Lead - TBC to KSS/,
  radio_channels_callsigns: /^Radio channels and call signs are TBC|Radio channel numbers and KSS call signs are TBC/,
  reporting_lines: /^KSS staff report to their bar supervisor\. Bar supervisors escalate to the KSS operational lead|Immediate escalation is required/,
  external_interfaces: /Challenge policy and refusal records|Bar operator \/ licence holder - bar operations/,
  key_contacts_directory: /KSS Operational Lead - TBC|Parklife Event Control - TBC|Bar Operator Lead - TBC to KSS/,
  control_room_structure: /decision-making point\. KSS bar supervisors/,
  briefing_and_induction: /Ask Angela, spiking awareness|bar operator contacts/,
  monitoring_and_density_tools: /bar operator feedback/,
  specialist_teams_and_assets: /^Specialist teams and assets are TBC|Final deployment detail will identify/,
  staffing_by_zone_and_time: /^TBC - final KSS Parklife bar deployment schedule/,
  response_teams: /^TBC - any KSS response pair\/team|Final response-team numbers/,
  relief_and_contingency: /^Relief and contingency arrangements are TBC|where the final staffing schedule permits/,
  service_delivery_scope: /allocated Parklife bar-security support only/,
  build_break_operations: /^Build and break duties are not confirmed/,
  escalation_staffing: /asset concerns or emergency support/,
  dynamic_escalation_triggers: /or a change in threat posture\.$/,
  bar_operations_roles: /Challenge policy escalation/,
  search_screening_roles: /^No planned KSS search or screening ownership is identified for Parklife in this bar-only draft\. KSS may support/,
  vip_backstage_roles: /^No planned KSS VIP or backstage role/,
  ingress_routes_holding_areas: /Public entry routes are controlled by the wider event plan\.$/,
  queue_design: /^Bar queue design is TBC|^Final KSS bar queue design is TBC/,
  accessible_entry_arrangements: /^Accessible route arrangements around bars are TBC/,
  high_density_controls: /repeated refusals or bar operator request/,
  transport_interface: /public departure, taxi\/private hire movement, public transport demand/,
  dispersal_routes: /^Dispersal routes are controlled by the wider Parklife egress plan\. KSS will keep bar close-down routes clear/,
  safe_spaces: /^Safe space and welfare locations are TBC/,
  lost_vulnerable_person_process: /^Lost, vulnerable, intoxicated, distressed or isolated persons are escalated to supervisors and Event Control\. KSS should keep/,
  ask_for_angela_process: /^Any Ask Angela request/,
  dps_name: /^TBC - to be confirmed/,
  licensing_conditions: /^Relevant licensing conditions are TBC|support the bar operator with Challenge 25/,
  incident_management: /and hand over to police, medical, welfare, safeguarding or bar management as required\.$/,
  risk_assessment_methodology: /supplied Parklife planning information when issued/,
  risk_assessment_source_notes: /^Source documents are pending|Final hazards, controls, bar locations, bar operator procedures|KSS deployment details will be reconciled/,
  emergency_procedures: /directed by the wider Parklife EMP and Event Control/,
  full_evacuation_procedure: /^For full evacuation, KSS follows Event Control instructions and directs customers/,
  lockdown_invacuation_procedure: /^For lockdown or invacuation, KSS moves customers/,
  rendezvous_points: /^Rendezvous points are TBC/,
  emergency_search_zones: /^Emergency search zones and sterile routes are TBC/,
  hostile_recon_indicators: /bar staff, routes or compounds/,
  accessibility_team_liaison: /^Accessibility team liaison is TBC/,
  communications_plan: /Parklife radio plan when issued|Final channel numbers and call signs are TBC/,
  sitrep_decision_logging: /bar operator concern/,
  refusal_false_id_protocol: /factual logging\. Event Control must receive|live access to refusal JotForm submissions/,
  ejection_protocol: /but welfare and safeguarding checks must be completed before removal continues\.$/,
  ejection_safeguarding: /may be a child, vulnerable adult/,
  debrief_reporting: /Ask Angela\/spiking concerns/,
  site_maps_and_route_diagrams: /pending issue to KSS|Final KSS deployment map, bar queue plan and emergency-route extracts|Final KSS deployment allocation will be added/,
  appendix_notes: /Appendix B - Parklife site map and bar plan - pending|supervisor briefing|radio channel numbers and KSS call sign plan - to be added when issued|Bar operator procedures, alcohol-management details|KSS final deployment schedule - to be added when supplied/,
  version_history_summary: /^V0\.1 - Initial Parklife Festival 2026 KSS bar-security draft created with deployment details pending\.|final KSS deployment, bar operator procedures and radio details remain pending|V0\.3 - Updated Warehouse Project|V0\.4 - Added MASTER Parklife Manchester/,
  contact_directory: /KSS Operational Lead - TBC|Parklife Event Control - TBC|Bar Operator Lead - TBC to KSS/,
}

function shouldSyncSeedPlanSummaryStatus(plan: Pick<EmpPlanRow, 'document_status'>, expectedStatus: string) {
  return clean(plan.document_status).toLowerCase() !== clean(expectedStatus).toLowerCase()
}

async function syncDownloadPlanValuesForContext(input: {
  supabase: ReturnType<typeof createClient>
  profileId: string
  templateId: string
  planId: string
  nowIso: string
  mode?: 'all' | 'stale-only'
  forceSummary?: boolean
}) {
  const mode = input.mode || 'all'
  const templateGraph = await loadTemplateGraph(input.supabase, input.templateId)
  const currentRows = mode === 'stale-only'
    ? await loadPlanValueRows(input.supabase, input.planId, templateGraph.fields)
    : []
  const currentValueByKey = new Map(currentRows.map((row) => [row.fieldKey, clean(row.valueText)]))
  const staleCoOpPattern = /Co-Op-style|Co-Op and other sponsor activation|Co-Op-style activation/i
  const shouldSyncAll = mode === 'all' || (mode === 'stale-only' && currentRows.length === 0)

  const upserts = templateGraph.fields
    .map((field) => {
      const valueText = clean(EMP_DOWNLOAD_PLAN_VALUES[field.key])
      if (!valueText) return null
      const currentValue = currentValueByKey.get(field.key) || ''
      const staleDeploymentPattern = DOWNLOAD_STALE_DEPLOYMENT_FIELD_PATTERNS[field.key]
      const shouldSyncField =
        shouldSyncAll ||
        (!currentValue && DOWNLOAD_SYNC_IF_MISSING_FIELD_KEYS.has(field.key)) ||
        staleCoOpPattern.test(currentValue) ||
        Boolean(staleDeploymentPattern?.test(currentValue))
      if (!shouldSyncField) return null

      return {
        plan_id: input.planId,
        field_id: field.id,
        value_text: valueText,
        value_source: 'manual',
        source_document_id: null,
        source_excerpt: null,
        updated_by_user_id: input.profileId,
        updated_at: input.nowIso,
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>

  if (mode === 'stale-only' && upserts.length === 0 && !input.forceSummary) {
    return
  }

  if (upserts.length > 0) {
    const { error: upsertError } = await input.supabase
      .from('emp_plan_field_values')
      .upsert(upserts, { onConflict: 'plan_id,field_id' })

    if (upsertError) {
      throwEmpOperationError('Failed to seed Download EMP plan values', upsertError)
    }
  }

  await syncPlanSummaryFromValues({
    supabase: input.supabase,
    planId: input.planId,
    updatedByUserId: input.profileId,
    values: EMP_DOWNLOAD_PLAN_VALUES,
    selectedAnnexes: EMP_DOWNLOAD_SELECTED_ANNEXES,
    includeKssProfileAppendix: false,
  })
}

async function syncIsleOfWightPlanValuesForContext(input: {
  supabase: ReturnType<typeof createClient>
  profileId: string
  templateId: string
  planId: string
  nowIso: string
  mode?: 'all' | 'pending-only'
  forceSummary?: boolean
}) {
  const mode = input.mode || 'all'
  const templateGraph = await loadTemplateGraph(input.supabase, input.templateId)
  const currentRows = mode === 'pending-only'
    ? await loadPlanValueRows(input.supabase, input.planId, templateGraph.fields)
    : []
  const currentValueByKey = new Map(currentRows.map((row) => [row.fieldKey, clean(row.valueText)]))
  const shouldSyncAll = mode === 'all' || (mode === 'pending-only' && currentRows.length === 0)

  const upserts = templateGraph.fields
    .map((field) => {
      const valueText = clean(EMP_ISLE_OF_WIGHT_PLAN_VALUES[field.key])
      if (!valueText) return null

      const currentValue = currentValueByKey.get(field.key) || ''
      const staleFieldPattern = ISLE_OF_WIGHT_STALE_FIELD_PATTERNS[field.key]
      const shouldSyncField =
        shouldSyncAll ||
        (!currentValue && ISLE_OF_WIGHT_SYNC_IF_MISSING_FIELD_KEYS.has(field.key)) ||
        Boolean(staleFieldPattern?.test(currentValue)) ||
        (ISLE_OF_WIGHT_STALE_DEPLOYMENT_SOURCE_PATTERN.test(currentValue) && valueText !== currentValue) ||
        (ISLE_OF_WIGHT_STALE_DOWNLOAD_SCOPE_PATTERN.test(currentValue) && valueText !== currentValue) ||
        (ISLE_OF_WIGHT_PENDING_SOURCE_PATTERN.test(currentValue) && valueText !== currentValue)
      if (!shouldSyncField) return null

      return {
        plan_id: input.planId,
        field_id: field.id,
        value_text: valueText,
        value_source: 'manual',
        source_document_id: null,
        source_excerpt: null,
        updated_by_user_id: input.profileId,
        updated_at: input.nowIso,
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>

  if (mode === 'pending-only' && upserts.length === 0 && !input.forceSummary) {
    return
  }

  if (upserts.length > 0) {
    const { error: upsertError } = await input.supabase
      .from('emp_plan_field_values')
      .upsert(upserts, { onConflict: 'plan_id,field_id' })

    if (upsertError) {
      throwEmpOperationError('Failed to seed Isle of Wight EMP plan values', upsertError)
    }
  }

  await syncPlanSummaryFromValues({
    supabase: input.supabase,
    planId: input.planId,
    updatedByUserId: input.profileId,
    values: EMP_ISLE_OF_WIGHT_PLAN_VALUES,
    selectedAnnexes: EMP_ISLE_OF_WIGHT_SELECTED_ANNEXES,
    includeKssProfileAppendix: false,
  })
}

async function syncParklifePlanValuesForContext(input: {
  supabase: ReturnType<typeof createClient>
  profileId: string
  templateId: string
  planId: string
  nowIso: string
  mode?: 'all' | 'missing-only'
  forceSummary?: boolean
}) {
  const mode = input.mode || 'all'
  const templateGraph = await loadTemplateGraph(input.supabase, input.templateId)
  const currentRows = mode === 'missing-only'
    ? await loadPlanValueRows(input.supabase, input.planId, templateGraph.fields)
    : []
  const currentValueByKey = new Map(currentRows.map((row) => [row.fieldKey, clean(row.valueText)]))
  const shouldSyncAll = mode === 'all' || (mode === 'missing-only' && currentRows.length === 0)

  const upserts = templateGraph.fields
    .map((field) => {
      const valueText = clean(EMP_PARKLIFE_PLAN_VALUES[field.key])
      if (!valueText) return null

      const currentValue = currentValueByKey.get(field.key) || ''
      const staleFieldPattern = PARKLIFE_STALE_FIELD_PATTERNS[field.key]
      const shouldSyncField =
        shouldSyncAll ||
        !currentValue ||
        Boolean(staleFieldPattern?.test(currentValue))
      if (!shouldSyncField) return null

      return {
        plan_id: input.planId,
        field_id: field.id,
        value_text: valueText,
        value_source: 'manual',
        source_document_id: null,
        source_excerpt: null,
        updated_by_user_id: input.profileId,
        updated_at: input.nowIso,
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>

  if (mode === 'missing-only' && upserts.length === 0 && !input.forceSummary) {
    return
  }

  if (upserts.length > 0) {
    const { error: upsertError } = await input.supabase
      .from('emp_plan_field_values')
      .upsert(upserts, { onConflict: 'plan_id,field_id' })

    if (upsertError) {
      throwEmpOperationError('Failed to seed Parklife EMP plan values', upsertError)
    }
  }

  await syncPlanSummaryFromValues({
    supabase: input.supabase,
    planId: input.planId,
    updatedByUserId: input.profileId,
    values: EMP_PARKLIFE_PLAN_VALUES,
    selectedAnnexes: EMP_PARKLIFE_SELECTED_ANNEXES,
    includeKssProfileAppendix: false,
  })
}

async function syncStarterFestivalPlanValuesForContext(input: {
  supabase: ReturnType<typeof createClient>
  profileId: string
  templateId: string
  planId: string
  nowIso: string
  starterPlan: EmpFestivalStarterPlan
  mode?: 'all' | 'missing-only'
  forceSummary?: boolean
}) {
  const mode = input.mode || 'all'
  const templateGraph = await loadTemplateGraph(input.supabase, input.templateId)
  const currentRows = mode === 'missing-only'
    ? await loadPlanValueRows(input.supabase, input.planId, templateGraph.fields)
    : []
  const currentValueByKey = new Map(currentRows.map((row) => [row.fieldKey, clean(row.valueText)]))
  const shouldSyncAll = mode === 'all' || (mode === 'missing-only' && currentRows.length === 0)

  const upserts = templateGraph.fields
    .map((field) => {
      const valueText = clean(input.starterPlan.values[field.key])
      if (!valueText) return null

      const currentValue = currentValueByKey.get(field.key) || ''
      const shouldSyncField = shouldSyncAll || !currentValue
      if (!shouldSyncField) return null

      return {
        plan_id: input.planId,
        field_id: field.id,
        value_text: valueText,
        value_source: 'manual',
        source_document_id: null,
        source_excerpt: null,
        updated_by_user_id: input.profileId,
        updated_at: input.nowIso,
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>

  if (mode === 'missing-only' && upserts.length === 0 && !input.forceSummary) {
    return
  }

  if (upserts.length > 0) {
    const { error: upsertError } = await input.supabase
      .from('emp_plan_field_values')
      .upsert(upserts, { onConflict: 'plan_id,field_id' })

    if (upsertError) {
      throwEmpOperationError(`Failed to seed ${input.starterPlan.eventName} EMP plan values`, upsertError)
    }
  }

  if (mode === 'all' || input.forceSummary) {
    await syncPlanSummaryFromValues({
      supabase: input.supabase,
      planId: input.planId,
      updatedByUserId: input.profileId,
      values: input.starterPlan.values,
      selectedAnnexes: input.starterPlan.selectedAnnexes,
      includeKssProfileAppendix: false,
    })
  }
}

export async function createEmpDownloadPlan() {
  const { supabase, profile } = await getEmpUserContext()
  const template = await ensureEmpTemplateSeededForContext(supabase, profile.id)

  const { data: existingPlan, error: existingPlanError } = await supabase
    .from('emp_plans')
    .select('id, document_status')
    .eq('template_id', template.id)
    .eq('title', EMP_DOWNLOAD_PLAN_TITLE)
    .maybeSingle()

  if (existingPlanError) {
    throwEmpOperationError('Failed to load Download EMP plan', existingPlanError)
  }

  if (existingPlan?.id) {
    await syncDownloadPlanValuesForContext({
      supabase,
      profileId: profile.id,
      templateId: template.id,
      planId: existingPlan.id as string,
      nowIso: new Date().toISOString(),
      mode: 'stale-only',
      forceSummary: shouldSyncSeedPlanSummaryStatus(
        { document_status: existingPlan.document_status as string | null },
        EMP_DOWNLOAD_PLAN_VALUES.document_status
      ),
    })
    return existingPlan.id as string
  }

  const nowIso = new Date().toISOString()
  const { data: createdPlan, error: createPlanError } = await supabase
    .from('emp_plans')
    .insert({
      template_id: template.id,
      title: EMP_DOWNLOAD_PLAN_TITLE,
      event_name: EMP_DOWNLOAD_EVENT_NAME,
      status: 'draft',
      created_by_user_id: profile.id,
      updated_by_user_id: profile.id,
      updated_at: nowIso,
      document_status: EMP_DOWNLOAD_PLAN_VALUES.document_status,
      selected_annexes: EMP_DOWNLOAD_SELECTED_ANNEXES,
      include_kss_profile_appendix: false,
    })
    .select('id')
    .single()

  if (createPlanError || !createdPlan) {
    throwEmpOperationError('Failed to create Download EMP plan', createPlanError)
  }

  try {
    await syncDownloadPlanValuesForContext({
      supabase,
      profileId: profile.id,
      templateId: template.id,
      planId: createdPlan.id as string,
      nowIso,
      mode: 'all',
    })
  } catch (error) {
    await supabase.from('emp_plans').delete().eq('id', createdPlan.id)
    throw error
  }

  return createdPlan.id as string
}

export async function createEmpIsleOfWightPlan() {
  const { supabase, profile } = await getEmpUserContext()
  const template = await ensureEmpTemplateSeededForContext(supabase, profile.id)

  const { data: existingPlan, error: existingPlanError } = await supabase
    .from('emp_plans')
    .select('id, document_status')
    .eq('template_id', template.id)
    .eq('title', EMP_ISLE_OF_WIGHT_PLAN_TITLE)
    .maybeSingle()

  if (existingPlanError) {
    throwEmpOperationError('Failed to load Isle of Wight EMP plan', existingPlanError)
  }

  if (existingPlan?.id) {
    await syncIsleOfWightPlanValuesForContext({
      supabase,
      profileId: profile.id,
      templateId: template.id,
      planId: existingPlan.id as string,
      nowIso: new Date().toISOString(),
      mode: 'pending-only',
      forceSummary: shouldSyncSeedPlanSummaryStatus(
        { document_status: existingPlan.document_status as string | null },
        EMP_ISLE_OF_WIGHT_PLAN_VALUES.document_status
      ),
    })
    return existingPlan.id as string
  }

  const nowIso = new Date().toISOString()
  const { data: createdPlan, error: createPlanError } = await supabase
    .from('emp_plans')
    .insert({
      template_id: template.id,
      title: EMP_ISLE_OF_WIGHT_PLAN_TITLE,
      event_name: EMP_ISLE_OF_WIGHT_EVENT_NAME,
      status: 'draft',
      created_by_user_id: profile.id,
      updated_by_user_id: profile.id,
      updated_at: nowIso,
      document_status: EMP_ISLE_OF_WIGHT_PLAN_VALUES.document_status,
      selected_annexes: EMP_ISLE_OF_WIGHT_SELECTED_ANNEXES,
      include_kss_profile_appendix: false,
    })
    .select('id')
    .single()

  if (createPlanError || !createdPlan) {
    throwEmpOperationError('Failed to create Isle of Wight EMP plan', createPlanError)
  }

  try {
    await syncIsleOfWightPlanValuesForContext({
      supabase,
      profileId: profile.id,
      templateId: template.id,
      planId: createdPlan.id as string,
      nowIso,
      mode: 'all',
    })
  } catch (error) {
    await supabase.from('emp_plans').delete().eq('id', createdPlan.id)
    throw error
  }

  return createdPlan.id as string
}

export async function createEmpParklifePlan() {
  const { supabase, profile } = await getEmpUserContext()
  const template = await ensureEmpTemplateSeededForContext(supabase, profile.id)

  const { data: existingPlan, error: existingPlanError } = await supabase
    .from('emp_plans')
    .select('id, document_status')
    .eq('template_id', template.id)
    .eq('title', EMP_PARKLIFE_PLAN_TITLE)
    .maybeSingle()

  if (existingPlanError) {
    throwEmpOperationError('Failed to load Parklife EMP plan', existingPlanError)
  }

  if (existingPlan?.id) {
    await syncParklifePlanValuesForContext({
      supabase,
      profileId: profile.id,
      templateId: template.id,
      planId: existingPlan.id as string,
      nowIso: new Date().toISOString(),
      mode: 'missing-only',
      forceSummary: shouldSyncSeedPlanSummaryStatus(
        { document_status: existingPlan.document_status as string | null },
        EMP_PARKLIFE_PLAN_VALUES.document_status
      ),
    })
    return existingPlan.id as string
  }

  const nowIso = new Date().toISOString()
  const { data: createdPlan, error: createPlanError } = await supabase
    .from('emp_plans')
    .insert({
      template_id: template.id,
      title: EMP_PARKLIFE_PLAN_TITLE,
      event_name: EMP_PARKLIFE_EVENT_NAME,
      status: 'draft',
      created_by_user_id: profile.id,
      updated_by_user_id: profile.id,
      updated_at: nowIso,
      document_status: EMP_PARKLIFE_PLAN_VALUES.document_status,
      selected_annexes: EMP_PARKLIFE_SELECTED_ANNEXES,
      include_kss_profile_appendix: false,
    })
    .select('id')
    .single()

  if (createPlanError || !createdPlan) {
    throwEmpOperationError('Failed to create Parklife EMP plan', createPlanError)
  }

  try {
    await syncParklifePlanValuesForContext({
      supabase,
      profileId: profile.id,
      templateId: template.id,
      planId: createdPlan.id as string,
      nowIso,
      mode: 'all',
    })
  } catch (error) {
    await supabase.from('emp_plans').delete().eq('id', createdPlan.id)
    throw error
  }

  return createdPlan.id as string
}

async function findExistingStarterFestivalPlan(
  supabase: ReturnType<typeof createClient>,
  templateId: string,
  starterPlan: EmpFestivalStarterPlan
) {
  const { data: eventNamePlan, error: eventNameError } = await supabase
    .from('emp_plans')
    .select('id, document_status')
    .eq('template_id', templateId)
    .eq('event_name', starterPlan.eventName)
    .maybeSingle()

  if (eventNameError) {
    throwEmpOperationError(`Failed to load ${starterPlan.eventName} EMP plan`, eventNameError)
  }

  if (eventNamePlan?.id) {
    return eventNamePlan
  }

  const { data: titlePlan, error: titleError } = await supabase
    .from('emp_plans')
    .select('id, document_status')
    .eq('template_id', templateId)
    .eq('title', starterPlan.planTitle)
    .maybeSingle()

  if (titleError) {
    throwEmpOperationError(`Failed to load ${starterPlan.eventName} EMP plan`, titleError)
  }

  return titlePlan
}

export async function createEmpStarterFestivalPlan(starterPlan: EmpFestivalStarterPlan) {
  const { supabase, profile } = await getEmpUserContext()
  const template = await ensureEmpTemplateSeededForContext(supabase, profile.id)
  const existingPlan = await findExistingStarterFestivalPlan(supabase, template.id, starterPlan)

  if (existingPlan?.id) {
    await syncStarterFestivalPlanValuesForContext({
      supabase,
      profileId: profile.id,
      templateId: template.id,
      planId: existingPlan.id as string,
      nowIso: new Date().toISOString(),
      starterPlan,
      mode: 'missing-only',
      forceSummary: shouldSyncSeedPlanSummaryStatus(
        { document_status: existingPlan.document_status as string | null },
        starterPlan.values.document_status
      ),
    })
    return existingPlan.id as string
  }

  const nowIso = new Date().toISOString()
  const { data: createdPlan, error: createPlanError } = await supabase
    .from('emp_plans')
    .insert({
      template_id: template.id,
      title: starterPlan.planTitle,
      event_name: starterPlan.eventName,
      status: 'draft',
      created_by_user_id: profile.id,
      updated_by_user_id: profile.id,
      updated_at: nowIso,
      document_status: starterPlan.values.document_status,
      selected_annexes: starterPlan.selectedAnnexes,
      include_kss_profile_appendix: false,
    })
    .select('id')
    .single()

  if (createPlanError || !createdPlan) {
    throwEmpOperationError(`Failed to create ${starterPlan.eventName} EMP plan`, createPlanError)
  }

  try {
    await syncStarterFestivalPlanValuesForContext({
      supabase,
      profileId: profile.id,
      templateId: template.id,
      planId: createdPlan.id as string,
      nowIso,
      starterPlan,
      mode: 'all',
    })
  } catch (error) {
    await supabase.from('emp_plans').delete().eq('id', createdPlan.id)
    throw error
  }

  return createdPlan.id as string
}

export async function createEmpStarterFestivalPlanByKey(key: string) {
  const starterPlan = getEmpStarterFestivalPlanByKey(key)
  if (!starterPlan) {
    throw new Error(`Unknown EMP starter festival plan: ${key}`)
  }

  return createEmpStarterFestivalPlan(starterPlan)
}

export async function createEmpStarterFestivalPlans() {
  for (const starterPlan of EMP_STARTER_FESTIVAL_PLANS) {
    await createEmpStarterFestivalPlan(starterPlan)
  }
}

export async function createEmpDemoPlan() {
  const { supabase, profile } = await getEmpUserContext()
  const template = await ensureEmpTemplateSeededForContext(supabase, profile.id)

  const { data: existingPlan, error: existingPlanError } = await supabase
    .from('emp_plans')
    .select('id')
    .eq('template_id', template.id)
    .eq('title', EMP_DEMO_PLAN_TITLE)
    .maybeSingle()

  if (existingPlanError) {
    throwEmpOperationError('Failed to load EMP example plan', existingPlanError)
  }

  if (existingPlan?.id) {
    return existingPlan.id as string
  }

  const nowIso = new Date().toISOString()
  const { data: createdPlan, error: createPlanError } = await supabase
    .from('emp_plans')
    .insert({
      template_id: template.id,
      title: EMP_DEMO_PLAN_TITLE,
      event_name: EMP_DEMO_EVENT_NAME,
      status: 'ready',
      created_by_user_id: profile.id,
      updated_by_user_id: profile.id,
      updated_at: nowIso,
      document_status: 'Final',
      selected_annexes: EMP_DEMO_SELECTED_ANNEXES,
      include_kss_profile_appendix: false,
    })
    .select('id')
    .single()

  if (createPlanError || !createdPlan) {
    throwEmpOperationError('Failed to create EMP example plan', createPlanError)
  }

  const templateGraph = await loadTemplateGraph(supabase, template.id)
  const upserts = templateGraph.fields
    .map((field) => {
      const valueText = clean(EMP_DEMO_PLAN_VALUES[field.key])
      if (!valueText) return null

      return {
        plan_id: createdPlan.id,
        field_id: field.id,
        value_text: valueText,
        value_source: 'manual',
        source_document_id: null,
        source_excerpt: null,
        updated_by_user_id: profile.id,
        updated_at: nowIso,
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>

  if (upserts.length > 0) {
    const { error: upsertError } = await supabase
      .from('emp_plan_field_values')
      .upsert(upserts, { onConflict: 'plan_id,field_id' })

    if (upsertError) {
      await supabase.from('emp_plans').delete().eq('id', createdPlan.id)
      throwEmpOperationError('Failed to seed EMP example plan values', upsertError)
    }
  }

  await syncPlanSummaryFromValues({
    supabase,
    planId: createdPlan.id,
    updatedByUserId: profile.id,
    values: EMP_DEMO_PLAN_VALUES,
    selectedAnnexes: EMP_DEMO_SELECTED_ANNEXES,
    includeKssProfileAppendix: false,
  })

  return createdPlan.id as string
}

export async function deleteEmpPlan(planId: string) {
  const { supabase } = await getEmpUserContext()
  await getPlanOrThrow(supabase, planId)
  const documents = await loadPlanDocuments(supabase, planId)
  const filePaths = documents.map((document) => document.filePath).filter(Boolean)

  const { error: deleteError } = await supabase
    .from('emp_plans')
    .delete()
    .eq('id', planId)

  if (deleteError) {
    throwEmpOperationError('Failed to delete EMP plan', deleteError)
  }

  if (filePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from('emp-documents').remove(filePaths)
    if (storageError) {
      console.error('Failed to remove EMP source files during plan deletion:', storageError)
    }
  }

  return { deletedPlanId: planId }
}

export async function getEmpPlanEditorData(planId: string): Promise<EmpPlanEditorData> {
  const { supabase, profile } = await getEmpUserContext()
  await ensureEmpTemplateSeededForContext(supabase, profile.id)

  const initialPlan = await getPlanOrThrow(supabase, planId)
  const isDownloadSeedPlan = isEmpDownloadSeedPlan(initialPlan)
  const isIsleOfWightSeedPlan = isEmpIsleOfWightSeedPlan(initialPlan)
  const isParklifeSeedPlan = isEmpParklifeSeedPlan(initialPlan)
  const starterFestivalSeedPlan = getEmpStarterFestivalSeedPlan(initialPlan)

  if (isDownloadSeedPlan) {
    await syncDownloadPlanValuesForContext({
      supabase,
      profileId: profile.id,
      templateId: initialPlan.template_id,
      planId,
      nowIso: new Date().toISOString(),
      mode: 'stale-only',
      forceSummary: shouldSyncSeedPlanSummaryStatus(
        initialPlan,
        EMP_DOWNLOAD_PLAN_VALUES.document_status
      ),
    })
  }

  if (isIsleOfWightSeedPlan) {
    await syncIsleOfWightPlanValuesForContext({
      supabase,
      profileId: profile.id,
      templateId: initialPlan.template_id,
      planId,
      nowIso: new Date().toISOString(),
      mode: 'pending-only',
      forceSummary: shouldSyncSeedPlanSummaryStatus(
        initialPlan,
        EMP_ISLE_OF_WIGHT_PLAN_VALUES.document_status
      ),
    })
  }

  if (isParklifeSeedPlan) {
    await syncParklifePlanValuesForContext({
      supabase,
      profileId: profile.id,
      templateId: initialPlan.template_id,
      planId,
      nowIso: new Date().toISOString(),
      mode: 'missing-only',
      forceSummary: shouldSyncSeedPlanSummaryStatus(
        initialPlan,
        EMP_PARKLIFE_PLAN_VALUES.document_status
      ),
    })
  }

  if (starterFestivalSeedPlan) {
    await syncStarterFestivalPlanValuesForContext({
      supabase,
      profileId: profile.id,
      templateId: initialPlan.template_id,
      planId,
      nowIso: new Date().toISOString(),
      starterPlan: starterFestivalSeedPlan,
      mode: 'missing-only',
      forceSummary: shouldSyncSeedPlanSummaryStatus(
        initialPlan,
        starterFestivalSeedPlan.values.document_status
      ),
    })
  }

  const plan = isDownloadSeedPlan || isIsleOfWightSeedPlan || isParklifeSeedPlan || starterFestivalSeedPlan
    ? await getPlanOrThrow(supabase, planId)
    : initialPlan
  const templateGraph = await loadTemplateGraph(supabase, plan.template_id)
  const values = await loadPlanValueRows(supabase, planId, templateGraph.fields)
  const documents = await loadPlanDocuments(supabase, planId)

  const { data: template, error: templateError } = await supabase
    .from('emp_templates')
    .select('id, title, description')
    .eq('id', plan.template_id)
    .single()

  if (templateError || !template) {
    throwEmpOperationError('Failed to load EMP template', templateError)
  }

  return {
    plan: buildPlanSummary(plan),
    template: {
      id: template.id,
      title: template.title,
      description: template.description,
    },
    sections: templateGraph.sections,
    fields: templateGraph.fields,
    values,
    documents,
  }
}

export async function getEmpEventControlLogData(planId: string): Promise<EmpEventControlLogData> {
  const { supabase, profile } = await getEmpUserContext()
  await ensureEmpTemplateSeededForContext(supabase, profile.id)

  const plan = await getPlanOrThrow(supabase, planId)
  const entries = await loadEventControlLogEntries(supabase, planId)
  const suggestions = await loadEventControlLogSuggestions(supabase)

  return {
    plan: buildPlanSummary(plan),
    entries,
    suggestions,
  }
}

async function touchEmpPlan(input: {
  supabase: ReturnType<typeof createClient>
  planId: string
  updatedByUserId: string
}) {
  const { error } = await input.supabase
    .from('emp_plans')
    .update({
      updated_by_user_id: input.updatedByUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.planId)

  if (error) {
    throwEmpOperationError('Failed to update EMP plan timestamp', error)
  }
}

export async function createEmpEventControlLogEntry(input: {
  planId: string
  loggedAt?: string
  fromCallSign?: string | null
  toCallSign?: string | null
  occurrence: string
  messageType?: string
  actionTaken?: string | null
  owner?: string | null
  priority?: string
  status?: string
}) {
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase, input.planId)

  const occurrence = clean(input.occurrence)
  if (!occurrence) {
    throw new Error('Occurrence is required')
  }

  const loggedAt = normalizeEventControlLogLoggedAt(input.loggedAt)
  const nowIso = new Date().toISOString()
  const logNumber = await getNextEventControlLogNumber(supabase, input.planId)

  const { data, error } = await (supabase as any)
    .from('emp_event_control_log_entries')
    .insert({
      plan_id: input.planId,
      log_number: logNumber,
      logged_at: loggedAt,
      from_call_sign: clean(input.fromCallSign) || null,
      to_call_sign: clean(input.toCallSign) || 'Event Control',
      occurrence,
      message_type: normalizeEventControlLogType(input.messageType),
      action_taken: clean(input.actionTaken) || null,
      owner: clean(input.owner) || null,
      priority: normalizeEventControlLogPriority(input.priority),
      status: normalizeEventControlLogStatus(input.status),
      created_by_user_id: profile.id,
      updated_by_user_id: profile.id,
      updated_at: nowIso,
    })
    .select('id, plan_id, log_number, logged_at, from_call_sign, to_call_sign, occurrence, message_type, action_taken, owner, priority, status, created_at, updated_at')
    .single()

  if (error || !data) {
    throwEmpEventControlLogOperationError('Failed to create EMP event control log entry', error)
  }

  await touchEmpPlan({ supabase, planId: input.planId, updatedByUserId: profile.id })

  return buildEventControlLogEntry(data as EmpEventControlLogEntryRow)
}

export async function updateEmpEventControlLogEntry(input: {
  planId: string
  entryId: string
  loggedAt?: string
  fromCallSign?: string | null
  toCallSign?: string | null
  occurrenceAmendment?: string | null
  messageType?: string
  actionTakenAmendment?: string | null
  owner?: string | null
  priority?: string
  status?: string
}) {
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase, input.planId)
  const nowIso = new Date().toISOString()

  const updatePayload: Record<string, unknown> = {
    updated_by_user_id: profile.id,
    updated_at: nowIso,
  }

  if (typeof input.loggedAt === 'string') updatePayload.logged_at = normalizeEventControlLogLoggedAt(input.loggedAt)
  if (typeof input.fromCallSign !== 'undefined') updatePayload.from_call_sign = clean(input.fromCallSign) || null
  if (typeof input.toCallSign !== 'undefined') updatePayload.to_call_sign = clean(input.toCallSign) || null
  if (typeof input.messageType === 'string') updatePayload.message_type = normalizeEventControlLogType(input.messageType)
  if (typeof input.owner !== 'undefined') updatePayload.owner = clean(input.owner) || null
  if (typeof input.priority === 'string') updatePayload.priority = normalizeEventControlLogPriority(input.priority)
  if (typeof input.status === 'string') updatePayload.status = normalizeEventControlLogStatus(input.status)

  const occurrenceAmendment = clean(input.occurrenceAmendment)
  const actionTakenAmendment = clean(input.actionTakenAmendment)
  if (occurrenceAmendment || actionTakenAmendment) {
    const { data: currentEntry, error: currentEntryError } = await (supabase as any)
      .from('emp_event_control_log_entries')
      .select('occurrence, action_taken')
      .eq('id', input.entryId)
      .eq('plan_id', input.planId)
      .single()

    if (currentEntryError || !currentEntry) {
      throwEmpEventControlLogOperationError('Failed to load EMP event control log entry for amendment', currentEntryError)
    }

    if (occurrenceAmendment) {
      updatePayload.occurrence = buildEventControlLogAmendment({
        currentValue: currentEntry.occurrence,
        amendment: occurrenceAmendment,
        amendedAt: nowIso,
        amendedBy: profile.full_name,
      })
    }

    if (actionTakenAmendment) {
      updatePayload.action_taken = buildEventControlLogAmendment({
        currentValue: currentEntry.action_taken,
        amendment: actionTakenAmendment,
        amendedAt: nowIso,
        amendedBy: profile.full_name,
      })
    }
  }

  const { data, error } = await (supabase as any)
    .from('emp_event_control_log_entries')
    .update(updatePayload)
    .eq('id', input.entryId)
    .eq('plan_id', input.planId)
    .select('id, plan_id, log_number, logged_at, from_call_sign, to_call_sign, occurrence, message_type, action_taken, owner, priority, status, created_at, updated_at')
    .single()

  if (error || !data) {
    throwEmpEventControlLogOperationError('Failed to update EMP event control log entry', error)
  }

  await touchEmpPlan({ supabase, planId: input.planId, updatedByUserId: profile.id })

  return buildEventControlLogEntry(data as EmpEventControlLogEntryRow)
}

export async function saveEmpPlanFields(input: {
  planId: string
  values: Record<string, string>
  selectedAnnexes?: string[]
  includeKssProfileAppendix?: boolean
}) {
  const { supabase, profile } = await getEmpUserContext()
  const plan = await getPlanOrThrow(supabase, input.planId)
  const templateGraph = await loadTemplateGraph(supabase, plan.template_id)
  const existingRows = await loadPlanValueRows(supabase, input.planId, templateGraph.fields)

  const existingByFieldId = new Map(existingRows.map((row) => [row.fieldId, row]))
  const upserts: Array<Record<string, unknown>> = []
  const deleteIds: string[] = []
  const normalizedValues: Record<string, string> = {}

  for (const field of templateGraph.fields) {
    if (!(field.key in input.values)) continue

    const nextValue = clean(input.values[field.key])
    normalizedValues[field.key] = nextValue
    const existing = existingByFieldId.get(field.id)
    const fallbackValue = clean(field.defaultValueText)

    if (!nextValue || nextValue === fallbackValue) {
      if (existing?.id) {
        deleteIds.push(existing.id)
      }
      continue
    }

    upserts.push({
      plan_id: input.planId,
      field_id: field.id,
      value_text: nextValue,
      value_source: 'manual',
      source_document_id: null,
      source_excerpt: null,
      updated_by_user_id: profile.id,
      updated_at: new Date().toISOString(),
    })
  }

  if (upserts.length > 0) {
    const { error: upsertError } = await supabase
      .from('emp_plan_field_values')
      .upsert(upserts, { onConflict: 'plan_id,field_id' })

    if (upsertError) {
      throwEmpOperationError('Failed to save EMP fields', upsertError)
    }
  }

  if (deleteIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('emp_plan_field_values')
      .delete()
      .in('id', deleteIds)

    if (deleteError) {
      throwEmpOperationError('Failed to clear EMP fields', deleteError)
    }
  }

  await syncPlanSummaryFromValues({
    supabase,
    planId: input.planId,
    updatedByUserId: profile.id,
    values: normalizedValues,
    selectedAnnexes: input.selectedAnnexes,
    includeKssProfileAppendix: input.includeKssProfileAppendix,
  })

  return getEmpPlanEditorData(input.planId)
}

export async function uploadEmpSourceDocument(input: {
  planId: string
  documentKind: EmpDocumentKind | string
  file: File
  replaceExisting?: boolean
}) {
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase, input.planId)
  let existingDocumentIds: string[] = []
  let existingFilePaths: string[] = []

  if (input.replaceExisting) {
    const { data: existingDocuments, error: existingDocumentsError } = await supabase
      .from('emp_source_documents')
      .select('id, file_path')
      .eq('plan_id', input.planId)
      .eq('document_kind', input.documentKind)

    if (existingDocumentsError) {
      throwEmpOperationError('Failed to inspect existing EMP attachments', existingDocumentsError)
    }

    existingDocumentIds = (existingDocuments || [])
      .map((document: any) => clean(document.id))
      .filter(Boolean)
    existingFilePaths = (existingDocuments || [])
      .map((document: any) => clean(document.file_path))
      .filter(Boolean)
  }

  const { extractTextFromSourceFile } = await import('@/lib/emp/document-text')
  const extractedText = await extractTextFromSourceFile(input.file)
  const fileExt = input.file.name.split('.').pop()?.toLowerCase() || 'bin'
  const filePath = `${input.planId}/${Date.now()}-${sanitizeFileName(input.file.name || `source.${fileExt}`)}`

  const { error: uploadError } = await supabase.storage
    .from('emp-documents')
    .upload(filePath, input.file, { upsert: false })

  if (uploadError) {
    throwEmpOperationError('Failed to upload EMP source file', uploadError)
  }

  const { data, error } = await supabase
    .from('emp_source_documents')
    .insert({
      plan_id: input.planId,
      document_kind: input.documentKind,
      file_name: input.file.name,
      file_path: filePath,
      file_type: input.file.type || 'application/octet-stream',
      file_size: input.file.size,
      extracted_text: extractedText,
      uploaded_by_user_id: profile.id,
    })
    .select('id, document_kind, file_name, file_path, file_type, file_size, extracted_text, created_at')
    .single()

  if (error || !data) {
    await supabase.storage.from('emp-documents').remove([filePath])
    throwEmpOperationError('Failed to create EMP source document record', error)
  }

  await supabase
    .from('emp_plans')
    .update({
      updated_by_user_id: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.planId)

  if (input.replaceExisting && existingDocumentIds.length > 0) {
    const { error: deleteExistingRowsError } = await supabase
      .from('emp_source_documents')
      .delete()
      .in('id', existingDocumentIds)

    if (deleteExistingRowsError) {
      console.error('Failed to remove replaced EMP attachment rows:', deleteExistingRowsError)
    }
  }

  if (input.replaceExisting && existingFilePaths.length > 0) {
    const { error: removeExistingFilesError } = await supabase.storage
      .from('emp-documents')
      .remove(existingFilePaths)

    if (removeExistingFilesError) {
      console.error('Failed to remove replaced EMP attachment files:', removeExistingFilesError)
    }
  }

  return {
    id: data.id,
    documentKind: data.document_kind,
    fileName: data.file_name,
    filePath: data.file_path,
    fileType: data.file_type,
    fileSize: Number(data.file_size || 0),
    extractedText: data.extracted_text,
    createdAt: data.created_at,
    signedUrl: await createEmpDocumentSignedUrl(supabase, data.file_path),
  } satisfies EmpSourceDocumentSummary
}

export async function extractEmpPlanFromSources(planId: string) {
  const { supabase, profile } = await getEmpUserContext()
  const plan = await getPlanOrThrow(supabase, planId)
  const templateGraph = await loadTemplateGraph(supabase, plan.template_id)
  const existingRows = await loadPlanValueRows(supabase, planId, templateGraph.fields)
  const documents = await loadPlanDocuments(supabase, planId)

  const candidates = deriveEmpFieldCandidates(
    documents.map((document) => ({
      id: document.id,
      document_kind: document.documentKind,
      file_name: document.fileName,
      extracted_text: document.extractedText,
    })) satisfies EmpSourceDocumentForExtraction[]
  )

  const fieldByKey = new Map(templateGraph.fields.map((field) => [field.key, field]))
  const existingByFieldKey = new Map(existingRows.map((row) => [row.fieldKey, row]))
  const upserts: Array<Record<string, unknown>> = []
  const skippedManualKeys: string[] = []
  const updatedKeys: string[] = []
  const syncValues: Record<string, string> = {}

  for (const [fieldKey, candidate] of Object.entries(candidates)) {
    const field = fieldByKey.get(fieldKey)
    if (!field) continue

    const existing = existingByFieldKey.get(fieldKey)
    if (existing?.valueSource === 'manual' && clean(existing.valueText)) {
      skippedManualKeys.push(fieldKey)
      continue
    }

    upserts.push({
      plan_id: planId,
      field_id: field.id,
      value_text: candidate.valueText,
      value_source: 'source_doc',
      source_document_id: candidate.sourceDocumentId,
      source_excerpt: candidate.sourceExcerpt,
      updated_by_user_id: profile.id,
      updated_at: new Date().toISOString(),
    })
    syncValues[fieldKey] = candidate.valueText
    updatedKeys.push(fieldKey)
  }

  if (upserts.length > 0) {
    const { error: upsertError } = await supabase
      .from('emp_plan_field_values')
      .upsert(upserts, { onConflict: 'plan_id,field_id' })

    if (upsertError) {
      throwEmpOperationError('Failed to persist EMP extraction results', upsertError)
    }
  }

  const hasProfileDocument = documents.some((document) => document.documentKind === 'kss_profile')
  await syncPlanSummaryFromValues({
    supabase,
    planId,
    updatedByUserId: profile.id,
    values: syncValues,
    includeKssProfileAppendix: plan.include_kss_profile_appendix || hasProfileDocument,
  })

  return {
    updatedKeys,
    skippedManualKeys,
    candidates,
    editorData: await getEmpPlanEditorData(planId),
  }
}

export async function getEmpPreviewData(planId: string) {
  const editorData = await getEmpPlanEditorData(planId)
  const resolvedValues = resolveEmpFieldValueMap(
    editorData.fields,
    editorData.values.map((valueRow) => ({
      fieldKey: valueRow.fieldKey,
      valueText: valueRow.valueText,
      source: valueRow.valueSource,
    }))
  )

  const model = buildEmpPreviewModel({
    fieldValues: resolvedValues,
    selectedAnnexes: editorData.plan.selectedAnnexes,
    includeKssProfileAppendix: editorData.plan.includeKssProfileAppendix,
    documents: editorData.documents.map((document) => ({
      documentKind: document.documentKind,
      fileName: document.fileName,
      fileType: document.fileType,
      signedUrl: document.signedUrl,
    })),
  })

  return {
    model,
    editorData,
  }
}

export async function getEmpMasterTemplatePlanPrefill(planId: string): Promise<EmpMasterTemplatePlanPrefill> {
  const { supabase } = await getEmpUserContext()
  const editorData = await getEmpPlanEditorData(planId)
  const resolvedValues = resolveEmpFieldValueMap(
    editorData.fields,
    editorData.values.map((valueRow) => ({
      fieldKey: valueRow.fieldKey,
      valueText: valueRow.valueText,
      source: valueRow.valueSource,
    }))
  )
  const fieldValues = Object.fromEntries(
    Object.entries(resolvedValues).map(([fieldKey, fieldValue]) => [fieldKey, fieldValue.valueText])
  )
  const previewModel = buildEmpPreviewModel({
    fieldValues: resolvedValues,
    selectedAnnexes: editorData.plan.selectedAnnexes,
    includeKssProfileAppendix: editorData.plan.includeKssProfileAppendix,
    documents: editorData.documents.map((document) => ({
      documentKind: document.documentKind,
      fileName: document.fileName,
      fileType: document.fileType,
      signedUrl: document.signedUrl,
    })),
  })
  const prefillData = buildEmpMasterTemplatePrefillFromFieldValues(fieldValues, {
    planTitle: editorData.plan.title,
    riskAssessmentRows: previewModel.riskAssessment?.rows || [],
  })
  let eventControlLogEntries: EmpEventControlLogEntry[] = []
  try {
    eventControlLogEntries = await loadEventControlLogEntries(supabase, planId)
  } catch (error) {
    if (!(error instanceof EmpSetupRequiredError)) {
      throw error
    }
  }

  if (eventControlLogEntries.length > 0) {
    prefillData.templateTableCellValues['event-control-log'] = buildEventControlLogTableCells(eventControlLogEntries)
    prefillData.templateFieldValues['event-control-log'] = {
      ...(prefillData.templateFieldValues['event-control-log'] || {}),
      Date: formatAppDate(eventControlLogEntries[eventControlLogEntries.length - 1]?.loggedAt || prefillData.eventDate, {}, prefillData.eventDate),
    }
  }

  return {
    planId,
    planTitle: editorData.plan.title,
    eventName: prefillData.eventName,
    eventDate: prefillData.eventDate,
    prefillData,
  }
}
