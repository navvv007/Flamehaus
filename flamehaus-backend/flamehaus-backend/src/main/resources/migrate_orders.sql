-- =============================================================================
--  MIGRATION: Add missing columns to the orders table
--  Run this ONCE against your flamehaus_db database.
--  These columns were added to the Order entity after the table was first
--  created, and ddl-auto=update does not add missing columns retroactively.
--
--  Usage:
--    mysql -u root -p flamehaus_db < migrate_orders.sql
--  or paste each ALTER TABLE into MySQL Workbench / DBeaver.
-- =============================================================================

USE flamehaus_db;

-- 1. payment_method  — RAZORPAY | STRIPE | COD  (nullable)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NULL;

-- 2. payment_status  — PENDING | PAID | FAILED  (not null, default PENDING)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';

-- 3. delivery_lat    — customer GPS latitude  (nullable)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE NULL;

-- 4. delivery_lng    — customer GPS longitude  (nullable)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE NULL;

-- 5. estimated_delivery — ETA datetime set when status advances  (nullable)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS estimated_delivery DATETIME NULL;

-- 6. tracking_note   — human-readable status note  (nullable)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS tracking_note VARCHAR(300) NULL;

-- 7. updated_at      — timestamp of last status change  (nullable)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL;

-- Verify all columns are present
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM   INFORMATION_SCHEMA.COLUMNS
WHERE  TABLE_SCHEMA = 'flamehaus_db'
  AND  TABLE_NAME   = 'orders'
ORDER  BY ORDINAL_POSITION;
