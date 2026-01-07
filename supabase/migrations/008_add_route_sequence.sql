-- Add route sequence field to track store order within a planned route
ALTER TABLE fa_stores
ADD COLUMN IF NOT EXISTS route_sequence INTEGER;

-- Add index for performance when querying stores by route sequence
CREATE INDEX IF NOT EXISTS idx_stores_route_sequence ON fa_stores(route_sequence) 
WHERE route_sequence IS NOT NULL AND compliance_audit_2_planned_date IS NOT NULL;

-- Add comment
COMMENT ON COLUMN fa_stores.route_sequence IS 'Order/sequence of store within a planned route (same manager, date, region)';
