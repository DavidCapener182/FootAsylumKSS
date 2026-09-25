# FRA Action Plan: server authorization design

Status: design and verification handoff; not an implemented security boundary.

Inspected 25 September 2026 against the dirty working tree at HEAD `37b2fe0` and live Supabase project `fwnzpafwfaiynrclwtnh`. Existing uncommitted work was preserved. Investigation used catalog queries and a read-only transaction; no production records, policies, files, accounts or sessions were changed. This document and its companion test matrix are the only changes owned by this task.

## Release condition

Do not onboard Area or Regional Managers using the existing unrestricted `client` role. Client access must follow explicit tenant and management assignments, expose only issued compliance information, and never expose KSS scheduling or internal records. KSS raises actions, Footasylum management progresses remediation, and an authorized KSS H&S verifier accepts evidence and closes actions.

See [verification-matrix.md](verification-matrix.md) for the release gates. Recommendations below are proposed interfaces and schema names unless explicitly identified as existing.

## Verified baseline and limits

The live `fa_private.get_user_role` checks `account_status = 'active'` and otherwise returns `pending`; it is a private-schema security-definer lookup with an empty search path. Application helpers also check the active profile. Preserve this behavior. Current application roles are `admin`, `ops`, `readonly`, `client`, `pending`; capabilities are global, not store scoped: [auth](../../lib/auth.ts), [permissions](../../lib/permissions.ts), [capabilities](../../lib/role-capabilities.ts).

A transaction using `BEGIN READ ONLY`, `SET LOCAL ROLE authenticated` and the JWT subject of an existing client profile produced the following counts, then rolled back. Only counts were inspected for sensitive address, note and storage data. This reproduces database authorization; it does not establish a browser login, HTTP response, downloaded bytes or a successful write.

| Client-visible data | Result |
| --- | ---: |
| Stores | 82 |
| Non-null planned audit dates | 33 |
| Planned dates on/after the database current date | 7 |
| Non-null route sequences | 33 |
| Non-empty store FRA notes | 5 |
| Profiles with home address / home coordinates | 1 / 1 |
| Unconfirmed FRA publications | 6 |
| Objects in `fa-attachments` | 1,668 |
| FRA photo comments | 360 |
| Audit instances, route operational items, visit times, CRM notes, activity logs | 0 each |

The attachment bucket is private, but its client SELECT policy covers the entire bucket. Private-bucket status alone is not authorization. The confirmed-only filter on the publication GET handler does not protect direct table/storage requests.

Current profiles comprise five admins, four ops and three clients (Hannah Lord, Toni Shaw and capener182). There are no Area/Regional Manager profiles or normalized membership tables. Do not infer that every admin/ops account is an H&S verifier. The brief says “Tony”; verify the intended identity against the existing Toni Shaw account before changing access.

The live hierarchy is denormalized in `fa_stores.reporting_area`, `reporting_area_manager_name`, and `reporting_area_manager_email`:

| Area | Existing contact | Active stores |
| --- | --- | ---: |
| AREA1 | Jill Gunn | 16 |
| AREA2 | Stu Hunter | 16 |
| AREA3 | Liam Harvey | 13 |
| AREA4 | Brett Llewellyn | 11 |
| AREA5 | Shaynul Uddin | 15 |
| NON_RETAIL | None | 3 |
| Unassigned | None | 2 |

One AREA2 store, Trafford Centre New Store, lacks manager contact fields. Unassigned rows include Bremont Manchester Boutique and Unknown Location (Imported). Their presence in the same table means reporting-area filters are not a tenant boundary. Explicitly reconcile store ownership; quarantine unresolved ownership from client access. Do not infer Footasylum ownership from name, store-code shape, or a null area. Archived stores require a deliberate history-access rule, not deletion of their action history.

`region` is an existing operational route grouping and overlaps reporting areas. Preserve saved route identifiers, assignments and visit times; introduce a separate management-region hierarchy. Existing email contact data is an invitation seed, not an authenticated grant.

## Concrete exposure inventory

“Confirmed DB” means policy/grant inspection and, where counted above, role-simulated reads. “Code path” means inspected working-tree implementation; deployment parity and browser responses remain to be tested.

