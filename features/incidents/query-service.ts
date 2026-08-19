import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  getFiscalYear,
  getFiscalYearRange,
  getIncidentAccidentType,
  getIncidentPersonType,
  getIncidentRootCause,
  getInvestigationRecommendations,
  parseFiscalYear,
} from './model'
import type {
  IncidentFilters,
  IncidentListItem,
  IncidentListResult,
  IncidentPage,
  IncidentProfileSummary,
  IncidentSource,
  IncidentStoreSummary,
  InvestigationSummary,
} from './types'

const DATABASE_PAGE_SIZE = 250
export const INCIDENT_LIST_PAGE_SIZE = 50

const nullableString = z.string().nullable().optional().transform((value) => value ?? null)
const nullableDateString = nullableString.refine(
  (value) => value === null || !Number.isNaN(new Date(value).getTime()),
  'Expected a valid date or timestamp'
)
const nullableObject = z.record(z.unknown()).nullable().optional().catch(null).transform((value) => value ?? null)

const rawIncidentSchema = z.object({
  id: z.string().min(1),
  reference_no: z.string().min(1),
  source_reference: nullableString,
  store_id: nullableString,
  reported_by_user_id: nullableString,
  assigned_investigator_user_id: nullableString,
  incident_category: nullableString,
  severity: nullableString,
  summary: nullableString,
  description: nullableString,
  occurred_at: nullableDateString,
  reported_at: nullableDateString,
  persons_involved: nullableObject,
  injury_details: nullableObject,
  witnesses: z.unknown().optional(),
  riddor_reportable: z.boolean().nullable().optional(),
  status: nullableString,
  target_close_date: nullableDateString,
  closed_at: nullableDateString,
  closure_summary: nullableString,
}).passthrough()

const storeSchema = z.object({
  id: z.string().min(1),
  store_name: z.string().nullable(),
  store_code: z.string().nullable(),
})

const profileSchema = z.object({
  id: z.string().min(1),
  full_name: z.string().nullable(),
})

const investigationSchema = z.object({
  incident_id: z.string().min(1),
  status: z.string().nullable(),
  root_cause: z.string().nullable(),
  recommendations: z.string().nullable(),
}).passthrough()

const yearRowSchema = z.object({ occurred_at: nullableDateString })

type RawIncident = z.infer<typeof rawIncidentSchema>
type SupabaseClient = ReturnType<typeof createClient>

