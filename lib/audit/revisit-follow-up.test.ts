import { describe, expect, it } from 'vitest'
import { completedAuditRevisit, type AuditRevisitFollowUp } from './revisit-follow-up'
import { requiresAuditRevisit, needsAuditVisit } from '@/lib/route-planning-store-eligibility'
import { summariseRevisitEvidence } from './revisit-follow-up-server'

export const followUp: AuditRevisitFollowUp = { status: 'available', originals: [{ id: 'original-2', auditNumber: 2, visitDate: '2026-09-17', percentage: 73.2, pdfPath: 'original-2.pdf', documentCount: 1, latestRevisitDate: '2026-10-22', latestEvidenceId: 'evidence-1' }] }
export const failedStore = { id: 'store', store_name: 'Fictional', compliance_audit_1_date: '2026-01-22', compliance_audit_1_overall_pct: 83.67, compliance_audit_1_pdf_path: null,
  compliance_audit_2_date: '2026-09-17', compliance_audit_2_overall_pct: 73.2, compliance_audit_2_pdf_path: 'original-2.pdf', audit_revisit_follow_up: followUp }

describe('exact-original revisit completion', () => {
  it('completes only the matching revisit, retaining original score, dates, PDFs and open findings', () => {
    const store = { ...failedStore, actions: [{ status: 'open' }], pendingFindings: 15 }, before = structuredClone(store)
    expect(completedAuditRevisit(store)?.id).toBe('original-2')
    expect(requiresAuditRevisit(store)).toBe(false); expect(needsAuditVisit(store)).toBe(false)
    expect(store).toEqual(before); expect(store.pendingFindings).toBe(15)
  })
  it.each([undefined, { status: 'available', originals: [] }, { status: 'unavailable', originals: followUp.originals }])('keeps missing, unavailable or permission-lost evidence outstanding', audit_revisit_follow_up => {
    const store = { ...failedStore, audit_revisit_follow_up } as typeof failedStore
    expect(completedAuditRevisit(store)).toBeNull(); expect(requiresAuditRevisit(store)).toBe(true)
  })
  it.each([
    { compliance_audit_2_date: '2026-10-24' },
    { compliance_audit_2_overall_pct: 72 },
    { compliance_audit_2_pdf_path: 'new-revision.pdf' },
    { compliance_audit_2_pdf_path: undefined },
    { compliance_audit_3_date: '2026-10-24', compliance_audit_3_overall_pct: 70, compliance_audit_3_pdf_path: 'audit3.pdf' },
  ])('never satisfies a newer audit/revision or unknown pointer: %j', change => {
    const store = { ...failedStore, ...change }
    expect(completedAuditRevisit(store)).toBeNull(); expect(requiresAuditRevisit(store)).toBe(true)
  })
  it('does not count an older original even when its revisit date is after the latest failed audit', () => {
    const older = { ...followUp.originals[0], id: 'original-1', auditNumber: 1, visitDate: '2026-01-22', percentage: 83.67, pdfPath: null }
    expect(requiresAuditRevisit({ ...failedStore, audit_revisit_follow_up: { status: 'available', originals: [older] } })).toBe(true)
  })
  it('can complete a first-audit revisit without inventing a second audit', () => {
    const original = { ...followUp.originals[0], auditNumber: 1 }
    const store = { compliance_audit_1_date: '2026-09-17', compliance_audit_1_overall_pct: 73.2, compliance_audit_1_pdf_path: 'original-2.pdf', compliance_audit_2_date: null, compliance_audit_2_overall_pct: null, audit_revisit_follow_up: { status: 'available' as const, originals: [original] } }
    expect(requiresAuditRevisit(store)).toBe(false); expect(needsAuditVisit(store)).toBe(true)
  })
})

describe('document summaries', () => {
  const original = { id: 'original-2', store_id: 'store', audit_number: 2, visit_date: '2026-09-17', percentage: 73.2, pdf_path: 'original-2.pdf' }
  const document = { id: 'doc1', original_history_id: original.id, revisit_date: '2026-10-22', file_sha256: 'a'.repeat(64), file_size: 100, storage_path: `${original.id}/evidence.pdf`, mime_type: 'application/pdf', created_at: '2026-10-25T12:00:00Z' }
  it('counts unique documents, keeps originals separate and links the latest evidence deterministically', () => {
    const older = { ...original, id: 'original-1', audit_number: 1, visit_date: '2026-01-22' }
    const result = summariseRevisitEvidence(['store'], [original, older], [document, document, { ...document, id: 'doc2', created_at: '2026-10-25T13:00:00Z' }, { ...document, id: 'doc3', original_history_id: older.id, storage_path: `${older.id}/another.pdf` }], '2026-10-25')
    expect(result.store.originals.map(row => [row.id, row.documentCount, row.latestEvidenceId])).toEqual([['original-2', 2, 'doc2'], ['original-1', 1, 'doc3']])
    expect(JSON.stringify(result)).not.toContain('storage_path'); expect(JSON.stringify(result)).not.toContain('file_sha256')
  })
  it('refuses invalid, future, preceding or unrelated evidence and inaccessible stores', () => {
    const invalid = [
      { ...document, file_sha256: 'bad' }, { ...document, file_size: 0 }, { ...document, storage_path: 'another-original/file.pdf' },
      { ...document, revisit_date: '2026-09-16' }, { ...document, revisit_date: '2026-10-26' }, { ...document, original_history_id: 'other' },
    ].map((row, i) => ({ ...row, id: `bad${i}` }))
    expect(summariseRevisitEvidence(['store'], [original], invalid, '2026-10-25').store.originals).toEqual([])
    expect(summariseRevisitEvidence(['other-store'], [original], [document], '2026-10-25')).toEqual({ 'other-store': { status: 'available', originals: [] } })
  })
})

it('retains a later unscored audit obligation instead of applying older completion', () => {
  const store = { ...failedStore, compliance_audit_3_date: '2026-10-24', compliance_audit_3_overall_pct: null, compliance_audit_3_pdf_path: null }
  expect(completedAuditRevisit(store)).toBeNull(); expect(needsAuditVisit(store)).toBe(true)
})


it('counts current reports only and selects the corrected version across follow-up consumers', () => {
  const original = { id: 'original', store_id: 'store', audit_number: 2, visit_date: '2026-08-12', percentage: 79.17, pdf_path: 'original.pdf' }
  const first = { id: 'first', original_history_id: original.id, revisit_date: '2026-10-29', file_sha256: 'a'.repeat(64), file_size: 100, storage_path: 'original/first.pdf', mime_type: 'application/pdf', created_at: '2026-10-29T13:11:30Z' }
  const second = { ...first, id: 'second', replaces_id: first.id, file_sha256: 'b'.repeat(64), created_at: '2026-10-29T14:00:00Z' }
  const before = structuredClone(original)
  const summary = summariseRevisitEvidence(['store'], [original], [first, second], '2026-10-29').store
  expect(summary.originals[0]).toMatchObject({ documentCount: 1, latestEvidenceId: 'second', latestRevisitDate: first.revisit_date, percentage: 79.17 })
  expect(original).toEqual(before)
})
