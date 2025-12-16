-- Add PDF file path columns for audit reports
ALTER TABLE fa_stores
ADD COLUMN IF NOT EXISTS compliance_audit_1_pdf_path TEXT,
ADD COLUMN IF NOT EXISTS compliance_audit_2_pdf_path TEXT;

-- Add comments for documentation
COMMENT ON COLUMN fa_stores.compliance_audit_1_pdf_path IS 'Path to the PDF file for compliance audit 1 in the fa-attachments storage bucket';
COMMENT ON COLUMN fa_stores.compliance_audit_2_pdf_path IS 'Path to the PDF file for compliance audit 2 in the fa-attachments storage bucket';

