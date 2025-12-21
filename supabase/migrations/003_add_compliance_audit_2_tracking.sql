-- Add fields to track assigned manager and planned date for second compliance audit
ALTER TABLE fa_stores 
ADD COLUMN compliance_audit_2_assigned_manager_user_id UUID REFERENCES fa_profiles(id) ON DELETE SET NULL,
ADD COLUMN compliance_audit_2_planned_date DATE;

-- Add index for performance when querying stores needing second audit
CREATE INDEX idx_stores_audit_2_assigned ON fa_stores(compliance_audit_2_assigned_manager_user_id) WHERE compliance_audit_2_assigned_manager_user_id IS NOT NULL;


