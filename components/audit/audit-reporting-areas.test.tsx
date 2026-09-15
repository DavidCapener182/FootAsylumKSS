import React from 'react'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AuditStatsCards } from './audit-stats-cards'
import { AuditTable } from './audit-table'
import { AuditLeagueTable } from './audit-league-table'
import { AuditImprovementTable } from './audit-improvement-table'
import { AuditRow, getAuditAreaCode } from './audit-table-helpers'

vi.stubGlobal('React', React)
afterAll(() => { vi.unstubAllGlobals() })
vi.mock('@/components/shared/pdf-viewer-modal', () => ({ PDFViewerModal: () => null }))

const stores = [
  { id: 'meadowhall', store_name: 'Meadowhall', store_code: 'S0072', region: 'A2', reporting_area: 'AREA3', is_active: true, compliance_audit_1_date: '2026-01-01', compliance_audit_1_overall_pct: 90, compliance_audit_2_date: '2026-08-01', compliance_audit_2_overall_pct: 96 },
  { id: 'bolton', store_name: 'Bolton', store_code: 'S0017', region: 'A3', reporting_area: 'AREA2', is_active: true, compliance_audit_1_date: '2026-01-01', compliance_audit_1_overall_pct: 80, compliance_audit_2_date: '2026-08-01', compliance_audit_2_overall_pct: 90 },
  { id: 'photo', store_name: 'Photo Studio', store_code: 'S0900', region: 'Photo', reporting_area: 'NON_RETAIL', is_active: true, compliance_audit_1_date: '2026-01-01', compliance_audit_1_overall_pct: 74 },
].map(store => ({ compliance_audit_3_overall_pct: null, compliance_audit_2_overall_pct: null, ...store })) as AuditRow[]

describe('Audit Tracker reporting areas', () => {
  it('never uses a geographic region as a reporting-area fallback', () => {
    expect(getAuditAreaCode(stores[0])).toBe('AREA3')
    expect(getAuditAreaCode({ reporting_area: null })).toBe('UNASSIGNED')
  })

  it('calculates Stuart’s summary from Area 2 stores only', () => {
    const html = renderToStaticMarkup(<AuditStatsCards stores={stores} selectedArea="AREA2" />)
    expect(html).toContain('Area 2 average')
    expect(html).toContain('90.00%')
    expect(html).not.toContain('Yorkshire')
  })

  for (const [name, Component] of [['grouped', AuditTable], ['league', AuditLeagueTable], ['improvement', AuditImprovementTable]] as const) {
    it(`${name} view filters by reporting area rather than geographic region`, () => {
      const html = renderToStaticMarkup(<Component rows={stores} userRole="admin" areaFilter="AREA3" />)
      expect(html).toContain('Meadowhall')
      expect(html).not.toContain('Bolton')
      expect(html).not.toContain('Photo Studio')
    })
  }

  it('shows the studio under its separate group', () => {
    const html = renderToStaticMarkup(<AuditTable rows={stores} userRole="admin" areaFilter="NON_RETAIL" />)
    expect(html).toContain('Non-retail sites')
    expect(html).toContain('Photo Studio')
    expect(html).not.toContain('Bolton')
  })
})