function parseRawIncident(row: unknown, source: IncidentSource): RawIncident {
  const result = rawIncidentSchema.safeParse(row)
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`).join('; ')
    throw new Error(`Invalid ${source} incident data: ${details}`)
  }
  return result.data
}

function normalizeIncident(row: unknown, source: IncidentSource): IncidentListItem {
  const parsed = parseRawIncident(row, source)
  return {
    ...parsed,
    source_reference: parsed.source_reference,
    store_id: parsed.store_id,
    reported_by_user_id: parsed.reported_by_user_id,
    assigned_investigator_user_id: parsed.assigned_investigator_user_id,
    incident_category: parsed.incident_category?.trim() || 'other',
    severity: parsed.severity?.trim() || 'unknown',
    summary: parsed.summary,
    description: parsed.description,
    occurred_at: parsed.occurred_at,
    reported_at: parsed.reported_at,
    persons_involved: parsed.persons_involved,
    injury_details: parsed.injury_details,
    witnesses: parsed.witnesses ?? null,
    riddor_reportable: parsed.riddor_reportable === true,
    status: parsed.status?.trim() || (source === 'active' ? 'open' : 'closed'),
    target_close_date: parsed.target_close_date,
    closed_at: parsed.closed_at,
    closure_summary: parsed.closure_summary,
    source,
    fa_stores: null,
    reporter: null,
    investigator: null,
  }
}

function parseRequestedPage(value?: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function paginate(items: IncidentListItem[], requestedPage: number): IncidentPage {
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / INCIDENT_LIST_PAGE_SIZE))
  const page = Math.min(requestedPage, pageCount)
  const offset = (page - 1) * INCIDENT_LIST_PAGE_SIZE
  const pageItems = items.slice(offset, offset + INCIDENT_LIST_PAGE_SIZE)

  return {
    items: pageItems,
    page,
    pageSize: INCIDENT_LIST_PAGE_SIZE,
    pageCount,
    total,
    from: total === 0 ? 0 : offset + 1,
    to: total === 0 ? 0 : offset + pageItems.length,
    hasPreviousPage: page > 1,
    hasNextPage: page < pageCount,
  }
}

function getDateBoundary(value: string | undefined, endOfDay: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(date.getTime()) ? null : date
}

function matchesNonSearchFilters(incident: IncidentListItem, filters: IncidentFilters, isArchive: boolean) {
  if (filters.store_id && incident.store_id !== filters.store_id) return false
  if (filters.severity && incident.severity !== filters.severity) return false
  if (!isArchive && filters.status && incident.status !== filters.status) return false

  const occurredAt = incident.occurred_at ? new Date(incident.occurred_at) : null
  const occurredAtTime = occurredAt && !Number.isNaN(occurredAt.getTime()) ? occurredAt.getTime() : null
  const fiscalYear = parseFiscalYear(filters.year)
  if (fiscalYear && (occurredAtTime === null || getFiscalYear(occurredAt!) !== fiscalYear)) return false

  const from = getDateBoundary(filters.date_from, false)
  if (from && (occurredAtTime === null || occurredAtTime < from.getTime())) return false
  const to = getDateBoundary(filters.date_to, true)
  if (to && (occurredAtTime === null || occurredAtTime > to.getTime())) return false
  return true
}

function matchesSearch(
  incident: IncidentListItem,
  searchQuery: string,
  investigationMap: Map<string, InvestigationSummary>
) {
  if (!searchQuery) return true
  const values = [
    incident.reference_no,
    incident.source_reference,
    incident.summary,
    incident.description,
    incident.incident_category,
    incident.fa_stores?.store_name,
    incident.fa_stores?.store_code,
    incident.investigator?.full_name,
    getIncidentPersonType(incident),
    getIncidentRootCause(incident, investigationMap),
    getInvestigationRecommendations(incident.id, investigationMap),
    getIncidentAccidentType(incident),
  ]
  return values.some((value) => String(value || '').toLowerCase().includes(searchQuery))
}

function sortByOccurredAtDescending(a: IncidentListItem, b: IncidentListItem) {
  const aTime = new Date(a.occurred_at || a.closed_at || 0).getTime()
  const bTime = new Date(b.occurred_at || b.closed_at || 0).getTime()
  if (aTime !== bTime) return bTime - aTime
  return b.id.localeCompare(a.id)
}

function enrichIncident(
  incident: IncidentListItem,
  storeMap: Map<string, IncidentStoreSummary>,
  profileMap: Map<string, IncidentProfileSummary>
): IncidentListItem {
  const reporter = incident.reported_by_user_id ? profileMap.get(incident.reported_by_user_id) : null
  const investigator = incident.assigned_investigator_user_id
    ? profileMap.get(incident.assigned_investigator_user_id)
    : null
  return {
    ...incident,
    fa_stores: incident.store_id ? storeMap.get(incident.store_id) ?? null : null,
    reporter: reporter ? { full_name: reporter.full_name } : null,
    investigator: investigator ? { full_name: investigator.full_name } : null,
  }
}

export function presentIncidentList(input: {
  activeRows: unknown[]
  archiveRows: unknown[]
  legacyClosedRows: unknown[]
  stores?: unknown[]
  profiles?: unknown[]
  investigations?: unknown[]
  availableYears?: number[]
  filters?: IncidentFilters
  openPage?: string
  closedPage?: string
}): IncidentListResult {
  const filters = input.filters ?? {}
  const stores = z.array(storeSchema).parse(input.stores ?? []).map((store): IncidentStoreSummary => ({
    id: store.id,
    store_name: store.store_name?.trim() || 'Unknown Store',
    store_code: store.store_code,
  }))
  const profiles = z.array(profileSchema).parse(input.profiles ?? [])
  const storeMap = new Map(stores.map((store) => [store.id, store]))
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  const investigationMap = new Map<string, InvestigationSummary>()
  for (const row of z.array(investigationSchema).parse(input.investigations ?? [])) {
    if (!investigationMap.has(row.incident_id)) {
      investigationMap.set(row.incident_id, {
        incident_id: row.incident_id,
        status: row.status,
        root_cause: row.root_cause,
        recommendations: row.recommendations,
      })
    }
  }

  const active = input.activeRows.map((row) => normalizeIncident(row, 'active'))
  const mergedClosed = new Map<string, IncidentListItem>()
  for (const row of input.archiveRows) {
    const incident = normalizeIncident(row, 'archive')
    mergedClosed.set(incident.id, incident)
  }
  for (const row of input.legacyClosedRows) {
    const incident = normalizeIncident(row, 'legacy')
    if (!mergedClosed.has(incident.id)) mergedClosed.set(incident.id, incident)
  }

  const searchQuery = filters.q?.trim().toLowerCase() || ''
  const allOpenIncidents = active
    .map((incident) => enrichIncident(incident, storeMap, profileMap))
    .filter((incident) => matchesNonSearchFilters(incident, filters, false))
    .filter((incident) => matchesSearch(incident, searchQuery, investigationMap))
    .sort(sortByOccurredAtDescending)
  const allClosedIncidents = Array.from(mergedClosed.values())
    .map((incident) => enrichIncident(incident, storeMap, profileMap))
    .filter((incident) => matchesNonSearchFilters(incident, filters, true))
    .filter((incident) => matchesSearch(incident, searchQuery, investigationMap))
    .sort(sortByOccurredAtDescending)

  return {
    allOpenIncidents,
    allClosedIncidents,
    open: paginate(allOpenIncidents, parseRequestedPage(input.openPage)),
    closed: paginate(allClosedIncidents, parseRequestedPage(input.closedPage)),
    availableYears: [...new Set(input.availableYears ?? [])].sort((a, b) => b - a),
    investigationMap,
  }
}

function getDatabaseDateBounds(filters: IncidentFilters) {
  const fiscalYear = parseFiscalYear(filters.year)
  const fiscalRange = fiscalYear ? getFiscalYearRange(fiscalYear) : null
  return {
    fiscalFrom: fiscalRange?.start ?? null,
    fiscalTo: fiscalRange?.end ?? null,
    dateFrom: getDateBoundary(filters.date_from, false)?.toISOString() ?? null,
    dateTo: getDateBoundary(filters.date_to, true)?.toISOString() ?? null,
  }
}

async function fetchIncidentRows(
  supabase: SupabaseClient,
  table: 'fa_incidents' | 'fa_closed_incidents',
  source: IncidentSource,
  filters: IncidentFilters
): Promise<RawIncident[]> {
  const rows: unknown[] = []
  const dateBounds = getDatabaseDateBounds(filters)

  for (let offset = 0; ; offset += DATABASE_PAGE_SIZE) {
    let query = supabase.from(table).select('*')
    if (source === 'active') query = query.neq('status', 'closed')
    if (source === 'legacy') query = query.eq('status', 'closed')
    if (source === 'active' && filters.status) query = query.eq('status', filters.status)
    if (filters.store_id) query = query.eq('store_id', filters.store_id)
    if (filters.severity) query = query.eq('severity', filters.severity)
    if (dateBounds.fiscalFrom) query = query.gte('occurred_at', dateBounds.fiscalFrom)
    if (dateBounds.fiscalTo) query = query.lte('occurred_at', dateBounds.fiscalTo)
    if (dateBounds.dateFrom) query = query.gte('occurred_at', dateBounds.dateFrom)
    if (dateBounds.dateTo) query = query.lte('occurred_at', dateBounds.dateTo)

    const result = await query
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + DATABASE_PAGE_SIZE - 1)
    if (result.error) {
      throw new Error(`Unable to load ${source} incidents: ${result.error.message}`)
    }
    const pageRows = result.data ?? []
    rows.push(...pageRows)
    if (pageRows.length < DATABASE_PAGE_SIZE) break
  }

  return rows.map((row) => parseRawIncident(row, source))
}

async function fetchAvailableYears(supabase: SupabaseClient) {
  const years = new Set<number>()
  for (const table of ['fa_incidents', 'fa_closed_incidents'] as const) {
    for (let offset = 0; ; offset += DATABASE_PAGE_SIZE) {
      const result = await supabase
        .from(table)
        .select('occurred_at')
        .order('occurred_at', { ascending: false })
        .range(offset, offset + DATABASE_PAGE_SIZE - 1)
      if (result.error) throw new Error(`Unable to load incident years from ${table}: ${result.error.message}`)
      const pageRows = z.array(yearRowSchema).parse(result.data ?? [])
      for (const row of pageRows) {
        if (!row.occurred_at) continue
        const date = new Date(row.occurred_at)
        if (!Number.isNaN(date.getTime())) years.add(getFiscalYear(date))
      }
      if (pageRows.length < DATABASE_PAGE_SIZE) break
    }
  }
  return Array.from(years).sort((a, b) => b - a)
}

function chunk<T>(values: T[], size = 100) {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size))
  return chunks
}

async function fetchStores(supabase: SupabaseClient, storeIds: string[]) {
  const rows: unknown[] = []
  for (const ids of chunk(storeIds)) {
    const result = await supabase.from('fa_stores').select('id, store_name, store_code').in('id', ids)
    if (result.error) throw new Error(`Unable to enrich incidents with stores: ${result.error.message}`)
    rows.push(...(result.data ?? []))
  }
  return z.array(storeSchema).parse(rows)
}

async function fetchProfiles(supabase: SupabaseClient, profileIds: string[]) {
  const rows: unknown[] = []
  for (const ids of chunk(profileIds)) {
    const result = await supabase.from('fa_profiles').select('id, full_name').in('id', ids)
    if (result.error) throw new Error(`Unable to enrich incidents with profiles: ${result.error.message}`)
    rows.push(...(result.data ?? []))
  }
  return z.array(profileSchema).parse(rows)
}

async function fetchInvestigations(supabase: SupabaseClient, incidentIds: string[]) {
  const rows: unknown[] = []
  for (const ids of chunk(incidentIds)) {
    const result = await supabase
      .from('fa_investigations')
      .select('incident_id, status, root_cause, recommendations, updated_at, created_at')
      .in('incident_id', ids)
      .order('updated_at', { ascending: false })
    if (result.error) throw new Error(`Unable to load incident investigations: ${result.error.message}`)
    rows.push(...(result.data ?? []))
  }
  return z.array(investigationSchema).parse(rows)
}

export async function getIncidentList(input: {
  filters?: IncidentFilters
  openPage?: string
  closedPage?: string
} = {}): Promise<IncidentListResult> {
  const supabase = createClient()
  const filters = input.filters ?? {}
  const [activeRows, archiveRows, legacyClosedRows, availableYears] = await Promise.all([
    fetchIncidentRows(supabase, 'fa_incidents', 'active', filters),
    fetchIncidentRows(supabase, 'fa_closed_incidents', 'archive', filters),
    fetchIncidentRows(supabase, 'fa_incidents', 'legacy', filters),
    fetchAvailableYears(supabase),
  ])

  const allRows = [...activeRows, ...archiveRows, ...legacyClosedRows]
  const storeIds = [...new Set(allRows.map((row) => row.store_id).filter((id): id is string => Boolean(id)))]
  const profileIds = [...new Set(allRows.flatMap((row) => [
    row.reported_by_user_id,
    row.assigned_investigator_user_id,
  ]).filter((id): id is string => Boolean(id)))]
  const incidentIds = [...new Set(allRows.map((row) => row.id))]
  const [stores, profiles, investigations] = await Promise.all([
    fetchStores(supabase, storeIds),
    fetchProfiles(supabase, profileIds),
    fetchInvestigations(supabase, incidentIds),
  ])

  return presentIncidentList({
    activeRows,
    archiveRows,
    legacyClosedRows,
    stores,
    profiles,
    investigations,
    availableYears,
    filters,
    openPage: input.openPage,
    closedPage: input.closedPage,
  })
}
