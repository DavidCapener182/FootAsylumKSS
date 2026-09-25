# FRA Action Plan authorization verification

Companion to [security-design.md](security-design.md). This is a manual acceptance matrix with concrete fixtures, requests and expected outcomes. It is not an executed passing suite. Run mutation cases only against an isolated test database/storage environment. Never create fictitious actions or evidence in production to prove a denial.

## Evidence already collected

| Check | Method | Status |
| --- | --- | --- |
| Active-profile helper and current policy/grant definitions | Live catalog SELECT | Inspected 2026-09-25 |
| Existing client visibility | Read-only authenticated-role transaction; counts in design | Reproduced current exposures; **not a target-model pass** |
| Operational route tables, CRM notes and activity logs | Same transaction | Existing client denied rows |
| Download/search/calendar/report implementation | Working-tree source inspection | Located concrete code paths; deployed HTTP behavior not verified |
| Direct client audit/photo/comment mutation | Policies and grants only | Potential write paths identified; no mutation attempted |
| Proposed permissions and workflow tests below | Not implemented or run by this task | All pending |

Record future results as `PASS`, `FAIL`, or `BLOCKED`, with code SHA, migration set, UTC time, test environment, identity fixture and sanitized request/response or DB assertion. A successful admin/service-role query does not prove client behavior. A hidden button, UI redirect or empty screen does not prove direct API/storage denial.

## Test fixtures

Create fixtures in the isolated environment, using ordinary authenticated sessions and fresh tokens:

- KSS admin; KSS ops assessor; KSS verifier; KSS readonly; anon; pending; suspended; authenticated profile without membership.
- Client F admin; Client G admin; F area manager for A; F area manager for B; F manager assigned A+B; F regional manager for R1 containing A/B, with C in R2; cover manager whose grant expires during the test.
- F stores SA in A, SB in B and SC in C; G store SG; F NON_RETAIL and unresolved-ownership store; an archived F store with an open historical action; a store alias mapped to a different scope as an invalid fixture.
- For each relevant store: draft FRA, pending PDF, confirmed issued FRA, issued H&S report, internal scheduling sentinel `KSS_SCHEDULE_SENTINEL`, internal note sentinel and private staff-location sentinel.
- Issued FRA with remedial and routine rows; approved empty list; missing/unreviewed action draft; tracked open action; work-completed action; awaiting-verification action; closed action.
- Evidence states: reservation, uploaded-unfinalized, finalized-unsubmitted, submitted, rejected; exact object hashes; action belonging to another tenant; guessed existing object path.

For each read test exercise all applicable paths: browser page/RSC response, server action/API, direct PostgREST SELECT, permitted RPC, Storage list/download/sign, CSV/PDF/ZIP export, search and aggregate counts. Test forbidden IDs directly without relying on navigation. DB reads should return no unauthorized rows; denied API commands return controlled 401/403/404 as appropriate, with no target-content disclosure. For missing and unauthorized object IDs, use a consistent non-enumerating response. Do not treat HTTP 200 with an error-free but incorrect row count as a pass.

## Identity, hierarchy and read tests

