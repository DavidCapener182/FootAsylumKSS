import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuditCyclePanel } from './audit-cycle-panel'
import type { AuditRow } from './audit-table-helpers'
vi.mock('@/app/actions/audit-pdfs', () => ({getAuditPDFDownloadUrl: vi.fn()}))
vi.stubGlobal('React', React)
afterEach(() => { vi.useRealTimers() })
describe('audit cycle view', () => {
  it('shows Audit 3/4 with a 2027 booking and keeps 2026 behind history', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2027-01-01T12:00:00Z'))
    const store = {id:'s',store_name:'Bolton',store_code:'S0017',is_active:true,
      compliance_audit_1_date:'2026-02-01',compliance_audit_1_overall_pct:90,
      compliance_audit_2_date:'2026-10-01',compliance_audit_2_overall_pct:95,
      compliance_audit_2_planned_date:'2027-02-03'} as AuditRow
    const html = renderToStaticMarkup(<AuditCyclePanel stores={[store]} history={[]} canManage />)
    expect(html).toContain('Audit 3</th>')
    expect(html).toContain('Audit 4</th>')
    expect(html).toContain('Booked ')
    expect(html).toContain('/route-planning?year=2027')
    expect(html).toContain('<details>')
    expect(html).toContain('Audit 1')
    expect(html).not.toContain('<details open')
  })
  it('does not offer booking to a read-only user', () => {
    expect(renderToStaticMarkup(<AuditCyclePanel stores={[]} history={[]} canManage={false} />)).not.toContain('Book next audit')
  })
})
