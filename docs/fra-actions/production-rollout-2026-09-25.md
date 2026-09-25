# FRA Action Plans production rollout status — 25 September 2026

Project: `fwnzpafwfaiynrclwtnh`. The user approved the production FRA schema/permission rollout and a push to main, with local tests only (no paid staging branch).

## Applied and read back

1. `20260925125432 fra_action_persistence_source_bound`
2. `20260925125453 fra_historical_pdf_import`
3. `20260925125507 fra_confirmed_publication_actions`
4. `20260925125520 fra_client_roles`

The `fa_fra_actions` table exists with **zero actions**. The role enum contains `client_admin` and `area_manager`, but **zero profiles** have either role. All three existing active legacy `client` profiles remain unchanged. No historical PDF rows were imported and no accounts were invited.

## Blocked step

Automatic approval review rejected `fra_client_hierarchy.sql` twice. The stated reason is that local PGlite role checks and the read-only live legacy-policy inspection do not satisfy its required full cross-role RLS test before this production access migration. Do not retry the same migration through another execution route.

Consequently, `fra_action_workflow.sql`, the private evidence bucket, roster and membership seeds, PDF row import, account conversion, manager invitations and deployment are **not done**. Do not enable `FRA_ACTION_PLAN_REQUIRED` or push the current board to main while the client hierarchy is absent.

## Local verification completed

- Isolated current-main integration: TypeScript, production build, 24 focused tests and PGlite suites for persistence, PDF import, publication, hierarchy/workflow and roster.
- Read-only live catalog: required existing tables/functions present; 72/72 roster records match store IDs, codes, areas and active states; old `client` policies on operational tables and attachments remain broad.
- Local preview: Seen → Addressed with brief note → evidence → KSS review. Test card reset to New.

The next safe route is a full cross-role RLS test in an isolated Supabase environment, followed by the reviewed migration order and authenticated role/API/storage readback. The user previously declined the paid staging branch, so obtain a revised decision before creating one.
