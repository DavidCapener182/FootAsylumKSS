# Continuous audit cycles

The Audit Tracker retains its original layout, area filters, rankings and score editing. The separate cycle-panel prototype is not mounted, following user feedback. Next-year booking remains available through Routes. The numbering baseline is 2026:

- 2026: Audits 1 and 2.
- 2027: Audits 3 and 4.
- 2028: Audits 5 and 6, continuing with two numbers per year.

Canonical records retain their existing `(store, audit_year, audit_number)` identity, where the number is the round within the year. `lib/audit/cycles.ts` derives the continuous display number. Existing third visits are shown as revisits, so they do not collide with the next year's first scheduled number. Studio revisions retain the original round through the existing publication function.

Earlier reports remain in store audit history. The original Audit Tracker controls remain visible as before. Continuous year-pair labels are retained in Studio and route-planning guidance.

Route planning now loads completed stores and evaluates availability against the selected visit year. Next year's pair opens after the current second visit has a date and a score. Dates extend to the end of next year, advancing automatically each January. Existing unresolved bookings are kept; a passing completed second visit consumes its previous booking. Failed visits retain their booking until explicitly reviewed or rescheduled. Booking does not reset scores, PDFs or actions. Publishing the first Studio report of a later year uses the existing transactional publication function to snapshot the old slots into history before resetting the current slots.

Audit Studio draft cards include Cancel audit. Confirmation is required. Cancellation retains the server record and evidence in the recoverable archive, removes the current account's device copy, and blocks opening/saving/completing the cancelled draft. The database locks the audit and checks revision/status, so completed or finalizing reports cannot be cancelled and a racing save cannot revive an archived draft.

## Release order

Apply `20261107203844_audit_studio_cancel_drafts.sql` before releasing the application. It adds a service-role-only cancellation function and an archive read-only trigger. This change was checked against an isolated PostgreSQL runtime and applied to the production database on 7 November 2026. Function permissions and the archive trigger were read back successfully.

## Verification

Focused numbering, booking eligibility, route presenter, device isolation, cancellation and rendered-view tests pass, together with TypeScript checking. Database checks cover invalid actors, stale revisions, completed/finalizing states, repeat cancellation, blocked revival and execution grants.

The wider Studio suite has an existing failure: the private Word reference document lacks the current emergency-lighting evidence wording. This was reproduced on the unchanged HEAD checkout with the same local Word document.
