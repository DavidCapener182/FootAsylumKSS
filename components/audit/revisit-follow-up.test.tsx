import React from 'react'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RevisitFollowUp } from './revisit-follow-up'
vi.stubGlobal('React', React)
afterAll(() => { vi.unstubAllGlobals() })
const original = { id: 'parent', auditNumber: 2, visitDate: '2026-09-17', percentage: 73.2, pdfPath: 'audit.pdf', documentCount: 2, latestRevisitDate: '2026-10-22', latestEvidenceId: 'evidence' }
const store = { id: 'store', store_name: 'Fictional', compliance_audit_2_date: original.visitDate, compliance_audit_2_overall_pct: 73.2, compliance_audit_2_pdf_path: original.pdfPath, audit_revisit_follow_up: { status: 'available' as const, originals: [original] } }
describe('tracker follow-up evidence', () => {
  it('shows the completed revisit, exact document count and authorized report/history links', () => {
    const html = renderToStaticMarkup(<RevisitFollowUp store={store} />)
    expect(html).toContain('Revisited 22 Oct 2026'); expect(html).toContain('Revisit complete'); expect(html).toContain('2 documents')
    expect(html).not.toContain('2 revisits'); expect(html).toContain('/api/audit-revisits?storeId=store&amp;evidenceId=evidence')
    expect(html).toContain('/stores/store?tab=audit-history#revisit-heading'); expect(html).toContain('Audit score and open actions unchanged')
  })
  it('labels older-original evidence without completing a later failed audit', () => {
    const html = renderToStaticMarkup(<RevisitFollowUp store={{ ...store, compliance_audit_2_date: '2026-10-24' }} />)
    expect(html).toContain('Original Audit 2'); expect(html).not.toContain('Revisit complete')
  })
  it('hides report identifiers on permission/error fallback', () => {
    const html = renderToStaticMarkup(<RevisitFollowUp store={{ ...store, audit_revisit_follow_up: { status: 'unavailable', originals: [original] } }} />)
    expect(html).toContain('Revisit history unavailable'); expect(html).not.toContain('evidenceId='); expect(html).not.toContain('Revisit complete')
  })
})

describe('missing revisit report prompt', () => {
  const missing = { ...store, audit_revisit_follow_up: { status: 'available' as const, originals: [] } }
  it('offers a separate upload for a failed audit without evidence', () => {
    const html = renderToStaticMarkup(<RevisitFollowUp store={missing} onUpload={() => {}} />)
    expect(html).toContain('Revisit report required')
    expect(html).toContain('Upload revisit report')
  })
  it('does not ask again for a completed Dundee-style revisit', () => {
    expect(renderToStaticMarkup(<RevisitFollowUp store={store} onUpload={() => {}} />)).not.toContain('Upload revisit report')
  })
  it('does not require a revisit at exactly 80% or for an unscored visit', () => {
    for (const score of [80, 90, null]) expect(renderToStaticMarkup(<RevisitFollowUp store={{ ...missing, compliance_audit_2_overall_pct: score }} onUpload={() => {}} />)).not.toContain('Upload revisit report')
  })
  it('keeps the requirement visible but hides upload controls for viewers', () => {
    const html = renderToStaticMarkup(<RevisitFollowUp store={missing} />)
    expect(html).toContain('Revisit report required')
    expect(html).not.toContain('Upload revisit report')
  })
  it('still asks when evidence belongs to an earlier failed audit', () => {
    expect(renderToStaticMarkup(<RevisitFollowUp store={{ ...store, compliance_audit_2_date: '2026-10-24' }} onUpload={() => {}} />)).toContain('Upload revisit report')
  })
})
