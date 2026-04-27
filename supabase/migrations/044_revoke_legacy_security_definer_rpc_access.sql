-- Revoke client-role execute privileges from legacy SECURITY DEFINER RPC-style
-- functions that are not required by the current FootAsylum app runtime.
--
-- Note: fa_get_user_role is intentionally excluded because it is used heavily
-- in active RLS policies across multiple tables.

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
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
  END LOOP;
END $$;
