-- Event Control Log entries should be editable but not deletable.

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
