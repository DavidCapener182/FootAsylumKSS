# FRA Action Plans account provisioning plan

This plan creates no accounts or memberships. Read-only `auth.users` lookup on 25 September 2026 found **no existing login** for any of the five Area Manager contact emails. The user authorised those addresses as intended login emails. Confirm mailbox ownership before invitations.

| Intended role | Person | Login email / current profile |
| --- | --- | --- |
| Client Admin | Hannah Lord | hannah.lord@footasylum.com; profile `1eb36932-44ee-41ac-861d-39b2414d925b` (`client`) |
| Client Admin | Toni Shaw | toni.shaw@footasylum.com; profile `25903bcd-f26d-4bd4-a160-d663aba45d3b` (`client`) |
| AREA1 Manager | Jill Gunn | Jill.Gunn@footasylum.com — no auth user yet |
| AREA2 Manager | Stu Hunter | Stuart.Hunter@footasylum.com — no auth user yet |
| AREA3 Manager | Liam Harvey | Liam.Harvey@footasylum.com — no auth user yet |
| AREA4 Manager | Brett Llewellyn | brett.llewellyn@footasylum.com — no auth user yet |
| AREA5 Manager | Shaynul Uddin | Shaynul.Uddin@footasylum.com — no auth user yet |

`capener182` is David's test account, currently profile `27521f03-913a-4390-8fce-627c85bd65ef` with legacy `client`. David confirmed its replacement KSS role is **Admin**. It must remain KSS-only and is **not** seeded as Client Admin.

## Provision after the release gates pass

1. Apply and test the FRA action register, role enum, hierarchy, 72-store roster seed and workflow commands. Create the private evidence bucket through the Storage API. Verify role-isolation and direct URL/API tests.
2. Apply the [identity-checked inactive membership seed](../supabase/drafts/fra_client_admin_memberships_seed.sql) for Hannah and Toni against Footasylum client `10000000-0000-4000-8000-000000000001`. Read it back. Activate each membership, then use the audited admin role-change action to set `client_admin`; verify each login sees the 72-store history and no KSS routes or legacy client data.
3. Invite each Area Manager to the exact confirmed email, initially as an invited account. The generic invite flow deliberately cannot invite directly as `area_manager`. Confirm the resulting `auth.users` email and profile ID before inserting an **inactive** client membership and the one matching area assignment. Activate membership only after reviewing the association, then use the audited admin role-change action to set `area_manager`.
4. Sign in as each new Area Manager and verify only their active stores: AREA1 15, AREA2 14, AREA3 12, AREA4 11, AREA5 15. The five inactive retail stores remain visible to Client Admin/KSS history but are not Area Manager tasks.
5. Change `capener182` to KSS Admin using the audited role-change action and verify the account has no Footasylum client membership. Once no active legacy `client` profile remains, retire broad legacy client policies in a separate reviewed migration.

The application role-change action and database trigger both reject `client_admin` or `area_manager` without a matching active membership; Area Manager additionally needs at least one assigned area. Store contact names and emails never grant access by themselves.
