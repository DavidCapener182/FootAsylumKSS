import { createHash } from 'node:crypto'
import { FRA_TEMPLATE_VARIANTS } from './template-profiles'

export const PRE_OPENING_EVIDENCE_KEYS = ['commissioning', 'handover', 'landlordResponsibilities', 'staffingTraining', 'finalLayoutRecheck'] as const
export type PreOpeningEvidence = Partial<Record<typeof PRE_OPENING_EVIDENCE_KEYS[number], string>>
export type PreOpeningActionTracking = Record<string, { owner?: string; targetDate?: string; closureEvidence?: string }>

export function validatePreOpeningMetadata(data: Record<string, any>) {
  const evidence: PreOpeningEvidence = {}
  const tracking: PreOpeningActionTracking = {}
  const text = (value: unknown, max: number) => {
    if (typeof value !== 'string' || value.length > max) throw new Error('Invalid pre-opening evidence text')
    return value.trim()
  }
  if (data.preOpeningEvidence !== undefined) {
    if (!data.preOpeningEvidence || typeof data.preOpeningEvidence !== 'object' || Array.isArray(data.preOpeningEvidence)) throw new Error('Invalid pre-opening evidence')
    for (const key of PRE_OPENING_EVIDENCE_KEYS) {
      if (data.preOpeningEvidence[key] !== undefined) evidence[key] = text(data.preOpeningEvidence[key], 5000)
    }
  }
  if (data.preOpeningActionTracking !== undefined) {
    if (!data.preOpeningActionTracking || typeof data.preOpeningActionTracking !== 'object' || Array.isArray(data.preOpeningActionTracking)) throw new Error('Invalid action tracking')
    if (Object.keys(data.preOpeningActionTracking).length > 200) throw new Error('Too many tracked actions')
    for (const [id, raw] of Object.entries(data.preOpeningActionTracking)) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid action tracking row')
      const row = raw as Record<string, unknown>
      const targetDate = row.targetDate === undefined ? '' : text(row.targetDate, 10)
      if (targetDate && (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(new Date(targetDate).valueOf()) || new Date(targetDate).toISOString().slice(0, 10) !== targetDate)) throw new Error('Invalid action due date')
      tracking[id] = { owner: row.owner === undefined ? '' : text(row.owner, 300), targetDate, closureEvidence: row.closureEvidence === undefined ? '' : text(row.closureEvidence, 5000) }
    }
  }
  const latitude = data.siteMapLatitude == null ? '' : text(String(data.siteMapLatitude), 30)
  const longitude = data.siteMapLongitude == null ? '' : text(String(data.siteMapLongitude), 30)
  if (latitude || longitude) {
    if (!latitude || !longitude || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)) || Math.abs(Number(latitude)) > 90 || Math.abs(Number(longitude)) > 180) throw new Error('Enter valid latitude and longitude together')
  }
  const source = data.siteMapSource == null ? '' : text(data.siteMapSource, 2000)
  return { preOpeningEvidence: evidence, preOpeningActionTracking: tracking, siteMapLatitude: latitude, siteMapLongitude: longitude, siteMapSource: source }
}

