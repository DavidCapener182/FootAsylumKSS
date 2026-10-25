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
