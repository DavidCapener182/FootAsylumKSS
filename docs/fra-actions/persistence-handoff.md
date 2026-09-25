# Local FRA persistence draft

Status: **unapplied SQL draft, insufficient for live import**, locally tested on 25 September 2026. No production database, account, storage object or deployment was changed. The stored-response identity, array position and serialized item hash are now bound and rechecked. Live use still requires migration against the real schema, private storage setup, authenticated role checks, and PDF/evidence readback. The user declined a paid Supabase staging branch, so testing remains local only.

## Files and ownership

- [SQL draft](../../supabase/drafts/fra_action_persistence.sql): dedicated actions, historical review decisions, source investigations, events, RLS/grants, service-only commands and immutable-history triggers.
- [Database integration tests](../../scripts/fra-actions/persistence.integration.mjs): executes the actual SQL in an isolated in-memory PostgreSQL-compatible PGlite database. No connection string is accepted; it cannot connect to Supabase.
- This handoff. The queue validator/adapter and UI are peer-owned; their canonical exports are consumed by the database tests, not copied into a second JavaScript validator.

No existing dirty files or repository package manifests/lockfiles were changed by this persistence task. The earlier security design and manual matrix remain broader release requirements; passing this local slice does not close their existing client-exposure findings.

## Tables and current access

| Table | Purpose | Authenticated access |
| --- | --- | --- |
| `fa_fra_historical_reviews` | Immutable Queue A decisions, exact candidate snapshot, evidence/check state, reviewer/time and supersession chain | Active KSS admin/ops SELECT only |
| `fa_fra_actions` | Dedicated FRA remedial actions created from eligible reviewed rows | Active KSS admin/ops/readonly SELECT only |
| `fa_fra_action_events` | Atomic creation event and immutable history | Active KSS admin/ops/readonly SELECT only |
| `fa_fra_source_investigations` | Queue B source discovery, without creating invented actions | Active KSS admin/ops SELECT only |

Clients/managers see no rows in these tables, cannot write them and cannot invoke mutation RPCs. Anonymous access is revoked. Service-role access is limited to SELECT/INSERT; ordinary UPDATE/DELETE/TRUNCATE grants are absent. UPDATE/DELETE triggers additionally reject mutation even under privileged SQL. These measures do not restrict a database owner from intentionally changing DDL, and do not claim to.

Every command is `SECURITY INVOKER`, has a fixed empty search path and schema-qualified relations, and is executable only by `service_role`. The trusted server must derive `p_actor` from the authenticated session; never pass the browser's reviewer ID as authority. Database checks then require the actor to be an active KSS admin/ops profile. Profile row locks order commands against account revocation. This slice has no verification/closure command and does not assume every ops user is an H&S verifier.

## Command contracts

```sql
public.fa_fra_record_historical_review(
  p_actor uuid,
  p_candidate jsonb,
  p_review jsonb,
  p_idempotency_key uuid,
  p_expected_latest_review_id uuid DEFAULT NULL
) RETURNS uuid;

public.fa_fra_migrate_reviewed_action(
  p_actor uuid,
  p_review_id uuid
) RETURNS uuid;

public.fa_fra_record_source_investigation(
  p_actor uuid,
  p_store_id uuid,
  p_data jsonb,
  p_idempotency_key uuid
) RETURNS uuid;
```

Queue A uses the candidate snapshot from `reconcile-history.mjs` and the JSON returned by `toHistoricalReviewInput` in [historical-review.mjs](../../scripts/fra-actions/historical-review.mjs). Candidate identity is `stagingKey`, `storeId`, `assessmentInstanceId`, `publicationId`, `sourceItemSha256`. The SQL checks matching review identity and source/store/FRA-template linkage; supplied publication identity must refer to a confirmed publication for that same store and instance. Existing publication PDF path/hash are checked again at migration. The SQL now locks the exact `fa_audit_responses` row, checks its FRA instance/store, validates the explicit `fra_extracted_data.actionPlanItems[index]` path and ordinal, and compares the stored serialized item against `sourceItemJson` and its SHA-256. It repeats the check at migration. The previous inventory lacks `sourceItemJson`; it fails closed and must be regenerated before any stored-response review.

