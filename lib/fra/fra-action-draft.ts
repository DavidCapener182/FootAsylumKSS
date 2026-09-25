/** The assessor's reviewed action list, shared by the issued PDF and action tracker. */
export type FraActionPriority = 'Low' | 'Medium' | 'High'
export type FraActionKind = 'remedial' | 'routine'

export interface FraActionDraftItem {
  sourceActionId: string
  kind: FraActionKind
  recommendation: string
  priority: FraActionPriority
  dueNote?: string
  targetDate?: string
  sourceFindingId?: string
}

export interface FraActionDraft {
  version: 1
  instanceId: string
  storeId: string
  approval: 'pending' | 'approved'
  approvedBy?: string
  approvedAt?: string
  items: FraActionDraftItem[]
}

export type NewFraActionDraftItem = Omit<FraActionDraftItem, 'sourceActionId'>

export interface FraActionPublicationSnapshot {
  version: 1
  instanceId: string
  storeId: string
  approvedBy: string
  approvedAt: string
  /** The exact, ordered rows to print in the issued FRA. */
  pdfRows: ReadonlyArray<Readonly<FraActionDraftItem>>
  /** Only remedial rows become tracked FRA actions. */
  trackingRows: ReadonlyArray<Readonly<FraActionDraftItem>>
  fingerprint: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function newSourceActionId(): string {
  const crypto = globalThis.crypto
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID()
  if (typeof crypto?.getRandomValues !== 'function') throw new Error('Secure UUID generation is unavailable')
  // randomUUID can be unavailable in a local HTTP preview while getRandomValues works.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}`
    + `-${hex.slice(20)}`
}

function assertKeys(value: Record<string, unknown>, allowed: string[], field: string): void {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key))
  if (unexpected) throw new Error(`${field} has an unsupported field: ${unexpected}`)
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

function requiredString(value: unknown, field: string, maxLength = 3000): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`)
  const trimmed = value.trim()
  if (trimmed.length > maxLength) throw new Error(`${field} is too long`)
  return trimmed
}

function optionalString(value: unknown, field: string, maxLength = 500): string | undefined {
  if (value === undefined) return undefined
  return requiredString(value, field, maxLength)
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field} must be an object`)
  return value as Record<string, unknown>
}

/** Validates persisted drafts without replacing existing action identities. */
export function validateFraActionDraft(value: unknown): FraActionDraft {
  const draft = object(value, 'FRA action draft')
  assertKeys(draft, ['version', 'instanceId', 'storeId', 'approval', 'approvedBy', 'approvedAt', 'items'], 'FRA action draft')
  if (draft.version !== 1) throw new Error('Unsupported FRA action draft version')
  const instanceId = requiredString(draft.instanceId, 'instanceId', 36)
  const storeId = requiredString(draft.storeId, 'storeId', 36)
  if (!UUID.test(instanceId) || !UUID.test(storeId)) throw new Error('FRA and store IDs must be UUIDs')
  if (draft.approval !== 'pending' && draft.approval !== 'approved') throw new Error('Invalid FRA action approval')
  let approvedBy: string | undefined
  let approvedAt: string | undefined
  if (draft.approval === 'approved') {
    approvedBy = requiredString(draft.approvedBy, 'approvedBy', 36)
    approvedAt = requiredString(draft.approvedAt, 'approvedAt', 35)
    if (!UUID.test(approvedBy)) throw new Error('approvedBy must be a UUID')
    const parsedApprovalTime = new Date(approvedAt)
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(approvedAt)
      || Number.isNaN(parsedApprovalTime.valueOf())
      || parsedApprovalTime.toISOString() !== approvedAt) {
      throw new Error('approvedAt must be an exact UTC ISO timestamp')
    }
  } else if (draft.approvedBy !== undefined || draft.approvedAt !== undefined) {
    throw new Error('Pending FRA action plans cannot have approval details')
  }
  if (!Array.isArray(draft.items)) throw new Error('FRA action items must be an array')

  const ids = new Set<string>()
  const items = draft.items.map((rawItem, index): FraActionDraftItem => {
    const item = object(rawItem, `Action ${index + 1}`)
    assertKeys(item, ['sourceActionId', 'kind', 'recommendation', 'priority', 'dueNote', 'targetDate', 'sourceFindingId'], `Action ${index + 1}`)
    const sourceActionId = requiredString(item.sourceActionId, `Action ${index + 1} ID`, 36)
    if (!UUID.test(sourceActionId)) throw new Error(`Action ${index + 1} ID must be a UUID`)
    const identity = sourceActionId.toLowerCase()
    if (ids.has(identity)) throw new Error(`Duplicate FRA action ID: ${sourceActionId}`)
    ids.add(identity)
    if (item.kind !== 'remedial' && item.kind !== 'routine') throw new Error(`Action ${index + 1} has an invalid kind`)
    if (item.priority !== 'Low' && item.priority !== 'Medium' && item.priority !== 'High') {
      throw new Error(`Action ${index + 1} has an invalid priority`)
    }
    const recommendation = requiredString(item.recommendation, `Action ${index + 1} recommendation`)
    const dueNote = optionalString(item.dueNote, `Action ${index + 1} due note`)
    const sourceFindingId = optionalString(item.sourceFindingId, `Action ${index + 1} finding ID`, 160)
    const targetDate = optionalString(item.targetDate, `Action ${index + 1} target date`, 10)
    if (targetDate && !isCalendarDate(targetDate)) throw new Error(`Action ${index + 1} target date must be a valid YYYY-MM-DD date`)
    return {
      sourceActionId,
      kind: item.kind,
      recommendation,
      priority: item.priority,
      ...(dueNote !== undefined ? { dueNote } : {}),
      ...(targetDate !== undefined ? { targetDate } : {}),
      ...(sourceFindingId !== undefined ? { sourceFindingId } : {}),
    }
  })

  return {
    version: 1,
    instanceId,
    storeId,
    approval: draft.approval,
    ...(approvedBy ? { approvedBy } : {}),
    ...(approvedAt ? { approvedAt } : {}),
    items,
  }
}

