-- Immutable reviewed PDFs; source images remain until verified SharePoint archiving.
CREATE TABLE public.fa_fra_publications (
 id uuid PRIMARY KEY,
 instance_id uuid NOT NULL REFERENCES public.fa_audit_instances(id),
 store_id uuid NOT NULL REFERENCES public.fa_stores(id),
 pdf_path text NOT NULL UNIQUE,
 pdf_sha256 text NOT NULL,
 pdf_bytes bigint NOT NULL CHECK(pdf_bytes > 0),
 source_fingerprint text NOT NULL,
 source_images jsonb NOT NULL DEFAULT '[]'::jsonb,
 created_by uuid NOT NULL REFERENCES public.fa_profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 confirmed_by uuid REFERENCES public.fa_profiles(id),
 confirmed_at timestamptz,
 archive_status text NOT NULL DEFAULT 'awaiting_confirmation' CHECK(archive_status IN ('awaiting_confirmation','pending','verified','complete','blocked')),
 archive_receipt jsonb,
 CHECK ((confirmed_at IS NULL) = (confirmed_by IS NULL))
);
CREATE INDEX fa_fra_publications_instance_idx ON public.fa_fra_publications(instance_id, created_at DESC);
CREATE INDEX fa_fra_publications_store_idx ON public.fa_fra_publications(store_id);
CREATE INDEX fa_fra_publications_created_by_idx ON public.fa_fra_publications(created_by);
CREATE INDEX fa_fra_publications_confirmed_by_idx ON public.fa_fra_publications(confirmed_by);
CREATE UNIQUE INDEX fa_fra_publications_confirmed_instance_idx ON public.fa_fra_publications(instance_id) WHERE confirmed_at IS NOT NULL;
ALTER TABLE public.fa_fra_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorised users read FRA publications" ON public.fa_fra_publications FOR SELECT TO authenticated
 USING (public.fa_get_user_role(auth.uid()) IN ('admin','ops','readonly','client'));
REVOKE ALL ON public.fa_fra_publications FROM anon, authenticated;
GRANT SELECT ON public.fa_fra_publications TO authenticated;
GRANT ALL ON public.fa_fra_publications TO service_role;
NOTIFY pgrst, 'reload schema';
-- Service-only commit keeps PDF linkage, completion and archival eligibility atomic.
CREATE FUNCTION public.fa_confirm_fra_publication(publication_id uuid, confirming_user uuid, assessment_time timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE publication public.fa_fra_publications;
BEGIN
 SELECT * INTO STRICT publication FROM public.fa_fra_publications WHERE id=publication_id FOR UPDATE;
 IF publication.confirmed_at IS NOT NULL THEN RETURN; END IF;
 UPDATE public.fa_audit_instances SET status='completed', conducted_at=assessment_time, updated_at=now() WHERE id=publication.instance_id;
 -- Publishing historical assessments must not replace a newer store assessment.
 IF NOT EXISTS (
   SELECT 1 FROM public.fa_audit_instances a JOIN public.fa_audit_templates t ON t.id=a.template_id
   WHERE a.store_id=publication.store_id AND a.id<>publication.instance_id AND a.status::text='completed'
   AND t.category::text='fire_risk_assessment' AND COALESCE(a.conducted_at,a.created_at)>assessment_time
 ) THEN
   UPDATE public.fa_stores SET fire_risk_assessment_date=assessment_time::date, fire_risk_assessment_pdf_path=publication.pdf_path WHERE id=publication.store_id;
 END IF;
 UPDATE public.fa_fra_publications SET confirmed_at=now(), confirmed_by=confirming_user, archive_status='pending' WHERE id=publication_id;
END $$;
REVOKE ALL ON FUNCTION public.fa_confirm_fra_publication(uuid,uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fa_confirm_fra_publication(uuid,uuid,timestamptz) TO service_role;