| Surface and evidence | Current gap | Required gate |
| --- | --- | --- |
| `fa_stores`; [client policy](../../supabase/migrations/013_add_client_role.sql) | Confirmed DB: all client rows and columns, including planned date, assigned KSS user, route sequence and unclassified FRA notes; other tenants are present | Remove broad client base-table access; serve tenant/scoped compliance projection only |
| `fa_profiles`; same migration | Confirmed DB: clients can select all profiles including home address/coordinates and account-change details | Own safe profile plus minimal public actor directory; no client SELECT of staff private profile records |
| [Calendar page](../../app/(protected)/calendar/page.tsx), [calendar action](../../app/actions/calendar.ts) | Code path: page requires authentication only; action reads planned routes and assigned auditors | KSS-only operational action; client calendar, if retained, uses separate completed-compliance query |
| [Dashboard query](../../features/dashboard/query-service.ts) | Code path: returns planned routes, visit counts and planning-derived metrics | Separate client DTO and query; exclude internal aggregates and planning-derived forecast drivers as well as raw rows |
| [Store directory](../../features/stores/query-service.ts), [store detail](../../app/(protected)/stores/[id]/page.tsx) | Code path: `select('*')`, passthrough/spread or direct raw store props | Explicit client projection; no sensitive fields in RSC/JSON even if component hides them |
| [Store search](../../app/api/stores/search/route.ts), [manager search](../../app/api/managers/search/route.ts) | Code path: authenticated search includes planned date/assigned-manager store lists | Scoped compliance search; KSS-only staff/route search; no cross-area autocomplete/count leaks |
| [Weekly digest](../../app/api/reports/weekly-digest/route.ts), [monthly newsletter builder](../../lib/reports/monthly-newsletter.ts), [report authorization](../../lib/reports/authorization.ts) | Code path: client `exportReports` includes planned-route metrics; newsletter includes `plannedVisitDate` and FRA notes | Distinct client-safe report capability/projection, including generated PDFs and saved report versions |
| [Audit tracker](../../app/(protected)/audit-tracker/page.tsx), [FRA tracker query](../../features/fra/query-service.ts) | Code path: clients read store notes/PDF paths; raw audit-instance policies currently deny client reports/ratings derived from responses | Published FRA/H&S report projection; never grant raw responses simply to make the client tracker work |
| `fa_store_audits_archive`; [archive policy](../../supabase/migrations/022_enable_rls_for_fa_archive_and_route_tables.sql) | Policy permits client SELECT; schema also contains planned date and assigned manager | Include archive/history in projection cutover; expose issued report dates/results only |
| `fa_fra_publications`; [publication read policy](../../supabase/migrations/20260907115000_fra_publication_read_policy.sql) | Confirmed DB: broad active-client SELECT, including six unconfirmed publications and source-image/archive metadata | KSS owns raw publication ledger; client reads issued document projection only |
| [Publication GET](../../app/api/fra-reports/publication/route.ts) | Code path: requires `viewEvidence`, filters confirmed but lacks client/store scope | Check tenant, scope and issued state using document identity before service signing |
| [Audit PDF download](../../app/actions/audit-pdfs.ts) | Code path: role-only `viewEvidence`, caller-supplied path, service-role signer | Accept document ID, resolve authorized immutable record server-side; reject arbitrary path signing |
| [FRA PDF download](../../app/actions/fra-pdfs.ts), [bulk FRA download](../../app/api/fra-pdfs/download-all/route.ts), [attachment download](../../app/actions/attachments.ts) | Code paths rely on current broad table/storage visibility | Parent-scoped authorization for every item, including mixed authorized/unauthorized bulk requests |
| `storage.objects`; [attachment policies](../../supabase/migrations/057_repair_fa_attachments_storage_policies.sql) | Confirmed DB: client can list/read entire `fa-attachments`, including source photos/pending PDFs | Replace broad client policy with exact document/evidence linkage and state/scope checks |
| [FRA photo INSERT policy](../../supabase/migrations/016_fra_photo_upload_policy.sql) | Policy/grants: any authenticated identity may insert under `fra/%`; no active role or instance linkage | Active KSS + authorized draft instance + reserved path; separate manager remediation-evidence bucket/path |
| [SafeHub instance/response/media policies](../../supabase/migrations/015_add_safehub_templates.sql) | Policy/grants: owner branch is `conducted_by_user_id = auth.uid()` without active KSS requirement; authenticated write grants exist | Explicit active KSS predicate on every owner/write branch; original assessed/published versions immutable |
| [FRA photo comments](../../supabase/migrations/040_add_fra_photo_comments.sql) | Live SELECT is `true` for authenticated; live mutations check owner only | KSS-only draft annotations with parent checks; separate deliberately shared action comments |
| [Generic action workflow](../../app/api/actions/workflow/route.ts), [store actions](../../app/actions/store-actions.ts) | Existing `manageActions` combines broad mutation/verification; unsuitable for manager remediation | Dedicated FRA command API; do not grant managers generic `manageActions` |

