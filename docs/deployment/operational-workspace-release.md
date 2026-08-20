# Operational workspace release

## What changes

- Mobile Today becomes the field-first home on small screens.
- Incident capture is a ten-step, device-drafted workflow. Final incident submission still requires connectivity.
- SafeHub has stable routes for templates, builder, conduct, active work, review, insights and imports.
- Audit responses and Event Control log entries retain local drafts. Event Control submissions can queue offline and are idempotent when retried.
- Actions gain named work queues and blocker, evidence, verification, recurrence and dependency fields.
- Reports gain a catalogue and immutable generation metadata.
- EMP and CMP share completeness, review, approval, publication, archive, comment and version controls.

## Deployment order

1. Run the complete unit, security, type, lint, bundle and production-build gates.
2. Apply `20260820094619_add_operational_workspace_models.sql`, `20260820094712_harden_operational_workspace_privileges.sql`, then `20260820094848_index_operational_workspace_foreign_keys.sql`.
3. Run `npm run check:schema` against the connected project.
4. Deploy the matching application commit.
5. Verify an admin and an ops session, a mobile draft/recovery path, a report generation record, and an EMP/CMP lifecycle transition.

## Rollback boundary

The migration is additive. If the application must be rolled back, leave the new tables and columns in place; the previous application does not depend on them. Do not drop report history or plan snapshots during an application rollback.

Legacy public event-day kiosk links were revoked by the earlier kiosk hardening migration. Regenerate only the exact event links that are operationally required and distribute the new PIN separately.
