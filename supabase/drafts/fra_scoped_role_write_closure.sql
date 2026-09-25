-- Draft only. Add before client_admin/area_manager activation.
-- Intersect legacy owner and source-photo write policies with active KSS status.
-- Scope on storage is limited to fa-attachments; other product buckets retain
-- their existing policies. Manager evidence uses the service-only workflow.

DO $$
DECLARE
  source_table text;
  verb text;
BEGIN
  FOREACH source_table IN ARRAY ARRAY[
    'fa_fra_photo_comments',
    'fa_audit_instances',
    'fa_audit_responses',
    'fa_audit_media'
  ] LOOP
    IF to_regclass(format('public.%I', source_table)) IS NULL THEN
      RAISE EXCEPTION 'Expected operational table public.% is missing', source_table;
    END IF;
    FOREACH verb IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS fra_kss_operational_%s ON public.%I', lower(verb), source_table);
      EXECUTE format(
        'CREATE POLICY fra_kss_operational_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s',
        lower(verb), source_table, verb,
        CASE verb
          WHEN 'INSERT' THEN 'WITH CHECK (fa_private.get_user_role((SELECT auth.uid())) IN (''admin''::public.fa_user_role, ''ops''::public.fa_user_role))'
          WHEN 'UPDATE' THEN 'USING (fa_private.get_user_role((SELECT auth.uid())) IN (''admin''::public.fa_user_role, ''ops''::public.fa_user_role)) WITH CHECK (fa_private.get_user_role((SELECT auth.uid())) IN (''admin''::public.fa_user_role, ''ops''::public.fa_user_role))'
          ELSE 'USING (fa_private.get_user_role((SELECT auth.uid())) IN (''admin''::public.fa_user_role, ''ops''::public.fa_user_role))'
        END
      );
    END LOOP;
  END LOOP;
END $$;

DROP POLICY IF EXISTS fra_kss_attachment_insert_only ON storage.objects;
CREATE POLICY fra_kss_attachment_insert_only ON storage.objects
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (bucket_id <> 'fa-attachments' OR
    fa_private.get_user_role((SELECT auth.uid())) IN ('admin'::public.fa_user_role, 'ops'::public.fa_user_role));

DROP POLICY IF EXISTS fra_kss_attachment_update_only ON storage.objects;
CREATE POLICY fra_kss_attachment_update_only ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (bucket_id <> 'fa-attachments' OR
    fa_private.get_user_role((SELECT auth.uid())) IN ('admin'::public.fa_user_role, 'ops'::public.fa_user_role))
  WITH CHECK (bucket_id <> 'fa-attachments' OR
    fa_private.get_user_role((SELECT auth.uid())) IN ('admin'::public.fa_user_role, 'ops'::public.fa_user_role));

DROP POLICY IF EXISTS fra_kss_attachment_delete_only ON storage.objects;
CREATE POLICY fra_kss_attachment_delete_only ON storage.objects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (bucket_id <> 'fa-attachments' OR
    fa_private.get_user_role((SELECT auth.uid())) IN ('admin'::public.fa_user_role, 'ops'::public.fa_user_role));
