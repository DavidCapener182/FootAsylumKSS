# Footasylum client scope roster — 25 September 2026

Read-only database inventory of `fa_stores`: 82 records. The [draft seed](../supabase/drafts/fra_footasylum_roster_seed.sql) pins 72 retail store IDs with `S0000`-style codes and AREA1–AREA5 assignments (67 active, 5 inactive). Client Admin history includes all 72; Area Manager scope includes only the 67 active stores. It creates no user memberships, invites or permissions. Its checks abort if a store code, ID, area, active flag or roster count changes before application.

| Area | Stores | Display contact | Contact email |
| --- | ---: | --- | --- |
| AREA1 | 15 | Jill Gunn | Jill.Gunn@footasylum.com |
| AREA2 | 16 | Stu Hunter | Stuart.Hunter@footasylum.com |
| AREA3 | 12 | Liam Harvey | Liam.Harvey@footasylum.com |
| AREA4 | 12 | Brett Llewellyn | brett.llewellyn@footasylum.com |
| AREA5 | 17 | Shaynul Uddin | Shaynul.Uddin@footasylum.com |

The user has authorised these contact emails as the intended Area Manager login emails. Confirm each mailbox and account identity before creating a membership or invitation, then test its scope before activation. Hannah Lord and Toni Shaw are confirmed Client Admins. Management regions have not been confirmed; the draft leaves `management_region_id` null.

The five inactive retail stores are S0007 Manchester Womans, S0014 Hanley, S0032 Croydon, S0040 Trafford Mega and S0051 Swindon. They remain in Client Admin history but `manager_visible=false` prevents Area Managers seeing or progressing them.

Ten records remain outside this retail seed and have **no client or Area Manager membership**:

| Code | Record | Reason to investigate |
| --- | --- | --- |
| None | Trafford Centre New Store (AREA2) | No store code; confirm identity and whether this is a duplicate/new store. |
| BREMONT-MAN | Bremont Manchester Boutique | Other client; exclude from Footasylum. |
| EXT-GLASGOW | Glasgow (AREA1) | Imported external code; reconcile with current store. |
| EXT-HUDDERSFIELD | Huddersfield (AREA3) | Imported external code; reconcile with current store. |
| EXT-SANDBROOK | Sandbrook (AREA2) | Imported external code; reconcile with current store. |
| EXT-SHARPPROJECT | Sharp Project (AREA2, inactive) | Imported external code; confirm site type and history. |
| EXT-UNKNOWNLOCAT | Unknown Location (Imported) | Unknown client and area. |
| S0900 | Photo Studio (NON_RETAIL) | Non-retail site; confirm whether it belongs in a separate Footasylum scope. |
| WH003 | Heywood (NON_RETAIL) | Warehouse; confirm separate non-retail scope. |
| WH004 | Middleton (NON_RETAIL) | Warehouse; confirm separate non-retail scope. |

Any FRA action on an unresolved record remains visible to KSS administrators but is not sent to a client or Area Manager view until its assignment is reviewed.
