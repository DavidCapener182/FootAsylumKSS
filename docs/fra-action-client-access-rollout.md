> Superseded draft: this document describes the rejected multi-table client hierarchy. Do not apply its migrations or provisioning steps. See `docs/fra-actions/production-rollout-2026-09-25.md` for current status.

# FRA Action Plans: controlled client access rollout

This is an implementation sequence, not authorisation to change production. The SQL files under `supabase/drafts/` are **unapplied**. The board is populated from exact issued FRA PDF action rows with unknown historical completion shown as New, with source provenance retained.

## Order

1. Inventory exact action-plan rows from each store's issued FRA PDF. Mark each source as a confirmed publication PDF or a current store PDF whose issued provenance still needs checking. Do not use stored JSON recommendations or generic H&S actions as source rows.
2. Apply and database-test `fra_action_persistence.sql`, then `fra_historical_pdf_import.sql` and `fra_confirmed_publication_actions.sql` from `supabase/drafts/`. Import issued PDF rows as New with historical completion explicitly unknown. Confirmed future publications create actions from their frozen snapshot. Deploy these before the client views.
3. Apply `supabase/drafts/fra_client_roles.sql` as its own migration transaction. PostgreSQL enum values must be committed before they are used by policies or data changes.
4. Apply `supabase/drafts/fra_client_hierarchy.sql`. It creates the client → management region → area → store assignment model and narrow action/store views. It does not seed memberships or change any profile role.
5. Create the private `fa-fra-action-evidence` bucket through the Supabase Storage API with a 10 MiB limit and JPEG, PNG, WebP and PDF MIME types. Grant no direct authenticated storage policies. Then apply `supabase/drafts/fra_action_workflow.sql`; it adds versioned progression commands and append-only evidence/event records. Every active KSS admin or ops user may verify and close, as the user specified.
6. Resolve [the legacy client access gate](fra-legacy-client-access-audit-2026-09-25.md). Three active legacy `client` profiles currently have broad policies: Hannah Lord, Toni Shaw and `capener182`. The legacy role remains separate from `client_admin` and `area_manager`; do not auto-convert them.
7. Apply the reviewed [72-store retail seed](../supabase/drafts/fra_footasylum_roster_seed.sql) only if its exact roster assertions pass. Management regions remain null until confirmed. Resolve the ten excluded records individually using [the roster review](fra-client-roster-review-2026-09-25.md). The operational `fa_stores.region` and contact email fields are never authorization sources.
8. Create inactive client memberships and area assignments for confirmed identities. Test with dedicated accounts before activating memberships and assigning the matching `fa_profiles.role`. Provision KSS H&S verifiers separately.
9. Run cross-role checks: Area Manager sees only assigned stores and no routes/calendar/staff/other-client rows; Client Admin sees only their client; KSS admin/ops retains needed access; legacy `client`, pending and suspended users see no new action data. Test direct URLs, APIs, storage and signed evidence access, not just the sidebar.
10. The user declined a paid staging branch. Run the local PGlite integration suites, then use a controlled production rollout with explicit account-by-account readback and direct URL/API/storage checks. Do not activate accounts until the scoped board, commands, PDF access and evidence endpoints have passed those gates.

## Current access boundary

- `area_manager`: FRA Action Plans for assigned areas, Help and Privacy. May acknowledge, record approach/booking and submit evidence after deployment.
- `client_admin`: read-only FRA Action Plans for their own client, Help and Privacy.
- KSS admin/ops: all stores; every active admin or ops user may verify and close.
- Legacy `client`: no access to the new board.

The board API derives actor identity from a fresh authenticated session; service-only RPCs validate role, account status, store assignment and action version. The private evidence bucket accepts uploads only through a server endpoint that checks the same action scope. Direct client storage access is not granted.
