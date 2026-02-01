-- Allow any authenticated user to upload FRA report placeholder photos.
-- The API restricts paths to fra/{instanceId}/photos/{placeholderId}/...
-- so only valid FRA instance IDs from the request are used.
CREATE POLICY "Authenticated users can upload FRA photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fa-attachments'
    AND name LIKE 'fra/%'
    AND auth.uid() IS NOT NULL
  );
