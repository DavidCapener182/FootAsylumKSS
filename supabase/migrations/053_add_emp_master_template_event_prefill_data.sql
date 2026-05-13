ALTER TABLE public.emp_master_template_events
  ADD COLUMN IF NOT EXISTS prefill_data JSONB NOT NULL DEFAULT '{}'::jsonb;

