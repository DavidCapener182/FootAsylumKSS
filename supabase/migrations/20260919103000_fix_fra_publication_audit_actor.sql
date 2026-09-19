-- FRA confirmation is intentionally service-role only, but the store audit
-- trigger requires auth.uid() to identify the person responsible for the
-- change. Bind the already authorised reviewer for the transaction before
-- updating the audited store row.
CREATE OR REPLACE FUNCTION public.fa_confirm_fra_publication(
  publication_id uuid,
  confirming_user uuid,
  assessment_time timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  publication public.fa_fra_publications;
BEGIN
  SELECT * INTO STRICT publication
  FROM public.fa_fra_publications
  WHERE id = publication_id
  FOR UPDATE;

  IF publication.confirmed_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.fa_profiles
    WHERE id = confirming_user
  ) THEN
    RAISE EXCEPTION 'Confirming FRA reviewer does not exist';
  END IF;

  PERFORM pg_catalog.set_config('request.jwt.claim.sub', confirming_user::text, true);

  UPDATE public.fa_audit_instances
  SET status = 'completed', conducted_at = assessment_time, updated_at = now()
  WHERE id = publication.instance_id;

  -- Publishing historical assessments must not replace a newer store assessment.
  IF NOT EXISTS (
    SELECT 1
    FROM public.fa_audit_instances a
    JOIN public.fa_audit_templates t ON t.id = a.template_id
    WHERE a.store_id = publication.store_id
      AND a.id <> publication.instance_id
      AND a.status::text = 'completed'
      AND t.category::text = 'fire_risk_assessment'
      AND COALESCE(a.conducted_at, a.created_at) > assessment_time
  ) THEN
    UPDATE public.fa_stores
    SET fire_risk_assessment_date = assessment_time::date,
        fire_risk_assessment_pdf_path = publication.pdf_path
    WHERE id = publication.store_id;
  END IF;

  UPDATE public.fa_fra_publications
  SET confirmed_at = now(),
      confirmed_by = confirming_user,
      archive_status = 'pending'
  WHERE id = publication_id;
END
$$;

REVOKE ALL ON FUNCTION public.fa_confirm_fra_publication(uuid, uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fa_confirm_fra_publication(uuid, uuid, timestamptz)
  TO service_role;

NOTIFY pgrst, 'reload schema';
