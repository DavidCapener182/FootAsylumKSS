-- Shared operational workspace models for assurance, planning, reporting and plans.

ALTER TABLE public.fa_audit_instances
  ADD COLUMN IF NOT EXISTS assigned_auditor_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evidence_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.emp_event_control_log_entries
  ADD COLUMN IF NOT EXISTS client_request_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_emp_event_control_log_idempotency
  ON public.emp_event_control_log_entries(plan_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fa_audit_instances_schedule
  ON public.fa_audit_instances(scheduled_at, assigned_auditor_user_id)
  WHERE status <> 'completed';

ALTER TABLE public.fa_actions
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS reassignment_reason TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (verification_status IN ('not_required', 'awaiting_evidence', 'awaiting_verification', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
  ADD COLUMN IF NOT EXISTS dependency_action_ids UUID[] NOT NULL DEFAULT '{}'::UUID[];

ALTER TABLE public.fa_store_actions
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS reassignment_reason TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (verification_status IN ('not_required', 'awaiting_evidence', 'awaiting_verification', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
  ADD COLUMN IF NOT EXISTS dependency_action_ids UUID[] NOT NULL DEFAULT '{}'::UUID[];

CREATE INDEX IF NOT EXISTS idx_fa_actions_work_queue
  ON public.fa_actions(assigned_to_user_id, verification_status, due_date);
CREATE INDEX IF NOT EXISTS idx_fa_store_actions_work_queue
  ON public.fa_store_actions(assigned_to_user_id, verification_status, due_date);

CREATE TABLE IF NOT EXISTS public.fa_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.fa_profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('audits', 'fra', 'actions', 'incidents', 'stores', 'activity', 'reports')),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  filters JSONB NOT NULL DEFAULT '{}'::JSONB,
  visible_columns JSONB NOT NULL DEFAULT '[]'::JSONB,
  density TEXT NOT NULL DEFAULT 'comfortable' CHECK (density IN ('compact', 'comfortable')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_user_id, feature, name)
);

CREATE TABLE IF NOT EXISTS public.fa_planning_settings (
  owner_user_id UUID PRIMARY KEY REFERENCES public.fa_profiles(id) ON DELETE CASCADE,
  working_day_hours NUMERIC(4,2) NOT NULL DEFAULT 8 CHECK (working_day_hours > 0 AND working_day_hours <= 24),
  visit_hours_per_stop NUMERIC(4,2) NOT NULL DEFAULT 1.75 CHECK (visit_hours_per_stop > 0),
  travel_hours_per_stop NUMERIC(4,2) NOT NULL DEFAULT 0.5 CHECK (travel_hours_per_stop >= 0),
  default_start_location TEXT,
  default_finish_location TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fa_report_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'generating', 'ready', 'failed')),
  data_cutoff_at TIMESTAMPTZ NOT NULL,
  storage_path TEXT,
  file_name TEXT,
  generated_by_user_id UUID NOT NULL REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  approved_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  recipients JSONB NOT NULL DEFAULT '[]'::JSONB,
  error_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK ((status = 'ready' AND (storage_path IS NOT NULL OR file_name IS NOT NULL) AND completed_at IS NOT NULL) OR status <> 'ready')
);

CREATE INDEX IF NOT EXISTS idx_fa_report_versions_recent
  ON public.fa_report_versions(created_at DESC, report_type);

ALTER TYPE public.emp_plan_status ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE public.emp_plan_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.emp_plan_status ADD VALUE IF NOT EXISTS 'published';
ALTER TYPE public.emp_plan_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE public.cmp_plan_status ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE public.cmp_plan_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.cmp_plan_status ADD VALUE IF NOT EXISTS 'published';
ALTER TYPE public.cmp_plan_status ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE public.emp_plans
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS change_notes TEXT,
  ADD COLUMN IF NOT EXISTS review_date DATE,
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_plan_id UUID REFERENCES public.emp_plans(id) ON DELETE SET NULL;

ALTER TABLE public.cmp_plans
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS change_notes TEXT,
  ADD COLUMN IF NOT EXISTS review_date DATE,
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_plan_id UUID REFERENCES public.cmp_plans(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.kss_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('emp', 'cmp')),
  plan_id UUID NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  status TEXT NOT NULL,
  change_notes TEXT,
  snapshot JSONB NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_type, plan_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.kss_plan_review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('emp', 'cmp')),
  plan_id UUID NOT NULL,
  section_key TEXT,
  comment TEXT NOT NULL CHECK (char_length(trim(comment)) > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_by_user_id UUID NOT NULL REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  resolved_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kss_plan_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('emp', 'cmp')),
  plan_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES public.fa_profiles(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_type, plan_id, version_number, user_id)
);

