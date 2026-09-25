import { webcrypto } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addFraActionDraftItem,
  approveFraActionDraft,
  buildFraActionPublicationSnapshot,
  createFraActionDraft,
  updateFraActionDraftItem,
  validateFraActionDraft,
} from './fra-action-draft'

const instanceId = '11111111-1111-4111-8111-111111111111'
const storeId = '22222222-2222-4222-8222-222222222222'
const actorId = '33333333-3333-4333-8333-333333333333'
const actionA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const actionB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const approvalTime = new Date('2026-09-25T10:30:00.000Z')

const remedial = {
  kind: 'remedial' as const,
  recommendation: 'Repair the fire alarm panel fault.',
  priority: 'High' as const,
  targetDate: '2026-10-10',
  sourceFindingId: 'panel-fault',
}

afterEach(() => { vi.unstubAllGlobals() })

describe('FRA action draft', () => {
  it('assigns one stable ID per item, preserves it on edit, and prevents editing an approved plan', () => {
    const draft = createFraActionDraft(
      { instanceId, storeId, items: [remedial] },
      () => actionA,
    )
    const changed = updateFraActionDraftItem(draft, actionA, {
      recommendation: 'Repair and test the fire alarm panel.',
      targetDate: '2026-10-12',
    })
    expect(changed.items[0].sourceActionId).toBe(actionA)
    expect(changed.items[0].targetDate).toBe('2026-10-12')
    expect(draft.items[0].recommendation).toBe(remedial.recommendation)
    expect(() => updateFraActionDraftItem(draft, actionA, { sourceActionId: actionB } as never))
      .toThrow('unsupported field')

    const approved = approveFraActionDraft(changed, actorId, approvalTime)
    expect(approved.approvedBy).toBe(actorId)
    expect(approved.approvedAt).toBe(approvalTime.toISOString())
    expect(() => updateFraActionDraftItem(approved, actionA, { priority: 'Medium' }))
      .toThrow('cannot be edited')
    expect(() => approveFraActionDraft(approved, actorId, approvalTime)).toThrow('already approved')
  })

  it('generates secure UUIDs when randomUUID is unavailable on a local HTTP preview', () => {
    vi.stubGlobal('crypto', { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) })
    const draft = createFraActionDraft({ instanceId, storeId, items: [remedial, remedial] })
    expect(new Set(draft.items.map(item => item.sourceActionId)).size).toBe(2)
    for (const item of draft.items) expect(item.sourceActionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('rejects duplicate IDs, impossible target dates, blank recommendations, and forged approval details', () => {
    const draft = createFraActionDraft({ instanceId, storeId, items: [remedial] }, () => actionA)
    expect(() => addFraActionDraftItem(draft, remedial, () => actionA)).toThrow('Duplicate FRA action ID')
    expect(() => updateFraActionDraftItem(draft, actionA, { targetDate: '2026-02-31' }))
      .toThrow('valid YYYY-MM-DD')
    expect(() => updateFraActionDraftItem(draft, actionA, { recommendation: '   ' }))
      .toThrow('recommendation is required')
    expect(() => validateFraActionDraft({ ...draft, approval: 'approved' }))
      .toThrow('approvedBy is required')
    expect(() => validateFraActionDraft({ ...draft, approvedBy: actorId }))
      .toThrow('Pending FRA action plans cannot have approval details')
  })

  it('allows an explicitly approved empty plan and rejects publication of a pending one', async () => {
    const pending = createFraActionDraft({ instanceId, storeId })
    expect(() => validateFraActionDraft(pending)).not.toThrow()
    await expect(buildFraActionPublicationSnapshot(pending)).rejects.toThrow('Assessor approval')

    const approved = approveFraActionDraft(pending, actorId, approvalTime)
    const snapshot = await buildFraActionPublicationSnapshot(approved)
    expect(snapshot.pdfRows).toEqual([])
    expect(snapshot.trackingRows).toEqual([])
    expect(snapshot.fingerprint).toMatch(/^[0-9a-f]{64}$/)
    expect((await buildFraActionPublicationSnapshot(approved)).fingerprint).toBe(snapshot.fingerprint)
  })

  it('keeps routine advice in PDF rows while tracking only remedial work', async () => {
    let draft = createFraActionDraft({ instanceId, storeId, items: [remedial] }, () => actionA)
    draft = addFraActionDraftItem(draft, {
      kind: 'routine',
      recommendation: 'Continue routine weekly alarm checks.',
      priority: 'Low',
      dueNote: 'Ongoing management checks',
    }, () => actionB)
    const approved = approveFraActionDraft(draft, actorId, approvalTime)
    const snapshot = await buildFraActionPublicationSnapshot(approved)

    expect(snapshot.pdfRows.map(item => item.sourceActionId)).toEqual([actionA, actionB])
    expect(snapshot.trackingRows.map(item => item.sourceActionId)).toEqual([actionA])
    expect(snapshot.trackingRows[0].targetDate).toBe('2026-10-10')
    expect(snapshot.pdfRows[1].dueNote).toBe('Ongoing management checks')
    draft.items[0].recommendation = 'Changed locally after publication snapshot'
    expect(snapshot.pdfRows[0].recommendation).toBe(remedial.recommendation)
    expect(Object.isFrozen(snapshot.pdfRows[0])).toBe(true)
  })

  it('changes the fingerprint for an edit or reordering while retaining item identities', async () => {
    let draft = createFraActionDraft({ instanceId, storeId, items: [remedial] }, () => actionA)
    draft = addFraActionDraftItem(draft, {
      kind: 'remedial', recommendation: 'Repair the fire door closer.', priority: 'Medium',
    }, () => actionB)
    const original = await buildFraActionPublicationSnapshot(approveFraActionDraft(draft, actorId, approvalTime))
    const edited = await buildFraActionPublicationSnapshot(approveFraActionDraft(
      updateFraActionDraftItem(draft, actionA, { targetDate: '2026-10-11' }), actorId, approvalTime,
    ))
    const reordered = await buildFraActionPublicationSnapshot(approveFraActionDraft(
      { ...draft, items: [...draft.items].reverse() }, actorId, approvalTime,
    ))
    expect(original.fingerprint).not.toBe(edited.fingerprint)
    expect(original.fingerprint).not.toBe(reordered.fingerprint)
    expect(reordered.pdfRows.map(item => item.sourceActionId)).toEqual([actionB, actionA])
  })
})
