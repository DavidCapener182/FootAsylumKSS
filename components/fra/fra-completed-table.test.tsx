import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FRACompletedTable } from './fra-completed-table'
import type { FRARow } from './fra-table-helpers'
vi.mock('@/app/actions/fra-pdfs', () => ({ getFRAPDFDownloadUrl: vi.fn(), deleteFRAPDF: vi.fn() }))
afterEach(() => { vi.unstubAllGlobals() })
describe('completed FRA document controls', () => {
  it('exposes the saved PDF on mobile and desktop without treating an in-date assessment as a saved file', () => {
    vi.stubGlobal('React', React)
    const base: FRARow = { id: 'saved', store_name: 'Saved store', store_code: 'S0001', region: 'A1', is_active: true, compliance_audit_1_date: '2026-01-01', compliance_audit_2_date: null, fire_risk_assessment_date: new Date().toISOString().slice(0, 10), fire_risk_assessment_pdf_path: 'store/saved/original.pdf', fire_risk_assessment_notes: null, fire_risk_assessment_pct: null }
    const html = renderToStaticMarkup(<FRACompletedTable rows={[base, { ...base, id: 'missing', store_name: 'Missing store', fire_risk_assessment_pdf_path: null }]} />)
    expect(html.match(/aria-label="Open PDF for Saved store"/g)).toHaveLength(2)
    expect(html).not.toContain('Open PDF for Missing store')
    expect(html).toContain('No saved PDF')
    expect(html).toContain('Up to date')
    expect(html).not.toContain('/audit-lab/view-fra-report?instanceId=saved')
  })
})