/** Assigns stable IDs once, when an assessor first creates the draft. */
export function createFraActionDraft(
  input: { instanceId: string; storeId: string; items?: NewFraActionDraftItem[] },
  makeId: () => string = newSourceActionId,
): FraActionDraft {
  const items = (input.items ?? []).map((item) => ({ ...item, sourceActionId: makeId() }))
  return validateFraActionDraft({ version: 1, instanceId: input.instanceId, storeId: input.storeId, approval: 'pending', items })
}

export function addFraActionDraftItem(
  value: unknown,
  input: NewFraActionDraftItem,
  makeId: () => string = newSourceActionId,
): FraActionDraft {
  const draft = validateFraActionDraft(value)
  if (draft.approval !== 'pending') throw new Error('Approved FRA action plans cannot be edited')
  return validateFraActionDraft({ ...draft, items: [...draft.items, { ...input, sourceActionId: makeId() }] })
}

/** Edits preserve identity, and a caller cannot silently replace the source ID. */
export function updateFraActionDraftItem(
  value: unknown,
  sourceActionId: string,
  patch: Partial<NewFraActionDraftItem>,
): FraActionDraft {
  const draft = validateFraActionDraft(value)
  if (draft.approval !== 'pending') throw new Error('Approved FRA action plans cannot be edited')
  assertKeys(object(patch, 'FRA action edit'), ['kind', 'recommendation', 'priority', 'dueNote', 'targetDate', 'sourceFindingId'], 'FRA action edit')
  if (!draft.items.some((item) => item.sourceActionId === sourceActionId)) throw new Error('FRA action not found')
  return validateFraActionDraft({
    ...draft,
    items: draft.items.map((item) => item.sourceActionId === sourceActionId ? { ...item, ...patch } : item),
  })
}

export function approveFraActionDraft(value: unknown, approvedBy: string, at: Date = new Date()): FraActionDraft {
  const draft = validateFraActionDraft(value)
  if (draft.approval !== 'pending') throw new Error('FRA action plan is already approved')
  if (Number.isNaN(at.valueOf())) throw new Error('Invalid approval time')
  return validateFraActionDraft({ ...draft, approval: 'approved', approvedBy, approvedAt: at.toISOString() })
}

/** Approval freezes the PDF rows and the exact remedial subset for publication. */
export async function buildFraActionPublicationSnapshot(value: unknown): Promise<FraActionPublicationSnapshot> {
  const draft = validateFraActionDraft(value)
  if (draft.approval !== 'approved') throw new Error('Assessor approval is required before publishing FRA actions')
  // Validated approved drafts always include these fields. The publication
  // endpoint must bind the actor and instance/store IDs to authenticated DB rows.
  const approvedBy = draft.approvedBy!
  const approvedAt = draft.approvedAt!
  const pdfRows = Object.freeze(draft.items.map((item) => Object.freeze({ ...item })))
  const trackingRows = Object.freeze(pdfRows.filter((item) => item.kind === 'remedial'))
  const canonical = JSON.stringify({ version: draft.version, instanceId: draft.instanceId, storeId: draft.storeId, approvedBy, approvedAt, pdfRows })
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 is unavailable')
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return Object.freeze({ version: 1, instanceId: draft.instanceId, storeId: draft.storeId, approvedBy, approvedAt, pdfRows, trackingRows, fingerprint })
}
