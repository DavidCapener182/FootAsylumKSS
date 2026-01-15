-- Fix storage policies for fa-attachments bucket
-- This migration:
-- 1. Creates fa_current_role() function as an alias for backward compatibility
-- 2. Sets up proper storage policies for the fa-attachments bucket

-- ============================================
-- HELPER FUNCTION - fa_current_role()
-- ============================================
-- This function is an alias for fa_get_user_role(auth.uid())
-- It's used by storage policies that may have been created manually
CREATE OR REPLACE FUNCTION fa_current_role()
RETURNS fa_user_role AS $$
  SELECT fa_get_user_role(auth.uid());
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- STORAGE POLICIES - fa-attachments bucket
-- ============================================
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admin full access to attachments bucket" ON storage.objects;
DROP POLICY IF EXISTS "Ops can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Ops can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Readonly can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Client can view attachments" ON storage.objects;

-- Admin: Full access (INSERT, SELECT, UPDATE, DELETE)
CREATE POLICY "Admin full access to attachments bucket"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'fa-attachments' 
    AND fa_get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    bucket_id = 'fa-attachments' 
    AND fa_get_user_role(auth.uid()) = 'admin'
  );

-- Ops: Upload and view
CREATE POLICY "Ops can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fa-attachments' 
    AND fa_get_user_role(auth.uid()) = 'ops'
  );

CREATE POLICY "Ops can view attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fa-attachments' 
    AND fa_get_user_role(auth.uid()) IN ('ops', 'admin')
  );

-- Ops: Can update and delete their own uploads
CREATE POLICY "Ops can update attachments"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'fa-attachments' 
    AND fa_get_user_role(auth.uid()) = 'ops'
  )
  WITH CHECK (
    bucket_id = 'fa-attachments' 
    AND fa_get_user_role(auth.uid()) = 'ops'
  );

CREATE POLICY "Ops can delete attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fa-attachments' 
    AND fa_get_user_role(auth.uid()) = 'ops'
  );

-- Readonly: View only
CREATE POLICY "Readonly can view attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fa-attachments' 
    AND fa_get_user_role(auth.uid()) = 'readonly'
  );

-- Client: View only (read-only access)
CREATE POLICY "Client can view attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fa-attachments' 
    AND fa_get_user_role(auth.uid()) = 'client'
  );
