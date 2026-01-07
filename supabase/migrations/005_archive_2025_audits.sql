-- Archive 2025 audits from fa_stores table
-- This migration creates an archive table and moves 2025 audit data

-- ============================================
-- CREATE ARCHIVE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS fa_store_audits_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES fa_stores(id) ON DELETE CASCADE,
  audit_year INTEGER NOT NULL,
  audit_number INTEGER NOT NULL CHECK (audit_number IN (1, 2, 3)),
  audit_date DATE,
  overall_pct NUMERIC(5, 2),
  action_plan_sent BOOLEAN,
  pdf_path TEXT,
  assigned_manager_user_id UUID REFERENCES fa_profiles(id) ON DELETE SET NULL,
  planned_date DATE,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, audit_year, audit_number)
);

-- Add index for efficient queries
CREATE INDEX idx_store_audits_archive_store_id ON fa_store_audits_archive(store_id);
CREATE INDEX idx_store_audits_archive_year ON fa_store_audits_archive(audit_year);
CREATE INDEX idx_store_audits_archive_store_year ON fa_store_audits_archive(store_id, audit_year);

-- Add comment for documentation
COMMENT ON TABLE fa_store_audits_archive IS 'Archived historical compliance audit data by year';

-- ============================================
-- ARCHIVE 2025 AUDIT DATA
-- ============================================

-- Archive Audit 1 data from 2025
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
  2025 as audit_year,
  1 as audit_number,
  compliance_audit_1_date as audit_date,
  compliance_audit_1_overall_pct as overall_pct,
  action_plan_1_sent as action_plan_sent,
  compliance_audit_1_pdf_path as pdf_path,
  NOW() as archived_at
FROM fa_stores
WHERE compliance_audit_1_date IS NOT NULL
  AND EXTRACT(YEAR FROM compliance_audit_1_date) = 2025
ON CONFLICT (store_id, audit_year, audit_number) DO NOTHING;

-- Archive Audit 2 data from 2025
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
  2025 as audit_year,
  2 as audit_number,
  compliance_audit_2_date as audit_date,
  compliance_audit_2_overall_pct as overall_pct,
  action_plan_2_sent as action_plan_sent,
  compliance_audit_2_pdf_path as pdf_path,
  compliance_audit_2_assigned_manager_user_id as assigned_manager_user_id,
  compliance_audit_2_planned_date as planned_date,
  NOW() as archived_at
FROM fa_stores
WHERE compliance_audit_2_date IS NOT NULL
  AND EXTRACT(YEAR FROM compliance_audit_2_date) = 2025
ON CONFLICT (store_id, audit_year, audit_number) DO NOTHING;

-- Archive Audit 3 data from 2025
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
  2025 as audit_year,
  3 as audit_number,
  compliance_audit_3_date as audit_date,
  compliance_audit_3_overall_pct as overall_pct,
  action_plan_3_sent as action_plan_sent,
  NOW() as archived_at
FROM fa_stores
WHERE compliance_audit_3_date IS NOT NULL
  AND EXTRACT(YEAR FROM compliance_audit_3_date) = 2025
ON CONFLICT (store_id, audit_year, audit_number) DO NOTHING;

-- ============================================
-- CLEAR 2025 AUDIT DATA FROM fa_stores
-- ============================================

-- Clear Audit 1 columns for 2025 audits
UPDATE fa_stores
SET 
  compliance_audit_1_date = NULL,
  compliance_audit_1_overall_pct = NULL,
  action_plan_1_sent = NULL,
  compliance_audit_1_pdf_path = NULL
WHERE compliance_audit_1_date IS NOT NULL
  AND EXTRACT(YEAR FROM compliance_audit_1_date) = 2025;

-- Clear Audit 2 columns for 2025 audits
UPDATE fa_stores
SET 
  compliance_audit_2_date = NULL,
  compliance_audit_2_overall_pct = NULL,
  action_plan_2_sent = NULL,
  compliance_audit_2_pdf_path = NULL,
  compliance_audit_2_assigned_manager_user_id = NULL,
  compliance_audit_2_planned_date = NULL
WHERE compliance_audit_2_date IS NOT NULL
  AND EXTRACT(YEAR FROM compliance_audit_2_date) = 2025;

-- Clear Audit 3 columns for 2025 audits
UPDATE fa_stores
SET 
  compliance_audit_3_date = NULL,
  compliance_audit_3_overall_pct = NULL,
  action_plan_3_sent = NULL
WHERE compliance_audit_3_date IS NOT NULL
  AND EXTRACT(YEAR FROM compliance_audit_3_date) = 2025;

-- ============================================
-- UPDATE CALCULATED FIELDS
-- ============================================

-- Recalculate area_average_pct and total_audits_to_date for stores
-- This will be based on remaining (non-2025) audits
UPDATE fa_stores
SET 
  area_average_pct = NULL,
  total_audits_to_date = NULL
WHERE area_average_pct IS NOT NULL OR total_audits_to_date IS NOT NULL;

-- Note: The application should recalculate these fields based on current audit data
