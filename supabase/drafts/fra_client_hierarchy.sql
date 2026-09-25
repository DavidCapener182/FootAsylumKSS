-- SUPERSEDED: DO NOT APPLY. The broad hierarchy rollout was rejected; see fra_store_access_service_only.sql.
-- UNAPPLIED DRAFT. Depends on fra_client_roles.sql and
-- fra_action_persistence.sql. Review legacy client policies and run a full
-- cross-role RLS test before applying. No assignments or access are seeded.
BEGIN;

CREATE TABLE public.fa_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(btrim(name)) BETWEEN 1 AND 200)
);

CREATE TABLE public.fa_client_management_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.fa_clients(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  UNIQUE (client_id, id), UNIQUE (client_id, name)
);

CREATE TABLE public.fa_client_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  -- Nullable until Footasylum confirms the separate management regions.
  management_region_id uuid,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  FOREIGN KEY (client_id, management_region_id)
    REFERENCES public.fa_client_management_regions(client_id, id) ON DELETE RESTRICT,
  UNIQUE (client_id, id), UNIQUE (client_id, name)
);

-- A store has one client/management area assignment. This hierarchy is
-- independent of fa_stores.region (KSS operations/routes) and the legacy
-- reporting_area_manager_email contact field.
CREATE TABLE public.fa_client_store_memberships (
  store_id uuid PRIMARY KEY REFERENCES public.fa_stores(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL,
  area_id uuid NOT NULL,
  -- Closed stores remain in Client Admin history but are not manager tasks.
  manager_visible boolean NOT NULL DEFAULT false,
  FOREIGN KEY (client_id, area_id)
    REFERENCES public.fa_client_areas(client_id, id) ON DELETE RESTRICT
);
CREATE INDEX fa_client_stores_client_area_idx
  ON public.fa_client_store_memberships(client_id, area_id);

CREATE TABLE public.fa_client_memberships (
  user_id uuid PRIMARY KEY REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.fa_clients(id) ON DELETE RESTRICT,
  access_level text NOT NULL CHECK (access_level IN ('client_admin', 'area_manager')),
  is_active boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, client_id)
);
CREATE INDEX fa_client_memberships_client_idx
  ON public.fa_client_memberships(client_id, access_level) WHERE is_active;

CREATE TABLE public.fa_client_area_assignments (
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  area_id uuid NOT NULL,
  PRIMARY KEY (user_id, area_id),
  FOREIGN KEY (user_id, client_id)
    REFERENCES public.fa_client_memberships(user_id, client_id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id, area_id)
    REFERENCES public.fa_client_areas(client_id, id) ON DELETE RESTRICT
);
CREATE INDEX fa_client_area_assignments_area_idx
  ON public.fa_client_area_assignments(client_id, area_id);

-- The existing administrator role-change RPC can activate a profile in the
-- same transaction. Fail that change unless the corresponding client/area
-- membership has already been reviewed and activated. This guards direct
-- trusted SQL as well as the application action.
CREATE FUNCTION fa_private.fra_guard_scoped_role_assignment() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
    AND NEW.role::text IN ('client_admin','area_manager') THEN
    IF NOT EXISTS (SELECT 1 FROM public.fa_client_memberships m
      WHERE m.user_id=NEW.id AND m.access_level=NEW.role::text AND m.is_active) THEN
      RAISE EXCEPTION 'Active client membership required before scoped role assignment' USING ERRCODE='42501';
    END IF;
    IF NEW.role::text='area_manager' AND NOT EXISTS (
      SELECT 1 FROM public.fa_client_area_assignments aa
      JOIN public.fa_client_memberships m ON m.user_id=aa.user_id AND m.client_id=aa.client_id
      WHERE aa.user_id=NEW.id AND m.access_level='area_manager' AND m.is_active
    ) THEN
      RAISE EXCEPTION 'Reviewed area assignment required before Area Manager role' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fa_profiles_guard_scoped_role_assignment
  BEFORE UPDATE OF role ON public.fa_profiles
  FOR EACH ROW EXECUTE FUNCTION fa_private.fra_guard_scoped_role_assignment();
REVOKE ALL ON FUNCTION fa_private.fra_guard_scoped_role_assignment()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fa_private.fra_guard_scoped_role_assignment() TO service_role;

-- No client or manager can write membership rows directly. An audited KSS
-- administration command must create/activate assignments after review.
ALTER TABLE public.fa_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fa_client_management_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fa_client_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fa_client_store_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fa_client_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fa_client_area_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fa_clients, public.fa_client_management_regions,
  public.fa_client_areas, public.fa_client_store_memberships,
  public.fa_client_memberships, public.fa_client_area_assignments
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fa_clients, public.fa_client_management_regions,
  public.fa_client_areas, public.fa_client_store_memberships,
  public.fa_client_memberships, public.fa_client_area_assignments
  TO authenticated;
