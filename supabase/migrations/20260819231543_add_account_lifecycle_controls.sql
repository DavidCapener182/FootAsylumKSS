-- Add an explicit application-account lifecycle without deleting identity or
-- ownership records. Non-active accounts and AAL1 admin/ops sessions resolve
-- to the non-privileged `pending` role inside every RLS policy that uses the
-- shared role helper.

CREATE TYPE public.fa_account_status AS ENUM (
  'invited',
  'pending',
  'active',
  'suspended',
  'deactivated'
);

ALTER TABLE public.fa_profiles
  ADD COLUMN account_status public.fa_account_status NOT NULL DEFAULT 'active',
  ADD COLUMN status_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN status_changed_by_user_id uuid REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  ADD COLUMN status_change_reason text;

-- The preceding audit migration correctly rejects actor-less runtime security
-- changes. This one-time deterministic backfill has no human actor, so disable
-- only that trigger for the statement and restore it immediately.
ALTER TABLE public.fa_profiles DISABLE TRIGGER fa_profiles_security_activity_log;

UPDATE public.fa_profiles
SET account_status = 'pending',
    status_changed_at = now(),
    status_change_reason = 'Migrated from the legacy pending role'
WHERE role = 'pending'::public.fa_user_role;

ALTER TABLE public.fa_profiles ENABLE TRIGGER fa_profiles_security_activity_log;

-- Existing profiles were intentionally backfilled as active above. Every
-- future insert that omits trusted lifecycle input must instead fail closed.
ALTER TABLE public.fa_profiles
  ALTER COLUMN account_status SET DEFAULT 'pending'::public.fa_account_status;

ALTER TABLE public.fa_profiles
  ADD CONSTRAINT fa_profiles_status_change_reason_length
  CHECK (status_change_reason IS NULL OR char_length(status_change_reason) <= 500);

CREATE INDEX fa_profiles_account_status_idx
  ON public.fa_profiles (account_status);

COMMENT ON COLUMN public.fa_profiles.account_status IS
  'Only active accounts receive their assigned role through RLS helpers; admin and ops also require AAL2.';
COMMENT ON COLUMN public.fa_profiles.status_changed_by_user_id IS
  'Administrator responsible for the most recent role or lifecycle change; null only for legacy migration state.';
COMMENT ON COLUMN public.fa_profiles.status_change_reason IS
  'Required administrator-supplied reason for the most recent role or lifecycle change.';

CREATE OR REPLACE FUNCTION fa_private.get_user_role(user_id uuid)
RETURNS public.fa_user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN profile.account_status = 'active'::public.fa_account_status
      AND (
        profile.role NOT IN (
          'admin'::public.fa_user_role,
          'ops'::public.fa_user_role
        )
        OR COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      )
      THEN profile.role
    ELSE 'pending'::public.fa_user_role
  END
  FROM public.fa_profiles AS profile
  WHERE profile.id = user_id;
$$;

REVOKE ALL ON FUNCTION fa_private.get_user_role(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA fa_private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fa_private.get_user_role(uuid) TO anon, authenticated, service_role;

-- Keep the locked-down legacy helper status-aware for old database objects
-- that still reference it. API-facing roles retain no EXECUTE permission.
CREATE OR REPLACE FUNCTION public.fa_get_user_role(user_id uuid)
RETURNS public.fa_user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN profile.account_status = 'active'::public.fa_account_status THEN profile.role
    ELSE 'pending'::public.fa_user_role
  END
  FROM public.fa_profiles AS profile
  WHERE profile.id = user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.fa_get_user_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fa_get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fa_get_user_role(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fa_get_user_role(uuid) TO service_role;

-- Repair the remaining legacy policies that read the profile role directly.
-- Every role decision must pass through the status-aware private helper so a
-- suspended or deactivated Auth session cannot retain direct PostgREST access.
DROP POLICY IF EXISTS "Admin full access to claims"
  ON public.fa_claims;
CREATE POLICY "Admin full access to claims"
  ON public.fa_claims
  FOR ALL
  TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role)
  WITH CHECK (fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role);

DROP POLICY IF EXISTS "Ops can manage claims"
  ON public.fa_claims;
CREATE POLICY "Ops can manage claims"
  ON public.fa_claims
  FOR ALL
  TO authenticated
  USING (
    fa_private.get_user_role(auth.uid()) IN (
      'admin'::public.fa_user_role,
      'ops'::public.fa_user_role
    )
  )
  WITH CHECK (
    fa_private.get_user_role(auth.uid()) IN (
      'admin'::public.fa_user_role,
      'ops'::public.fa_user_role
    )
  );

DROP POLICY IF EXISTS "Readonly can view claims"
  ON public.fa_claims;
CREATE POLICY "Readonly can view claims"
  ON public.fa_claims
  FOR SELECT
  TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'readonly'::public.fa_user_role);

