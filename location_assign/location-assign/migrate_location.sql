USE flamehaus_db;

-- Add GPS columns to delivery_partners if not present
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS current_lat         DOUBLE   NULL;
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS current_lng         DOUBLE   NULL;
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS location_updated_at DATETIME NULL;

-- Add GPS columns to orders if not present (for delivery drop point)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE NULL;

-- Index for fast nearest-partner query
ALTER TABLE delivery_partners ADD INDEX IF NOT EXISTS idx_dp_availability_status (availability, status);
ALTER TABLE delivery_partners ADD INDEX IF NOT EXISTS idx_dp_gps (current_lat, current_lng);

SELECT 'Location columns ready' AS result;