GRANT ALL ON public.fa_clients, public.fa_client_management_regions,
  public.fa_client_areas, public.fa_client_store_memberships,
  public.fa_client_memberships, public.fa_client_area_assignments
  TO service_role;

-- The existing status-aware fa_private.get_user_role helper reads the profile
-- without recursive profile RLS. Suspended accounts return pending.
CREATE POLICY fra_client_membership_self ON public.fa_client_memberships
  FOR SELECT TO authenticated USING (
    user_id = (SELECT auth.uid())
    AND is_active
    AND access_level = fa_private.get_user_role((SELECT auth.uid()))::text
  );
CREATE POLICY fra_client_area_assignment_self ON public.fa_client_area_assignments
  FOR SELECT TO authenticated USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.fa_client_memberships m
      WHERE m.user_id = (SELECT auth.uid()) AND m.client_id = fa_client_area_assignments.client_id
        AND m.access_level = 'area_manager' AND m.is_active
        AND m.access_level = fa_private.get_user_role((SELECT auth.uid()))::text)
  );
CREATE POLICY fra_client_store_assignment_read ON public.fa_client_store_memberships
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.fa_client_memberships m
      WHERE m.user_id = (SELECT auth.uid()) AND m.client_id = fa_client_store_memberships.client_id
        AND m.access_level = 'client_admin' AND m.is_active
        AND m.access_level = fa_private.get_user_role((SELECT auth.uid()))::text)
    OR EXISTS (SELECT 1 FROM public.fa_client_memberships m
      JOIN public.fa_client_area_assignments a
        ON a.user_id = m.user_id AND a.client_id = m.client_id
      WHERE m.user_id = (SELECT auth.uid()) AND m.client_id = fa_client_store_memberships.client_id
        AND m.access_level = 'area_manager' AND m.is_active
        AND m.access_level = fa_private.get_user_role((SELECT auth.uid()))::text
        AND a.area_id = fa_client_store_memberships.area_id
        AND fa_client_store_memberships.manager_visible)
  );

-- Deliberately expose a narrow store directory. A view owner can bypass the
-- underlying fa_stores RLS, so its own predicate checks the current token,
-- active profile role, active membership, client and assigned area. Never
-- add operational region, route sequence, staff data or raw PDF paths here.
CREATE VIEW public.fa_client_store_directory WITH (security_barrier = true) AS
SELECT s.id, s.store_code, s.store_name,
  a.name AS reporting_area,
  s.reporting_area_manager_name
FROM public.fa_stores s
JOIN public.fa_client_store_memberships csm ON csm.store_id = s.id
JOIN public.fa_client_areas a ON a.id = csm.area_id AND a.client_id = csm.client_id
WHERE EXISTS (
  SELECT 1 FROM public.fa_client_memberships m
  WHERE m.user_id = (SELECT auth.uid())
    AND m.client_id = csm.client_id
    AND m.is_active
    AND m.access_level = fa_private.get_user_role((SELECT auth.uid()))::text
    AND (m.access_level = 'client_admin' OR
      (m.access_level = 'area_manager' AND EXISTS (
        SELECT 1 FROM public.fa_client_area_assignments caa
        WHERE caa.user_id = m.user_id AND caa.client_id = m.client_id
          AND caa.area_id = csm.area_id AND csm.manager_visible)))
);
REVOKE ALL ON public.fa_client_store_directory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fa_client_store_directory TO authenticated, service_role;

-- The action table includes internal provenance, reviewer IDs and raw PDF
-- paths. Keep its existing KSS-only RLS policy. Client roles read only the
-- explicit board fields below. Event payloads remain KSS-only as well.
CREATE VIEW public.fa_client_fra_action_board WITH (security_barrier = true) AS
SELECT a.id, a.store_id, a.recommendation, a.priority, a.status,
  a.version, a.pdf_page, a.source_origin, a.created_at
FROM public.fa_fra_actions a
JOIN public.fa_client_store_memberships csm ON csm.store_id = a.store_id
WHERE EXISTS (
  SELECT 1 FROM public.fa_client_memberships m
  WHERE m.user_id = (SELECT auth.uid())
    AND m.client_id = csm.client_id
    AND m.is_active
    AND m.access_level = fa_private.get_user_role((SELECT auth.uid()))::text
    AND (m.access_level = 'client_admin' OR
      (m.access_level = 'area_manager' AND EXISTS (
        SELECT 1 FROM public.fa_client_area_assignments caa
        WHERE caa.user_id = m.user_id AND caa.client_id = m.client_id
          AND caa.area_id = csm.area_id AND csm.manager_visible)))
);
REVOKE ALL ON public.fa_client_fra_action_board FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fa_client_fra_action_board TO authenticated, service_role;

COMMIT;