CREATE OR REPLACE FUNCTION public.kss_transition_plan(
  p_plan_type TEXT,
  p_plan_id UUID,
  p_status TEXT,
  p_change_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_table REGCLASS;
  v_values_table REGCLASS;
  v_status_type REGTYPE;
  v_current JSONB;
  v_snapshot JSONB;
  v_version INTEGER;
  v_current_status TEXT;
BEGIN
  IF v_user_id IS NULL OR fa_private.get_user_role(v_user_id) <> 'admin' THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_plan_type NOT IN ('emp', 'cmp') OR p_status NOT IN ('draft', 'review', 'approved', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid plan transition' USING ERRCODE = '22023';
  END IF;
  IF p_status IN ('draft', 'archived') AND char_length(trim(COALESCE(p_change_notes, ''))) < 5 THEN
    RAISE EXCEPTION 'A change reason is required for this transition' USING ERRCODE = '22023';
  END IF;

  v_table := CASE p_plan_type WHEN 'emp' THEN 'public.emp_plans'::REGCLASS ELSE 'public.cmp_plans'::REGCLASS END;
  v_values_table := CASE p_plan_type WHEN 'emp' THEN 'public.emp_plan_field_values'::REGCLASS ELSE 'public.cmp_plan_field_values'::REGCLASS END;
  v_status_type := CASE p_plan_type WHEN 'emp' THEN 'public.emp_plan_status'::REGTYPE ELSE 'public.cmp_plan_status'::REGTYPE END;
  EXECUTE format('SELECT to_jsonb(p) FROM %s p WHERE id = $1 FOR UPDATE', v_table) INTO v_current USING p_plan_id;
  IF v_current IS NULL THEN RAISE EXCEPTION 'Plan not found' USING ERRCODE = 'P0002'; END IF;
  v_current_status := v_current ->> 'status';
  IF NOT (
    (v_current_status = 'draft' AND p_status = 'review') OR
    (v_current_status = 'review' AND p_status IN ('draft', 'approved')) OR
    (v_current_status = 'approved' AND p_status IN ('review', 'published')) OR
    (v_current_status = 'published' AND p_status IN ('archived')) OR
    (v_current_status = 'archived' AND p_status IN ('draft'))
  ) THEN
    RAISE EXCEPTION 'Transition from % to % is not allowed', v_current_status, p_status USING ERRCODE = '22023';
  END IF;

  IF v_current_status = 'approved' AND p_status = 'review' AND char_length(trim(COALESCE(p_change_notes, ''))) < 5 THEN
    RAISE EXCEPTION 'A change reason is required to return an approved plan to review' USING ERRCODE = '22023';
  END IF;

  v_version := COALESCE((v_current ->> 'version_number')::INTEGER, 1) + 1;
  EXECUTE format($sql$
    UPDATE %s SET status = $1::text::%s, version_number = $2, change_notes = $3,
      review_date = CASE WHEN $1 = 'review' THEN CURRENT_DATE ELSE review_date END,
      approved_by_user_id = CASE WHEN $1 = 'approved' THEN $4 ELSE approved_by_user_id END,
      approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END,
      published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE published_at END,
      updated_by_user_id = $4, updated_at = NOW()
    WHERE id = $5
  $sql$, v_table, v_status_type) USING p_status, v_version, NULLIF(trim(COALESCE(p_change_notes, '')), ''), v_user_id, p_plan_id;

  EXECUTE format($sql$
    SELECT to_jsonb(p) || jsonb_build_object('field_values', COALESCE((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.updated_at, v.id) FROM %s v WHERE v.plan_id = p.id), '[]'::jsonb))
    FROM %s p WHERE p.id = $1
  $sql$, v_values_table, v_table) INTO v_snapshot USING p_plan_id;

  INSERT INTO public.kss_plan_versions(plan_type, plan_id, version_number, status, change_notes, snapshot, created_by_user_id)
  VALUES (p_plan_type, p_plan_id, v_version, p_status, NULLIF(trim(COALESCE(p_change_notes, '')), ''), v_snapshot, v_user_id);

  RETURN jsonb_build_object('status', p_status, 'versionNumber', v_version);
END
$$;

ALTER TABLE public.fa_saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fa_planning_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fa_report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kss_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kss_plan_review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kss_plan_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY fa_saved_views_owner_all ON public.fa_saved_views FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY fa_planning_settings_owner_all ON public.fa_planning_settings FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY fa_report_versions_role_select ON public.fa_report_versions FOR SELECT TO authenticated
  USING (fa_private.get_user_role(auth.uid()) IN ('admin', 'ops', 'readonly', 'client'));
CREATE POLICY fa_report_versions_manager_insert ON public.fa_report_versions FOR INSERT TO authenticated
  WITH CHECK (generated_by_user_id = auth.uid() AND fa_private.get_user_role(auth.uid()) IN ('admin', 'ops'));
CREATE POLICY kss_plan_versions_admin_select ON public.kss_plan_versions FOR SELECT TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'admin');
CREATE POLICY kss_plan_versions_admin_insert ON public.kss_plan_versions FOR INSERT TO authenticated
  WITH CHECK (fa_private.get_user_role(auth.uid()) = 'admin' AND created_by_user_id = auth.uid());
