import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getInternalAreaDisplayName } from '@/lib/areas'
import {
  getStoreActionListTitle,
  getStoreActionQuestion,
  normalizeStoreActionQuestion,
} from '@/lib/store-action-titles'
import { isSuppressedStoreActionQuestion } from '@/lib/actions/action-summary'
import type { ActionFilters, UnifiedAction, UnifiedActionResult } from './types'

const assignedProfileSchema = z.object({
  id: z.string(),
  full_name: z.string().nullable(),
}).nullable()

const incidentRelationSchema = z.object({ reference_no: z.string() }).nullable()

const incidentActionRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.string(),
  due_date: z.string(),
  status: z.string(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  evidence_required: z.boolean(),
  completion_notes: z.string().nullable(),
  incident_id: z.string(),
  assigned_to: assignedProfileSchema,
  incident: incidentRelationSchema,
}).passthrough()

const storeSchema = z.object({
  id: z.string(),
  store_name: z.string(),
  store_code: z.string().nullable(),
  region: z.string().nullable(),
  compliance_audit_1_overall_pct: z.number().nullable(),
  compliance_audit_2_overall_pct: z.number().nullable(),
  compliance_audit_2_assigned_manager_user_id: z.string().nullable(),
}).nullable()

const storeActionRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  source_flagged_item: z.string().nullable(),
  priority: z.string(),
  due_date: z.string(),
  status: z.string(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  completion_notes: z.string().nullable(),
  store: storeSchema,
}).passthrough()

function dedupeVisibleStoreActions(actions: UnifiedAction[]) {
  const activeByKey = new Map<string, UnifiedAction>()
  const nonActiveActions: UnifiedAction[] = []

  for (const action of actions) {
    const status = action.status.toLowerCase()
    if (!['open', 'in_progress'].includes(status)) {
      nonActiveActions.push(action)
      continue
    }

    const storeId = action.store?.id || 'unknown'
    const normalizedQuestion =
      normalizeStoreActionQuestion(action.store_question || getStoreActionQuestion(action) || action.title) || action.title
    const key = `${storeId}||${normalizedQuestion.toLowerCase()}||${status}`
    const existing = activeByKey.get(key)

    if (!existing || new Date(action.due_date).getTime() < new Date(existing.due_date).getTime()) {
      activeByKey.set(key, action)
    }
  }

  return [...activeByKey.values(), ...nonActiveActions]
}

export function presentUnifiedActions(
  incidentRows: unknown[],
  storeRows: unknown[],
  filters: ActionFilters = {}
): UnifiedActionResult {
  const incidentActions: UnifiedAction[] = z.array(incidentActionRowSchema).parse(incidentRows).map((action) => ({
    id: action.id,
    title: action.title,
    description: action.description,
    priority: action.priority,
    due_date: action.due_date,
    status: action.status,
    created_at: action.created_at,
    updated_at: action.updated_at,
    evidence_required: action.evidence_required,
    completion_notes: action.completion_notes,
    incident_id: action.incident_id,
    incident: action.incident,
    assigned_to: action.assigned_to,
    source_type: 'incident',
    store: null,
  }))

  const storeActions = z.array(storeActionRowSchema).parse(storeRows).map((action): UnifiedAction => {
    const areaCode = action.store?.region?.trim().toUpperCase() || ''
    const storeQuestion = getStoreActionQuestion(action)
    return {
      id: action.id,
      title: action.title,
      description: action.description,
      source_flagged_item: action.source_flagged_item,
      priority: action.priority,
      due_date: action.due_date,
      status: action.status,
      created_at: action.created_at,
      updated_at: action.updated_at,
      completion_notes: action.completion_notes,
      incident_id: null,
      incident: action.store
        ? { reference_no: action.store.store_code ? `${action.store.store_code} - ${action.store.store_name}` : action.store.store_name }
        : { reference_no: 'Store Action' },
      assigned_to: areaCode
        ? { id: `area:${areaCode}`, full_name: getInternalAreaDisplayName(areaCode, { includeCode: false, fallback: `Area ${areaCode}` }) }
        : null,
      source_type: 'store',
      store_question: storeQuestion,
      store: action.store,
    }
  }).filter((action) => !isSuppressedStoreActionQuestion(action.store_question || action.title))

  let actions = [...incidentActions, ...dedupeVisibleStoreActions(storeActions)]
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  if (filters.assigned_to) actions = actions.filter((action) => action.assigned_to?.id === filters.assigned_to)
  if (filters.priority) actions = actions.filter((action) => action.priority === filters.priority)

  if (filters.q) {
    const query = filters.q.trim().toLowerCase()
    if (query) {
      actions = actions.filter((action) => {
        const title = action.source_type === 'store' ? getStoreActionListTitle(action) : action.title
        return [
          title,
          action.store_question,
          action.incident?.reference_no,
          action.assigned_to?.full_name,
          action.description,
          action.store?.store_name,
        ].some((value) => String(value || '').toLowerCase().includes(query))
      })
    }
  }

  const storeQuestionOptions = Array.from(new Set(
    actions
      .filter((action) => action.source_type === 'store')
      .map((action) => action.store_question || getStoreActionQuestion(action))
      .filter((question): question is string => Boolean(question))
  )).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

  if (filters.store_question) {
    const selected = normalizeStoreActionQuestion(filters.store_question) || filters.store_question
    actions = actions.filter((action) => action.source_type === 'store'
      && (normalizeStoreActionQuestion(action.store_question || '') || '') === selected)
  }

  return { actions, storeQuestionOptions }
}

