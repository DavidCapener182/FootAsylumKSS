import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildHistoricalReviewQueues, HISTORICAL_FRA_DECISIONS,
  proposeHistoricalFraAction, toHistoricalReviewInput, toLegacySourceInvestigationInput, validateHistoricalActionReview,
  validateLegacySourceInvestigation } from './historical-review.mjs'

const reviewerUserId = '00000000-0000-4000-8000-000000000001'
const candidate = {
  stagingKey: 'instance:response:1', storeId: 'store-1', assessmentInstanceId: 'instance',
  publicationId: 'publication', confirmedPdfPath: 'fra/issued.pdf', confirmedPdfSha256: 'a'.repeat(64),
  sourceItemSha256: 'b'.repeat(64), sourceOrdinal: 1, recommendation: 'Repair the fire panel', priority: 'High',
}
const issuedFra = { pdfPath: 'fra/issued.pdf', pdfSha256: 'a'.repeat(64), page: 22,
  rowOrdinal: 1, exactRecommendation: 'Repair the fire panel' }
const checks = { issuedPdfVerified: true, fraOriginVerified: true, notFraOriginVerified: false,
  remedialVerified: true, routineVerified: false, outstandingVerified: true, completedVerified: false,
  completionEvidenceChecked: true, duplicateChecked: true, priorityAndTargetChecked: true }
const review = {
  caseId: `fra-action:${candidate.stagingKey}`, stagingKey: candidate.stagingKey, storeId: candidate.storeId,
  assessmentInstanceId: candidate.assessmentInstanceId, publicationId: candidate.publicationId,
  sourceItemSha256: candidate.sourceItemSha256, decision: 'open_migrate', reviewerUserId,
  reviewedAt: '2026-09-25T12:00:00.000Z', reason: 'The issued report requires repair and the current panel remains faulty.',
  issuedFra, checks, completionEvidenceRef: 'current site check 2026-09-24', priority: 'High',
  duplicateDisposition: 'new', duplicateOfFraActionId: '',
}

test('orders confirmed action candidates first and keeps legacy stores in source discovery', () => {
  const inventory = { candidateActions: [
    { ...candidate, stagingKey: 'unconfirmed', publicationId: null },
    { ...candidate, stagingKey: 'confirmed' },
  ], storeInventory: [
    { storeId: 'store-2', storeCode: 'S0002', sourceReviewNeeded: true, latestFraDate: '2026-01-01' },
    { storeId: 'store-3', storeCode: 'S0003', sourceReviewNeeded: false },
  ] }
  const queues = buildHistoricalReviewQueues(inventory)
  assert.equal(queues.queueA[0].stagingKey, 'confirmed')
  assert.equal(queues.queueB.length, 1)
  assert.equal(queues.queueB[0].queue, 'legacy_source_discovery')
  assert.equal(queues.summary.migrationReady, 0)
  assert.equal(HISTORICAL_FRA_DECISIONS.length, 6)
})

test('only fully evidenced open review creates a proposal with exact issued wording', () => {
  const proposal = proposeHistoricalFraAction(review, candidate)
  assert.equal(proposal.recommendation, issuedFra.exactRecommendation)
  assert.equal(proposal.targetDate, null)
  assert.equal(proposal.sourceKey.length, 64)
  assert.throws(() => proposeHistoricalFraAction({ ...review, checks: { ...checks, outstandingVerified: false } }, candidate), /outstandingVerified/)
  assert.throws(() => proposeHistoricalFraAction({ ...review, issuedFra: { ...issuedFra, pdfSha256: 'c'.repeat(64) } }, candidate), /does not match/)
  assert.throws(() => proposeHistoricalFraAction({ ...review, targetDate: '2026-02-30' }, candidate), /Target date/)
  assert.throws(() => proposeHistoricalFraAction({ ...review, targetDate: '2026-10-01' }, candidate), /Target date evidence/)
  assert.throws(() => proposeHistoricalFraAction({ ...review, checks: { ...checks, routineVerified: true } }, candidate), /conflicts/)
  assert.throws(() => proposeHistoricalFraAction({ ...review, checks: { ...checks, completedVerified: true } }, candidate), /conflicts/)
  assert.throws(() => proposeHistoricalFraAction({ ...review, duplicateDisposition: 'link_existing' }, candidate), /conflicts/)
  assert.throws(() => proposeHistoricalFraAction({ ...review, duplicateOfFraActionId: reviewerUserId }, candidate), /conflicts/)
})

