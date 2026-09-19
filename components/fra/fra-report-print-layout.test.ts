import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const reportSource = readFileSync(
  new URL('./fra-report-view.tsx', import.meta.url),
  'utf8'
)
const printCss = readFileSync(
  new URL('../../public/print.css', import.meta.url),
  'utf8'
)

describe('FRA report print layout contract', () => {
  it('uses a bounded grid for hazard evidence instead of an unbounded stacked column', () => {
    expect(reportSource).toContain('className="fra-hazards-photo-cell')
    expect(reportSource).toContain(
      '<PhotoPlaceholder placeholderId="fire-hazards" label="Hazard photos" maxPhotos={5} compact />'
    )
    expect(printCss).toContain('body.fra-print-document .fra-hazards-table .fra-photo-grid')
    expect(printCss).toContain('body.fra-print-document .fra-hazards-table .fra-photo-block')

    const genericPhotoRules = printCss.lastIndexOf(
      'body.fra-print-document .fra-photo-grid .fra-photo-block'
    )
    const hazardPhotoRules = printCss.lastIndexOf(
      'body.fra-print-document .fra-hazards-table .fra-photo-grid .fra-photo-block'
    )
    expect(hazardPhotoRules).toBeGreaterThan(genericPhotoRules)
  })

  it('allows long print tables to paginate while keeping each row intact', () => {
    const sharedAvoidRule = printCss.slice(
      printCss.indexOf('body.fra-print-document .fra-diagram'),
      printCss.indexOf('/* Each section = one printed page')
    )
    expect(sharedAvoidRule).not.toContain('.fra-print-table')
    expect(printCss).toContain('body.fra-print-document .fra-print-page table tr')
  })

  it('does not force a page break after the final site-pictures sheet', () => {
    expect(reportSource).toContain(
      'className="fra-section fra-a4-page fra-print-page fra-last-page p-12 max-w-4xl mx-auto"'
    )
    expect(reportSource).not.toContain(
      'className="fra-section fra-a4-page fra-print-page fra-last-page page-break-after-always'
    )
    expect(printCss).toContain(
      'body.fra-print-document .fra-print-page.fra-last-page'
    )
  })

  it('keeps assessor calibration in the risk rationale without changing the action-plan format', () => {
    const actionPlan = reportSource.slice(
      reportSource.indexOf('{/* Action Plan */}'),
      reportSource.indexOf('{/* Additional Site Pictures')
    )
    expect(actionPlan).not.toContain('Assessor calibration applied:')
    expect(reportSource).toContain('className="fra-risk-summary-section"')
  })
})
