# FRA Action Plans rollout status — 25 September 2026

Project: `fwnzpafwfaiynrclwtnh`. The user approved the production FRA action setup and main push, and requested local tests only. No paid staging branch was created.

## Applied and read back

- Base FRA action schema, historical PDF import support, confirmed publication action creation, and new role enum values.
- 69 action rows imported from byte-verified issued FRA PDFs across 25 stores. The live KSS board shows the imported rows grouped by store. These are initially in `open`/New status, as requested.
- A service-only per-user/per-store access table. Hannah and Toni each have 72 active Client Admin grants across the reviewed stores. Jill Gunn has 15 AREA1 grants and Stu Hunter has 14 AREA2 grants. Authenticated users cannot query the grant table directly.
- Versioned action workflow functions; direct authenticated calls are denied and service-role calls are allowed. A private evidence bucket exists with a 10 MiB limit and JPEG, PNG, WebP and PDF types.
- Hannah Lord and Toni Shaw were changed from the legacy `client` role to `client_admin` through the authenticated admin lifecycle UI. `capener182`, David's test account, was changed from `client` to KSS `admin`. Jill and Stu were invited and activated as `area_manager`; their reviewed store grants were activated first.

## Remaining access gate

After the user explicitly approved the impact, the restrictive read policy was applied to five H&S/FRA source tables and the KSS-only operational write policy was applied to FRA photo comments, SafeHub instance/response/media tables and the attachments bucket. The production catalog readback confirms the restrictive policies. The earlier broad multi-table client hierarchy migration remains rejected and superseded by the service-only store grant table.

The narrower per-store grants, server-side board filtering, and source policy closures were pushed to main at `03ec1c6`. Production SQL readback confirmed the five account roles/statuses and grant counts. A live sign-in as an Area Manager has not been performed because their credentials are held by those users.

Supabase Auth's invitation sender hit its email rate limit on the third invitation. Liam Harvey, Brett Llewellyn and Shaynul Uddin have not been invited or granted access. No manager account has access outside its reviewed area. The local invitation action was fixed to recognise the pending readonly profile automatically created by the auth trigger; the fix passed focused tests and needs a subsequent main push.

## Local checks

The isolated release branch passed TypeScript, production build, focused Vitest checks, and PGlite tests for the service-only store grant model and source read/write closure. The live local KSS board was visually checked against the 69 imported rows, store grouping, card modal, and issued PDF page link. Focused account lifecycle tests passed after the invitation fix. Authenticated manager UI readback remains outstanding.
