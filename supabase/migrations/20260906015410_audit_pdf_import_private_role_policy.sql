-- Use the same private role helper as the existing store-action policies.
ALTER POLICY "Auditors read PDF imports" ON public.fa_audit_pdf_imports
  USING (fa_private.get_user_role(auth.uid()) IN ('admin','ops','readonly','client'));
ALTER POLICY "Auditors manage PDF imports" ON public.fa_audit_pdf_imports
  USING (fa_private.get_user_role(auth.uid()) IN ('admin','ops'))
  WITH CHECK (fa_private.get_user_role(auth.uid()) IN ('admin','ops'));
NOTIFY pgrst, 'reload schema';