DROP POLICY IF EXISTS "Client can view claims"
  ON public.fa_claims;
CREATE POLICY "Client can view claims"
  ON public.fa_claims
  FOR SELECT
  TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'client'::public.fa_user_role);

-- Remove legacy catch-all policies that granted every authenticated account
-- full incident/action access. Permissive RLS policies combine with OR, so
-- leaving any one of these in place would bypass lifecycle and MFA checks.
DROP POLICY IF EXISTS "Authenticated users can manage incidents"
  ON public.fa_incidents;
DROP POLICY IF EXISTS "Admin and ops can manage incidents"
  ON public.fa_incidents;
CREATE POLICY "Admin and ops can manage incidents"
  ON public.fa_incidents
  FOR ALL
  TO authenticated
  USING (
    fa_private.get_user_role(auth.uid()) IN (
      'admin'::public.fa_user_role,
      'ops'::public.fa_user_role
    )
  )
  WITH CHECK (
    fa_private.get_user_role(auth.uid()) IN (
      'admin'::public.fa_user_role,
      'ops'::public.fa_user_role
    )
  );

DROP POLICY IF EXISTS "Readonly can view incidents"
  ON public.fa_incidents;
CREATE POLICY "Readonly can view incidents"
  ON public.fa_incidents
  FOR SELECT
  TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'readonly'::public.fa_user_role);

DROP POLICY IF EXISTS "Authenticated users can manage actions"
  ON public.fa_actions;
DROP POLICY IF EXISTS "Admin and ops can manage actions"
  ON public.fa_actions;
CREATE POLICY "Admin and ops can manage actions"
  ON public.fa_actions
  FOR ALL
  TO authenticated
  USING (
    fa_private.get_user_role(auth.uid()) IN (
      'admin'::public.fa_user_role,
      'ops'::public.fa_user_role
    )
  )
  WITH CHECK (
    fa_private.get_user_role(auth.uid()) IN (
      'admin'::public.fa_user_role,
      'ops'::public.fa_user_role
    )
  );

DROP POLICY IF EXISTS "Readonly can view actions"
  ON public.fa_actions;
CREATE POLICY "Readonly can view actions"
  ON public.fa_actions
  FOR SELECT
  TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'readonly'::public.fa_user_role);

DROP POLICY IF EXISTS "Authenticated users can manage closed incidents"
  ON public.fa_closed_incidents;
DROP POLICY IF EXISTS "Admin and ops can manage closed incidents"
  ON public.fa_closed_incidents;
CREATE POLICY "Admin and ops can manage closed incidents"
  ON public.fa_closed_incidents
  FOR ALL
  TO authenticated
  USING (
    fa_private.get_user_role(auth.uid()) IN (
      'admin'::public.fa_user_role,
      'ops'::public.fa_user_role
    )
  )
  WITH CHECK (
    fa_private.get_user_role(auth.uid()) IN (
      'admin'::public.fa_user_role,
      'ops'::public.fa_user_role
    )
  );

DROP POLICY IF EXISTS "Readonly can view closed incidents"
  ON public.fa_closed_incidents;
