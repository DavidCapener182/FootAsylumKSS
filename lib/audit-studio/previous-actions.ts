import type { AuditDocument, Response } from './types';

/** Only explicitly selected previous actions affect this visit's follow-up check. */
export function previousActionResponse(doc: AuditDocument, id: string, base: Response): Response {
  if (id !== '16.03' || !doc.previousActionReviews?.length) return base;
  const reviews = doc.previousActionReviews;
  base = {...base, note: base.note || reviews.map(r => `${r.title}: ${r.note || "Not checked"}`).join("\n")};
  if (reviews.some(r => r.outcome === 'not-improved')) return {...base, answer: 'no', verified: true};
  if (reviews.some(r => !r.outcome || !r.note.trim())) return {...base, answer: null, verified: false};
  if (reviews.every(r => r.outcome === 'not-applicable'))
    return {...base, answer: 'na', verified: true, naReason: reviews.map(r => `${r.title}: ${r.note}`).join('\n')};
  return {...base, answer: 'yes', verified: true};
}
