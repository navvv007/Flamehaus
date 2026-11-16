-- =============================================================================
--  MIGRATION: Add missing columns to orders table
--  Works in MySQL Workbench, DBeaver, mysql CLI — any client.
--  Run each ALTER TABLE one at a time.
--  If a column already exists you will get "Duplicate column name" — ignore it.
-- =============================================================================

USE flamehaus_db;

ALTER TABLE orders ADD COLUMN payment_method     VARCHAR(20)  NULL;
ALTER TABLE orders ADD COLUMN payment_status     VARCHAR(20)  NOT NULL DEFAULT 'PENDING';
ALTER TABLE orders ADD COLUMN delivery_lat       DOUBLE       NULL;
ALTER TABLE orders ADD COLUMN delivery_lng       DOUBLE       NULL;
ALTER TABLE orders ADD COLUMN estimated_delivery DATETIME     NULL;
ALTER TABLE orders ADD COLUMN tracking_note      VARCHAR(300) NULL;
ALTER TABLE orders ADD COLUMN updated_at         DATETIME     NULL;

-- Confirm the final table structure
DESCRIBE orders;
