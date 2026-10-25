# Append-only audit revisit evidence

Store → Audit History → Original audits & revisit evidence. Admin/Ops select the stable original H&S history entry, enter the revisit date and notes, and upload a PDF, DOCX, JPG, PNG or WebP up to 4 MB. Existing `viewEvidence` roles can read the history and download evidence only after the authenticated store query passes existing RLS. Scoped client roles receive no new access.

The original `fa_store_audit_history.id` is the foreign key. Revisit rows retain the date, note, original filename, verified SHA-256, size, uploader and timestamp. They cannot update/delete existing audits, answers, scores, actions, visit dates/counts or audit PDF pointers. Evidence does not close failures or grant signoff. `saveLatestAuditPdf`, studio publication and ordinary audit-PDF upload paths are not used.

Each upload attempt owns a random private object with `upsert:false`. The server checks file signatures and verifies a downloaded copy's hash before committing the row. Database uniqueness covers both the submission UUID and original/date/hash fingerprint. Retries return the original row; changed metadata conflicts rather than overwriting it. A losing retry removes only its newly uploaded object. Confirmed validation/transaction failures and failed readback attempt cleanup. An ambiguous RPC/network outcome retains the private object, because the row may already have committed; the UI holds the same submission for retry. Any orphan cleanup must compare committed `storage_path` references before deleting objects. There is no automatic orphan deletion or evidence removal endpoint.

## Deployment order

1. Confirm target project `fwnzpafwfaiynrclwtnh` and existing `fa_store_audit_history` schema. Capture the target store/history/PDF references before release. Do not derive an original-audit UUID from a store UUID.
2. Apply `supabase/migrations/20261025173000_append_audit_revisits.sql` using the existing authorized migration workflow, keeping its migration version in sync with the repository. It creates one new table, invoker RPC, immutable-row trigger and a private bucket. The restrictive storage policy affects only this new bucket. No original data is backfilled, changed or deleted.
3. Run `npm run check:schema` against the target with the existing schema-contract database URL. The contract now requires the new columns, functions, trigger, RLS, restricted privileges and bucket.
4. Push only the scoped feature commit to main; verify CI and Vercel deployment `READY` for that exact SHA, and confirm `footasylum.kssnwltd.co.uk` points to it. No new environment variables, credentials or paid resources are required.
5. Check authenticated store history and denied routes without creating fictional live client records. Confirm the original visit dates, scores, counts, answers, actions and PDF pointers match the captured baseline.
6. The parent task coordinates the separately authorized real Dundee report upload only after live verification. Select the original 17 September 2026 Audit 2 history entry (73.20%), record revisit date 22 October 2026, then verify the stored/downloaded report hash. Keep Audit 1 (22 January 2026, 83.67%) and Audit 2 unchanged. Do not mark training or roof leaks resolved.

If the migration is absent, the panel reports history unavailable and leaves the existing store timeline functional; it does not fall back to replacement uploads.

## Verification

- `npm exec vitest -- run --no-cache` — full unit suite, including 27 focused revisit tests.
- `node --test scripts/fra-actions/*.test.mjs`, `npm run type-check`, `npm run lint`, `npm run build`, `npm run check:bundle`, `npm run check:function-storage`.
- `PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node scripts/test-audit-revisits-db.mjs` — isolated PostgreSQL, synthetic schema/actors/audits only; verifies actual migration execution, default-privilege revocation, retries, conflicts, multiple revisits, denied roles, immutable records, unchanged original history, and private storage policies. No remote connection is possible in this harness. PGlite is an optional local test runtime, not an application dependency.
- `node scripts/test-audit-revisits-ui.mjs` — actual React component in isolated Chromium with synthetic API responses; verifies stable submission UUID after an uncertain response, no duplicate display, retained original audit details, read-only controls and mobile width. Uses the existing production CSS from `.next`, and writes labelled screenshots to `output/playwright/audit-revisits/`.

Concurrent request retries are exercised in the mocked service test. The isolated PostgreSQL test verifies the real uniqueness constraints/RPC; its embedded runtime serializes database calls and does not claim a multi-session PostgreSQL concurrency test.
