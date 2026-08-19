# Deployment schema contract

`npm run check:schema` is a read-only deployment gate. It compares the target
Supabase PostgreSQL database with every checked-in SQL migration and the critical
columns, functions, RLS policies, triggers, privileges, and storage buckets in
`config/schema-contract.json`.

The checker never applies migrations and never writes application data. It opens
a `READ ONLY` transaction, queries migration metadata and PostgreSQL catalogs,
checks `storage.buckets`, then rolls the transaction back.

## Required secret

Set `SUPABASE_SCHEMA_CONTRACT_DATABASE_URL` to a PostgreSQL connection URL for
the target Supabase project. The database role must be able to read:

- `supabase_migrations.schema_migrations`
- PostgreSQL `pg_catalog` and `information_schema`
- `storage.buckets`

Use the Supabase database connection secret, not the browser anon key or service
role API key. Require TLS in the URL (for example, `?sslmode=require`) and store
it as a protected GitHub Environment secret named
`SUPABASE_SCHEMA_CONTRACT_DATABASE_URL` in the `production` environment.

Run locally against an explicitly selected target:

```bash
SUPABASE_SCHEMA_CONTRACT_DATABASE_URL='postgresql://...' npm run check:schema
```

The reusable `.github/workflows/deployment-schema-contract.yml` workflow runs
the same gate manually or can be called by a deployment workflow. A deployment
workflow should depend on that job before publishing an application build. If
the target is behind, apply migrations through the separately approved database
release process, then rerun this check. Do not weaken the contract to make a
stale target pass.

Adding a `.sql` file to `supabase/migrations` automatically makes its version
required. Update `config/schema-contract.json` when a migration introduces a
new security-critical object or invariant.

## Browser-test credential boundary

The standard CI browser suite tests public sign-in, invitation-only access,
unauthenticated redirects, account-setup protection, and fail-closed kiosk UI.
It does not use or invent privileged production identities. Authenticated
business journeys require a separately provisioned non-production test project
and test accounts before they can become an honest deployment gate.

## Kiosk source throttling boundary

Vercel deployments derive the public kiosk source bucket from the platform-controlled
`x-vercel-forwarded-for` header. On any non-Vercel deployment, generic
`X-Forwarded-For` and `X-Real-IP` values are deliberately ignored because a client can
spoof them when an edge proxy does not overwrite them.

For a self-hosted deployment, configure `EMP_EVENT_DAY_TRUSTED_IP_HEADER` with the
lowercase name of a custom header that the edge proxy always removes from incoming
requests and replaces with the real client address. If this variable is absent, all
requests use one conservative shared source bucket; the separate credential-wide PIN
lockout still applies.