CREATE POLICY "Readonly can view closed incidents"
  ON public.fa_closed_incidents
  FOR SELECT
  TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'readonly'::public.fa_user_role);

DROP POLICY IF EXISTS "Client can view closed incidents"
  ON public.fa_closed_incidents;
CREATE POLICY "Client can view closed incidents"
  ON public.fa_closed_incidents
  FOR SELECT
  TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'client'::public.fa_user_role);

DROP POLICY IF EXISTS "Admins can insert releases"
  ON public.fa_release_notes;
DROP POLICY IF EXISTS admin_insert_releases
  ON public.fa_release_notes;
CREATE POLICY "Admins can insert releases"
  ON public.fa_release_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role);

DROP POLICY IF EXISTS "Admins can update releases"
  ON public.fa_release_notes;
DROP POLICY IF EXISTS admin_update_releases
  ON public.fa_release_notes;
CREATE POLICY "Admins can update releases"
  ON public.fa_release_notes
  FOR UPDATE
  TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role)
  WITH CHECK (fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role);

DROP POLICY IF EXISTS "Admins can delete releases"
  ON public.fa_release_notes;
DROP POLICY IF EXISTS admin_delete_releases
  ON public.fa_release_notes;
CREATE POLICY "Admins can delete releases"
  ON public.fa_release_notes
  FOR DELETE
  TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role);

DROP POLICY IF EXISTS "Users can read own feedback"
  ON public.fa_user_feedback;
DROP POLICY IF EXISTS user_read_feedback
  ON public.fa_user_feedback;
CREATE POLICY "Users can read own feedback"
  ON public.fa_user_feedback
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role
  );

DROP POLICY IF EXISTS "Admins can update feedback"
  ON public.fa_user_feedback;
DROP POLICY IF EXISTS admin_update_feedback
  ON public.fa_user_feedback;
CREATE POLICY "Admins can update feedback"
  ON public.fa_user_feedback
  FOR UPDATE
  TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role)
  WITH CHECK (fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role);

DROP POLICY IF EXISTS "Admins can delete feedback"
  ON public.fa_user_feedback;
DROP POLICY IF EXISTS admin_delete_feedback
  ON public.fa_user_feedback;
CREATE POLICY "Admins can delete feedback"
  ON public.fa_user_feedback
  FOR DELETE
  TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role);

DROP POLICY IF EXISTS tfs_audit_log_select_admin_ops
  ON public.tfs_audit_log;
CREATE POLICY tfs_audit_log_select_admin_ops
  ON public.tfs_audit_log
  FOR SELECT
  TO authenticated
  USING (
    fa_private.get_user_role(auth.uid()) IN (
      'admin'::public.fa_user_role,
      'ops'::public.fa_user_role
    )
  );

-- The original schema's `FOR ALL` admin policy allowed direct PostgREST
-- INSERT/UPDATE/DELETE operations on profiles. Keep ordinary administrator
-- profile edits (for example route-planning home fields), but require the
-- validated RPC below for every role/lifecycle mutation and reserve profile
-- creation for trusted service-role invitation provisioning.
DROP POLICY IF EXISTS "Admin full access to profiles"
  ON public.fa_profiles;

DROP POLICY IF EXISTS "Active admins can update profiles"
  ON public.fa_profiles;

CREATE POLICY "Active admins can update profiles"
  ON public.fa_profiles
  FOR UPDATE
  TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role)
  WITH CHECK (fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role);

REVOKE INSERT, DELETE
  ON TABLE public.fa_profiles
  FROM PUBLIC, anon, authenticated;

