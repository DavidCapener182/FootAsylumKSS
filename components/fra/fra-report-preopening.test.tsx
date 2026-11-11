import React from 'react'
import { createHash } from 'node:crypto'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
vi.mock('next/dynamic', () => ({ default: () => () => null }))
vi.mock('@/components/offline/offline-sync-provider', () => ({ useOfflineSync: () => ({ isOnline: true, saveDraft: vi.fn(), discardDraft: vi.fn() }) }))
vi.mock('@/components/offline/offline-status', () => ({ OfflineStatus: () => null }))
vi.mock('@/components/ui/button', () => ({ Button: ({ children }: any) => <button>{children}</button> }))
vi.mock('@/components/ui/textarea', () => ({ Textarea: () => null }))
import { FRAReportView } from './fra-report-view'
const fixture: any = {
  clientName: 'Example', premises: 'Example Store', address: '1 Example Street', assessorName: 'Test Assessor',
  assessmentDate: '2026-11-11', description: 'Recorded description', floorArea: '1000 sq ft', occupancy: '10',
  sourcesOfIgnition: ['Recorded ignition'], sourcesOfFuel: ['Recorded fuel'], sourcesOfOxygen: [], peopleAtRisk: ['Staff'],
  significantFindings: ['Recorded finding'], recommendedControls: [], store: {}, fraInstance: {},
  fireAlarmPanelLocation: 'Recorded panel location', internalFireDoors: 'Recorded door condition',
  actionPlanItems: [{ sourceActionId: 'test', recommendation: 'Verify commissioning', priority: 'High' }],
}
const render = (data: any, Component = FRAReportView) => renderToStaticMarkup(<Component data={data} />)
describe('pre-opening report rendering', () => {
  it.each([undefined, 'bremont_watches'])('leaves operational profile %s byte-identical', variant => {
    const data = { ...fixture, fraTemplateVariant: variant, assessmentContext: 'operational' }
    // Hashes captured from unchanged main at 80fa57ca before this change.
    const expected = variant ? '2a119e9e5c3d3e967955d8d20f4a3613ac9540b11ce2b27887fc3f7ada6d0428' : '9716d2eae84f579e75b5bef904abb61c5264c74f7497386f501e85597b354b56'
    expect(createHash('sha256').update(render(data)).digest('hex')).toBe(expected)
  })
  it('removes unsupported claims and keeps signature unpopulated', () => {
    const html = render({ ...fixture, assessmentContext: 'pre_opening', assessmentReviewDate: 'Before public opening' })
    for (const claim of ['Fixed wire installation has been inspected and tested.', 'Portable appliance testing has been carried out.', 'There are no sleeping occupants', 'Submitted by:', '>Signed:', 'No physical testing', 'No physical\n']) expect(html).not.toContain(claim)
    expect(html).toContain('Provisional indication')
    expect(html).toContain('data-fra-pre-opening="true"')
    expect(html).toContain('Not recorded')
    expect(html).toContain('Site location and proposed layout plans')
    expect(html).toContain('Plans supplied for reference. Proposed layouts do not confirm the completed fit-out, appliance access or approved routes. See each plan’s source and status in its caption.')
    expect(html).toContain('Assessment Date:</span> 11 November 2026')
    expect(html).toContain('Review Date:</span> Before public opening')
    expect(html).not.toContain('Invalid Date')
    const signature = html.slice(html.indexOf('fra-signature-block'), html.indexOf('fra-report-print-footer'))
    expect(signature).not.toContain('Test Assessor')
    expect(signature).toContain('_________________________')
  })
  it.each([['Normal', 'Moderate Harm'], ['Low', 'Extreme Harm']])('uses assessor rating wording for complete saved judgement %s / %s', (likelihood, consequence) => {
    const html = render({ ...fixture, assessmentContext: 'pre_opening', riskRatingRationale: ['No material evacuation, compartmentation, or fire safety management deficiencies were identified in the available evidence.'], manualRiskRatingOverride: { likelihood, consequence, reason: 'Recorded assessor rationale for these conditions.' } })
    expect(html).toContain('Assessor assessment')
    expect(html).not.toContain('No material evacuation')
    expect(html).toContain('assessor’s assessed risk rating is moderate')
    expect(html).toContain('Recorded assessor rationale for these conditions.')
    expect(html.toLowerCase()).not.toContain('provisional')
    expect(html).toContain('not approval to open')
    expect(html).toContain('_________________________')
  })
  it.each([
    { overall: 'Moderate' },
    { likelihood: 'Normal', consequence: 'Moderate Harm' },
    { likelihood: 'Normal', consequence: 'Moderate Harm', reason: '  ' },
    { likelihood: 'Unsupported', consequence: 'Moderate Harm', reason: 'Reason' },
  ])('keeps incomplete or invalid judgement provisional: %j', manualRiskRatingOverride => {
    const html = render({ ...fixture, assessmentContext: 'pre_opening', manualRiskRatingOverride })
    expect(html).toContain('Provisional indication')
    expect(html).toContain('generated automatically and await assessor judgement')
    expect(html).not.toContain('Assessor assessment')
  })
  it('renders saved evidence and action tracking without turning them into approval', () => {
    const html = render({ ...fixture, assessmentContext: 'pre_opening', preOpeningEvidence: { commissioning: 'Certificate pending from contractor' }, preOpeningActionTracking: { test: { owner: 'Project manager', targetDate: '2026-11-20', closureEvidence: 'Awaiting certificate' } } })
    for (const value of ['Certificate pending from contractor', 'Project manager', '2026-11-20', 'Awaiting certificate']) expect(html).toContain(value)
    expect(html).toContain('An entry is not itself approval to open')
  })
})
