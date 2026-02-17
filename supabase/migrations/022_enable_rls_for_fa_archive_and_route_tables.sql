-- Non-destructive, idempotent RLS setup for FA-prefixed tables.
-- This script does not drop tables, delete rows, or remove policies.

-- ============================================
-- ENABLE RLS (safe if already enabled)
-- ============================================

ALTER TABLE IF EXISTS public.fa_store_audits_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fa_route_operational_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fa_route_visit_times ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - fa_store_audits_archive
-- ============================================

DO $do$
BEGIN
  IF to_regclass('public.fa_store_audits_archive') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'fa_store_audits_archive'
         AND policyname = 'Admin full access to store audits archive'
     ) THEN
    EXECUTE $sql$
      CREATE POLICY "Admin full access to store audits archive"
      ON public.fa_store_audits_archive FOR ALL
      USING (fa_get_user_role(auth.uid()) = 'admin')
      WITH CHECK (fa_get_user_role(auth.uid()) = 'admin')
    $sql$;
  END IF;
END
$do$;

DO $do$
BEGIN
  IF to_regclass('public.fa_store_audits_archive') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'fa_store_audits_archive'
         AND policyname = 'Ops can manage store audits archive'
     ) THEN
    EXECUTE $sql$
      CREATE POLICY "Ops can manage store audits archive"
      ON public.fa_store_audits_archive FOR ALL
      USING (fa_get_user_role(auth.uid()) = 'ops')
      WITH CHECK (fa_get_user_role(auth.uid()) = 'ops')
    $sql$;
  END IF;
END
$do$;

DO $do$
BEGIN
  IF to_regclass('public.fa_store_audits_archive') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'fa_store_audits_archive'
         AND policyname = 'Readonly can view store audits archive'
     ) THEN
    EXECUTE $sql$
      CREATE POLICY "Readonly can view store audits archive"
      ON public.fa_store_audits_archive FOR SELECT
      USING (fa_get_user_role(auth.uid()) = 'readonly')
    $sql$;
  END IF;
END
$do$;

DO $do$
BEGIN
  IF to_regclass('public.fa_store_audits_archive') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'fa_store_audits_archive'
         AND policyname = 'Client can view store audits archive'
     ) THEN
    EXECUTE $sql$
      CREATE POLICY "Client can view store audits archive"
      ON public.fa_store_audits_archive FOR SELECT
      USING (fa_get_user_role(auth.uid()) = 'client')
    $sql$;
  END IF;
END
$do$;

-- ============================================
-- RLS POLICIES - fa_route_operational_items
-- ============================================

DO $do$
BEGIN
  IF to_regclass('public.fa_route_operational_items') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'fa_route_operational_items'
         AND policyname = 'Admin full access to route operational items'
     ) THEN
    EXECUTE $sql$
      CREATE POLICY "Admin full access to route operational items"
      ON public.fa_route_operational_items FOR ALL
      USING (fa_get_user_role(auth.uid()) = 'admin')
      WITH CHECK (fa_get_user_role(auth.uid()) = 'admin')
    $sql$;
  END IF;
END
$do$;

DO $do$
BEGIN
  IF to_regclass('public.fa_route_operational_items') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'fa_route_operational_items'
         AND policyname = 'Ops can manage route operational items'
     ) THEN
    EXECUTE $sql$
      CREATE POLICY "Ops can manage route operational items"
      ON public.fa_route_operational_items FOR ALL
      USING (fa_get_user_role(auth.uid()) = 'ops')
      WITH CHECK (fa_get_user_role(auth.uid()) = 'ops')
    $sql$;
  END IF;
END
$do$;

-- ============================================
-- RLS POLICIES - fa_route_visit_times
-- ============================================

DO $do$
BEGIN
  IF to_regclass('public.fa_route_visit_times') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'fa_route_visit_times'
         AND policyname = 'Admin full access to route visit times'
     ) THEN
    EXECUTE $sql$
      CREATE POLICY "Admin full access to route visit times"
      ON public.fa_route_visit_times FOR ALL
      USING (fa_get_user_role(auth.uid()) = 'admin')
      WITH CHECK (fa_get_user_role(auth.uid()) = 'admin')
    $sql$;
  END IF;
END
$do$;

DO $do$
BEGIN
  IF to_regclass('public.fa_route_visit_times') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'fa_route_visit_times'
         AND policyname = 'Ops can manage route visit times'
     ) THEN
    EXECUTE $sql$
      CREATE POLICY "Ops can manage route visit times"
      ON public.fa_route_visit_times FOR ALL
      USING (fa_get_user_role(auth.uid()) = 'ops')
      WITH CHECK (fa_get_user_role(auth.uid()) = 'ops')
    $sql$;
  END IF;
END
$do$;