The original photo-comment migration has wider UPDATE/DELETE text than the current live owner policies. The live catalog is authoritative; inspect migration replay separately. Tightening a new policy while leaving an old permissive policy in place does not restrict access: permissive policies combine with OR.

Existing route operational/visit tables and CRM/activity policies already deny clients; preserve these denies. Raw audit instances currently deny reads of existing KSS-owned assessments to clients; the owner-write bypass is a policy finding, not a performed write. Nearby `fa_hs_*` tables also have unconditional anon/authenticated read policies and SELECT grants. Their content, intended publication status and Data API reachability need separate confirmation; do not certify tenant isolation while an alternate report-data path remains unreviewed.

## Authorization records and predicate

Proposed normalized records:

- `fa_clients`, `fa_management_regions(client_id)`, `fa_management_areas(client_id, region_id, code)`.
- Authoritative `store_id -> client_id, area_id` binding; composite foreign keys prevent cross-client region/area/store associations. Keep operational `region` unchanged.
- `fa_client_memberships(user_id, client_id, role, status)` where role is `client_admin`, `regional_manager`, or `area_manager`.
- Many-to-many membership-area and membership-region grants with optional start/end timestamps for cover. Only active grants apply; changes are checked from DB on each request, not trusted from stale JWT claims or user-editable metadata.
- KSS verifier entitlement assigned by an authorized KSS administrator. `readonly` remains read-only and internal; never use it for a Footasylum manager. A store has no membership or account role.

The conceptual predicate `can_read_client_store(actor, store)` is true only if the actor has an active application profile, an active membership for that store's explicit client, and either client-admin membership, a current direct area grant, or a current region grant containing the store's area. Unassigned stores fail closed except for an explicitly approved tenant-wide rule; unresolved tenant ownership always fails closed. Regional assignment changes affect current access to historical actions without rewriting the original report's provenance. Expired cover ends immediately for new requests.

`can_progress_fra_action` additionally requires an area-manager grant for the action's current store assignment and a published, tracked remedial action in an editable state. Regional-manager and client-admin memberships are read-only by default in this design because the brief does not authorize their remediation writes. An explicit separately granted capability can extend this after the responsibility decision. Never accept a client-supplied scope or actor ID as authority.

| Role | Read issued reports/actions | Progress remediation | Verify/reject/close | Edit assessments | Internal scheduling | Manage access |
| --- | --- | --- | --- | --- | --- | --- |
| Active KSS admin | All authorized KSS stores | Administrative correction through audited command | With verifier entitlement | Yes | Yes | Yes |
| Active KSS ops/H&S | Existing authorized KSS stores | Administrative correction through audited command | With verifier entitlement | Existing assessor rights | Preserve current rights | No |
| KSS readonly | Preserve existing permitted read scope | No | No | No | Preserve existing permitted reads only; route pages currently exclude this role | No |
| Client admin | Own client | No by default | No | No | No | No |
| Regional manager | Assigned management regions | No by default | No | No | No | No |
| Area manager | Assigned areas | Yes, scoped | No | No | No | No |
| Pending/suspended/no membership/store/anonymous | None | No | No | No | No | No |

## Database, server and storage gates

Use a separate client compliance projection (`fa_client_store_compliance` and issued-document records are proposed names) so existing KSS `fa_stores` operational queries and identities can remain intact. Clients lose SELECT on raw `fa_stores`, staff profiles, raw publications, raw audit responses, operational history and unclassified report versions. Update every client consumer to the safe projection before the access cutover. The projection contains explicit tenant/store/area identity, display address and issued assessment facts; no planned date, auditor assignment, route sequence, staff home location, internal note, pending PDF or source-image manifest. Derive it transactionally from authoritative changes; it is not a second editable source of truth.

