-- Heywood and Middleton are warehouse sites.
-- H&S and FRA were completed externally, so keep percentage scores blank and
-- hard-code the FRA overall risk rating as Tolerable.

WITH target_stores AS (
  SELECT id
  FROM public.fa_stores
  WHERE UPPER(COALESCE(store_code, '')) IN ('WH003', 'M3', 'WH004', 'POINT 62', 'POINT62', 'P62')
    OR lower(trim(COALESCE(store_name, ''))) IN ('heywood', 'middleton', 'point 62', 'point62')
)
UPDATE public.fa_stores AS stores
SET
  compliance_audit_1_date = DATE '2026-05-07',
  compliance_audit_1_overall_pct = NULL,
  action_plan_1_sent = NULL,
  fire_risk_assessment_date = DATE '2026-05-07',
  fire_risk_assessment_pct = NULL,
  fire_risk_assessment_notes = 'Completed by another team member; warehouse site - no percentage score. Overall risk rating: Tolerable.',
  total_audits_to_date = GREATEST(COALESCE(stores.total_audits_to_date, 0), 1),
  updated_at = NOW()
FROM target_stores
WHERE stores.id = target_stores.id;

WITH target_stores AS (
  SELECT id
  FROM public.fa_stores
  WHERE UPPER(COALESCE(store_code, '')) IN ('WH003', 'M3', 'WH004', 'POINT 62', 'POINT62', 'P62')
    OR lower(trim(COALESCE(store_name, ''))) IN ('heywood', 'middleton', 'point 62', 'point62')
),
fra_template AS (
  SELECT id
  FROM public.fa_audit_templates
  WHERE category = 'fire_risk_assessment'
  ORDER BY is_active DESC, updated_at DESC, created_at DESC
  LIMIT 1
),
audit_user AS (
  SELECT id
  FROM public.fa_profiles
  ORDER BY
    CASE role
      WHEN 'admin' THEN 0
      WHEN 'ops' THEN 1
      ELSE 2
    END,
    created_at ASC
  LIMIT 1
)
INSERT INTO public.fa_audit_instances (
  template_id,
  store_id,
  conducted_by_user_id,
  conducted_at,
  overall_score,
  status,
  fra_overall_risk_rating,
  created_at,
  updated_at
)
SELECT
  fra_template.id,
  target_stores.id,
  audit_user.id,
  TIMESTAMPTZ '2026-05-07 00:00:00+00',
  NULL,
  'completed',
  'Tolerable',
  NOW(),
  NOW()
FROM target_stores
CROSS JOIN fra_template
CROSS JOIN audit_user
WHERE NOT EXISTS (
  SELECT 1
  FROM public.fa_audit_instances AS existing
  WHERE existing.store_id = target_stores.id
    AND existing.template_id = fra_template.id
    AND existing.status = 'completed'
    AND existing.conducted_at::date = DATE '2026-05-07'
);

WITH target_stores AS (
  SELECT id
  FROM public.fa_stores
  WHERE UPPER(COALESCE(store_code, '')) IN ('WH003', 'M3', 'WH004', 'POINT 62', 'POINT62', 'P62')
    OR lower(trim(COALESCE(store_name, ''))) IN ('heywood', 'middleton', 'point 62', 'point62')
)
UPDATE public.fa_audit_instances AS instances
SET
  fra_overall_risk_rating = 'Tolerable',
  overall_score = NULL,
  status = 'completed',
  conducted_at = TIMESTAMPTZ '2026-05-07 00:00:00+00',
  updated_at = NOW()
FROM target_stores, public.fa_audit_templates AS templates
WHERE instances.store_id = target_stores.id
  AND templates.id = instances.template_id
  AND templates.category = 'fire_risk_assessment'
  AND instances.conducted_at::date = DATE '2026-05-07';