| ID | Actor / operation | Expected result |
| --- | --- | --- |
| A01 | Anon, pending, suspended and no-membership actors read F compliance/actions/evidence | No client compliance data; pending/suspended also fail when reusing an existing unexpired JWT |
| A02 | F client admin requests F and G stores/reports/actions | All approved F scope; no G or unresolved-ownership data |
| A03 | AM A lists stores and requests SA/SB/SC/SG by ID | SA allowed; SB/SC/SG denied across every path |
| A04 | AM A+B reads both areas, then loses B grant without token refresh | Both initially allowed; next B request denied after revocation |
| A05 | RM R1 reads A/B/C; attempts AM command | A/B allowed, C denied; write denied by default even within R1 |
| A06 | Cover grant reaches expiry; membership suspended; auth user removed | New protected requests fail closed without waiting for claim refresh; record signed-link expiry exception separately |
| A07 | SA moves A to B while action remains open | Current AM B can access; AM A cannot; historical report/source/store identity is unchanged |
| A08 | Directly edit membership/role/area grant; change user metadata to claim admin | Denied; no capability change; only authorized KSS admin can grant access |
| A09 | NON_RETAIL, unassigned, archived and alias/merged-store reads | Follow approved explicit rules; no tenant/area widening from aliases or automatic fallback |
| A10 | Client reads raw fa_stores/fa_profiles/archive/publication/response tables | Unsafe base records unavailable; authorized safe projections still work; staff-private columns never returned |
| A11 | Client accesses calendar/dashboard/store list/detail/search/manager search | No schedule/note/location sentinel, assigned KSS user, route sequence or planning-derived aggregate in HTML, RSC, JSON or client props |
| A12 | Client downloads weekly/monthly reports, saved versions, CSV and ZIP | Scoped issued compliance data only; no planning fields, private notes, source manifests or other-area totals |
| A13 | AM compares pagination, count, sort/filter and autocomplete across scopes | Counts and available filter values reveal only authorized scope; supplied area/store filters cannot widen access |
| A14 | Client reads draft FRA/pending PDF/confirmed FRA and H&S report | Draft/pending denied; issued in-scope artifacts readable; no raw response access required to show published rating |
| A15 | Client admin or manager attempts original FRA edit, template edit, schedule or route action | Denied at server and direct DB/RPC layers |
| A16 | Client uses raw audit-instance insert with self as conducted_by_user_id; then response/media insert | Denied regardless of ownership; also deny for suspended former assessor |
| A17 | Client reads/writes FRA source-photo comments or inserts arbitrary fra/% object | Denied even when created_by/auth.uid match; KSS authorized draft behavior still works |
| A18 | Audit views, legacy reports and alternate fa_hs_* tables queried directly | No alternate cross-tenant/internal-data path; record intended public datasets explicitly if any |

## Workflow, provenance and history tests

| ID | Actor / operation | Expected result |
| --- | --- | --- |
| W01 | AM A progresses SA open → work_ordered → visit_booked → work_completed | Allowed; one ordered server-authored event per command and matching current version/state |
| W02 | AM A attempts same command on SB/SG, or swaps payload store/client/action IDs | Denied atomically; no row, event or evidence changes |
| W03 | AM sends verified_closed, verified_by, original recommendation, priority, target/source IDs, actor or timestamp | Rejected by strict command schema and DB checks; no mass assignment |
| W04 | AM submits work completion alone | Work-completed state only; never verified/closed or automatically accepted |
| W05 | AM submits missing, unfinalized, other-action or other-tenant evidence | Rejected; no awaiting-verification event/state |
| W06 | AM submits valid evidence after completed work or requested follow-up | Exact evidence revision shared and submission event + awaiting_verification state committed together |
| W07 | Manager/client admin/non-verifier ops directly invokes verification RPC | Denied; service-only function also denies PUBLIC/anon/authenticated EXECUTE |
| W08 | KSS verifier accepts valid pending submission | Verified_closed, verifier identity/time and immutable event; evidence/source unchanged |
| W09 | KSS verifier rejects without reason; then with reason | Empty reason denied; valid reason produces further_action_required and visible shared review event |
| W10 | Manager progresses a closed action or changes submitted evidence while review is pending | Denied; explicit verifier reopen/review flow required |
| W11 | Two commands use same expected version concurrently | Exactly one commits; stale command reports conflict; no lost event |
| W12 | Exact idempotent replay; same key with different payload | Exact replay returns original result without duplicate event; changed payload rejected |
| W13 | Failure between event insert and state update or between evidence bind and submission | Entire transaction rolled back; no orphan successful event/state |
| W14 | Client/KSS ordinary session tries event UPDATE/DELETE; app tries source snapshot UPDATE/DELETE | Denied; correction is append-only; authorized maintenance is separately controlled |
| W15 | Cross-store/client publication/action/evidence/event associations via direct DB | FK/constraint or command validation rejects inconsistent provenance |
| W16 | Client supplies approval:approved to publication; KSS supplies mismatched instance/store/finding | Unauthorized client denied; mismatched source denied even for KSS; actor derived server-side |
| W17 | Publish reviewed remedial + routine list, replay confirmation, compare PDF rows/action rows | PDF matches frozen ordered snapshot; only remedial rows tracked; unique publication/source-action identity prevents duplicates |
| W18 | Publish missing/pending draft versus approved empty/routine-only list | Missing/pending denied; explicit approved empty/routine-only publishes with zero tracked remedial actions |
| W19 | Source changes after PDF review or action IDs regenerated on retry | Stale fingerprint/version rejected; stable existing IDs retained |
| W20 | Import historical PDF with unknown completion/provenance or a generic H&S action | Quarantined for KSS review; not silently exposed as verified open/closed FRA action |

