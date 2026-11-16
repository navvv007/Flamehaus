-- ── Fix: remove UNIQUE constraint on order_id in delivery_assignments ────────
-- This allows multiple assignment rows per order (one REJECTED + one new ASSIGNED)
-- The active assignment is found by status, not by uniqueness.

USE flamehaus_db;

-- Drop the unique constraint
ALTER TABLE delivery_assignments DROP INDEX uk_da_order;

-- Add a regular index for query performance (non-unique)
ALTER TABLE delivery_assignments ADD INDEX idx_da_order_id (order_id);

-- Add missing columns if not already present (safe to run even if they exist)
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS rejected_at        DATETIME     NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS rejection_reason   VARCHAR(300) NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS reassign_count     INT          NULL DEFAULT 0;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS partner_order_rating  INT       NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS partner_order_comment VARCHAR(300) NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS partner_rated_at   DATETIME     NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS rated_at           DATETIME     NULL;

-- Verify
SELECT 'delivery_assignments' AS tbl, COUNT(*) AS cnt FROM delivery_assignments;
