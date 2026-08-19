-- Allocate incident references atomically. The previous MAX(reference_no) + 1
-- implementation could return the same value to concurrent requests.

CREATE TABLE IF NOT EXISTS public.fa_incident_reference_counters (
  incident_year INTEGER PRIMARY KEY,
  last_value BIGINT NOT NULL CHECK (last_value >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fa_incident_reference_counters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.fa_incident_reference_counters FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.fa_incident_reference_counters TO service_role;

-- Seed/reconcile the counter from references already issued before this migration.
INSERT INTO public.fa_incident_reference_counters (incident_year, last_value)
SELECT
  substring(reference_no FROM '^INC-([0-9]{4})-[0-9]+$')::INTEGER AS incident_year,
  MAX(substring(reference_no FROM '^INC-[0-9]{4}-([0-9]+)$')::BIGINT) AS last_value
FROM (
  SELECT reference_no FROM public.fa_incidents
) AS issued_references
WHERE reference_no ~ '^INC-[0-9]{4}-[0-9]+$'
GROUP BY 1
ON CONFLICT (incident_year) DO UPDATE
SET
  last_value = GREATEST(
    public.fa_incident_reference_counters.last_value,
    EXCLUDED.last_value
  ),
  updated_at = NOW();

-- Some deployed environments contain the legacy closed-incidents archive even
-- though it is not part of a reproducible clean migration. Include it when it
-- exists so an archived reference can never be reissued.
DO $$
BEGIN
  IF to_regclass('public.fa_closed_incidents') IS NOT NULL THEN
    EXECUTE $seed_closed$
      INSERT INTO public.fa_incident_reference_counters (incident_year, last_value)
      SELECT
        substring(reference_no FROM '^INC-([0-9]{4})-[0-9]+$')::INTEGER,
        MAX(substring(reference_no FROM '^INC-[0-9]{4}-([0-9]+)$')::BIGINT)
      FROM public.fa_closed_incidents
      WHERE reference_no ~ '^INC-[0-9]{4}-[0-9]+$'
      GROUP BY 1
      ON CONFLICT (incident_year) DO UPDATE
      SET
        last_value = GREATEST(
          public.fa_incident_reference_counters.last_value,
          EXCLUDED.last_value
        ),
        updated_at = NOW()
    $seed_closed$;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fa_generate_incident_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  reference_year INTEGER := EXTRACT(YEAR FROM clock_timestamp())::INTEGER;
  next_value BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Allocation is part of incident creation, not a general authenticated
  -- utility. The shared helper also enforces account lifecycle and (for
  -- privileged roles) the required authenticator assurance level.
  IF COALESCE(
    fa_private.get_user_role(auth.uid()),
    'pending'::public.fa_user_role
  ) NOT IN (
    'admin'::public.fa_user_role,
    'ops'::public.fa_user_role
  ) THEN
    RAISE EXCEPTION 'Incident management permission required'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.fa_incident_reference_counters (
    incident_year,
    last_value,
    updated_at
  )
  VALUES (reference_year, 1, clock_timestamp())
  ON CONFLICT (incident_year) DO UPDATE
  SET
    last_value = public.fa_incident_reference_counters.last_value + 1,
    updated_at = clock_timestamp()
  RETURNING last_value INTO next_value;

  RETURN format('INC-%s-%s', reference_year, lpad(next_value::TEXT, 6, '0'));
END;
$$;

REVOKE ALL ON FUNCTION public.fa_generate_incident_reference() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fa_generate_incident_reference() TO authenticated;
