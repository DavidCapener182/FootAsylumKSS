-- Cover foreign keys introduced by the operational workspace migration so
-- lifecycle transitions and parent deletes do not require table scans.

CREATE INDEX IF NOT EXISTS idx_fa_audit_instances_assigned_auditor ON public.fa_audit_instances(assigned_auditor_user_id);
CREATE INDEX IF NOT EXISTS idx_fa_actions_verified_by ON public.fa_actions(verified_by_user_id);
CREATE INDEX IF NOT EXISTS idx_fa_store_actions_assigned_to ON public.fa_store_actions(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_fa_store_actions_verified_by ON public.fa_store_actions(verified_by_user_id);
CREATE INDEX IF NOT EXISTS idx_fa_report_versions_generated_by ON public.fa_report_versions(generated_by_user_id);
CREATE INDEX IF NOT EXISTS idx_fa_report_versions_approved_by ON public.fa_report_versions(approved_by_user_id);
CREATE INDEX IF NOT EXISTS idx_emp_plans_approved_by ON public.emp_plans(approved_by_user_id);
CREATE INDEX IF NOT EXISTS idx_emp_plans_parent ON public.emp_plans(parent_plan_id);
CREATE INDEX IF NOT EXISTS idx_cmp_plans_approved_by ON public.cmp_plans(approved_by_user_id);
CREATE INDEX IF NOT EXISTS idx_cmp_plans_parent ON public.cmp_plans(parent_plan_id);
CREATE INDEX IF NOT EXISTS idx_kss_plan_versions_created_by ON public.kss_plan_versions(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_kss_plan_review_comments_created_by ON public.kss_plan_review_comments(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_kss_plan_review_comments_resolved_by ON public.kss_plan_review_comments(resolved_by_user_id);
CREATE INDEX IF NOT EXISTS idx_kss_plan_ack_user ON public.kss_plan_acknowledgements(user_id);
