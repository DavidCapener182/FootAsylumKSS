# Audit PDF actions and history — 6 September 2026

## Delivered behavior

- Completed or cancelled store actions appear only in History. An imported action also enters History six calendar months after its PDF audit date; expiry preserves its original status rather than recording an unverified completion.
- Only second-audit PDFs create actions. Both upload entry points run the shared flagged-item importer after linking the PDF. First-audit uploads are skipped.
- Admin and operations users can check an existing second-audit PDF again from the store's Audit Tracker actions dialog. The same source finding cannot be imported twice or reopen an existing completed action.
- Store actions have a Complete control on desktop, mobile and in the details dialog. Completion records the timestamp, preserves the source and refreshes current work/history.
- Current action readers used by the dashboard, store pages, Audit Tracker, routes and operational reports exclude completed and expired records.

## Live backfill and preservation

The initial inventory contained 93 linked PDFs across 82 store records. All 93 were read and their 483 flagged-item declarations reconciled with extracted findings. Following the user's second-audit-only clarification, the applied manifest included 30 second-audit PDFs and 168 findings. No first-audit finding was imported.

All 188 pre-existing records were already completed. They were preserved without deleting, reopening or modifying them and now appear in History, including nine records previously suppressed by legacy question filtering. The archive view was checked before applying the second-audit backfill.

Verified database readback after the authenticated Sunderland recheck:

| Measure | Count |
| --- | ---: |
| Total store actions | 356 |
| Current actions | 168 |
| Completed history | 188 |
| Imported second-audit findings | 168 |
| Imported first-audit findings | 0 |
| PDF import receipts | 30 |
| Import receipts requiring review | 0 |
| Duplicate source groups | 0 |

Sunderland's two findings match the supplied screenshot: chemical storage and combustible storage. The PDF audit date is 4 August 2026; both remain active until 4 February 2027 unless completed earlier. An authenticated check through the preview returned: “0 new actions added. 2 flagged items checked; previously imported items were kept.”

## Extraction safeguards

The deterministic parser reads the flagged section after the cover and stops at subsequent report sections. It preserves questions and observations, excludes photo captions, checks the declared finding count, verifies the store against the cover and reads the conducted date from the PDF. A count, identity, date-slot or parsing problem preserves the uploaded PDF and returns a review warning. Files over 50 MB also require a separate review/import. Failed or partial database imports can be retried without duplicating existing findings.

New actions record the source PDF path, page, audit number, audit date, stable finding key and six-month end date. PDF source wording is retained, with a neutral default medium priority. No new first-audit records or store audit-date corrections were applied.

The receipt policies use the existing private role helper, matching the store-action permissions. The authenticated browser check caught and verified the correction to the initial receipt policy. No new import-table security advisory was reported.

## Evidence and delivery boundaries

- Automated suite: 94 files / 427 tests passed, covering first-audit exclusion, extraction counts, duplicate prevention, calendar-month expiry, history filtering, permissions and store-action completion.
- Production build and desktop/mobile preview checks recorded in the task. Current and historical views were checked at 1455px and 390px; current action details also at 360px, without horizontal page overflow.
- The real linked-PDF recheck exercised authenticated storage retrieval, extraction and duplicate prevention. A new-file upload was covered by automated tests; no duplicate live upload was made merely for testing.
- Database schema, receipts and backfill are live. Application changes were validated in the local preview before the user requested Git publication. No separate manual deployment was performed.

Local evidence is retained in `output/audit-pdf-actions-2026-09-06/`: the baseline action backup, PDF text inventory, extraction review, applied manifest and inserted row IDs. The repeated dry run proposes zero inserts and skips all 168 imported findings. These artifacts contain operational data and remain local.
