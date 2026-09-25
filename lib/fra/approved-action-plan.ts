import 'server-only'
import { buildFraActionPublicationSnapshot, type FraActionPublicationSnapshot } from './fra-action-draft'

/** Recompute the fingerprint instead of trusting stored JSON or a caller. */
export async function verifyApprovedActionSnapshot(value: unknown): Promise<FraActionPublicationSnapshot> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Approved FRA action snapshot is missing')
  const stored = value as Record<string, unknown>
  if (!Array.isArray(stored.pdfRows) || !Array.isArray(stored.trackingRows)) throw new Error('Approved FRA action rows are missing')
  const rebuilt = await buildFraActionPublicationSnapshot({
    version: stored.version,
    instanceId: stored.instanceId,
    storeId: stored.storeId,
    approval: 'approved',
    approvedBy: stored.approvedBy,
    approvedAt: stored.approvedAt,
    items: stored.pdfRows,
  })
  if (stored.fingerprint !== rebuilt.fingerprint
    || JSON.stringify(stored.pdfRows) !== JSON.stringify(rebuilt.pdfRows)
    || JSON.stringify(stored.trackingRows) !== JSON.stringify(rebuilt.trackingRows)) {
    throw new Error('Approved FRA action snapshot has changed')
  }
  return rebuilt
}

export function approvedActionRowsForPdf(snapshot: FraActionPublicationSnapshot) {
  return snapshot.pdfRows.map(({ sourceActionId, recommendation, priority, dueNote }) => ({
    sourceActionId, recommendation, priority, ...(dueNote ? { dueNote } : {}),
  }))
}

export function assertPrintedFraActionRows(snapshot: FraActionPublicationSnapshot, fingerprint: string,
  printedRows: Array<{ sourceActionId: string; priority: string; action: string }>): void {
  const expectedRows = approvedActionRowsForPdf(snapshot).map(row => ({
    sourceActionId: row.sourceActionId, priority: row.priority,
    action: `${row.recommendation}${row.dueNote ? ` — ${row.dueNote}` : ''}`,
  }))
  if (fingerprint !== snapshot.fingerprint || JSON.stringify(printedRows) !== JSON.stringify(expectedRows)) {
    throw new Error('Printed action rows differ from the assessor-approved action plan')
  }
}
