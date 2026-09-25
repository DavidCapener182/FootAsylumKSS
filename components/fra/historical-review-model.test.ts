import { describe, expect, it } from 'vitest'
import {
  blankCandidateReview,
  candidateQueue,
  candidateReviewErrors,
  isCandidateReviewShape,
  isLegacyInvestigationShape,
  legacyInvestigationErrors,
  legacyQueue,
  type HistoricalCandidate,
  type HistoricalReviewInventory,
  type HistoricalStore,
} from './historical-review-model'

const reviewerId = '11111111-1111-4111-8111-111111111111'
const storeId = '22222222-2222-4222-8222-222222222222'
const pdfSha256 = 'a'.repeat(64)
const candidate: HistoricalCandidate = {
  stagingKey: 'assessment:response:1', storeId, storeCode: 'S0001',
  assessmentInstanceId: '33333333-3333-4333-8333-333333333333',
  responseId: '44444444-4444-4444-8444-444444444444',
  sourceJsonPath: 'fra_extracted_data.actionPlanItems[0]', sourceOrdinal: 1,
  sourceItemSha256: 'b'.repeat(64), publicationId: '55555555-5555-4555-8555-555555555555',
  confirmedPdfPath: 'fra/issued.pdf', confirmedPdfSha256: pdfSha256,
  recommendation: 'Repair fire alarm panel.', priority: 'High', dueNote: null,
  reviewFlags: ['ISSUED_PDF_ACTION_LIST_UNVERIFIED'],
}

const store: HistoricalStore = {
  storeId, storeCode: 'S0001', storeName: 'Example Store', isActive: true,
  latestFraDate: '2026-09-01', currentFraPdfReference: null,
  historicalFraReferences: [], hasSafehubFraInstance: false, sourceReviewNeeded: true,
}

function reviewed() {
  return {
    ...blankCandidateReview(candidate, reviewerId),
    reviewedAt: '2026-09-25T10:00:00.000Z',
    comment: 'Checked the current fire alarm panel and issued report.',
    issuedPdfPath: candidate.confirmedPdfPath!, issuedPdfSha256: pdfSha256,
    issuedPdfPage: '21', issuedPdfRow: '1', issuedActionText: candidate.recommendation,
    pdfIdentityChecked: true, actionTextMatched: true,
    fraOrigin: 'confirmed' as const, actionKind: 'remedial' as const,
    completion: 'open' as const, completionEvidenceChecked: true,
    completionEvidenceRef: 'Current site check dated 24 September',
    duplicateDisposition: 'new' as const, priority: 'High' as const,
    priorityAndTargetChecked: true,
  }
}

describe('local historical FRA review model', () => {
  it('puts confirmed candidates first and keeps legacy stores in source discovery', () => {
    const inventory: HistoricalReviewInventory = {
      generatedAt: '2026-09-25T10:00:00Z', projectId: 'test', summary: {},
      storeInventory: [store], assessmentInventory: [],
      candidateActions: [{ ...candidate, stagingKey: 'unconfirmed', publicationId: null }, candidate],
    }
    expect(candidateQueue(inventory)[0].stagingKey).toBe(candidate.stagingKey)
    expect(legacyQueue(inventory).map(item => item.storeId)).toEqual([storeId])
  })

  it('records Unable to verify without requiring a PDF or completion evidence', () => {
    const review = { ...blankCandidateReview(candidate, reviewerId),
      reviewedAt: '2026-09-25T10:00:00.000Z', comment: 'The issued report is unavailable.',
      missingEvidenceReason: 'Locate the archived issued FRA PDF.',
    }
    expect(candidateReviewErrors(review, candidate)).toEqual([])
    expect(candidateReviewErrors({ ...review, missingEvidenceReason: '' }, candidate))
      .toContain('State exactly what evidence is missing.')
    expect(isCandidateReviewShape(review)).toBe(true)
    expect(isCandidateReviewShape({ ...review, issuedPdfPath: { unsafe: true } })).toBe(false)
  })

  it('requires exact PDF identity, row, completion and target evidence for an open proposal', () => {
    const valid = { ...reviewed(), decision: 'open_migrate' as const }
    expect(candidateReviewErrors(valid, candidate)).toEqual([])
    expect(candidateReviewErrors({ ...valid, issuedPdfRow: '' }, candidate))
      .toContain('Record the exact issued PDF action row number.')
    expect(candidateReviewErrors({ ...valid, issuedPdfSha256: 'c'.repeat(64) }, candidate))
      .toContain('The reviewed PDF path and hash must match the confirmed publication.')
    expect(candidateReviewErrors({ ...valid, completion: 'unknown' }, candidate))
      .toContain('Migration requires evidence that the action remains open.')
    expect(candidateReviewErrors({ ...valid, targetDate: '2026-02-31' }, candidate))
      .toContain('Target date must be a real YYYY-MM-DD date.')
    expect(candidateReviewErrors({ ...valid, targetDate: '2026-10-10' }, candidate))
      .toContain('Reference evidence for the target date.')
    expect(candidateReviewErrors({ ...valid, targetDate: '2026-10-10', targetDateEvidenceRef: 'Approved work order' }, candidate)).toEqual([])
  })

  it('allows a sourced outside-FRA exclusion without claiming a PDF match', () => {
    const review = { ...blankCandidateReview(candidate, reviewerId),
      reviewedAt: '2026-09-25T10:00:00.000Z', comment: 'This was an H&S audit item.',
      decision: 'not_fra_exclude' as const, fraOrigin: 'not_fra' as const,
      completionEvidenceRef: 'H&S audit item 4 on 2 September',
    }
    expect(candidateReviewErrors(review, candidate)).toEqual([])
  })

  it('does not treat locating a legacy PDF as verifying its identity or creating actions', () => {
    const base = { storeId, reviewerId, reviewedAt: '2026-09-25T10:00:00.000Z',
      pdfPath: 'fra/legacy.pdf', pdfSha256, issuedPdfVerified: false,
      evidenceRef: 'Archive copy', notes: 'Store/date still to be checked.',
    }
    expect(legacyInvestigationErrors({ ...base, status: 'pdf_located' }, store)).toEqual([])
    expect(legacyInvestigationErrors({ ...base, status: 'source_verified' }, store))
      .toContain('Check the exact issued PDF identity before marking the source verified.')
    expect(legacyInvestigationErrors({ ...base, status: 'source_verified', issuedPdfVerified: true }, store)).toEqual([])
    expect(isLegacyInvestigationShape({ ...base, status: 'source_verified' })).toBe(true)
    expect(isLegacyInvestigationShape({ ...base, issuedPdfVerified: 'yes' })).toBe(false)
  })
})
