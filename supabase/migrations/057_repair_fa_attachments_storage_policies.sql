-- Repair fa-attachments storage policies after legacy public role helpers were
-- revoked. Stale policies that still call fa_is_ops/fa_current_role fail at
-- upload time with "permission denied for function fa_is_ops".

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

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        COALESCE(qual, '') ILIKE '%fa-attachments%'
        OR COALESCE(with_check, '') ILIKE '%fa-attachments%'
      )
      AND (
        COALESCE(qual, '') ILIKE '%fa_is_admin%'
        OR COALESCE(qual, '') ILIKE '%fa_is_ops%'
        OR COALESCE(qual, '') ILIKE '%fa_is_readonly%'
        OR COALESCE(qual, '') ILIKE '%fa_current_role%'
        OR COALESCE(qual, '') ILIKE '%fa_get_user_role%'
        OR COALESCE(with_check, '') ILIKE '%fa_is_admin%'
        OR COALESCE(with_check, '') ILIKE '%fa_is_ops%'
        OR COALESCE(with_check, '') ILIKE '%fa_is_readonly%'
        OR COALESCE(with_check, '') ILIKE '%fa_current_role%'
        OR COALESCE(with_check, '') ILIKE '%fa_get_user_role%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Admin full access to attachments bucket" ON storage.objects;
DROP POLICY IF EXISTS "Ops can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Ops can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Ops can update attachments" ON storage.objects;
DROP POLICY IF EXISTS "Ops can delete attachments" ON storage.objects;
DROP POLICY IF EXISTS "Readonly can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Client can view attachments" ON storage.objects;

CREATE POLICY "Admin full access to attachments bucket"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'fa-attachments'
    AND fa_private.get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    bucket_id = 'fa-attachments'
    AND fa_private.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Ops can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fa-attachments'
    AND fa_private.get_user_role(auth.uid()) = 'ops'
  );

CREATE POLICY "Ops can view attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fa-attachments'
    AND fa_private.get_user_role(auth.uid()) IN ('ops', 'admin')
  );

CREATE POLICY "Ops can update attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'fa-attachments'
    AND fa_private.get_user_role(auth.uid()) = 'ops'
  )
  WITH CHECK (
    bucket_id = 'fa-attachments'
    AND fa_private.get_user_role(auth.uid()) = 'ops'
  );

CREATE POLICY "Ops can delete attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fa-attachments'
    AND fa_private.get_user_role(auth.uid()) = 'ops'
  );

CREATE POLICY "Readonly can view attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fa-attachments'
    AND fa_private.get_user_role(auth.uid()) = 'readonly'
  );

CREATE POLICY "Client can view attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fa-attachments'
    AND fa_private.get_user_role(auth.uid()) = 'client'
  );
