-- Security hardening for Supabase linter findings relevant to FootAsylum.

-- 1) Remove SECURITY DEFINER from cmp_is_allowed_user and pin search_path.
CREATE OR REPLACE FUNCTION public.cmp_is_allowed_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, auth, pg_temp
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.capener@kssnwltd.co.uk';
$$;

-- 2) Pin search_path for trigger/helper functions flagged by linter.
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
        'set_fra_photo_comments_updated_at',
        'tfs_validate_store_visit_activity_payload'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn);
  END LOOP;
END $$;

-- 3) Tighten FRA photo comment update/delete policies to owner-only.
DROP POLICY IF EXISTS "Authenticated users can update FRA photo comments" ON public.fa_fra_photo_comments;
CREATE POLICY "Authenticated users can update FRA photo comments"
  ON public.fa_fra_photo_comments
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can delete FRA photo comments" ON public.fa_fra_photo_comments;
CREATE POLICY "Authenticated users can delete FRA photo comments"
  ON public.fa_fra_photo_comments
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- 4) Prevent arbitrary SQL execution from client-facing roles.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'admin_exec_sql'
      AND pg_get_function_identity_arguments(p.oid) = 'query text'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.admin_exec_sql(text) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.admin_exec_sql(text) FROM authenticated;
  END IF;
END $$;
