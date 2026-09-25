# FRA Action Plans rollout status — 25 September 2026

Project: `fwnzpafwfaiynrclwtnh`. The user approved the production FRA action setup and main push, and requested local tests only. No paid staging branch was created.

## Applied and read back

- Base FRA action schema, historical PDF import support, confirmed publication action creation, and new role enum values.
- 69 action rows imported from byte-verified issued FRA PDFs across 25 stores. The live KSS board shows the imported rows grouped by store. These are initially in `open`/New status, as requested.
- A service-only per-user/per-store access table. It has **zero grants** and authenticated users cannot query it directly.
- Versioned action workflow functions; direct authenticated calls are denied and service-role calls are allowed. A private evidence bucket exists with a 10 MiB limit and JPEG, PNG, WebP and PDF types.
- No Area Manager or Client Admin account has been activated or invited. The three existing legacy `client` profiles remain unchanged.

## Remaining access gate

The old application has broader direct Data API and Server Action reads than the proposed Area Manager role should receive. A local RLS closure draft passed PGlite, but automatic approval review rejected applying it to production because it would remove anonymous and authenticated access from five existing H&S source tables and might disrupt other app features. The earlier broad client hierarchy migration was also rejected. Neither rejected migration has been retried or bypassed.

The narrower per-store grants and server-side board filtering are locally implemented. Manager/client account activation, evidence workflow verification as those roles, and production deployment are still pending a safe closure of the legacy read paths. Existing manager seed scripts remain inactive and have not been applied.

## Local checks

The isolated release branch passed TypeScript, production build, focused Vitest checks, and PGlite tests for the service-only store grant model and source-read closure. The live local KSS board was visually checked against the 69 imported rows. The client and manager workflow cannot be called live until role activation is safe.
