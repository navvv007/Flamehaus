USE flamehaus_db;

-- Add refund status tracking to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_id     VARCHAR(100) NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20)  NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at   DATETIME     NULL;

-- Index for timeout scheduler query on delivery_assignments
ALTER TABLE delivery_assignments ADD INDEX IF NOT EXISTS idx_da_status_assigned (status, assigned_at);

SELECT 'Timeout migration done' AS result;