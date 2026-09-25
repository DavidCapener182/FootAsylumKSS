import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reconcileFraHistory } from './reconcile-history.mjs'

const store = { id: 'footasylum-store', store_code: 'S0012', store_name: 'Example Store', is_active: true,
  fire_risk_assessment_date: '2026-09-01', fire_risk_assessment_pdf_path: 'legacy/example.pdf' }
const external = { id: 'external-store', store_code: 'BREMONT-MAN', store_name: 'External Store', is_active: true,
  fire_risk_assessment_date: '2026-09-01', fire_risk_assessment_pdf_path: 'external/example.pdf' }
const roster = { projectId: 'example-project', reviewedOn: '2026-09-25',
  stores: [{ id: store.id, code: store.store_code, name: store.store_name }] }
const templates = [{ id: 'fra-template', category: 'fire_risk_assessment' }, { id: 'hs-template', category: 'footasylum_audit' }]
const instances = [
  { id: 'fra-one', template_id: 'fra-template', store_id: store.id, status: 'completed', conducted_at: '2026-09-01' },
  { id: 'hs-one', template_id: 'hs-template', store_id: store.id, status: 'completed', conducted_at: '2026-09-01' },
  { id: 'external-fra', template_id: 'fra-template', store_id: external.id, status: 'completed', conducted_at: '2026-09-01' },
]
const responses = [
  { id: 'fra-response', audit_instance_id: 'fra-one', response_json: { fra_extracted_data: { actionPlanItems: [
    { priority: 'High', recommendation: 'Repair fire panel', dueNote: 'As soon as practicable' },
    { priority: 'Low', recommendation: 'Continue routine checks' },
  ] } } },
  { id: 'hs-response', audit_instance_id: 'hs-one', response_json: { fra_extracted_data: { actionPlanItems: [
    { priority: 'High', recommendation: 'Do not import this H&S item' },
  ] } } },
  { id: 'external-response', audit_instance_id: 'external-fra', response_json: { fra_extracted_data: { actionPlanItems: [
    { priority: 'High', recommendation: 'Do not import this external item' },
  ] } } },
]

test('stages only explicitly rostered FRA items for review and never infers completion', () => {
  const report = reconcileFraHistory({ roster, stores: [store, external], templates, instances, responses,
    publications: [{ id: 'issued-one', instance_id: 'fra-one', confirmed_at: '2026-09-02', pdf_path: 'fra/issued.pdf', pdf_sha256: 'hash' }],
    history: [{ store_id: store.id, kind: 'FRA', visit_date: '2026-09-01', pdf_path: 'legacy/example.pdf' }] })
  assert.equal(report.summary.fraInstances, 1)
  assert.equal(report.summary.explicitCandidateItems, 2)
  assert.equal(report.summary.trackingEligibleItems, 0)
  assert.deepEqual(report.candidateActions.map((row) => row.recommendation), ['Repair fire panel', 'Continue routine checks'])
  assert.ok(report.candidateActions.every((row) => row.reviewNeeded && !row.trackingEligible))
  assert.ok(report.candidateActions.every((row) => row.reviewFlags.includes('COMPLETION_STATUS_UNKNOWN')))
  assert.equal(report.candidateActions[0].publicationId, 'issued-one')
  assert.equal(report.assessmentInventory[0].storePdfIdentityVerified, false)
})

test('requires the reviewed store identity before producing an inventory', () => {
  assert.throws(() => reconcileFraHistory({ roster: { ...roster, stores: [{ ...roster.stores[0], name: 'Changed name' }] },
    stores: [store], templates, instances, responses, publications: [], history: [] }), /needs review/)
})
