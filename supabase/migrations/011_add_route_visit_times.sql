-- Create table to store visit time overrides for routes
CREATE TABLE IF NOT EXISTS fa_route_visit_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE CASCADE,
  planned_date DATE NOT NULL,
  region TEXT,
  store_id UUID NOT NULL REFERENCES fa_stores(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(manager_user_id, planned_date, region, store_id)
);

-- Add index for querying visit times by route
CREATE INDEX IF NOT EXISTS idx_route_visit_times_route ON fa_route_visit_times(manager_user_id, planned_date, region);
CREATE INDEX IF NOT EXISTS idx_route_visit_times_store ON fa_route_visit_times(store_id);

-- Add comment
COMMENT ON TABLE fa_route_visit_times IS 'Custom visit times for stores in route schedules';