test('needs evidence is saveable without a PDF or completion evidence and cannot migrate', () => {
  const incomplete = { ...review, decision: 'needs_evidence', issuedFra: undefined, checks: undefined,
    completionEvidenceRef: undefined, missingEvidenceReason: 'Issued FRA PDF has not been located' }
  assert.equal(validateHistoricalActionReview(incomplete, candidate).migrationEligible, false)
  assert.equal(proposeHistoricalFraAction(incomplete, candidate), null)
  assert.throws(() => validateHistoricalActionReview({ ...incomplete, missingEvidenceReason: '' }, candidate), /Missing evidence/)
})

test('a legacy store source review creates no action row', () => {
  const queueItem = { storeId: 'store-2' }
  const investigation = validateLegacySourceInvestigation({ caseId: 'legacy-store:store-2', storeId: 'store-2',
    reviewerUserId, reviewedAt: review.reviewedAt, status: 'needs_source',
    notes: 'The issued report is not yet available.', evidenceRef: 'Original PDF requested',
    missingEvidenceReason: 'Original PDF' }, queueItem)
  assert.equal(investigation.actionCandidatesCreated, 0)
  assert.equal(investigation.migrationEligible, false)
  const uiLegacy = { storeId: 'store-2', reviewerId: reviewerUserId,
    reviewedAt: review.reviewedAt, status: 'source_verified', notes: 'Compared with store and date.',
    evidenceRef: 'PDF readback log', pdfPath: 'fra/legacy.pdf', pdfSha256: 'c'.repeat(64),
    issuedPdfVerified: true }
  const mapped = toLegacySourceInvestigationInput(uiLegacy)
  assert.equal(validateLegacySourceInvestigation(mapped, queueItem).migrationEligible, false)
  assert.throws(() => validateLegacySourceInvestigation(
    toLegacySourceInvestigationInput({ ...uiLegacy, issuedPdfVerified: false }),
    queueItem), /must be verified/)
})

test('UI review fields map to the canonical open proposal without losing checks', () => {
  const ui = {
    stagingKey: candidate.stagingKey, sourceItemSha256: candidate.sourceItemSha256, storeId: candidate.storeId,
    decision: 'open_migrate', reviewerId: reviewerUserId, reviewedAt: review.reviewedAt, comment: review.reason,
    missingEvidenceReason: '', issuedPdfPath: issuedFra.pdfPath, issuedPdfSha256: issuedFra.pdfSha256,
    issuedPdfPage: String(issuedFra.page), issuedPdfRow: String(issuedFra.rowOrdinal),
    issuedActionText: issuedFra.exactRecommendation, pdfIdentityChecked: true, actionTextMatched: true,
    fraOrigin: 'confirmed', actionKind: 'remedial', completion: 'open', completionEvidenceChecked: true,
    completionEvidenceRef: review.completionEvidenceRef, duplicateDisposition: 'new', linkedActionId: '',
    priority: 'High', priorityAndTargetChecked: true, targetDate: '', targetDateEvidenceRef: '',
  }
  const canonical = toHistoricalReviewInput(ui, candidate)
  assert.deepEqual(canonical.checks, checks)
  assert.equal(proposeHistoricalFraAction(canonical, candidate).recommendation, issuedFra.exactRecommendation)
  assert.equal(proposeHistoricalFraAction(toHistoricalReviewInput({ ...ui, decision: 'needs_evidence',
    missingEvidenceReason: 'PDF unavailable', issuedPdfPath: '', issuedPdfSha256: '', issuedPdfPage: '',
    issuedPdfRow: '', issuedActionText: '', pdfIdentityChecked: false, completionEvidenceChecked: false }, candidate), candidate), null)
})
