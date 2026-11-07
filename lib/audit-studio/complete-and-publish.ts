import 'server-only';
import { completeAudit } from './server';
import { publishToStore } from './store-records';
import type { AuditBundle } from './types';

/** Freeze the report first, then publish through the existing idempotent store transaction. */
export async function completeAndPublishAudit(id: string, value: unknown, user: { id: string }): Promise<AuditBundle> {
  const completed = await completeAudit(id, value);
  if (completed.audit.document.purpose !== 'store' || completed.publication) return completed;
  try {
    return await publishToStore(id, { storeId: completed.audit.store_id }, user);
  } catch {
    // Keep the completed report available. The existing publish button safely retries
    // without regenerating the PDF or consuming another annual audit slot.
    return { ...completed, publicationError: 'Your report is complete, but it has not been added to the Audit Tracker. Retry saving to the store.' };
  }
}
