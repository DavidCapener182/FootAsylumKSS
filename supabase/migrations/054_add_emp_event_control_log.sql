-- Plan-linked live Event Control Log for EMP events

CREATE TABLE IF NOT EXISTS public.emp_event_control_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.emp_plans(id) ON DELETE CASCADE,
  log_number INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  from_call_sign TEXT,
  to_call_sign TEXT,
  occurrence TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'operational',
  action_taken TEXT,
  owner TEXT,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'monitoring', 'closed')),
  created_by_user_id UUID NOT NULL REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  updated_by_user_id UUID NOT NULL REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, log_number)
);

CREATE INDEX IF NOT EXISTS idx_emp_event_control_log_entries_plan_logged_at
  ON public.emp_event_control_log_entries(plan_id, logged_at DESC, log_number DESC);

ALTER TABLE public.emp_event_control_log_entries
  DROP CONSTRAINT IF EXISTS emp_event_control_log_entries_message_type_check;

ALTER TABLE public.emp_event_control_log_entries
  DROP CONSTRAINT IF EXISTS emp_event_control_log_entries_message_type_not_blank;

ALTER TABLE public.emp_event_control_log_entries
  ADD CONSTRAINT emp_event_control_log_entries_message_type_not_blank
  CHECK (length(trim(message_type)) > 0);

ALTER TABLE public.emp_event_control_log_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "EMP access to event control log entries" ON public.emp_event_control_log_entries;
DROP POLICY IF EXISTS "EMP can view event control log entries" ON public.emp_event_control_log_entries;
DROP POLICY IF EXISTS "EMP can create event control log entries" ON public.emp_event_control_log_entries;
DROP POLICY IF EXISTS "EMP can update event control log entries" ON public.emp_event_control_log_entries;

CREATE POLICY "EMP can view event control log entries"
  ON public.emp_event_control_log_entries FOR SELECT
  TO authenticated
  USING (public.emp_is_allowed_user());

CREATE POLICY "EMP can create event control log entries"
  ON public.emp_event_control_log_entries FOR INSERT
  TO authenticated
  WITH CHECK (public.emp_is_allowed_user());

CREATE POLICY "EMP can update event control log entries"
  ON public.emp_event_control_log_entries FOR UPDATE
  TO authenticated
  USING (public.emp_is_allowed_user())
  WITH CHECK (public.emp_is_allowed_user());