A view is acceptable only if its grants, owner/invoker behavior, underlying permissions and scope are tested. A security-invoker view alone does not hide unsafe base-table columns when clients retain broad base-table access. Prefer explicit safe projection tables with RLS or a narrowly scoped server/DB read function. Do not introduce an unrestricted security-definer view/RPC as a shortcut. Private helper functions use fixed search paths and minimum EXECUTE grants.

All new exposed tables require RLS and deliberate grants. Remove `anon` access and unnecessary TRUNCATE/REFERENCES/TRIGGER grants. Client-facing tables provide SELECT only, with the active scope predicate; action mutations occur through the commands below, never a generic PATCH accepting arbitrary columns. Client policy replacement must cover existing `client` users as well as new memberships.

Every server action/API revalidates authenticated user, active profile, membership, target identity and allowed transition. Service-role use is confined to a checked operation; it must not convert caller-provided paths or IDs into unconditional reads/writes. Proposed command RPCs can remain service-only, matching the existing publication RPC, but must recheck trusted server-derived actor, membership and state in the same transaction. Revoke EXECUTE from PUBLIC/anon/authenticated. If a user-session RPC is chosen instead, derive the actor only from `auth.uid()` and test direct calls. Do not expose a privileged RPC accepting arbitrary actor IDs to clients.

Private evidence storage must reserve an object key against a known action and upload intent. Managers can upload only within an active in-scope reservation, with file size/type limits. Finalization verifies object existence, byte hash and immutable evidence metadata. No overwrite/upsert of finalized evidence, direct client DELETE, or substituting a source FRA/photo path. Cross-client/action path mismatch fails at storage policy and server finalization. Unsubmitted uploads remain visible only to their owner and authorized KSS; submission explicitly shares them with other authorized viewers of the action.

Download functions accept issued-document or evidence IDs, resolve store/client/scope and publication/submission state, then sign the stored key. Use short-lived links, private/no-store responses and no public URLs. Existing signed links can remain valid until expiry (the inspected FRA photo view signs some links for 24 hours); scope revocation cannot retract an already downloaded file. Inventory outstanding TTLs at cutover; use an authenticated proxy instead of reusable signed URLs if immediate revocation is required. Never promise instant revocation of existing links.

## Action and event contract agreed with draft peer

The new pure [draft module](../../lib/fra/fra-action-draft.ts) defines version-1 draft items with stable UUID `sourceActionId`, `kind: remedial | routine`, recommendation, `Low | Medium | High` priority, optional due note, target date and source-finding reference. `createFraActionDraft` assigns identities once; `addFraActionDraftItem` and `updateFraActionDraftItem` preserve identities of existing rows and return a pending draft; `validateFraActionDraft` checks persisted data; `approveFraActionDraft` records `approvedBy` and `approvedAt`. Async `buildFraActionPublicationSnapshot` requires approved data and creates ordered `pdfRows`, remedial-only `trackingRows`, approver/time and a SHA-256 fingerprint covering identity, approval provenance and exact normalized rows. An explicitly approved empty list is valid and differs from missing/unreviewed data. This module does not authorize a caller or persist immutable records. The peer owns the module and its tests; this documentation task has only inspected its final interface.

The publication handler must establish active KSS authority and derive approver/time server-side. Resolve instance, store, client and template category from the database; payload `approval`, `storeId`, `instanceId` and `sourceFindingId` are not authorization. Validate bounded strings/item counts and resolve source-finding references to the same assessment where supplied. Keep unsupported historical references explicit rather than fabricating them.

Store the exact reviewed action snapshot and hash with the publication. Extend existing `fa_confirm_fra_publication` transaction to confirm the publication and insert remedial actions once; uniqueness is `(publication_id, source_action_id)`. Confirm only if the reviewed fingerprint/version still matches. Routine rows remain in the PDF snapshot but do not become corrective-action tasks. Do not regenerate wording or IDs on confirmation. Historical report imports need reviewed provenance and their own issuance/binding evidence; a non-null legacy PDF path alone is insufficient.

Proposed `fa_fra_actions` carries immutable `client_id`, `store_id`, assessment/publication/source-action identity and original finding/priority/target metadata, plus command-maintained state/version. Composite FKs or checked constraints/triggers enforce publication, action, event and evidence all refer to the same client/store/source. Client scope follows the authoritative current store assignment, not editable action payload fields. No direct client UPDATE/DELETE.

