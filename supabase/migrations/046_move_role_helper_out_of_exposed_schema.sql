-- Move the role lookup used by RLS out of the exposed public API schema.
--
-- Supabase exposes public SECURITY DEFINER functions as RPC endpoints when
-- client roles can execute them. RLS policies still need a definer helper to
-- read fa_profiles safely, so policies are rewritten to use fa_private.

CREATE SCHEMA IF NOT EXISTS fa_private;

REVOKE ALL ON SCHEMA fa_private FROM PUBLIC;

CREATE OR REPLACE FUNCTION fa_private.get_user_role(user_id uuid)
RETURNS public.fa_user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.fa_profiles WHERE id = user_id;
$$;

REVOKE ALL ON FUNCTION fa_private.get_user_role(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA fa_private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fa_private.get_user_role(uuid) TO anon, authenticated, service_role;

-- Rewrite all existing policies that referenced the exposed public helper.
DO $$
DECLARE
  pol record;
  role_sql text;
  using_sql text;
  check_sql text;
BEGIN
  FOR pol IN
    SELECT *
    FROM pg_policies
    WHERE qual ILIKE '%fa_get_user_role%'
       OR with_check ILIKE '%fa_get_user_role%'
  LOOP
    SELECT string_agg(quote_ident(role_name::text), ', ')
    INTO role_sql
    FROM unnest(pol.roles) AS role_name;

    using_sql := CASE
      WHEN pol.qual IS NULL THEN ''
      ELSE ' USING (' || replace(replace(pol.qual, 'public.fa_get_user_role(', 'fa_private.get_user_role('), 'fa_get_user_role(', 'fa_private.get_user_role(') || ')'
    END;

    check_sql := CASE
      WHEN pol.with_check IS NULL THEN ''
      ELSE ' WITH CHECK (' || replace(replace(pol.with_check, 'public.fa_get_user_role(', 'fa_private.get_user_role('), 'fa_get_user_role(', 'fa_private.get_user_role(') || ')'
    END;

    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      pol.policyname,
      pol.schemaname,
      pol.tablename,
      pol.permissive,
      pol.cmd,
      role_sql,
      using_sql,
      check_sql
    );
  END LOOP;
END $$;

-- The original public helper may remain for old SQL references, but it must
-- not be executable by API-facing roles as an RPC.
REVOKE EXECUTE ON FUNCTION public.fa_get_user_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fa_get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fa_get_user_role(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fa_get_user_role(uuid) TO service_role;
