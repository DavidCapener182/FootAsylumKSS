-- Add Fire Risk Assessment tracking columns to fa_stores table
-- FRAs are required for stores that have completed audit 1 or audit 2 in the current year
-- FRAs must be renewed every 12 months

ALTER TABLE fa_stores 
ADD COLUMN fire_risk_assessment_date DATE,
ADD COLUMN fire_risk_assessment_pdf_path TEXT,
ADD COLUMN fire_risk_assessment_notes TEXT,
ADD COLUMN fire_risk_assessment_pct NUMERIC(5, 2);

-- Add index for efficient queries when filtering by FRA date
CREATE INDEX idx_stores_fra_date ON fa_stores(fire_risk_assessment_date) WHERE fire_risk_assessment_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN fa_stores.fire_risk_assessment_date IS 'Date of last Fire Risk Assessment completion. Must be renewed every 12 months.';
COMMENT ON COLUMN fa_stores.fire_risk_assessment_pdf_path IS 'Path to the Fire Risk Assessment PDF document in storage';
COMMENT ON COLUMN fa_stores.fire_risk_assessment_notes IS 'Optional notes or description for the Fire Risk Assessment';
COMMENT ON COLUMN fa_stores.fire_risk_assessment_pct IS 'Fire Risk Assessment percentage score (0-100)';
