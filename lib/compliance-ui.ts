export type StoreComplianceLevel = 'green' | 'amber' | 'red' | 'grey'

export type AuditLifecycleStatus =
  | 'not_started'
  | 'audit_1_complete'
  | 'second_audit_required'
  | 'audit_2_planned'
  | 'audit_2_complete'

export type StoreComplianceSummary = {
  level: StoreComplianceLevel
  label: string
  summary: string
  className: string
  dotClassName: string
}

export type AuditLifecycleSummary = {
  status: AuditLifecycleStatus
  label: string
  description: string
}

export function getLatestAuditScore(store: any): number | null {
  if (typeof store?.compliance_audit_2_overall_pct === 'number') return store.compliance_audit_2_overall_pct
  if (typeof store?.compliance_audit_1_overall_pct === 'number') return store.compliance_audit_1_overall_pct
  return null
}

export function getCompletedAuditCount(store: any): number {
  return [1, 2].filter((auditNumber) => {
    const date = store?.[`compliance_audit_${auditNumber}_date`]
    const score = store?.[`compliance_audit_${auditNumber}_overall_pct`]
    return Boolean(date && score !== null && score !== undefined)
  }).length
}

export function getAuditLifecycle(store: any): AuditLifecycleSummary {
  const audit1Complete = Boolean(
    store?.compliance_audit_1_date &&
      store?.compliance_audit_1_overall_pct !== null &&
      store?.compliance_audit_1_overall_pct !== undefined
  )
  const audit2Complete = Boolean(
    store?.compliance_audit_2_date &&
      store?.compliance_audit_2_overall_pct !== null &&
      store?.compliance_audit_2_overall_pct !== undefined
  )

  if (audit2Complete) {
    return {
      status: 'audit_2_complete',
      label: 'Audit 2 Complete',
      description: 'Follow-up audit is complete.',
    }
  }

  if (audit1Complete && store?.compliance_audit_2_planned_date) {
    return {
      status: 'audit_2_planned',
      label: 'Audit 2 Planned',
      description: 'Follow-up audit is scheduled.',
    }
  }

  if (audit1Complete) {
    return {
      status: 'second_audit_required',
      label: 'Audit 2 Required',
      description: 'First audit complete; follow-up still outstanding.',
    }
  }

  return {
    status: 'not_started',
    label: 'Not Started',
    description: 'No compliance audit has been recorded yet.',
  }
}

export function getOpenActions(actions: any[] | null | undefined): any[] {
  return (actions || []).filter((action) => !['complete', 'cancelled'].includes(String(action?.status || '').toLowerCase()))
}

export function getOverdueActions(actions: any[] | null | undefined): any[] {
  const today = new Date()
  return getOpenActions(actions).filter((action) => {
    if (!action?.due_date) return false
    const dueDate = new Date(action.due_date)
    if (Number.isNaN(dueDate.getTime())) return false
    return dueDate < today
  })
}

export function getStoreComplianceSummary(input: {
  latestAuditScore: number | null
  fraStatus?: string | null
  openActionCount?: number
  overdueActionCount?: number
  auditLifecycleStatus?: string | null
}): StoreComplianceSummary {
  const fraStatus = input.fraStatus || null
  const openActionCount = input.openActionCount || 0
  const overdueActionCount = input.overdueActionCount || 0
  const auditLifecycleStatus = input.auditLifecycleStatus || null

  if (
    fraStatus === 'overdue' ||
    overdueActionCount > 0 ||
    (typeof input.latestAuditScore === 'number' && input.latestAuditScore < 70)
  ) {
    return {
      level: 'red',
      label: 'Red',
      summary: 'Escalation required',
      className: 'border-rose-200 bg-rose-50 text-rose-800',
      dotClassName: 'bg-rose-500',
    }
  }

  if (
    fraStatus === 'required' ||
    fraStatus === 'due' ||
    openActionCount > 0 ||
    auditLifecycleStatus === 'second_audit_required' ||
    auditLifecycleStatus === 'audit_2_planned' ||
    (typeof input.latestAuditScore === 'number' && input.latestAuditScore < 80)
  ) {
    return {
      level: 'amber',
      label: 'Amber',
      summary: 'Follow-up required',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
      dotClassName: 'bg-amber-500',
    }
  }

  if (typeof input.latestAuditScore === 'number' || fraStatus === 'up_to_date') {
    return {
      level: 'green',
      label: 'Green',
      summary: 'Up to date',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      dotClassName: 'bg-emerald-500',
    }
  }

  return {
    level: 'grey',
    label: 'Grey',
    summary: 'Insufficient data',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
    dotClassName: 'bg-slate-400',
  }
}