-- Defense in depth for callers with UPDATE privileges. A direct update may
-- still edit non-security profile fields, but identity, role and lifecycle
-- fields can change only while the validated RPC has enabled its local flag.
-- Runtime profile deletion is forbidden even for privileged API roles.
CREATE OR REPLACE FUNCTION public.fa_guard_profile_security_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  security_change_authorized boolean :=
    COALESCE(
      pg_catalog.current_setting('fa.profile_security_change_authorized', true),
      'off'
    ) = 'on';
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'User profiles cannot be deleted; deactivate the account instead'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.role IS DISTINCT FROM NEW.role
     OR OLD.account_status IS DISTINCT FROM NEW.account_status
     OR OLD.status_changed_at IS DISTINCT FROM NEW.status_changed_at
     OR OLD.status_changed_by_user_id IS DISTINCT FROM NEW.status_changed_by_user_id
     OR OLD.status_change_reason IS DISTINCT FROM NEW.status_change_reason THEN
    IF NOT security_change_authorized THEN
      RAISE EXCEPTION 'Role and account lifecycle changes must use fa_admin_change_user_access'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.fa_guard_profile_security_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS fa_profiles_guard_security_mutation
  ON public.fa_profiles;

CREATE TRIGGER fa_profiles_guard_security_mutation
  BEFORE UPDATE OR DELETE ON public.fa_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fa_guard_profile_security_mutation();

