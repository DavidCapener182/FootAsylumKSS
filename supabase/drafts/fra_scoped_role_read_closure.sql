-- Draft only. Apply before activating client_admin or area_manager accounts.
-- Restrictive SELECT policies intersect every existing permissive policy, so
-- historical broad policies cannot grant these source records to client roles.
-- The private helper already returns pending for inactive accounts and for
-- admin/ops sessions without the required assurance level.

DO $$
DECLARE
  source_table text;
BEGIN
  FOREACH source_table IN ARRAY ARRAY[
    'fa_fra_photo_comments',
    'fa_hs_incidents',
    'fa_hs_claims',
    'fa_hs_sites',
    'fa_hs_monthly_summary'
  ] LOOP
    IF to_regclass(format('public.%I', source_table)) IS NULL THEN
      RAISE EXCEPTION 'Expected source table public.% is missing', source_table;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', source_table);
    -- Anon policies cannot be constrained by a policy scoped to authenticated.
    EXECUTE format('REVOKE SELECT ON TABLE public.%I FROM anon, PUBLIC', source_table);
    EXECUTE format('DROP POLICY IF EXISTS fra_kss_source_read_only ON public.%I', source_table);
    EXECUTE format(
      'CREATE POLICY fra_kss_source_read_only ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (fa_private.get_user_role((SELECT auth.uid())) IN (''admin''::public.fa_user_role, ''ops''::public.fa_user_role, ''readonly''::public.fa_user_role))',
      source_table
    );
  END LOOP;
END $$;
