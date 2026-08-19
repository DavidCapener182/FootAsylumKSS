import type { IncidentListItem, InvestigationSummary } from './types'

export function getIncidentMetaObject(incident: Pick<IncidentListItem, 'persons_involved'>) {
  return incident.persons_involved ?? {}
}

export function getIncidentPersonType(incident: Pick<IncidentListItem, 'persons_involved'>) {
  const meta = getIncidentMetaObject(incident)
  const personType = meta.person_type ?? meta.personType
  if (typeof personType !== 'string' || personType.trim().length === 0) {
    return 'Unknown'
  }
  return personType
}

export function getIncidentChildInvolved(incident: Pick<IncidentListItem, 'persons_involved'>) {
  const meta = getIncidentMetaObject(incident)
  return Boolean(meta.child_involved ?? meta.childInvolved)
}

export function getIncidentLostTimeDays(
  incident: Pick<IncidentListItem, 'injury_details' | 'persons_involved'>
) {
  const injury = incident.injury_details ?? {}
  const meta = getIncidentMetaObject(incident)
  const raw = injury.lost_time_days
    ?? injury.lostTimeDays
    ?? meta.lost_time_days
    ?? meta.lostTimeDays

  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function getIncidentAccidentType(
  incident: Pick<IncidentListItem, 'injury_details' | 'persons_involved'>
) {
  const injury = incident.injury_details ?? {}
  const meta = getIncidentMetaObject(incident)
  const accidentType = injury.accident_type
    ?? injury.accidentType
    ?? meta.accident_type
    ?? meta.accidentType

  return typeof accidentType === 'string' && accidentType.trim().length > 0 ? accidentType : null
}

export function getInvestigationRootCause(
  incidentId: string,
  investigationMap: Map<string, InvestigationSummary>
) {
  const rootCause = investigationMap.get(incidentId)?.root_cause
  if (!rootCause || rootCause.trim().length === 0) return null
  return rootCause
}

export function getInjuryRootCause(
  incident: Pick<IncidentListItem, 'injury_details' | 'persons_involved'>
) {
  const injury = incident.injury_details ?? {}
  const meta = getIncidentMetaObject(incident)
  const rootCause = injury.root_cause
    ?? injury.rootCause
    ?? meta.root_cause
    ?? meta.rootCause

  return typeof rootCause === 'string' && rootCause.trim().length > 0 ? rootCause : null
}

export function getIncidentRootCause(
  incident: IncidentListItem,
  investigationMap: Map<string, InvestigationSummary>
) {
  return getInvestigationRootCause(incident.id, investigationMap) || getInjuryRootCause(incident)
}

export function getInvestigationRecommendations(
  incidentId: string,
  investigationMap: Map<string, InvestigationSummary>
) {
  const recommendations = investigationMap.get(incidentId)?.recommendations
  if (!recommendations || recommendations.trim().length === 0) return null
  return recommendations
}

export function parseFiscalYear(value?: string) {
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2100) return null
  return parsed
}

export function getFiscalYear(date: Date) {
  return date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear()
}

export function getFiscalYearRange(fiscalYear: number) {
  return {
    start: `${fiscalYear}-02-01T00:00:00.000Z`,
    end: `${fiscalYear + 1}-01-31T23:59:59.999Z`,
  }
}