-- All application role/lifecycle mutations flow through one serialized
-- boundary. The table lock makes the final-active-admin check stable across
-- concurrent application calls; auth.uid() and the active-admin lookup prevent
-- callers from supplying or impersonating the audit actor.
CREATE OR REPLACE FUNCTION public.fa_admin_change_user_access(
  p_target_user_id uuid,
  p_new_role public.fa_user_role,
  p_new_account_status public.fa_account_status,
  p_reason text
)
RETURNS TABLE (
  id uuid,
  role public.fa_user_role,
  account_status public.fa_account_status,
  status_changed_at timestamptz,
  status_changed_by_user_id uuid,
  status_change_reason text,
  previous_role public.fa_user_role,
  previous_account_status public.fa_account_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor_id uuid := auth.uid();
  actor_profile public.fa_profiles%ROWTYPE;
  target_profile public.fa_profiles%ROWTYPE;
  effective_role public.fa_user_role;
  effective_status public.fa_account_status;
  normalized_reason text := pg_catalog.btrim(p_reason);
  other_active_admins integer;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for account administration'
      USING ERRCODE = '42501';
  END IF;

  -- This SECURITY DEFINER RPC bypasses table RLS, so it must enforce MFA
  -- independently of the private role helper used by ordinary policies.
  IF COALESCE(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'Multi-factor authentication is required for account administration'
      USING ERRCODE = '42501';
  END IF;

  IF normalized_reason IS NULL
     OR pg_catalog.char_length(normalized_reason) < 3
     OR pg_catalog.char_length(normalized_reason) > 500 THEN
    RAISE EXCEPTION 'A reason between 3 and 500 characters is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user is required'
      USING ERRCODE = '22023';
  END IF;

  -- SHARE ROW EXCLUSIVE conflicts with itself and ordinary row writes, so two
  -- admin lifecycle calls cannot both observe the same final-admin count.
  LOCK TABLE public.fa_profiles IN SHARE ROW EXCLUSIVE MODE;

  SELECT profile.*
  INTO actor_profile
  FROM public.fa_profiles AS profile
  WHERE profile.id = actor_id;

  IF NOT FOUND
     OR actor_profile.role <> 'admin'::public.fa_user_role
     OR actor_profile.account_status <> 'active'::public.fa_account_status THEN
    RAISE EXCEPTION 'Only an active administrator can change account access'
      USING ERRCODE = '42501';
  END IF;

  SELECT profile.*
  INTO target_profile
  FROM public.fa_profiles AS profile
  WHERE profile.id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target account profile was not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_new_role = 'pending'::public.fa_user_role THEN
    RAISE EXCEPTION 'Pending access must be represented by account_status, not an assigned role'
      USING ERRCODE = '22023';
  END IF;

  effective_role := COALESCE(p_new_role, target_profile.role);
  effective_status := COALESCE(p_new_account_status, target_profile.account_status);

  -- Choosing an approved role is the explicit approval step for invited and
  -- pending accounts. Suspended/deactivated accounts require a separate
  -- reactivation status action and are never reactivated by a role edit.
  IF p_new_role IS NOT NULL
     AND p_new_account_status IS NULL
     AND target_profile.account_status IN (
       'invited'::public.fa_account_status,
       'pending'::public.fa_account_status
     ) THEN
    effective_status := 'active'::public.fa_account_status;
  END IF;

  IF effective_status IS DISTINCT FROM target_profile.account_status THEN
    IF NOT (
      CASE target_profile.account_status
        WHEN 'invited'::public.fa_account_status THEN
          effective_status IN (
            'pending'::public.fa_account_status,
            'active'::public.fa_account_status,
            'deactivated'::public.fa_account_status
          )
        WHEN 'pending'::public.fa_account_status THEN
          effective_status IN (
            'active'::public.fa_account_status,
            'deactivated'::public.fa_account_status
          )
        WHEN 'active'::public.fa_account_status THEN
          effective_status IN (
            'suspended'::public.fa_account_status,
            'deactivated'::public.fa_account_status
          )
        WHEN 'suspended'::public.fa_account_status THEN
          effective_status IN (
            'active'::public.fa_account_status,
            'deactivated'::public.fa_account_status
          )
        WHEN 'deactivated'::public.fa_account_status THEN
          effective_status = 'active'::public.fa_account_status
        ELSE FALSE
      END
    ) THEN
      RAISE EXCEPTION 'Invalid account status transition from % to %',
        target_profile.account_status, effective_status
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF effective_role IS NOT DISTINCT FROM target_profile.role
     AND effective_status IS NOT DISTINCT FROM target_profile.account_status THEN
    RAISE EXCEPTION 'The requested role and account status are already applied'
      USING ERRCODE = '22023';
  END IF;

  -- This covers self-demotion/deactivation and changes made to another admin.
  -- An active admin may lose admin access only while another active admin exists.
  IF target_profile.role = 'admin'::public.fa_user_role
     AND target_profile.account_status = 'active'::public.fa_account_status
     AND (
       effective_role <> 'admin'::public.fa_user_role
       OR effective_status <> 'active'::public.fa_account_status
     ) THEN
    SELECT pg_catalog.count(*)::integer
    INTO other_active_admins
    FROM public.fa_profiles AS profile
    WHERE profile.id <> target_profile.id
      AND profile.role = 'admin'::public.fa_user_role
      AND profile.account_status = 'active'::public.fa_account_status;

    IF other_active_admins < 1 THEN
      RAISE EXCEPTION 'The final active administrator cannot be demoted, suspended, or deactivated'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- This transaction-local setting is read by the BEFORE trigger above. It is
  -- enabled only after every actor, transition and final-admin check succeeds.
  PERFORM pg_catalog.set_config(
    'fa.profile_security_change_authorized',
    'on',
    true
  );

  UPDATE public.fa_profiles AS profile
  SET role = effective_role,
      account_status = effective_status,
      status_changed_at = pg_catalog.now(),
      status_changed_by_user_id = actor_id,
      status_change_reason = normalized_reason
  WHERE profile.id = target_profile.id;

  PERFORM pg_catalog.set_config(
    'fa.profile_security_change_authorized',
    'off',
    true
  );

  RETURN QUERY
  SELECT profile.id,
         profile.role,
         profile.account_status,
         profile.status_changed_at,
         profile.status_changed_by_user_id,
         profile.status_change_reason,
         target_profile.role,
         target_profile.account_status
  FROM public.fa_profiles AS profile
  WHERE profile.id = target_profile.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.fa_admin_change_user_access(
  uuid,
  public.fa_user_role,
  public.fa_account_status,
  text
) FROM PUBLIC, anon, authenticated, service_role;

-- The function still performs its own active-admin check. Granting only the
-- authenticated API role preserves auth.uid() for authorization and auditing.
GRANT EXECUTE ON FUNCTION public.fa_admin_change_user_access(
  uuid,
  public.fa_user_role,
  public.fa_account_status,
  text
) TO authenticated;
