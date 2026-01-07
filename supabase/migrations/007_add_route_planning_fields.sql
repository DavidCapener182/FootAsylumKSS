-- Add fields for route planning
-- Add latitude/longitude to stores for mapping
ALTER TABLE fa_stores
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- Add home address fields to profiles for route planning
ALTER TABLE fa_profiles
ADD COLUMN IF NOT EXISTS home_address TEXT,
ADD COLUMN IF NOT EXISTS home_latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS home_longitude NUMERIC(11, 8);

-- Add index for location queries
CREATE INDEX IF NOT EXISTS idx_stores_location ON fa_stores(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_home_location ON fa_profiles(home_latitude, home_longitude) WHERE home_latitude IS NOT NULL AND home_longitude IS NOT NULL;

-- Add comments
COMMENT ON COLUMN fa_stores.latitude IS 'Store latitude for mapping and route planning';
COMMENT ON COLUMN fa_stores.longitude IS 'Store longitude for mapping and route planning';
COMMENT ON COLUMN fa_profiles.home_address IS 'Manager home address for route planning start point';
COMMENT ON COLUMN fa_profiles.home_latitude IS 'Manager home latitude for route planning';
COMMENT ON COLUMN fa_profiles.home_longitude IS 'Manager home longitude for route planning';
