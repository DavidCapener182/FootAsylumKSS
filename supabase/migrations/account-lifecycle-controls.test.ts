import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260819231543_add_account_lifecycle_controls.sql'),
  'utf8'
)

describe('account lifecycle migration', () => {
  it('uses explicit statement terminators for PL/pgSQL function bodies', () => {
    for (const functionName of [
      'fa_guard_profile_security_mutation',
      'fa_admin_change_user_access',
    ]) {
      const functionStart = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${functionName}`)
      const bodyStart = migration.indexOf('AS $function$', functionStart)
      const bodyEnd = migration.indexOf('$function$;', bodyStart + 1)
      const body = migration.slice(bodyStart + 'AS $function$'.length, bodyEnd).trim()

      expect(functionStart).toBeGreaterThan(-1)
      expect(bodyStart).toBeGreaterThan(functionStart)
      expect(bodyEnd).toBeGreaterThan(bodyStart)
      expect(body).toMatch(/END;$/)
    }
  })

  it('preserves profiles while introducing every lifecycle state', () => {
    expect(migration).toContain('CREATE TYPE public.fa_account_status')
    for (const status of ['invited', 'pending', 'active', 'suspended', 'deactivated']) {
      expect(migration).toContain(`'${status}'`)
    }
    expect(migration).toContain('ADD COLUMN account_status')
    expect(migration).toContain(
      "ALTER COLUMN account_status SET DEFAULT 'pending'::public.fa_account_status"
    )
    expect(migration).toContain('DISABLE TRIGGER fa_profiles_security_activity_log')
    expect(migration).toContain('ENABLE TRIGGER fa_profiles_security_activity_log')
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.fa_profiles/i)
  })

  it('makes RLS role resolution fail closed for non-active accounts', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION fa_private.get_user_role')
    expect(migration).toContain("profile.account_status = 'active'::public.fa_account_status")
    expect(migration).toContain("ELSE 'pending'::public.fa_user_role")
    expect(migration).toContain('REVOKE EXECUTE ON FUNCTION public.fa_get_user_role(uuid) FROM authenticated')
  })

  it('requires AAL2 for admin and operations roles at the direct RLS boundary', () => {
    const privateHelper = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION fa_private.get_user_role'),
      migration.indexOf('REVOKE ALL ON FUNCTION fa_private.get_user_role')
    )
    expect(privateHelper).toContain("'admin'::public.fa_user_role")
    expect(privateHelper).toContain("'ops'::public.fa_user_role")
    expect(privateHelper).toContain("COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2'")
    expect(privateHelper).toContain("ELSE 'pending'::public.fa_user_role")
  })

  it('serializes role/status changes and protects the final active administrator', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.fa_admin_change_user_access')
    expect(migration).toContain('LOCK TABLE public.fa_profiles IN SHARE ROW EXCLUSIVE MODE')
    expect(migration).toContain("actor_profile.account_status <> 'active'::public.fa_account_status")
    expect(migration).toContain("profile.id <> target_profile.id")
    expect(migration).toContain("profile.role = 'admin'::public.fa_user_role")
    expect(migration).toContain("profile.account_status = 'active'::public.fa_account_status")
    expect(migration).toContain('The final active administrator cannot be demoted, suspended, or deactivated')
  })

  it('parenthesizes the SQL transition CASE so PL/pgSQL does not parse it as a CASE statement', () => {
    expect(migration).toMatch(
      /IF NOT \(\s*CASE target_profile\.account_status[\s\S]*?ELSE FALSE\s*END\s*\) THEN/
    )
  })

  it('requires a trusted authenticated actor and a bounded reason', () => {
    expect(migration).toContain('actor_id uuid := auth.uid()')
    expect(migration).toContain('Only an active administrator can change account access')
    expect(migration).toContain('A reason between 3 and 500 characters is required')
    expect(migration).toContain('status_changed_by_user_id = actor_id')
    expect(migration).toContain('status_change_reason = normalized_reason')
    expect(migration).toContain("COALESCE(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'")
    expect(migration).toContain('Multi-factor authentication is required for account administration')
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.fa_admin_change_user_access[\s\S]*FROM PUBLIC, anon, authenticated, service_role/)
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.fa_admin_change_user_access[\s\S]*TO authenticated/)
  })

  it('blocks direct profile insertion, deletion, and security-field updates', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Admin full access to profiles"')
    expect(migration).toMatch(
      /CREATE POLICY "Active admins can update profiles"[\s\S]*FOR UPDATE[\s\S]*TO authenticated/
    )
    expect(migration).toMatch(
      /REVOKE INSERT, DELETE[\s\S]*ON TABLE public\.fa_profiles[\s\S]*FROM PUBLIC, anon, authenticated/
    )
    const profileWriteRevoke = migration.match(
      /REVOKE INSERT, DELETE[\s\S]*?ON TABLE public\.fa_profiles[\s\S]*?;/
    )?.[0]
    expect(profileWriteRevoke).toBeDefined()
    expect(profileWriteRevoke).not.toContain('service_role')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.fa_guard_profile_security_mutation')
    expect(migration).toMatch(
      /CREATE TRIGGER fa_profiles_guard_security_mutation[\s\S]*BEFORE UPDATE OR DELETE ON public\.fa_profiles/
    )
    expect(migration).toContain('User profiles cannot be deleted; deactivate the account instead')
    for (const field of [
      'OLD.id IS DISTINCT FROM NEW.id',
      'OLD.role IS DISTINCT FROM NEW.role',
      'OLD.account_status IS DISTINCT FROM NEW.account_status',
      'OLD.status_changed_at IS DISTINCT FROM NEW.status_changed_at',
      'OLD.status_changed_by_user_id IS DISTINCT FROM NEW.status_changed_by_user_id',
      'OLD.status_change_reason IS DISTINCT FROM NEW.status_change_reason',
    ]) {
      expect(migration).toContain(field)
    }
  })

  it('opens the profile-security guard only inside the validated RPC update', () => {
    const guardTriggerIndex = migration.indexOf('CREATE TRIGGER fa_profiles_guard_security_mutation')
    const legacyBackfillIndex = migration.indexOf('UPDATE public.fa_profiles\nSET account_status')
    expect(legacyBackfillIndex).toBeGreaterThan(-1)
    expect(guardTriggerIndex).toBeGreaterThan(legacyBackfillIndex)

    expect(migration).toContain(
      "pg_catalog.current_setting('fa.profile_security_change_authorized', true)"
    )
    expect(migration).toMatch(
      /final active administrator cannot be demoted, suspended, or deactivated'[\s\S]*pg_catalog\.set_config\([\s\S]*'fa\.profile_security_change_authorized',[\s\S]*'on',[\s\S]*true[\s\S]*\);[\s\S]*UPDATE public\.fa_profiles/
    )
    expect(migration).toMatch(
      /UPDATE public\.fa_profiles[\s\S]*pg_catalog\.set_config\([\s\S]*'fa\.profile_security_change_authorized',[\s\S]*'off'/
    )
  })

  it('replaces every legacy direct-role claims and feedback policy', () => {
    const policyNames = [
      'Admin full access to claims',
      'Ops can manage claims',
      'Readonly can view claims',
      'Client can view claims',
      'Admins can insert releases',
      'Admins can update releases',
      'Admins can delete releases',
      'Users can read own feedback',
      'Admins can update feedback',
      'Admins can delete feedback',
    ]

    for (const policyName of policyNames) {
      expect(migration).toContain(`DROP POLICY IF EXISTS "${policyName}"`)
      expect(migration).toContain(`CREATE POLICY "${policyName}"`)
    }

    const repairedPolicies = migration.slice(
      migration.indexOf('-- Repair the remaining legacy policies'),
      migration.indexOf('-- The original schema\'s `FOR ALL` admin policy')
    )
    expect(repairedPolicies).toContain('fa_private.get_user_role(auth.uid())')
    expect(repairedPolicies).toContain('ON public.fa_release_notes')
    expect(repairedPolicies).toContain('ON public.fa_user_feedback')
    expect(repairedPolicies).toContain('ON public.tfs_audit_log')
    for (const deployedPolicyName of [
      'admin_insert_releases',
      'admin_update_releases',
      'admin_delete_releases',
      'user_read_feedback',
      'admin_update_feedback',
      'admin_delete_feedback',
      'tfs_audit_log_select_admin_ops',
    ]) {
      expect(repairedPolicies).toContain(`DROP POLICY IF EXISTS ${deployedPolicyName}`)
    }
    expect(repairedPolicies).not.toMatch(/ON\s+public\.release_notes\b/)
    expect(repairedPolicies).not.toMatch(/ON\s+public\.user_feedback\b/)
    expect(repairedPolicies).not.toMatch(/FROM\s+(?:public\.)?fa_profiles/i)
    expect(repairedPolicies).not.toMatch(/fa_profiles\.role/i)
  })

  it('removes broad incident and action policies in favor of lifecycle-aware role policies', () => {
    for (const [table, legacyPolicy] of [
      ['fa_incidents', 'Authenticated users can manage incidents'],
      ['fa_actions', 'Authenticated users can manage actions'],
      ['fa_closed_incidents', 'Authenticated users can manage closed incidents'],
    ]) {
      expect(migration).toContain(`DROP POLICY IF EXISTS "${legacyPolicy}"`)
      expect(migration).toMatch(
        new RegExp(
          `CREATE POLICY "Admin and ops can manage [^"]+"[\\s\\S]*?ON public\\.${table}[\\s\\S]*?fa_private\\.get_user_role\\(auth\\.uid\\(\\)\\)`,
          'm'
        )
      )
    }

    expect(migration).toContain('CREATE POLICY "Readonly can view incidents"')
    expect(migration).toContain('CREATE POLICY "Readonly can view actions"')
    expect(migration).toContain('CREATE POLICY "Readonly can view closed incidents"')
    expect(migration).toContain('CREATE POLICY "Client can view closed incidents"')
  })
})
