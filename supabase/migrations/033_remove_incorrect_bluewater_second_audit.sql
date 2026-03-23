-- Remove incorrectly added second audit for Bluewater.
-- Also normalize total_audits_to_date after clearing Audit 2 fields.

UPDATE fa_stores
SET
  compliance_audit_2_date = NULL,
  compliance_audit_2_overall_pct = NULL,
  action_plan_2_sent = NULL,
  compliance_audit_2_pdf_path = NULL,
  total_audits_to_date = CASE
    WHEN compliance_audit_1_date IS NOT NULL AND compliance_audit_1_overall_pct IS NOT NULL THEN 1
    ELSE 0
  END
WHERE lower(trim(store_name)) = 'bluewater';