export async function getUnifiedActions(filters: ActionFilters = {}): Promise<UnifiedActionResult> {
  const supabase = createClient()
  let incidentQuery = supabase
    .from('fa_actions')
    .select(`id, title, description, priority, due_date, status, created_at, updated_at, evidence_required, completion_notes, incident_id,
      assigned_to:fa_profiles!fa_actions_assigned_to_user_id_fkey(id, full_name),
      incident:fa_incidents!fa_actions_incident_id_fkey(reference_no)`)
    .order('due_date', { ascending: true })
    .limit(2001)

  let storeQuery = supabase
    .from('fa_store_actions')
    .select(`id, title, description, source_flagged_item, priority, due_date, status, created_at, updated_at, completion_notes,
      store:fa_stores!fa_store_actions_store_id_fkey(id, store_name, store_code, region, compliance_audit_1_overall_pct, compliance_audit_2_overall_pct, compliance_audit_2_assigned_manager_user_id)`)
    .order('due_date', { ascending: true })
    .limit(2001)

  if (filters.status) {
    incidentQuery = incidentQuery.eq('status', filters.status)
    storeQuery = storeQuery.eq('status', filters.status)
  }
  if (filters.overdue) {
    const today = new Date().toISOString().slice(0, 10)
    incidentQuery = incidentQuery.lt('due_date', today).not('status', 'in', '(complete,cancelled)')
    storeQuery = storeQuery.lt('due_date', today).not('status', 'in', '(complete,cancelled)')
  }
  if (filters.date_from) {
    incidentQuery = incidentQuery.gte('due_date', filters.date_from)
    storeQuery = storeQuery.gte('due_date', filters.date_from)
  }
  if (filters.date_to) {
    incidentQuery = incidentQuery.lte('due_date', filters.date_to)
    storeQuery = storeQuery.lte('due_date', filters.date_to)
  }

  const [incidentResult, storeResult] = await Promise.all([incidentQuery, storeQuery])
  if (incidentResult.error) throw new Error(`Unable to load incident actions: ${incidentResult.error.message}`)
  if (storeResult.error) throw new Error(`Unable to load store actions: ${storeResult.error.message}`)
  if ((incidentResult.data?.length || 0) > 2000 || (storeResult.data?.length || 0) > 2000) {
    throw new Error('The action result set is too large. Apply a status or date filter and try again.')
  }

  return presentUnifiedActions(incidentResult.data || [], storeResult.data || [], filters)
}