CREATE POLICY kss_plan_comments_admin_all ON public.kss_plan_review_comments FOR ALL TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'admin') WITH CHECK (fa_private.get_user_role(auth.uid()) = 'admin');
CREATE POLICY kss_plan_ack_admin_all ON public.kss_plan_acknowledgements FOR ALL TO authenticated
  USING (fa_private.get_user_role(auth.uid()) = 'admin') WITH CHECK (fa_private.get_user_role(auth.uid()) = 'admin');

CREATE TRIGGER fa_saved_views_updated_at BEFORE UPDATE ON public.fa_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.fa_update_updated_at();
CREATE TRIGGER fa_planning_settings_updated_at BEFORE UPDATE ON public.fa_planning_settings
  FOR EACH ROW EXECUTE FUNCTION public.fa_update_updated_at();

REVOKE ALL ON public.fa_saved_views, public.fa_planning_settings, public.fa_report_versions,
  public.kss_plan_versions, public.kss_plan_review_comments, public.kss_plan_acknowledgements FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fa_saved_views, public.fa_planning_settings TO authenticated;
GRANT SELECT, INSERT ON public.fa_report_versions TO authenticated;
GRANT SELECT, INSERT ON public.kss_plan_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kss_plan_review_comments, public.kss_plan_acknowledgements TO authenticated;
REVOKE ALL ON FUNCTION public.kss_transition_plan(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kss_transition_plan(TEXT, UUID, TEXT, TEXT) TO authenticated;

COMMENT ON TABLE public.fa_report_versions IS 'Immutable metadata for generated report artefacts and their exact data cut-off.';
COMMENT ON TABLE public.kss_plan_versions IS 'Immutable EMP/CMP snapshots used for comparison, approval and controlled publication.';
