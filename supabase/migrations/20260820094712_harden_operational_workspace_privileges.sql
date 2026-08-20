-- Keep generated report and plan history append-only even when project-level
-- default privileges grant broader access to newly-created tables.

REVOKE ALL ON TABLE public.fa_report_versions FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.fa_report_versions TO authenticated;

REVOKE ALL ON TABLE public.kss_plan_versions FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.kss_plan_versions TO authenticated;

REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.fa_report_versions, public.kss_plan_versions
  FROM authenticated;
