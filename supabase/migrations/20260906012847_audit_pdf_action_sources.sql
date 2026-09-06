-- Preserve findings and completion evidence while separating current work from history.
ALTER TABLE public.fa_store_actions
  ADD COLUMN source_audit_date date,
  ADD COLUMN source_audit_number smallint CHECK (source_audit_number IN (1,2)),
  ADD COLUMN source_pdf_path text,
  ADD COLUMN source_page integer CHECK (source_page > 0),
  ADD COLUMN source_finding_key text,
  ADD COLUMN active_until date;
CREATE UNIQUE INDEX fa_store_actions_pdf_finding_unique
  ON public.fa_store_actions(store_id, source_audit_date, source_finding_key)
  WHERE source_finding_key IS NOT NULL;
CREATE INDEX fa_store_actions_active_until_idx ON public.fa_store_actions(active_until);
CREATE VIEW public.fa_current_store_actions WITH (security_invoker = true) AS
  SELECT * FROM public.fa_store_actions
  WHERE status::text NOT IN ('complete','completed','cancelled')
    AND (active_until IS NULL OR active_until > CURRENT_DATE);
GRANT SELECT ON public.fa_current_store_actions TO authenticated, service_role;
REVOKE ALL ON public.fa_current_store_actions FROM anon;
CREATE TABLE public.fa_audit_pdf_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.fa_stores(id) ON DELETE CASCADE,
  audit_number smallint NOT NULL CHECK (audit_number IN (1,2)),
  pdf_path text NOT NULL,
  audit_date date,
  status text NOT NULL CHECK (status IN ('imported','needs_review')),
  finding_count integer NOT NULL DEFAULT 0,
  error text,
  created_by_user_id uuid NOT NULL REFERENCES public.fa_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id,pdf_path)
);
ALTER TABLE public.fa_audit_pdf_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auditors read PDF imports" ON public.fa_audit_pdf_imports FOR SELECT TO authenticated
  USING (public.fa_get_user_role(auth.uid()) IN ('admin','ops','readonly','client'));
CREATE POLICY "Auditors manage PDF imports" ON public.fa_audit_pdf_imports FOR ALL TO authenticated
  USING (public.fa_get_user_role(auth.uid()) IN ('admin','ops'))
  WITH CHECK (public.fa_get_user_role(auth.uid()) IN ('admin','ops'));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.fa_audit_pdf_imports TO authenticated,service_role;
REVOKE ALL ON public.fa_audit_pdf_imports FROM anon;
CREATE INDEX fa_audit_pdf_imports_created_by_idx ON public.fa_audit_pdf_imports(created_by_user_id);
NOTIFY pgrst, 'reload schema';