/** Reviewed location text is not an extraction fragment: retain it without the legacy 90-character heuristic. */
export function preOpeningLocation(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const prerequisites = [
  ['commissioning', 'Obtain the fire alarm commissioning certificate, electrical installation records and emergency-lighting test and commissioning records. Close any outstanding system defects before opening and retain the documents on site.'],
  ['extinguishers', 'Complete extinguisher mounting or stands and signage, and clear access to every extinguisher. Check the final provision against the fire risks and retain service or commissioning records.'],
  ['handover', 'Complete remaining fit-out works, partitions, fire-stopping and ceiling joints affecting fire separation. Obtain the final fire strategy, as-built information and handover documents, and close outstanding fire-safety items.'],
  ['landlord', 'Record landlord and tenant fire-safety responsibilities, alarm interfaces, shared escape arrangements and emergency-service access. Brief the opening management team on the agreed arrangements.'],
  ['staffing', 'Complete opening-team fire-safety induction and the local emergency briefing. Assign evacuation roles and assistance arrangements, and start the required testing and inspection programme before public opening.'],
  ['recheck', 'Remove remaining contractor materials and temporary coverings. Walk the completed escape routes, check final exits and fire-door closing and release arrangements, and record a final pre-opening check with closure evidence.'],
  ['routine-audit', 'At the first scheduled H&S audit, review ongoing logbook completion, refresher-training and drill records, housekeeping, stock storage and maintenance records. Initial fire-safety readiness, induction and required opening tests must be completed before public opening.'],

] as const

/** Applied only to the pre-opening profile; no inference of approval, commissioning or completed checks. */
export function applyPreOpeningEvidence<T extends Record<string, any>>(data: T, custom: Record<string, any> | null, review: Record<string, any> | null): T & { preOpeningEvidence?: PreOpeningEvidence; preOpeningActionTracking?: PreOpeningActionTracking } {
  if (data.fraTemplateVariant === FRA_TEMPLATE_VARIANTS.BREMONT_WATCHES) return data
  if (data.assessmentContext !== 'pre_opening' && data.fraTemplateVariant !== FRA_TEMPLATE_VARIANTS.NEW_STORE_PRE_OPENING) return data
  const supplied = (key: string, fallback: string) => preOpeningLocation(custom?.[key]) || preOpeningLocation(review?.[key]) || fallback
  const metadata = validatePreOpeningMetadata(custom || {})
  const commissioningInformation = preOpeningLocation(metadata.preOpeningEvidence.commissioning)
  const actionId = (key: string) => {
    const hex = createHash('sha256').update(`${data.fraInstance?.id || ''}:${key}`).digest('hex')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
  }
  const rows = (data.actionPlanItems || []).filter((row: any) => !/^Continue routine checks and testing/.test(row.recommendation)).map((row: any) => ({ ...row }))
  for (const [key, recommendation] of prerequisites) {
    if (!rows.some((row: any) => row.sourceActionId === actionId(`preopening-${key}`) || row.recommendation === recommendation)) rows.push({ sourceActionId: actionId(`preopening-${key}`), recommendation, priority: key === 'routine-audit' ? 'Low' : 'High', dueNote: key === 'routine-audit' ? 'First scheduled H&S audit' : 'Before public opening; completion not recorded' })
  }
  // Deterministic content-derived identities keep tracking attached when unrelated rows are inserted/reordered.
  for (const row of rows) {
    if (!row.sourceActionId) {
      row.sourceActionId = actionId(String(row.recommendation))
    }
  }
  return { ...data, ...metadata,
    ...(metadata.siteMapLatitude && metadata.siteMapLongitude ? { store: { ...data.store, latitude: Number(metadata.siteMapLatitude), longitude: Number(metadata.siteMapLongitude) } } : {}),
    assessmentReviewDate: 'Before public opening, after final fit-out and commissioning; then on material change',
    accessDescription: supplied('accessDescription', 'Fire and Rescue Service access, appliance routes, site facilities and landlord arrangements require confirmation; access restrictions and appliance routes have not been confirmed.'),
    sleepingRisk: supplied('sleepingRisk', 'Sleeping occupancy and any adjoining sleeping risks have not been confirmed.'),
    historyOfFires: supplied('historyOfFires', 'Fire-incident history has not been confirmed.'),
    internalFireDoors: supplied('fireDoorsCondition', 'Fire-door condition, seals, self-closing operation and fire resistance require verification against the recorded observations and installation information.'),
    fireAlarmDescription: supplied('fireAlarmDescription', supplied('alarmSystemDescription', commissioningInformation || 'Confirm the fire alarm system category, coverage and commissioning documentation against the installation records. System condition and commissioning information are recorded below.')),
    emergencyLightingDescription: supplied('emergencyLightingDescription', 'Check emergency escape lighting coverage and performance against the final layout, test results and handover records. System information is recorded below.'),
    fireExtinguishersDescription: supplied('fireExtinguishersDescription', 'Final extinguisher provision, suitability, mounting, signage, accessibility and commissioning or servicing evidence require verification before opening.'),
    sprinklerDescription: supplied('sprinklerDescription', data.hasSprinklers ? 'A sprinkler system is recorded. Design, coverage, condition, landlord responsibilities and commissioning or handover evidence require verification.' : 'Sprinkler provision and any landlord system interfaces require confirmation; system provision has not been confirmed.'),
    sprinklerClearance: supplied('sprinklerClearance', 'Final stock and fit-out clearances require verification.'),
    fireExtinguisherService: supplied('fireExtinguisherService', 'Extinguisher servicing or commissioning evidence has not been confirmed.'),
    fireAlarmMaintenance: supplied('weeklyFireTests', 'Commissioning records and the ongoing test and maintenance arrangements require verification before opening.'),
    emergencyLightingMaintenance: supplied('emergencyLightingMonthlyTest', 'Commissioning results and ongoing test and maintenance arrangements require verification before opening.'),
    fireSafetyTrainingNarrative: supplied('fireSafetyTrainingNarrative', 'Completed staff instruction, evacuation training and records have not been confirmed; verify before opening.'),
    sourcesOfFuel: data.sourcesOfFuel.map((value: string) => value === 'Cleaning materials (low risk, non-flammable)' ? 'Cleaning materials: confirm quantities, storage and flammability from product information' : value),
    actionPlanItems: rows,
  }
}
