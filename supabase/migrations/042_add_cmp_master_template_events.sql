-- Persistable event profiles for CMP master templates

CREATE TABLE IF NOT EXISTS cmp_master_template_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_date DATE,
  prefill_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  updated_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cmp_master_template_events_updated_at
  ON cmp_master_template_events(updated_at DESC);

ALTER TABLE cmp_master_template_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CMP access to master template events" ON cmp_master_template_events;
CREATE POLICY "CMP access to master template events"
  ON cmp_master_template_events FOR ALL
  USING (cmp_is_allowed_user())
  WITH CHECK (cmp_is_allowed_user());