## Storage and document tests

| ID | Request | Expected result |
| --- | --- | --- |
| S01 | AM signs/downloads guessed pending/source-photo/other-area/other-tenant key | Denied through storage and application signer; document/evidence ID required |
| S02 | Call legacy getAuditPDFDownloadUrl with arbitrary known internal key | Cannot obtain signed URL; any retained compatibility wrapper resolves authorized parent first |
| S03 | Manager uploads to valid reservation, then mismatched action/path or revoked assignment | Valid scoped upload only; mismatches/revocation denied; no arbitrary prefix upload |
| S04 | Finalize missing object, incorrect hash, disallowed type/size or another user's unsubmitted object | Rejected; no finalized evidence record or shared read access |
| S05 | Upsert/delete finalized or submitted evidence | Denied; replacement creates a new evidence revision and event |
| S06 | List bucket/prefix using client token | Only intentionally permitted linked files, or no listing; cannot enumerate raw report/source folders |
| S07 | Bulk request combines permitted and forbidden document IDs | Defined consistent behavior (prefer reject entire mixed request); never includes forbidden bytes/names |
| S08 | Revoke assignment after signing URL; wait until configured TTL | New signatures denied immediately; old link expiry verified; document the bounded stale-link window |
| S09 | Shared browser: sign out user A, sign in user B; inspect cache/back navigation/offline stores | No A private response/evidence replay to B; private/no-store responses and any local persistence are user scoped |

## KSS preservation and rollout gates

| ID | Operation | Expected result |
| --- | --- | --- |
| K01 | Admin/ops load route planning, calendar, assignments and visit times before/after cutover | Same authorized records and saved route identities; no role widening for readonly |
| K02 | Authorized KSS staff prepare/edit draft FRA, upload photos, publish and open saved report | Existing legitimate process works; snapshot/evidence preservation and actor checks remain enforced |
| K03 | KSS creates/completes H&S audit, views internal CRM/activity and exports internal report | Existing authorized operation preserved; safe client projection updated without publishing internal fields |
| K04 | Disable new feature/roll back application | Manager writes stop; restricted policies remain; no restoration of broad client access or loss of history |
| K05 | Existing Hannah/Toni client sessions after cutover | Approved client-wide issued compliance remains available; no KSS scheduling or staff-private records |
| K06 | Scope changes during command transaction and expired upload reservations | Authorization rechecked with state/version; revoked caller cannot commit using prior preflight alone |

## Execution order and release record

1. Verify fixtures and record the KSS baseline (K01–K03). Run A01–A18 against actual client sessions/direct APIs before UI work is called secure.
2. Run W01–W20 and S01–S09 in isolation, including rejected direct writes and concurrency; inspect DB effects, not just response messages.
3. Perform browser walkthroughs for client admin, AM A and RM R1. Inspect serialized responses/exports and open actual in-scope PDF/evidence artifacts.
4. After authorized production cutover, repeat read-only A/K cases with approved real test identities, plus a specifically authorized pilot workflow. Do not replay destructive fixture tests in production.
5. Record unresolved identity, regional responsibility, tenant ownership, archived/non-retail policy, alternate-table exposure, deployment parity and signed-link TTL gaps. Each missing result remains BLOCKED, not PASS.

Release is accepted only when every applicable test passes, exceptions have explicit ownership and the coordinating task approves expansion beyond the scoped pilot. This document neither grants that approval nor provisions accounts.
