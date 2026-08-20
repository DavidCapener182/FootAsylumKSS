-- Remove the mandatory authenticator assurance requirement at the user's
-- request. Email/password authentication, trusted profiles, account lifecycle
-- status, role capabilities and row-level policies remain enforced.

COMMENT ON COLUMN public.fa_profiles.account_status IS
  'Only active accounts receive their assigned role through RLS helpers.';

CREATE OR REPLACE FUNCTION fa_private.get_user_role(user_id uuid)
RETURNS public.fa_user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN profile.account_status = 'active'::public.fa_account_status
      THEN profile.role
    ELSE 'pending'::public.fa_user_role
  END
  FROM public.fa_profiles AS profile
  WHERE profile.id = user_id;
$$;

REVOKE ALL ON FUNCTION fa_private.get_user_role(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA fa_private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fa_private.get_user_role(uuid) TO anon, authenticated, service_role;

-- Recreate the account-administration RPC without the AAL2 gate. It continues
-- to require an authenticated, active administrator; validates transitions;
-- protects the final active administrator; and records an accountable reason.
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

  -- This transaction-local setting is read by the profile guard trigger. It is
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

GRANT EXECUTE ON FUNCTION public.fa_admin_change_user_access(
  uuid,
  public.fa_user_role,
  public.fa_account_status,
  text
) TO authenticated;
