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
  EMP_MASTER_TEMPLATE_DESCRIPTION,
  EMP_MASTER_TEMPLATE_FIELDS,
  EMP_MASTER_TEMPLATE_SECTIONS,
  EMP_MASTER_TEMPLATE_TITLE,
  getEmpFieldEditMode,
  type EmpFieldEditMode,
  type EmpDocumentKind,
} from '@/lib/emp/master-template'
import { buildEmpPreviewModel, resolveEmpFieldValueMap } from '@/lib/emp/preview'

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

  const plan = await getPlanOrThrow(supabase, planId)
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
