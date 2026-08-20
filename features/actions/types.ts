export type ActionFilters = {
  assigned_to?: string
  status?: string
  overdue?: boolean
  priority?: string
  store_question?: string
  q?: string
  date_from?: string
  date_to?: string
  view?: string
}

export type UnifiedAction = {
  id: string
  title: string
  description: string | null
  source_flagged_item?: string | null
  priority: string
  due_date: string
  status: string
  created_at: string | null
  updated_at: string | null
  evidence_required?: boolean
  completion_notes?: string | null
  blocked_reason?: string | null
  reassignment_reason?: string | null
  verification_status?: 'not_required' | 'awaiting_evidence' | 'awaiting_verification' | 'verified' | 'rejected'
  recurrence_rule?: string | null
  dependency_action_ids?: string[]
  incident_id: string | null
  incident: { reference_no: string } | null
  assigned_to: { id: string; full_name: string | null } | null
  source_type: 'incident' | 'store'
  store_question?: string | null
  store?: {
    id: string
    store_name: string
    store_code: string | null
    region: string | null
    compliance_audit_1_overall_pct: number | null
    compliance_audit_2_overall_pct: number | null
    compliance_audit_2_assigned_manager_user_id: string | null
  } | null
}

export type UnifiedActionResult = {
  actions: UnifiedAction[]
  storeQuestionOptions: string[]
}
