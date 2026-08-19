import { serializeCsv, type CsvValue } from '@/lib/csv'

type RelatedRow<T> = T | T[] | null | undefined

type ExportStore = {
  id: string
  store_code: string | null
  store_name: string | null
  region: string | null
  city: string | null
  is_active: boolean | null
}

type ExportTemplate = {
  id: string
  title: string | null
  category: string | null
  is_active: boolean | null
}

export type AuditInstanceHistoryRow = {
  id: string
  template_id: string | null
  store_id: string | null
  conducted_by_user_id: string | null
  conducted_at: string | null
  overall_score: number | null
  status: string | null
  created_at: string | null
  updated_at: string | null
  fa_audit_templates: RelatedRow<ExportTemplate>
  fa_stores: RelatedRow<ExportStore>
}

export type StoreActionHistoryRow = {
  id: string
  store_id: string | null
  title: string | null
  description: string | null
  source_flagged_item: string | null
  priority_summary: string | null
  priority: string | null
  status: string | null
  due_date: string | null
  completed_at: string | null
  completion_notes: string | null
  ai_generated: boolean | null
  created_by_user_id: string | null
  created_at: string | null
  updated_at: string | null
  fa_stores: RelatedRow<ExportStore>
}

type AuditHistoryExportRecord = {
  record_type: CsvValue
  audit_instance_id: CsvValue
  store_action_id: CsvValue
  store_id: CsvValue
  store_code: CsvValue
  store_name: CsvValue
  area: CsvValue
  city: CsvValue
  store_active: CsvValue
  template_id: CsvValue
  template_title: CsvValue
  template_category: CsvValue
  template_active: CsvValue
  audit_status: CsvValue
  conducted_by_user_id: CsvValue
  conducted_at: CsvValue
  overall_score: CsvValue
  audit_created_at: CsvValue
  audit_updated_at: CsvValue
  action_title: CsvValue
  action_description: CsvValue
  source_flagged_item: CsvValue
  priority_summary: CsvValue
  action_priority: CsvValue
  action_status: CsvValue
  action_due_date: CsvValue
  action_completed_at: CsvValue
  action_completion_notes: CsvValue
  action_ai_generated: CsvValue
  action_created_by_user_id: CsvValue
  action_created_at: CsvValue
  action_updated_at: CsvValue
}

const AUDIT_HISTORY_COLUMNS = [
  ['Record Type', 'record_type'],
  ['Audit Instance ID', 'audit_instance_id'],
  ['Store Action ID', 'store_action_id'],
  ['Store ID', 'store_id'],
  ['Store Code', 'store_code'],
  ['Store Name', 'store_name'],
  ['Area', 'area'],
  ['City', 'city'],
  ['Store Active', 'store_active'],
  ['Template ID', 'template_id'],
  ['Template Title', 'template_title'],
  ['Template Category', 'template_category'],
  ['Template Active', 'template_active'],
  ['Audit Status', 'audit_status'],
  ['Conducted By User ID', 'conducted_by_user_id'],
  ['Conducted At', 'conducted_at'],
  ['Overall Score (%)', 'overall_score'],
  ['Audit Created At', 'audit_created_at'],
  ['Audit Updated At', 'audit_updated_at'],
  ['Action Title', 'action_title'],
  ['Action Description', 'action_description'],
  ['Source Flagged Item', 'source_flagged_item'],
  ['Priority Summary', 'priority_summary'],
  ['Action Priority', 'action_priority'],
  ['Action Status', 'action_status'],
  ['Action Due Date', 'action_due_date'],
  ['Action Completed At', 'action_completed_at'],
  ['Action Completion Notes', 'action_completion_notes'],
  ['Action AI Generated', 'action_ai_generated'],
  ['Action Created By User ID', 'action_created_by_user_id'],
  ['Action Created At', 'action_created_at'],
  ['Action Updated At', 'action_updated_at'],
] as const satisfies ReadonlyArray<readonly [string, keyof AuditHistoryExportRecord]>

function unwrapRelatedRow<T>(value: RelatedRow<T>): T | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function emptyExportRecord(): AuditHistoryExportRecord {
  return Object.fromEntries(
    AUDIT_HISTORY_COLUMNS.map(([, key]) => [key, ''])
  ) as AuditHistoryExportRecord
}

function yesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value ? 'Yes' : 'No'
}

export function buildAuditHistoryCsv(
  auditInstances: readonly AuditInstanceHistoryRow[],
  storeActions: readonly StoreActionHistoryRow[]
): string {
  const auditRecords = auditInstances.map((audit): AuditHistoryExportRecord => {
    const template = unwrapRelatedRow(audit.fa_audit_templates)
    const store = unwrapRelatedRow(audit.fa_stores)

    return {
      ...emptyExportRecord(),
      record_type: 'Audit Instance',
      audit_instance_id: audit.id,
      store_id: audit.store_id || store?.id || '',
      store_code: store?.store_code || '',
      store_name: store?.store_name || '',
      area: store?.region || '',
      city: store?.city || '',
      store_active: yesNo(store?.is_active),
      template_id: audit.template_id || template?.id || '',
      template_title: template?.title || '',
      template_category: template?.category || '',
      template_active: yesNo(template?.is_active),
      audit_status: audit.status || '',
      conducted_by_user_id: audit.conducted_by_user_id || '',
      conducted_at: audit.conducted_at || '',
      overall_score: audit.overall_score,
      audit_created_at: audit.created_at || '',
      audit_updated_at: audit.updated_at || '',
    }
  })

  const actionRecords = storeActions.map((action): AuditHistoryExportRecord => {
    const store = unwrapRelatedRow(action.fa_stores)

    return {
      ...emptyExportRecord(),
      record_type: 'Store Action',
      store_action_id: action.id,
      store_id: action.store_id || store?.id || '',
      store_code: store?.store_code || '',
      store_name: store?.store_name || '',
      area: store?.region || '',
      city: store?.city || '',
      store_active: yesNo(store?.is_active),
      action_title: action.title || '',
      action_description: action.description || '',
      source_flagged_item: action.source_flagged_item || '',
      priority_summary: action.priority_summary || '',
      action_priority: action.priority || '',
      action_status: action.status || '',
      action_due_date: action.due_date || '',
      action_completed_at: action.completed_at || '',
      action_completion_notes: action.completion_notes || '',
      action_ai_generated: yesNo(action.ai_generated),
      action_created_by_user_id: action.created_by_user_id || '',
      action_created_at: action.created_at || '',
      action_updated_at: action.updated_at || '',
    }
  })

  const records = [...auditRecords, ...actionRecords]
  return serializeCsv(
    AUDIT_HISTORY_COLUMNS.map(([header]) => header),
    records.map((record) => AUDIT_HISTORY_COLUMNS.map(([, key]) => record[key]))
  )
}
