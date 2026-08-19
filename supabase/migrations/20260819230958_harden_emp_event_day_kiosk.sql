-- Harden public EMP Event Day kiosk credentials, request throttling, and audit context.

ALTER TABLE public.emp_event_day_settings
  ADD COLUMN IF NOT EXISTS kiosk_access_id UUID,
  ADD COLUMN IF NOT EXISTS kiosk_event_date DATE,
  ADD COLUMN IF NOT EXISTS kiosk_token_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kiosk_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kiosk_revoked_at TIMESTAMPTZ;

-- Existing credentials have no trustworthy date or expiry scope. Revoke them rather
-- than silently grandfathering an unbounded public credential. Keep any PIN hash so
-- an administrator can deliberately preserve or replace it during regeneration.
UPDATE public.emp_event_day_settings
SET
  kiosk_enabled = false,
  kiosk_token_hash = NULL,
  kiosk_revoked_at = COALESCE(kiosk_revoked_at, NOW()),
  updated_at = NOW()
WHERE kiosk_token_hash IS NOT NULL;

UPDATE public.emp_event_day_settings
SET kiosk_enabled = false, updated_at = NOW()
WHERE kiosk_enabled = true AND kiosk_token_hash IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_emp_event_day_settings_kiosk_access_id
  ON public.emp_event_day_settings(kiosk_access_id)
  WHERE kiosk_access_id IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.emp_event_day_settings
    ADD CONSTRAINT emp_event_day_kiosk_token_lifecycle_complete CHECK (
      kiosk_token_hash IS NULL
      OR (
        kiosk_access_id IS NOT NULL
        AND kiosk_event_date IS NOT NULL
        AND kiosk_token_issued_at IS NOT NULL
        AND kiosk_token_expires_at IS NOT NULL
        AND kiosk_token_expires_at > kiosk_token_issued_at
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.emp_event_day_settings
    ADD CONSTRAINT emp_event_day_enabled_kiosk_is_active CHECK (
      NOT kiosk_enabled
      OR (
        kiosk_token_hash IS NOT NULL
        AND kiosk_revoked_at IS NULL
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.emp_event_equipment_events
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.emp_event_kiosk_request_limits (
  key_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key_hash, action),
  CONSTRAINT emp_event_kiosk_request_limits_action CHECK (
    action IN ('verify', 'search_staff', 'clocked_in', 'clock_in', 'clock_out', 'pin', 'worker')
  )
);

CREATE INDEX IF NOT EXISTS idx_emp_event_kiosk_request_limits_updated_at
  ON public.emp_event_kiosk_request_limits(updated_at);

CREATE TABLE IF NOT EXISTS public.emp_event_kiosk_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.emp_plans(id) ON DELETE SET NULL,
  kiosk_access_id UUID,
  event_date DATE,
  correlation_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN ('verify', 'search_staff', 'clocked_in', 'clock_in', 'clock_out')
  ),
  outcome TEXT NOT NULL CHECK (
    outcome IN ('success', 'authentication_failed', 'forbidden', 'rate_limited', 'validation_failed', 'error')
  ),
  status_code INTEGER NOT NULL CHECK (status_code BETWEEN 100 AND 599),
  client_key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_event_kiosk_request_events_plan_created_at
  ON public.emp_event_kiosk_request_events(plan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emp_event_kiosk_request_events_access_created_at
  ON public.emp_event_kiosk_request_events(kiosk_access_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emp_event_kiosk_request_events_correlation
  ON public.emp_event_kiosk_request_events(correlation_id);

ALTER TABLE public.emp_event_kiosk_request_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emp_event_kiosk_request_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.emp_event_kiosk_request_limits,
  public.emp_event_kiosk_request_events
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.emp_event_kiosk_request_limits
TO service_role;

GRANT SELECT, INSERT ON TABLE public.emp_event_kiosk_request_events
TO service_role;

CREATE OR REPLACE FUNCTION public.emp_consume_event_day_kiosk_limit(
  p_key_hash TEXT,
  p_action TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER,
  p_lock_seconds INTEGER,
  p_increment INTEGER DEFAULT 1
)
RETURNS TABLE (
  allowed BOOLEAN,
  retry_after_seconds INTEGER,
  current_count INTEGER,
  locked_until TIMESTAMPTZ,
  reservation_window_started_at TIMESTAMPTZ,
  attempt_reserved BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_row public.emp_event_kiosk_request_limits%ROWTYPE;
  v_window_end TIMESTAMPTZ;
  v_retry_until TIMESTAMPTZ;
BEGIN
  IF length(trim(COALESCE(p_key_hash, ''))) < 32 THEN
    RAISE EXCEPTION 'Invalid kiosk limiter key';
  END IF;
  IF p_action NOT IN ('verify', 'search_staff', 'clocked_in', 'clock_in', 'clock_out', 'pin', 'worker') THEN
    RAISE EXCEPTION 'Invalid kiosk limiter action';
  END IF;
  IF p_limit < 1 OR p_window_seconds < 1 OR p_lock_seconds < 0 OR p_increment < 0 THEN
    RAISE EXCEPTION 'Invalid kiosk limiter configuration';
  END IF;

  INSERT INTO public.emp_event_kiosk_request_limits (key_hash, action, window_started_at)
  VALUES (p_key_hash, p_action, v_now)
  ON CONFLICT (key_hash, action) DO NOTHING;

  SELECT *
  INTO v_row
  FROM public.emp_event_kiosk_request_limits AS request_limit
  WHERE request_limit.key_hash = p_key_hash
    AND request_limit.action = p_action
  FOR UPDATE;

  v_window_end := v_row.window_started_at + make_interval(secs => p_window_seconds);
  IF v_window_end <= v_now THEN
    UPDATE public.emp_event_kiosk_request_limits AS request_limit
    SET
      window_started_at = v_now,
      request_count = 0,
      locked_until = NULL,
      updated_at = v_now
    WHERE request_limit.key_hash = p_key_hash
      AND request_limit.action = p_action
    RETURNING * INTO v_row;
    v_window_end := v_now + make_interval(secs => p_window_seconds);
  END IF;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > v_now THEN
    RETURN QUERY SELECT
      false,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.locked_until - v_now)))::INTEGER),
      v_row.request_count,
      v_row.locked_until,
      v_row.window_started_at,
      false;
    RETURN;
  END IF;

  IF p_increment > 0 THEN
    UPDATE public.emp_event_kiosk_request_limits AS request_limit
    SET
      request_count = request_limit.request_count + p_increment,
      updated_at = v_now
    WHERE request_limit.key_hash = p_key_hash
      AND request_limit.action = p_action
    RETURNING * INTO v_row;
  END IF;

  IF v_row.request_count >= p_limit THEN
    v_retry_until := CASE
      WHEN p_lock_seconds > 0 THEN v_now + make_interval(secs => p_lock_seconds)
      ELSE v_window_end
    END;
    UPDATE public.emp_event_kiosk_request_limits AS request_limit
    SET locked_until = v_retry_until, updated_at = v_now
    WHERE request_limit.key_hash = p_key_hash
      AND request_limit.action = p_action;
    RETURN QUERY SELECT
      false,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_retry_until - v_now)))::INTEGER),
      v_row.request_count,
      v_retry_until,
      v_row.window_started_at,
      p_increment > 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true,
    0,
    v_row.request_count,
    NULL::TIMESTAMPTZ,
    v_row.window_started_at,
    p_increment > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.emp_consume_event_day_kiosk_limit(TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.emp_consume_event_day_kiosk_limit(TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER)
TO service_role;