The database overwrites submitted reviewer identity/time. Review idempotency compares the original candidate and canonical review, excluding reviewer/time and computed proposal fields. Exact retries return the original ID; changed payloads with the same key fail. A new decision must supply the latest review ID; prior reviews remain immutable. Candidate locks serialize review/migration commands. Already-migrated candidates cannot receive a replacement review through this command.

The six decisions are `open_migrate`, `closed_archive`, `routine_exclude`, `duplicate_link`, `not_fra_exclude`, and `needs_evidence`. Queryable `migration_eligible` is a generated stored boolean, true only when the validated decision is `open_migrate`; callers cannot supply or overwrite it. It describes that review's eligibility, not whether it remains the latest review or has already been migrated—the command checks those conditions separately.

- `needs_evidence` requires a reason and `missingEvidenceReason`, but no PDF, completion check or invented source-action UUID.
- `not_fra_exclude` requires explicit outside-FRA origin and an evidence reference, without pretending a PDF was reviewed.
- The four remaining dispositions require exact issued PDF identity, page/row, wording and affirmative PDF/FRA-origin checks. Their completion/routine/duplicate requirements match the canonical validator. `duplicate_link` must refer to an existing FRA action at the same store.
- Only `open_migrate` can create an action. All seven positive checks must be true: PDF, FRA origin, remedial, outstanding, completion evidence, duplicate resolution, priority/target review. It also requires actual boolean values, a completion evidence reference, valid priority and any target date's evidence reference. Routine/completed/non-FRA contradictions, duplicate disposition other than `new`, and a populated duplicate-action link are rejected directly by SQL, even if UI validation is bypassed.

The migration command rechecks active KSS authority, latest decision, unchanged issued-publication identity and exact action fields. It atomically inserts an open action and creation event. It does not change existing assessments, generic H&S actions, store completion dates or files. Retries return the existing action; uniqueness on staging key, source key and `(store, PDF hash, page, row)` prevents repeated extraction/import. The database source key matches the canonical JavaScript SHA-256 calculation. A genuinely repeated finding in a different report still needs human duplicate review.

Queue B accepts `toLegacySourceInvestigationInput` output: `needs_source`, `pdf_located`, `source_verified`. Missing-source reviews require notes/evidence reference/missing reason, not a PDF. Located PDFs require path/hash; verified sources also require the affirmative identity check. Blank PDF fields from the UI become null. Every investigation is append-only and creates zero action candidates/actions. Source discovery must lead to separately extracted, reviewed Queue A rows before migration.

## Current release boundary

The source binding described above passes local malicious-input and changed-source tests. The separate [historical PDF import](../../supabase/drafts/fra_historical_pdf_import.sql), [confirmed-publication action creation](../../supabase/drafts/fra_confirmed_publication_actions.sql), [client hierarchy](../../supabase/drafts/fra_client_hierarchy.sql) and [workflow](../../supabase/drafts/fra_action_workflow.sql) are also unapplied drafts. They must be reviewed together against the linked Supabase schema before activation.

Local PGlite tests cover database constraints, grants, row policies, idempotence, rollback and scoped commands. They do not prove Supabase Auth, PostgREST, Storage, the deployed browser, or live account permissions. The historical review path still requires exact issued-PDF byte verification and KSS review. The separate PDF extraction import follows the user's rule that every printed action-plan row appears on the store board at New; it does not infer prior completion.

## Verification and promotion

Run the local suites with the pinned PGlite module, including `persistence.integration.mjs`, `historical-pdf-import.integration.mjs`, `client-workflow.integration.mjs`, `roster-seed.integration.mjs` and `confirmed-publication.integration.mjs`. The integrated local run passed on 25 September 2026: persistence 18/18, historical PDF import 1/1, and the remaining three suites.

The user declined a paid staging branch. Before production activation, review the drafts against the actual schema and migration order, deploy with rollback and readback, create the private evidence bucket, then verify catalog grants, policy isolation, exact PDF/evidence retrieval, role-specific API access and an authenticated workflow. Keep manager access and the `FRA_ACTION_PLAN_REQUIRED` flag disabled until these checks pass. Do not treat the local suite as a production-schema or live-access test.
