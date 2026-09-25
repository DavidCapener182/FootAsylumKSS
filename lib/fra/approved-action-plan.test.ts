import { describe, expect, it } from 'vitest'
import { approveFraActionDraft, buildFraActionPublicationSnapshot, createFraActionDraft } from './fra-action-draft'
import { approvedActionRowsForPdf, assertPrintedFraActionRows, verifyApprovedActionSnapshot } from './approved-action-plan'

const instanceId = '11111111-1111-4111-8111-111111111111'
const storeId = '22222222-2222-4222-8222-222222222222'
const actor = '33333333-3333-4333-8333-333333333333'

describe('approved FRA action publication binding', () => {
  it('prints routine and remedial rows but tracks only remedial rows', async () => {
    const draft = createFraActionDraft({ instanceId, storeId, items: [
      { kind: 'remedial', recommendation: 'Repair the fire door closer', priority: 'High' },
      { kind: 'routine', recommendation: 'Continue weekly alarm checks', priority: 'Low' },
    ] })
    const snapshot = await buildFraActionPublicationSnapshot(approveFraActionDraft(draft, actor, new Date('2026-09-25T12:00:00.000Z')))
    const verified = await verifyApprovedActionSnapshot(JSON.parse(JSON.stringify(snapshot)))
    expect(approvedActionRowsForPdf(verified).map(row => row.recommendation)).toEqual([
      'Repair the fire door closer', 'Continue weekly alarm checks',
    ])
    expect(verified.trackingRows.map(row => row.recommendation)).toEqual(['Repair the fire door closer'])
    const printed = approvedActionRowsForPdf(verified).map(row => ({ sourceActionId: row.sourceActionId,
      priority: row.priority, action: row.recommendation }))
    expect(() => assertPrintedFraActionRows(verified, verified.fingerprint, printed)).not.toThrow()
    expect(() => assertPrintedFraActionRows(verified, verified.fingerprint, printed.slice().reverse())).toThrow('differ')
    expect(() => assertPrintedFraActionRows(verified, verified.fingerprint, printed.slice(0, 1))).toThrow('differ')
    await expect(verifyApprovedActionSnapshot({ ...snapshot, fingerprint: '0'.repeat(64) })).rejects.toThrow('changed')
    await expect(verifyApprovedActionSnapshot({ ...snapshot, trackingRows: [] })).rejects.toThrow('changed')
  })

  it('accepts an explicitly approved empty plan and rejects invented printed rows', async () => {
    const draft = createFraActionDraft({ instanceId, storeId })
    const snapshot = await buildFraActionPublicationSnapshot(approveFraActionDraft(draft, actor, new Date('2026-09-25T12:00:00.000Z')))
    expect((await verifyApprovedActionSnapshot(snapshot)).trackingRows).toEqual([])
    expect(() => assertPrintedFraActionRows(snapshot, snapshot.fingerprint, [])).not.toThrow()
    expect(() => assertPrintedFraActionRows(snapshot, snapshot.fingerprint, [
      { sourceActionId: 'extra', priority: 'Low', action: 'Continue checks' },
    ])).toThrow('differ')
  })
})
