-- Ensure the attachments bucket enforces a 250MB max object size.
UPDATE storage.buckets
SET file_size_limit = 250 * 1024 * 1024
WHERE id = 'fa-attachments';
