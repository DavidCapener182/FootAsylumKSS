import React from 'react'
import { afterAll, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { KpiGrid } from './kpi-grid'
import { ComplianceProgressPanel } from './compliance-progress-panel'

vi.stubGlobal('React', React)
afterAll(() => { vi.unstubAllGlobals() })

it('uses the applicable denominator in dashboard copy and both percentage displays', () => {
  const data = {auditStats: {totalStores: 69, firstAuditsRequired: 67, firstAuditsNotRequired: 2, firstAuditsComplete: 67}}
  const overview = renderToStaticMarkup(<KpiGrid data={data} />)
  const progress = renderToStaticMarkup(<ComplianceProgressPanel data={data} />)
  expect(overview).toContain('69 active stores')
  expect(overview).toContain('67 of 67 required first audits complete.')
  expect(overview).toContain('2 new stores · Audit 1 not required.')
  expect(overview).toContain('100% of required first audits complete')
  expect(progress).toContain('(100%)')
  expect(progress).toContain('2 new stores excluded from Audit 1 requirements.')
})
