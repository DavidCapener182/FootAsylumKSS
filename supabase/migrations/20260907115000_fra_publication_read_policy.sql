DROP POLICY "Authorised users read FRA publications" ON public.fa_fra_publications;
CREATE POLICY "Authorised users read FRA publications" ON public.fa_fra_publications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.fa_profiles p WHERE p.id=(SELECT auth.uid()) AND p.role::text IN ('admin','ops','readonly','client') AND p.account_status::text='active'));
NOTIFY pgrst, 'reload schema';
