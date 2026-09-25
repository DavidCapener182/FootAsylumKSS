-- UNAPPLIED DRAFT. A single explicit per-user, per-store authorization list.
-- Provision verified user IDs only after the corresponding account exists.
-- This table grants no direct browser/Data API access and does not alter
-- permissions on stores, FRAs, actions, or other application tables.
BEGIN;

CREATE TABLE public.fa_fra_store_access (
  user_id uuid NOT NULL REFERENCES public.fa_profiles(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.fa_stores(id) ON DELETE RESTRICT,
  access_level text NOT NULL CHECK (access_level IN ('client_admin','area_manager')),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, store_id, access_level)
);
CREATE INDEX fa_fra_store_access_store_idx ON public.fa_fra_store_access(store_id)
  WHERE is_active;
ALTER TABLE public.fa_fra_store_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fa_fra_store_access FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fa_fra_store_access TO service_role;

-- Fail closed if a scoped role is assigned without a reviewed store grant.
CREATE FUNCTION public.fa_fra_guard_scoped_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.role::text IN ('client_admin','area_manager') AND
     (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM NEW.role) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.fa_fra_store_access a
      JOIN public.fa_stores s ON s.id = a.store_id
      WHERE a.user_id = NEW.id AND a.access_level = NEW.role::text AND a.is_active
        AND (NEW.role::text = 'client_admin' OR s.is_active)
    ) THEN
      RAISE EXCEPTION 'Active FRA store assignment required before scoped role activation'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fa_fra_guard_scoped_role() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS fa_fra_guard_scoped_role ON public.fa_profiles;
CREATE TRIGGER fa_fra_guard_scoped_role BEFORE INSERT OR UPDATE OF role
ON public.fa_profiles FOR EACH ROW EXECUTE FUNCTION public.fa_fra_guard_scoped_role();

COMMIT;
