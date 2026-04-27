-- Final hardening pass for linter warnings:
-- revoke EXECUTE from PUBLIC as well as anon/authenticated for legacy
-- SECURITY DEFINER RPC-style functions.
--
-- Why: revoking from anon/authenticated alone is insufficient if PUBLIC
-- still retains EXECUTE, because API roles inherit PUBLIC privileges.

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'admin_exec_sql',
        'create_purchase_order_invoice',
        'fa_current_role',
        'fa_handle_new_auth_user',
        'fa_is_admin',
        'fa_is_ops',
        'fa_is_readonly',
        'fa_log_activity',
        'get_admin_user_id',
        'get_my_profile',
        'get_provider_id',
        'get_user_role',
        'get_users_with_profiles',
        'handle_new_user',
        'insert_invoice_as_admin',
        'is_admin',
        'tfs_current_user_role',
        'tfs_generate_incident_reference'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
  END LOOP;
END $$;

-- Tighten fa_get_user_role exposure for unauthenticated users only.
-- Keep authenticated access intact because active RLS policies depend on it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fa_get_user_role'
      AND pg_get_function_identity_arguments(p.oid) = 'user_id uuid'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.fa_get_user_role(uuid) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.fa_get_user_role(uuid) FROM anon;
    GRANT EXECUTE ON FUNCTION public.fa_get_user_role(uuid) TO authenticated;
  END IF;
END $$;
