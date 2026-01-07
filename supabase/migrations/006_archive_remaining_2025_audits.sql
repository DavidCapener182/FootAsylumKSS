-- Archive remaining 2025 audit data (including those with NULL dates but have audit data)
-- This handles cases where audit data exists but dates are NULL (likely 2025 data)
-- This migration ensures ALL non-2026 audit data is archived

-- ============================================
-- ARCHIVE REMAINING NON-2026 AUDIT DATA
-- ============================================

-- Archive Audit 1 data that is not from 2026
INSERT INTO fa_store_audits_archive (
  store_id,
  audit_year,
  audit_number,
  audit_date,
  overall_pct,
  action_plan_sent,
  pdf_path,
  archived_at
)
SELECT 
  id as store_id,
  COALESCE(EXTRACT(YEAR FROM compliance_audit_1_date)::INTEGER, 2025) as audit_year,
  1 as audit_number,
  compliance_audit_1_date as audit_date,
  compliance_audit_1_overall_pct as overall_pct,
  action_plan_1_sent as action_plan_sent,
  compliance_audit_1_pdf_path as pdf_path,
  NOW() as archived_at
FROM fa_stores
WHERE (compliance_audit_1_date IS NOT NULL AND EXTRACT(YEAR FROM compliance_audit_1_date) != 2026)
   OR (compliance_audit_1_date IS NULL AND (compliance_audit_1_overall_pct IS NOT NULL OR action_plan_1_sent IS NOT NULL))
ON CONFLICT (store_id, audit_year, audit_number) DO NOTHING;

-- Archive Audit 2 data that is not from 2026
INSERT INTO fa_store_audits_archive (
  store_id,
  audit_year,
  audit_number,
  audit_date,
  overall_pct,
  action_plan_sent,
  pdf_path,
  assigned_manager_user_id,
  planned_date,
  archived_at
)
SELECT 
  id as store_id,
  COALESCE(EXTRACT(YEAR FROM compliance_audit_2_date)::INTEGER, 2025) as audit_year,
  2 as audit_number,
  compliance_audit_2_date as audit_date,
  compliance_audit_2_overall_pct as overall_pct,
  action_plan_2_sent as action_plan_sent,
  compliance_audit_2_pdf_path as pdf_path,
  compliance_audit_2_assigned_manager_user_id as assigned_manager_user_id,
  compliance_audit_2_planned_date as planned_date,
  NOW() as archived_at
FROM fa_stores
WHERE (compliance_audit_2_date IS NOT NULL AND EXTRACT(YEAR FROM compliance_audit_2_date) != 2026)
   OR (compliance_audit_2_date IS NULL AND (compliance_audit_2_overall_pct IS NOT NULL OR action_plan_2_sent IS NOT NULL OR compliance_audit_2_pdf_path IS NOT NULL))
ON CONFLICT (store_id, audit_year, audit_number) DO NOTHING;

-- Archive Audit 3 data that is not from 2026
INSERT INTO fa_store_audits_archive (
  store_id,
  audit_year,
  audit_number,
  audit_date,
  overall_pct,
  action_plan_sent,
  archived_at
)
SELECT 
  id as store_id,
  COALESCE(EXTRACT(YEAR FROM compliance_audit_3_date)::INTEGER, 2025) as audit_year,
  3 as audit_number,
  compliance_audit_3_date as audit_date,
  compliance_audit_3_overall_pct as overall_pct,
  action_plan_3_sent as action_plan_sent,
  NOW() as archived_at
FROM fa_stores
WHERE (compliance_audit_3_date IS NOT NULL AND EXTRACT(YEAR FROM compliance_audit_3_date) != 2026)
   OR (compliance_audit_3_date IS NULL AND (compliance_audit_3_overall_pct IS NOT NULL OR action_plan_3_sent IS NOT NULL))
ON CONFLICT (store_id, audit_year, audit_number) DO NOTHING;

-- ============================================
-- CLEAR REMAINING NON-2026 AUDIT DATA
-- ============================================

-- Clear Audit 1 data that is not from 2026
UPDATE fa_stores
SET 
  compliance_audit_1_date = NULL,
  compliance_audit_1_overall_pct = NULL,
  action_plan_1_sent = NULL,
  compliance_audit_1_pdf_path = NULL
WHERE (compliance_audit_1_date IS NOT NULL AND EXTRACT(YEAR FROM compliance_audit_1_date) != 2026)
   OR (compliance_audit_1_date IS NULL AND (compliance_audit_1_overall_pct IS NOT NULL OR action_plan_1_sent IS NOT NULL));

-- Clear Audit 2 data that is not from 2026
UPDATE fa_stores
SET 
  compliance_audit_2_date = NULL,
  compliance_audit_2_overall_pct = NULL,
  action_plan_2_sent = NULL,
  compliance_audit_2_pdf_path = NULL,
  compliance_audit_2_assigned_manager_user_id = NULL,
  compliance_audit_2_planned_date = NULL
WHERE (compliance_audit_2_date IS NOT NULL AND EXTRACT(YEAR FROM compliance_audit_2_date) != 2026)
   OR (compliance_audit_2_date IS NULL AND (compliance_audit_2_overall_pct IS NOT NULL OR action_plan_2_sent IS NOT NULL OR compliance_audit_2_pdf_path IS NOT NULL));

-- Clear Audit 3 data that is not from 2026
UPDATE fa_stores
SET 
  compliance_audit_3_date = NULL,
  compliance_audit_3_overall_pct = NULL,
  action_plan_3_sent = NULL
WHERE (compliance_audit_3_date IS NOT NULL AND EXTRACT(YEAR FROM compliance_audit_3_date) != 2026)
   OR (compliance_audit_3_date IS NULL AND (compliance_audit_3_overall_pct IS NOT NULL OR action_plan_3_sent IS NOT NULL));

-- Reset calculated fields
UPDATE fa_stores
SET 
  area_average_pct = NULL,
  total_audits_to_date = NULL
WHERE area_average_pct IS NOT NULL OR total_audits_to_date IS NOT NULL;
