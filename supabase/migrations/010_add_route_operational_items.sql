-- Create table to store operational items for routes
CREATE TABLE IF NOT EXISTS fa_route_operational_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE CASCADE,
  planned_date DATE NOT NULL,
  region TEXT,
  title TEXT NOT NULL,
  location TEXT,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(manager_user_id, planned_date, region, start_time, title)
);

-- Add index for querying operational items by route
CREATE INDEX IF NOT EXISTS idx_route_operational_items_route ON fa_route_operational_items(manager_user_id, planned_date, region);

-- Add comment
COMMENT ON TABLE fa_route_operational_items IS 'Operational items (meetings, breaks, etc.) for route schedules';