Proposed `fa_fra_action_events` is append-only: action, event type, actor, server timestamp, previous/new state, expected/resulting version, idempotency key and bounded structured payload. Clients read deliberately shared events only; internal KSS comments belong in a separate private table. Neither client nor KSS UI can overwrite/delete the timeline; corrections are new events. Deny table UPDATE/DELETE even to ordinary staff sessions and enforce append-only behavior in DB. Privileged maintenance remains outside the normal application contract.

Proposed command interface:

| Command | Authority and accepted fields | Transaction rules |
| --- | --- | --- |
| `progressFraAction(actionId, expectedVersion, idempotencyKey, change)` | In-scope AM; work-order reference/date, contractor details, booked visit, work-completion date, shared comment | Allowed transitions among open/work_ordered/visit_booked/work_completed/further_action_required; changing these cannot imply closure or KSS verification |
| `submitFraEvidence(actionId, expectedVersion, idempotencyKey, evidenceIds, comment)` | In-scope AM; finalized evidence belonging to this action | Require work_completed or further_action_required plus usable evidence; append submission event, bind exact evidence revision and set awaiting_verification atomically |
| `reviewFraEvidence(actionId, expectedVersion, idempotencyKey, decision, reason)` | Active KSS verifier; accept or request further work/evidence | Only awaiting_verification; review exact submitted evidence, require rejection reason; accept sets verified_closed and server verifier/time; reject sets further_action_required |
| `reopenFraAction(...)` | Active KSS verifier | Closed actions never reopen via manager progress; reason required; preserve prior verification and append event |

Record `evidence_submitted` as an event and `awaiting_verification` as the resulting persisted state, avoiding an intermediate state with no reviewer queue. One transaction locks/checks the action version, rechecks authority, appends the event and updates the projection. Serialize changes to the relevant membership/store assignment with command authorization (for example, shared row/advisory locking discipline plus a checked scope version), so a stale preflight cannot authorize a command after a completed revocation. Define and test that transaction ordering explicitly. Unique `(action_id, actor_id, idempotency_key)` plus request hash: exact retry returns the original result, changed payload with reused key fails. Concurrent stale versions fail rather than overwrite history. Managers cannot alter recommendation, source, priority/target, actor, verification, client/store identity or history through these commands. Due-date changes, withdrawals and other exceptional transitions require a separate explicit audited rule; do not silently infer them.

## Staged rollout and safe rollback

1. Recheck live policies, profile status, schema, route baseline and deployment revision. Reconcile client ownership, named administrators, verifier entitlement and area/region grants. Approve the NON_RETAIL/unassigned/archived-store rules. Preserve all existing operational identities and dirty work.
2. Implement the normalized grants, safe read projections, immutable action/event/evidence model and tests in an isolated non-production environment. Keep new manager access disabled. Use fixtures for cross-tenant and unsafe-write tests.
3. Deploy compatible KSS readers/writers and client-safe consumers first. Keep KSS query behavior unchanged. Inventory all server actions, RSC payloads, search/export/download paths, storage policies, RPCs, saved reports and background consumers. Do not describe this compatibility stage as fixing exposure while broad live policies remain.
4. During a coordinated access cutover, populate reviewed memberships and projections, replace every broad client policy, tighten owner/photo policies, and restrict signers/commands. Preserve explicit active KSS policies. An old client page may fail closed during cutover; do not restore a broad policy to hide such an error. Adding new narrow policies alongside old broad ones is not a cutover.
5. Execute the real database/API/storage tests and client browser readback before enabling AM/RM invitations. Verify pending publications, raw schedule columns, staff-private profiles and internal notes are unavailable even through direct endpoints. Check old signed-link TTLs and caches separately.
6. Enable one scoped pilot manager; compare visible stores/actions with the approved assignment and exercise remediation-to-KSS verification. Only then expand to remaining verified managers. Review denied requests and legitimate KSS failures without logging report/evidence bodies.
7. Rollback disables new manager commands/invitations and leaves restricted reads in place; retain immutable records and evidence. Restore compatible application code, never the former broad client RLS/storage policies. KSS staff continue through the tested staff path; client errors remain fail-closed until repaired. No rollback deletes provenance or event history.

No production rollout is authorized by this artifact. Remaining decisions and untested surfaces must be recorded in the verification matrix rather than marked passed from source inspection.

## Reference

[Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) was checked during the investigation for grants, RLS, views and database-test guidance. Local policy evidence and the live catalog determine this application's findings.
