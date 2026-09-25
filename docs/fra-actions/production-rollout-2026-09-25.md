# FRA Action Plans rollout status — 25 September 2026

Project: `fwnzpafwfaiynrclwtnh`. The user approved the production FRA action setup and main push, and requested local tests only. No paid staging branch was created.

## Applied and read back

- Base FRA action schema, historical PDF import support, confirmed publication action creation, and new role enum values.
- 69 action rows imported from byte-verified issued FRA PDFs across 25 stores. The live KSS board shows the imported rows grouped by store. These are initially in `open`/New status, as requested.
- A service-only per-user/per-store access table. It has 144 inactive Client Admin grants for Hannah and Toni across the 72 reviewed stores. Authenticated users cannot query it directly.
- Versioned action workflow functions; direct authenticated calls are denied and service-role calls are allowed. A private evidence bucket exists with a 10 MiB limit and JPEG, PNG, WebP and PDF types.
- No Area Manager or Client Admin account has been activated or invited. The three existing legacy `client` profiles remain unchanged.

## Remaining access gate

After the user explicitly approved the impact, the restrictive read policy was applied to five H&S/FRA source tables and the KSS-only operational write policy was applied to FRA photo comments, SafeHub instance/response/media tables and the attachments bucket. The production catalog readback confirms the restrictive policies. The earlier broad multi-table client hierarchy migration remains rejected and superseded by the service-only store grant table.

The narrower per-store grants and server-side board filtering have been pushed to main at `1d8e85f`; direct authenticated manager/client readback is pending because no such accounts are active. Manager invitations and manager store grants have not been applied. Hannah and Toni remain on the old active `client` role; their new grants are inactive. The client/admin role changes must use the existing authenticated admin lifecycle flow.

## Local checks

The isolated release branch passed TypeScript, production build, focused Vitest checks, and PGlite tests for the service-only store grant model and source-read closure. The live local KSS board was visually checked against the 69 imported rows. The client and manager workflow cannot be called live until role activation and authenticated scope tests are complete.
