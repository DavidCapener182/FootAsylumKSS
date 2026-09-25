export const HISTORICAL_DECISIONS = [
  'open_migrate',
  'closed_archive',
  'routine_exclude',
  'duplicate_link',
  'not_fra_exclude',
  'needs_evidence',
] as const

export type HistoricalDecision = typeof HISTORICAL_DECISIONS[number]

export const DECISION_LABELS: Record<HistoricalDecision, string> = {
  open_migrate: 'Open — migration proposal',
  closed_archive: 'Closed — archive only',
  routine_exclude: 'Routine advice — exclude',
  duplicate_link: 'Duplicate — link existing action',
  not_fra_exclude: 'Outside FRA scope — exclude',
  needs_evidence: 'Unable to verify — more evidence needed',
}

export type HistoricalCandidate = {
  stagingKey: string
  storeId: string
  storeCode: string | null
  assessmentInstanceId: string
  responseId: string
  sourceJsonPath: string
  sourceOrdinal: number
  sourceItemSha256: string
  publicationId: string | null
  confirmedPdfPath: string | null
  confirmedPdfSha256: string | null
  recommendation: string
  priority: 'Low' | 'Medium' | 'High' | null
  dueNote: string | null
  reviewFlags: string[]
}

export type HistoricalStore = {
  storeId: string
  storeCode: string | null
  storeName: string
  isActive: boolean
  latestFraDate: string | null
  currentFraPdfReference: string | null
  historicalFraReferences: Array<{ visitDate: string | null; pdfPath: string | null }>
  hasSafehubFraInstance: boolean
  sourceReviewNeeded: boolean
}

export type HistoricalAssessment = {
  instanceId: string
  conductedAt: string | null
  status: string | null
}

export type HistoricalReviewInventory = {
  generatedAt: string
  projectId: string
  summary: Record<string, number>
  storeInventory: HistoricalStore[]
  assessmentInventory: HistoricalAssessment[]
  candidateActions: HistoricalCandidate[]
}

export type CandidateReview = {
  stagingKey: string
  sourceItemSha256: string
  storeId: string
  decision: HistoricalDecision
  reviewerId: string
  reviewedAt: string
  comment: string
  missingEvidenceReason: string
  issuedPdfPath: string
  issuedPdfSha256: string
  issuedPdfPage: string
  issuedPdfRow: string
  issuedActionText: string
  pdfIdentityChecked: boolean
  actionTextMatched: boolean
  fraOrigin: 'confirmed' | 'not_fra' | 'unknown'
  actionKind: 'remedial' | 'routine' | 'unknown'
  completion: 'open' | 'closed' | 'unknown'
  completionEvidenceChecked: boolean
  completionEvidenceRef: string
  duplicateDisposition: 'new' | 'link_existing' | 'unknown'
  linkedActionId: string
  priority: 'Low' | 'Medium' | 'High' | ''
  priorityAndTargetChecked: boolean
  targetDate: string
  targetDateEvidenceRef: string
}

