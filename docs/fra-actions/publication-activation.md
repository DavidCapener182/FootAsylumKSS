# Creating tracked actions when an FRA is issued

## Current boundary

The existing publication flow prepares a PDF in `POST /api/fra-reports/publication`, then confirms that saved PDF in `POST /api/fra-reports/complete` through `fa_confirm_fra_publication`. The PDF uses `/print/fra-report`, which renders legacy `actionPlanItems` from assessment responses. The assessor-approved `FraActionPublicationSnapshot` module is not yet stored or read by that print page. The unapplied action-persistence draft deliberately rejects `confirmed_publication` action inserts. Consequently, current stored recommendations must not be turned into live actions as a side effect of confirmation.

## Required atomic handoff

1. Save the assessor-approved draft with stable `sourceActionId` values against one FRA instance and store. Verify approval server-side, including approver identity. Store its immutable snapshot and fingerprint.
2. Render the issued PDF action table from **that snapshot's `pdfRows`**. Store the same snapshot and fingerprint on the pending publication record alongside the verified PDF hash. Refuse publication when either the action snapshot or the PDF binding is missing. An approved empty action list is valid.
3. On explicit PDF confirmation, use one database transaction to lock the publication, verify its PDF hash and snapshot fingerprint, confirm the publication, and insert only `trackingRows` (`kind = remedial`) into `fa_fra_actions`. Keep `source_action_id` and `publication_id` unique so retries return the same actions. Record creation events in the same transaction. Routine advice remains in the PDF only.
4. Make the confirmation command fail in full if any action row conflicts or fails validation. Do not confirm a PDF and create actions in separate network calls. Existing historical publications without an approved snapshot remain on the historical review path and are never backfilled automatically.

The schema and UI work must land together. Until then, `fa_confirm_fra_publication` should keep its existing PDF confirmation behavior, and the action board should show only verified rows already present in `fa_fra_actions`.

An unapplied additive SQL draft at `supabase/drafts/fra_confirmed_publication_actions.sql` implements the approval table, transaction and row validator. The report editor now has an assessor approval step: every row must be marked remedial or routine, and an explicitly approved empty plan is allowed. The print view reads that immutable snapshot, the PDF generator checks the rendered row IDs, wording and priority against it, and the publication endpoint binds its fingerprint to the saved PDF. Confirmation calls the atomic remedial-action command when a snapshot is present.

This new path is gated by `FRA_ACTION_PLAN_REQUIRED=true` because the database draft has not been applied or tested against the linked project. With the flag unset, existing FRA publication behavior and pending PDF fingerprints are unchanged. The user declined a paid Supabase staging branch, so only local PGlite tests have run. Keep the flag disabled until the real-schema migration, policies, Storage, PDF renderer and authenticated publication path are verified.

The SQL was exercised in isolated PGlite with `PGLITE_MODULE=/private/tmp/fra-persistence-db-tests/node_modules/@electric-sql/pglite/dist/index.js node scripts/fra-actions/confirmed-publication.integration.mjs`. The fixture checks remedial-only creation, retry idempotence, immutable publication binding, and full rollback when tracking rows contradict the PDF rows. This does not prove behavior against the linked Supabase schema, the real print renderer or Storage; those require controlled deployment and readback before activation.
