-- Ensure the attachments bucket enforces a 100MB max object size.
-- Supabase storage error "object exceeded the maximum allowed size"
-- is controlled by this bucket-level setting.
UPDATE storage.buckets
SET file_size_limit = 100 * 1024 * 1024
WHERE id = 'fa-attachments';