export type LegacyInvestigation = {
  storeId: string
  status: 'needs_source' | 'pdf_located' | 'source_verified'
  reviewerId: string
  reviewedAt: string
  pdfPath: string
  pdfSha256: string
  issuedPdfVerified: boolean
  evidenceRef: string
  notes: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256 = /^[0-9a-f]{64}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

/** Reject malformed downloaded drafts before putting them into form state. */
export function isCandidateReviewShape(value: unknown): value is CandidateReview {
  if (!isRecord(value)) return false
  const strings = [
    'stagingKey', 'sourceItemSha256', 'storeId', 'decision', 'reviewerId', 'reviewedAt',
    'comment', 'missingEvidenceReason', 'issuedPdfPath', 'issuedPdfSha256',
    'issuedPdfPage', 'issuedPdfRow', 'issuedActionText', 'fraOrigin', 'actionKind',
    'completion', 'completionEvidenceRef', 'duplicateDisposition', 'linkedActionId',
    'priority', 'targetDate', 'targetDateEvidenceRef',
  ]
  const booleans = ['pdfIdentityChecked', 'actionTextMatched', 'completionEvidenceChecked', 'priorityAndTargetChecked']
  return strings.every(key => typeof value[key] === 'string')
    && booleans.every(key => typeof value[key] === 'boolean')
}

export function isLegacyInvestigationShape(value: unknown): value is LegacyInvestigation {
  if (!isRecord(value)) return false
  const strings = ['storeId', 'status', 'reviewerId', 'reviewedAt', 'pdfPath', 'pdfSha256', 'evidenceRef', 'notes']
  return strings.every(key => typeof value[key] === 'string') && typeof value.issuedPdfVerified === 'boolean'
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

export function candidateQueue(inventory: HistoricalReviewInventory): HistoricalCandidate[] {
  const stores = new Map(inventory.storeInventory.map(store => [store.storeId, store]))
  return [...inventory.candidateActions].sort((left, right) =>
    Number(Boolean(right.publicationId)) - Number(Boolean(left.publicationId))
    || (stores.get(left.storeId)?.storeName || left.storeCode || '').localeCompare(stores.get(right.storeId)?.storeName || right.storeCode || '')
    || left.sourceOrdinal - right.sourceOrdinal
    || left.stagingKey.localeCompare(right.stagingKey))
}

export function legacyQueue(inventory: HistoricalReviewInventory): HistoricalStore[] {
  return inventory.storeInventory.filter(store => store.sourceReviewNeeded)
    .sort((left, right) => left.storeName.localeCompare(right.storeName))
}

export function blankCandidateReview(candidate: HistoricalCandidate, reviewerId: string): CandidateReview {
  return {
    stagingKey: candidate.stagingKey,
    sourceItemSha256: candidate.sourceItemSha256,
    storeId: candidate.storeId,
    decision: 'needs_evidence',
    reviewerId,
    reviewedAt: '',
    comment: '',
    missingEvidenceReason: '',
    issuedPdfPath: candidate.confirmedPdfPath || '',
    issuedPdfSha256: candidate.confirmedPdfSha256 || '',
    issuedPdfPage: '',
    issuedPdfRow: '',
    issuedActionText: '',
    pdfIdentityChecked: false,
    actionTextMatched: false,
    fraOrigin: 'unknown',
    actionKind: 'unknown',
    completion: 'unknown',
    completionEvidenceChecked: false,
    completionEvidenceRef: '',
    duplicateDisposition: 'unknown',
    linkedActionId: '',
    priority: candidate.priority || '',
    priorityAndTargetChecked: false,
    targetDate: '',
    targetDateEvidenceRef: '',
  }
}

/** Local review validation; the future write API must independently recheck every claim. */
export function candidateReviewErrors(review: CandidateReview, candidate: HistoricalCandidate): string[] {
  const errors: string[] = []
  if (review.stagingKey !== candidate.stagingKey || review.storeId !== candidate.storeId || review.sourceItemSha256 !== candidate.sourceItemSha256) {
    errors.push('This review does not match the selected inventory row.')
  }
  if (!HISTORICAL_DECISIONS.includes(review.decision)) errors.push('Choose a valid decision.')
  if (!UUID.test(review.reviewerId)) errors.push('A signed-in KSS reviewer ID is required.')
  if (!review.reviewedAt || Number.isNaN(Date.parse(review.reviewedAt))) errors.push('A review timestamp is required.')
  if (!review.comment.trim()) errors.push('Record the reason for this decision.')

  if (review.decision === 'needs_evidence') {
    if (!review.missingEvidenceReason.trim()) errors.push('State exactly what evidence is missing.')
    return errors
  }
  if (review.decision === 'not_fra_exclude') {
    if (review.fraOrigin !== 'not_fra') errors.push('Confirm that the item is outside FRA scope.')
    if (!review.completionEvidenceRef.trim()) errors.push('Reference the evidence showing its non-FRA origin.')
    return errors
  }

  if (!review.issuedPdfPath.trim() || !SHA256.test(review.issuedPdfSha256)) errors.push('Record the exact issued PDF path and SHA-256.')
  if (!/^\d+$/.test(review.issuedPdfPage) || Number(review.issuedPdfPage) < 1) errors.push('Record the issued PDF page number.')
  if (!/^\d+$/.test(review.issuedPdfRow) || Number(review.issuedPdfRow) < 1) errors.push('Record the exact issued PDF action row number.')
  if (!review.issuedActionText.trim()) errors.push('Transcribe the exact issued action wording.')
  if (!review.pdfIdentityChecked || !review.actionTextMatched) errors.push('Check PDF identity and match this row to the issued action plan.')
  if (review.fraOrigin !== 'confirmed') errors.push('Confirm FRA origin.')
  if (candidate.confirmedPdfPath && (review.issuedPdfPath !== candidate.confirmedPdfPath
    || review.issuedPdfSha256.toLowerCase() !== candidate.confirmedPdfSha256?.toLowerCase())) {
    errors.push('The reviewed PDF path and hash must match the confirmed publication.')
  }

  if (review.decision === 'routine_exclude') {
    if (review.actionKind !== 'routine') errors.push('Classify this row as routine advice.')
    return errors
  }

  if (review.actionKind !== 'remedial') errors.push('Confirm this is a remedial action.')
  if (review.completion === 'unknown' || !review.completionEvidenceChecked || !review.completionEvidenceRef.trim()) {
    errors.push('Review and reference current completion evidence.')
  }
  if (review.decision === 'closed_archive' && review.completion !== 'closed') errors.push('Closed archive requires verified completion.')
  if (review.decision === 'open_migrate') {
    if (review.completion !== 'open') errors.push('Migration requires evidence that the action remains open.')
    if (review.duplicateDisposition !== 'new') errors.push('Resolve duplicates before proposing a new action.')
    if (review.linkedActionId.trim()) errors.push('A new action proposal cannot also link an existing FRA action.')
    if (!review.priorityAndTargetChecked || !['Low', 'Medium', 'High'].includes(review.priority)) {
      errors.push('Confirm priority and any evidenced target date.')
    }
    if (review.targetDate && !isRealDate(review.targetDate)) errors.push('Target date must be a real YYYY-MM-DD date.')
    if (review.targetDate && !review.targetDateEvidenceRef.trim()) errors.push('Reference evidence for the target date.')
  }
  if (review.decision === 'duplicate_link') {
    if (review.duplicateDisposition !== 'link_existing' || !UUID.test(review.linkedActionId)) {
      errors.push('Link the exact existing FRA action ID.')
    }
  }
  return errors
}

export function legacyInvestigationErrors(review: LegacyInvestigation, store: HistoricalStore): string[] {
  const errors: string[] = []
  if (review.storeId !== store.storeId || !store.sourceReviewNeeded) errors.push('This investigation does not match a legacy queue store.')
  if (!UUID.test(review.reviewerId) || !review.reviewedAt || Number.isNaN(Date.parse(review.reviewedAt))) {
    errors.push('A signed-in KSS reviewer and timestamp are required.')
  }
  if (!review.notes.trim()) errors.push('Record what was checked and what remains unknown.')
  if (review.status === 'needs_source') {
    if (!review.evidenceRef.trim()) errors.push('Record the missing source or where it will be requested.')
  } else if (review.status === 'pdf_located' || review.status === 'source_verified') {
    if (!review.pdfPath.trim() || !SHA256.test(review.pdfSha256)) errors.push('Record the exact PDF path and SHA-256.')
    if (!review.evidenceRef.trim()) errors.push('Reference the document or verification evidence.')
    if (review.status === 'source_verified' && review.issuedPdfVerified !== true) errors.push('Check the exact issued PDF identity before marking the source verified.')
  } else {
    errors.push('Choose a source investigation status.')
  }
  return errors
}
