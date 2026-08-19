export type IncidentFilters = {
  store_id?: string
  status?: string
  severity?: string
  year?: string
  q?: string
  date_from?: string
  date_to?: string
}

export type IncidentListSearchParams = IncidentFilters & {
  open_page?: string
  closed_page?: string
  tab?: string
}

export type IncidentSource = 'active' | 'archive' | 'legacy'

export type IncidentStoreSummary = {
  id: string
  store_name: string
  store_code: string | null
}

export type IncidentProfileSummary = {
  id: string
  full_name: string | null
}

export type IncidentListItem = {
  [key: string]: unknown
  id: string
  reference_no: string
  source_reference: string | null
  store_id: string | null
  reported_by_user_id: string | null
  assigned_investigator_user_id: string | null
  incident_category: string
  severity: string
  summary: string | null
  description: string | null
  occurred_at: string | null
  reported_at: string | null
  persons_involved: Record<string, unknown> | null
  injury_details: Record<string, unknown> | null
  witnesses: unknown
  riddor_reportable: boolean
  status: string
  target_close_date: string | null
  closed_at: string | null
  closure_summary: string | null
  source: IncidentSource
  fa_stores: IncidentStoreSummary | null
  reporter: Pick<IncidentProfileSummary, 'full_name'> | null
  investigator: Pick<IncidentProfileSummary, 'full_name'> | null
}

export type InvestigationSummary = {
  incident_id: string
  status: string | null
  root_cause: string | null
  recommendations: string | null
}

export type IncidentPagination = {
  page: number
  pageSize: number
  pageCount: number
  total: number
  from: number
  to: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type IncidentPage = IncidentPagination & {
  items: IncidentListItem[]
}

export type IncidentListResult = {
  allOpenIncidents: IncidentListItem[]
  allClosedIncidents: IncidentListItem[]
  open: IncidentPage
  closed: IncidentPage
  availableYears: number[]
  investigationMap: Map<string, InvestigationSummary>
}
