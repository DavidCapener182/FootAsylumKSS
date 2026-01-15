-- Add 'client' role to fa_user_role enum
-- This role provides read-only access to incidents, actions, audits, and stores
-- but excludes route planning and activity logs
--
-- NOTE: This migration must be split into two parts when applying via Supabase MCP:
-- 1. First: Add the enum value (add_client_role_enum)
-- 2. Second: Add the policies (add_client_role_policies)
-- This is because PostgreSQL requires enum values to be committed before they can be used.
--
-- When applying manually, you can run this entire file, but when using MCP, split as shown above.

-- Add 'client' to the enum
ALTER TYPE fa_user_role ADD VALUE IF NOT EXISTS 'client';

-- ============================================
-- RLS POLICIES - fa_profiles
-- ============================================

-- Client: Can view all profiles (for display purposes)
CREATE POLICY "Client can view profiles"
  ON fa_profiles FOR SELECT
  USING (fa_get_user_role(auth.uid()) = 'client');

-- ============================================
-- RLS POLICIES - fa_stores
-- ============================================

-- Client: Read only access to stores
CREATE POLICY "Client can view stores"
  ON fa_stores FOR SELECT
  USING (fa_get_user_role(auth.uid()) = 'client');

-- ============================================
-- RLS POLICIES - fa_incidents
-- ============================================

-- Client: Read only access to incidents
CREATE POLICY "Client can view incidents"
  ON fa_incidents FOR SELECT
  USING (fa_get_user_role(auth.uid()) = 'client');

-- ============================================
-- RLS POLICIES - fa_investigations
-- ============================================

-- Client: Read only access to investigations
CREATE POLICY "Client can view investigations"
  ON fa_investigations FOR SELECT
  USING (fa_get_user_role(auth.uid()) = 'client');

-- ============================================
-- RLS POLICIES - fa_actions
-- ============================================

-- Client: Read only access to actions
CREATE POLICY "Client can view actions"
  ON fa_actions FOR SELECT
  USING (fa_get_user_role(auth.uid()) = 'client');

-- ============================================
-- RLS POLICIES - fa_attachments
-- ============================================

-- Client: Read only access to attachments
CREATE POLICY "Client can view attachments"
  ON fa_attachments FOR SELECT
  USING (fa_get_user_role(auth.uid()) = 'client');

-- ============================================
-- RLS POLICIES - fa_activity_log
-- ============================================

-- Note: Client role is intentionally NOT included in the activity log policy
-- The existing policy only allows 'admin', 'ops', 'readonly' to view activity logs
-- This ensures client users cannot access sensitive internal operations

-- ============================================
-- NOTES
-- ============================================
-- Client role has NO access to:
-- - Route planning (no RLS policy for client on route-planning related tables)
-- - Activity logs (not included in existing policy)
-- - Write operations (all policies are SELECT only for client)
