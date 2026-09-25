import { createHash } from 'node:crypto'

export const HISTORICAL_FRA_DECISIONS = Object.freeze([
  'open_migrate',
  'closed_archive',
  'routine_exclude',
  'duplicate_link',
  'not_fra_exclude',
  'needs_evidence',
])

const DECISIONS = new Set(HISTORICAL_FRA_DECISIONS)
const PRIORITIES = new Set(['Low', 'Medium', 'High'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256 = /^[a-f0-9]{64}$/i

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value
}

function nonempty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`)
  return value
}

function uuid(value, label) {
  if (!UUID.test(nonempty(value, label))) throw new Error(`${label} must be a UUID`)
  return value
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const day = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(day.valueOf()) && day.toISOString().slice(0, 10) === value
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

/** Two explicit human work queues. Neither queue is a migration instruction. */
export function buildHistoricalReviewQueues(inventory) {
  const source = record(inventory, 'Inventory')
  if (!Array.isArray(source.candidateActions) || !Array.isArray(source.storeInventory)) {
    throw new Error('Inventory candidateActions and storeInventory are required')
  }
  const queueA = source.candidateActions.map((candidate) => ({
    caseId: `fra-action:${nonempty(candidate.stagingKey, 'Candidate stagingKey')}`,
    queue: 'action_candidate',
    ...candidate,
    reviewNeeded: true,
    trackingEligible: false,
  })).sort((a, b) => {
    const publicationOrder = Number(Boolean(b.publicationId)) - Number(Boolean(a.publicationId))
    return publicationOrder || String(a.storeCode || '').localeCompare(String(b.storeCode || ''))
      || String(a.assessmentInstanceId).localeCompare(String(b.assessmentInstanceId))
      || a.sourceOrdinal - b.sourceOrdinal
  })
  const queueB = source.storeInventory.filter((store) => store.sourceReviewNeeded === true).map((store) => ({
    caseId: `legacy-store:${nonempty(store.storeId, 'Legacy store ID')}`,
    queue: 'legacy_source_discovery',
    storeId: store.storeId,
    storeCode: store.storeCode,
    storeName: store.storeName,
    latestFraDate: store.latestFraDate,
    currentFraPdfReference: store.currentFraPdfReference,
    historicalFraReferences: store.historicalFraReferences || [],
    reviewNeeded: true,
    trackingEligible: false,
    instruction: 'Locate and verify the issued FRA and its action page. Extract each row as a reviewed candidate before considering migration.',
  })).sort((a, b) => String(a.storeCode || '').localeCompare(String(b.storeCode || '')))
  return { queueA, queueB, summary: { actionCandidates: queueA.length,
    candidatesWithConfirmedPublication: queueA.filter((row) => row.publicationId).length,
    legacyStoresNeedingSourceDiscovery: queueB.length, migrationReady: 0 } }
}

/** Maps the UI's explicit checks to the canonical review shape before validation. */
export function toHistoricalReviewInput(uiInput, candidate) {
  const ui = record(uiInput, 'Candidate review input')
  const source = record(candidate, 'Candidate action')
  return {
    caseId: `fra-action:${ui.stagingKey}`,
    stagingKey: ui.stagingKey,
    storeId: ui.storeId,
    assessmentInstanceId: source.assessmentInstanceId,
    publicationId: source.publicationId || null,
    sourceItemSha256: ui.sourceItemSha256,
    decision: ui.decision,
    reviewerUserId: ui.reviewerId,
    reviewedAt: ui.reviewedAt,
    reason: ui.comment,
    missingEvidenceReason: ui.missingEvidenceReason,
    notFraEvidenceRef: ui.decision === 'not_fra_exclude' ? ui.completionEvidenceRef : undefined,
    issuedFra: {
      pdfPath: ui.issuedPdfPath,
      pdfSha256: ui.issuedPdfSha256,
      page: Number(ui.issuedPdfPage),
      rowOrdinal: Number(ui.issuedPdfRow),
      exactRecommendation: ui.issuedActionText,
    },
    checks: {
      issuedPdfVerified: ui.pdfIdentityChecked === true && ui.actionTextMatched === true,
      fraOriginVerified: ui.fraOrigin === 'confirmed',
      notFraOriginVerified: ui.fraOrigin === 'not_fra',
      remedialVerified: ui.actionKind === 'remedial',
      routineVerified: ui.actionKind === 'routine',
      outstandingVerified: ui.completion === 'open',
      completedVerified: ui.completion === 'closed',
      completionEvidenceChecked: ui.completionEvidenceChecked === true,
      duplicateChecked: ui.duplicateDisposition === 'new' || ui.duplicateDisposition === 'link_existing',
      priorityAndTargetChecked: ui.priorityAndTargetChecked === true,
    },
    completionEvidenceRef: ui.completionEvidenceRef,
    duplicateDisposition: ui.duplicateDisposition,
    duplicateOfFraActionId: ui.linkedActionId,
    priority: ui.priority,
    targetDate: ui.targetDate || undefined,
    targetDateEvidenceRef: ui.targetDateEvidenceRef,
  }
}

/** A reviewer must give one of six explicit dispositions for an existing Queue A candidate. */
export function validateHistoricalActionReview(input, candidate) {
  const review = record(input, 'Historical FRA review')
  const source = record(candidate, 'Candidate action')
  if (review.caseId !== `fra-action:${source.stagingKey}` || review.stagingKey !== source.stagingKey
    || review.storeId !== source.storeId || review.assessmentInstanceId !== source.assessmentInstanceId
    || (review.publicationId || null) !== (source.publicationId || null)
    || review.sourceItemSha256 !== source.sourceItemSha256) {
    throw new Error('Review does not match the candidate action and store')
  }
  if (!DECISIONS.has(review.decision)) throw new Error('Choose an explicit historical FRA decision')
  uuid(review.reviewerUserId, 'Reviewer user ID')
  if (typeof review.reviewedAt !== 'string' || Number.isNaN(Date.parse(review.reviewedAt))) {
    throw new Error('Review time is required')
  }
  nonempty(review.reason, 'Review reason')
  if (review.decision === 'needs_evidence') {
    nonempty(review.missingEvidenceReason, 'Missing evidence reason')
    return { ...review, migrationEligible: false }
  }

  const checks = record(review.checks, 'Review checks')
  for (const key of ['issuedPdfVerified', 'fraOriginVerified', 'notFraOriginVerified', 'remedialVerified', 'routineVerified',
    'outstandingVerified', 'completedVerified', 'completionEvidenceChecked', 'duplicateChecked', 'priorityAndTargetChecked']) {
    if (typeof checks[key] !== 'boolean') throw new Error(`Set the ${key} review check explicitly`)
  }
  if (review.decision === 'not_fra_exclude') {
    if (!checks.notFraOriginVerified) throw new Error('Non-FRA exclusion requires confirmed outside-FRA origin')
    nonempty(review.notFraEvidenceRef, 'Non-FRA source evidence reference')
    return { ...review, migrationEligible: false }
  }
  const issued = record(review.issuedFra, 'Issued FRA evidence')
  nonempty(issued.pdfPath, 'Issued FRA PDF path')
  if (!SHA256.test(nonempty(issued.pdfSha256, 'Issued FRA PDF SHA-256'))) throw new Error('Issued FRA PDF SHA-256 is invalid')
  if (!Number.isInteger(issued.page) || issued.page < 1) throw new Error('Issued FRA action page is required')
  if (!Number.isInteger(issued.rowOrdinal) || issued.rowOrdinal < 1) throw new Error('Issued FRA action row is required')
  nonempty(issued.exactRecommendation, 'Exact issued FRA recommendation')
  if (source.confirmedPdfPath && (issued.pdfPath !== source.confirmedPdfPath
    || issued.pdfSha256.toLowerCase() !== source.confirmedPdfSha256?.toLowerCase())) {
    throw new Error('Reviewed PDF does not match the confirmed FRA publication')
  }
  if (!checks.issuedPdfVerified || !checks.fraOriginVerified) {
    throw new Error('This decision requires a checked, FRA-origin issued PDF')
  }
  if (review.decision === 'open_migrate') {
    for (const key of ['issuedPdfVerified', 'fraOriginVerified', 'remedialVerified', 'outstandingVerified',
      'completionEvidenceChecked', 'duplicateChecked', 'priorityAndTargetChecked']) {
      if (!checks[key]) throw new Error(`Open migration requires ${key}`)
    }
    if (checks.notFraOriginVerified || checks.routineVerified || checks.completedVerified
      || review.duplicateDisposition !== 'new' || (typeof review.duplicateOfFraActionId === 'string' && review.duplicateOfFraActionId.trim())) {
      throw new Error('Open migration conflicts with the reviewed origin, routine, completion or duplicate disposition')
    }
    nonempty(review.completionEvidenceRef, 'Completion evidence reference')
    if (!PRIORITIES.has(review.priority)) throw new Error('Reviewer must confirm the issued priority')
    if (review.targetDate !== undefined) {
      if (!validDate(review.targetDate)) throw new Error('Target date must be a valid YYYY-MM-DD date')
      nonempty(review.targetDateEvidenceRef, 'Target date evidence reference')
    }
  }
  if (review.decision === 'closed_archive') {
    if (!checks.remedialVerified || !checks.completedVerified || !checks.completionEvidenceChecked) {
      throw new Error('Closed archival requires issued FRA and completion evidence checks')
    }
    nonempty(review.completionEvidenceRef, 'Completion evidence reference')
  }
  if (review.decision === 'routine_exclude' && (!checks.routineVerified || checks.remedialVerified)) {
    throw new Error('Routine exclusion requires a routine, non-remedial classification')
  }
  if (review.decision === 'duplicate_link') {
    if (!checks.remedialVerified || !checks.duplicateChecked || !checks.completionEvidenceChecked) {
      throw new Error('Duplicate link requires remedial, duplicate and completion checks')
    }
    nonempty(review.completionEvidenceRef, 'Completion evidence reference')
    uuid(review.duplicateOfFraActionId, 'Linked FRA action ID')
  }
  const sourceKey = sha256({ storeId: source.storeId, pdfSha256: issued.pdfSha256.toLowerCase(),
    page: issued.page, rowOrdinal: issued.rowOrdinal, wording: issued.exactRecommendation })
  return { ...review, sourceKey, migrationEligible: review.decision === 'open_migrate' }
}

/** Queue B records source discovery only. It cannot create an action candidate. */
export function validateLegacySourceInvestigation(input, queueItem) {
  const review = record(input, 'Legacy FRA source investigation')
  const source = record(queueItem, 'Legacy store queue item')
  if (review.caseId !== `legacy-store:${source.storeId}` || review.storeId !== source.storeId) {
    throw new Error('Source investigation does not match the legacy store')
  }
  uuid(review.reviewerUserId, 'Reviewer user ID')
  if (typeof review.reviewedAt !== 'string' || Number.isNaN(Date.parse(review.reviewedAt))) {
    throw new Error('Review time is required')
  }
  nonempty(review.notes, 'Source investigation notes')
  nonempty(review.evidenceRef, 'Source investigation evidence reference')
  if (!['needs_source', 'pdf_located', 'source_verified'].includes(review.status)) {
    throw new Error('Choose a legacy source investigation status')
  }
  if (review.status === 'pdf_located' || review.status === 'source_verified') {
    const pdf = record(review.issuedFra, 'Located FRA PDF')
    nonempty(pdf.pdfPath, 'Located FRA PDF path')
    if (!SHA256.test(nonempty(pdf.pdfSha256, 'Located FRA PDF SHA-256'))) {
      throw new Error('Located FRA PDF SHA-256 is invalid')
    }
    if (review.status === 'source_verified' && review.issuedPdfVerified !== true) {
      throw new Error('Located FRA PDF must be verified before source verification')
    }
  }
  if (review.status === 'needs_source') {
    nonempty(review.missingEvidenceReason, 'Missing source evidence reason')
  }
  return { ...review, actionCandidatesCreated: 0, migrationEligible: false }
}

/** Maps the UI's Queue B investigation fields to the source-only review shape. */
export function toLegacySourceInvestigationInput(uiInput) {
  const ui = record(uiInput, 'Legacy source investigation input')
  return {
    caseId: `legacy-store:${ui.storeId}`,
    storeId: ui.storeId,
    reviewerUserId: ui.reviewerId,
    reviewedAt: ui.reviewedAt,
    status: ui.status,
    notes: ui.notes,
    evidenceRef: ui.evidenceRef,
    missingEvidenceReason: ui.status === 'needs_source' ? ui.evidenceRef : undefined,
    issuedFra: { pdfPath: ui.pdfPath, pdfSha256: ui.pdfSha256 },
    issuedPdfVerified: ui.issuedPdfVerified === true,
  }
}

/** Produces a reviewable proposal only; the caller still needs an authorized write path. */
export function proposeHistoricalFraAction(review, candidate) {
  const validated = validateHistoricalActionReview(review, candidate)
  if (!validated.migrationEligible) return null
  return {
    source: 'historical_fra_review',
    storeId: candidate.storeId,
    assessmentInstanceId: candidate.assessmentInstanceId,
    publicationId: candidate.publicationId || null,
    sourceKey: validated.sourceKey,
    issuedFra: validated.issuedFra,
    recommendation: validated.issuedFra.exactRecommendation,
    priority: validated.priority,
    targetDate: validated.targetDate || null,
    reviewedBy: validated.reviewerUserId,
    reviewedAt: validated.reviewedAt,
    reviewReason: validated.reason,
    completionEvidenceRef: validated.completionEvidenceRef,
    checks: validated.checks,
  }
}
