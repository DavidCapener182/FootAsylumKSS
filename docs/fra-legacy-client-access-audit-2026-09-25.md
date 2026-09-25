# Legacy client access gate — 25 September 2026

Read-only Supabase checks found three **active** profiles with the legacy `client` role: Hannah Lord, Toni Shaw and `capener182`. The user has confirmed Hannah Lord and Toni Shaw as Client Admins. `capener182` is the user's own test account and must remain KSS-only, not become a Client Admin. Its exact future KSS role still needs to be chosen. No role or permission was changed during this audit.

Current RLS includes broad `client` SELECT policies for `fa_stores`, `fa_profiles`, `fa_incidents`, `fa_investigations`, `fa_claims`, `fa_actions`, `fa_store_actions`, `fa_attachments`, `fa_store_audits_archive`, `fa_fra_publications`, `fa_audit_pdf_imports`, `fa_report_versions`, and `storage.objects` in the `fa-attachments` bucket. Existing routes also explicitly allow `client` on dashboard, audit tracker, FRA, stores and actions. This is a release blocker for simply granting Area Managers that role.

## Safe conversion path

1. Deploy and test the new scoped tables, views, middleware and board with dedicated test accounts. Ensure direct URLs, APIs and storage access are denied outside the approved scope.
2. Hannah Lord and Toni Shaw are confirmed as Client Admins. The five stored Area Manager contact emails are authorised as intended login emails; verify each mailbox/account before invitation. Reclassify `capener182` to an appropriate KSS role only after its exact access is chosen. Keep the legacy role unchanged until conversion is tested.
3. For a confirmed Footasylum Client Admin, create an **active** `fa_client_memberships` row for the reviewed Footasylum client ID with `access_level='client_admin'`. The hierarchy seed itself creates no user memberships.
4. Use the existing audited administrator role-change command to set that profile to `client_admin`. The application and database trigger require the matching active membership first. Refresh the session and verify the account sees only its client store board plus Help and Privacy. Confirm it cannot query the old client tables, attachments, KSS routes, staff data, audit dates or operational schedules.
5. Convert or deactivate every remaining legacy `client` profile according to its verified purpose. Only then remove the old broad `client` RLS policies and route allowances through a separate reviewed migration. Check for additional profiles before doing so.

An Area Manager requires a matching active client membership and explicit area assignment before role change. Store manager names/emails in `fa_stores` are display contacts, never authorization evidence.
