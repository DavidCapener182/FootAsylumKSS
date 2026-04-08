-- Ensure the attachments bucket enforces a 500MB max object size.
UPDATE storage.buckets
SET file_size_limit = 500 * 1024 * 1024
WHERE id = 'fa-attachments';
