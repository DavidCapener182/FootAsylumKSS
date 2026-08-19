import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const enumMigration = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260819231014_extend_audit_and_user_enums.sql'),
  'utf8'
)

const integrityMigration = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260819231032_harden_fa_activity_log_integrity.sql'),
  'utf8'
)

describe('audit-log integrity migrations', () => {
  it('reproduces the pending role and user audit entity enums before use', () => {
    expect(enumMigration).toMatch(/ALTER TYPE public\.fa_user_role[\s\S]*'pending'/)
    expect(enumMigration).toMatch(/ALTER TYPE public\.fa_entity_type[\s\S]*'user'/)
  })

  it('backfills trusted provenance before enforcing non-null columns', () => {
    expect(integrityMigration).toContain("SET source = 'legacy'")
    expect(integrityMigration).toContain('SET correlation_id = pg_catalog.gen_random_uuid()')
    expect(integrityMigration).toMatch(/ALTER COLUMN source SET NOT NULL/)
    expect(integrityMigration).toMatch(/ALTER COLUMN correlation_id SET NOT NULL/)
  })

  it('removes direct client writes while preserving the existing SELECT policy', () => {
    expect(integrityMigration).toContain('DROP POLICY IF EXISTS "System can insert activity logs"')
    expect(integrityMigration).toMatch(
      /REVOKE INSERT, UPDATE, DELETE, TRUNCATE[\s\S]*FROM PUBLIC, anon, authenticated/
    )
    expect(integrityMigration).not.toMatch(/DROP POLICY IF EXISTS "Users can view activity logs"/)
    expect(integrityMigration).toMatch(
      /GRANT INSERT[\s\S]*ON TABLE public\.fa_activity_log[\s\S]*TO service_role/
    )
  })

  it('enforces append-only rows and uses qualified security-definer trigger writes', () => {
    expect(integrityMigration).toMatch(
      /CREATE TRIGGER fa_activity_log_append_only[\s\S]*BEFORE UPDATE OR DELETE/
    )
    expect(integrityMigration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.fa_log_activity\(\)[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = ''/
    )
    expect(integrityMigration).toContain("'database_trigger'")
    expect(integrityMigration).toContain("IF actor_id IS NULL THEN")
  })

  it('records redacted field-level entity diffs instead of permanent full-row copies', () => {
    const entityFunction = integrityMigration.split(
      'CREATE OR REPLACE FUNCTION public.fa_log_activity()'
    )[1]?.split('CREATE OR REPLACE FUNCTION public.fa_log_profile_security_change()')[0] || ''

    expect(entityFunction).toContain('value_allowlist := ARRAY[')
    expect(entityFunction).toContain("'changed_fields', pg_catalog.to_jsonb(changed_fields)")
    expect(entityFunction).toContain('FROM pg_catalog.unnest(changed_fields) AS changed(field_name)')
    expect(entityFunction).toContain('WHERE field_name = ANY(value_allowlist)')
    expect(entityFunction).toContain("'compliance_audit_2_date'")
    expect(entityFunction).toContain("'fire_risk_assessment_date'")

    // Sensitive narrative, people, location, contact, and document values must
    // not be placed in any entity value allowlist.
    for (const sensitiveField of [
      'summary',
      'description',
      'persons_involved',
      'injury_details',
      'witnesses',
      'closure_summary',
      'root_cause',
      'findings',
      'recommendations',
      'completion_notes',
      'address_line_1',
      'postcode',
      'reporting_area_manager_email',
      'compliance_audit_1_pdf_path',
      'compliance_audit_2_pdf_path',
      'fire_risk_assessment_pdf_path',
    ]) {
      expect(entityFunction).not.toMatch(new RegExp(`'${sensitiveField}'`))
    }

    expect(entityFunction).not.toContain("jsonb_build_object('old', raw_old_data")
    expect(entityFunction).not.toContain("jsonb_build_object('old', pg_catalog.to_jsonb(OLD)")
  })

  it('captures profile role, future account-status, and deletion security changes', () => {
    const profileFunction = integrityMigration.split(
      'CREATE OR REPLACE FUNCTION public.fa_log_profile_security_change()'
    )[1] || ''

    expect(profileFunction).toContain("old_data -> 'role'")
    expect(profileFunction).toContain("old_data -> 'account_status'")
    expect(profileFunction).toContain("action_text := 'Changed user role'")
    expect(profileFunction).toContain("action_text := 'Deleted user profile'")
    expect(profileFunction).toContain("'user'::public.fa_entity_type")
    expect(profileFunction).toContain("'profile_trigger'")
    expect(profileFunction).toContain("jsonb_build_object('changes', changes)")
    expect(profileFunction).not.toContain("'old', old_data,\n      'new', new_data")
    expect(profileFunction).toContain('pg_catalog.statement_timestamp()')
    expect(integrityMigration).toMatch(
      /CREATE TRIGGER fa_profiles_security_activity_log[\s\S]*AFTER UPDATE OR DELETE/
    )
  })
})
