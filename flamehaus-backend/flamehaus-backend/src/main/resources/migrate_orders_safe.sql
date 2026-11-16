-- =============================================================================
--  MIGRATION: Add missing columns to orders table
--  Compatible with MySQL 5.7+ and MySQL 8.x
--  Each block checks INFORMATION_SCHEMA before altering — safe to run again.
-- =============================================================================

USE flamehaus_db;

-- 1. payment_method
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA='flamehaus_db' AND TABLE_NAME='orders' AND COLUMN_NAME='payment_method');
SET @sql = IF(@col = 0,
    'ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20) NULL',
    'SELECT "payment_method already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. payment_status
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA='flamehaus_db' AND TABLE_NAME='orders' AND COLUMN_NAME='payment_status');
SET @sql = IF(@col = 0,
    'ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT ''PENDING''',
    'SELECT "payment_status already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. delivery_lat
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA='flamehaus_db' AND TABLE_NAME='orders' AND COLUMN_NAME='delivery_lat');
SET @sql = IF(@col = 0,
    'ALTER TABLE orders ADD COLUMN delivery_lat DOUBLE NULL',
    'SELECT "delivery_lat already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. delivery_lng
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA='flamehaus_db' AND TABLE_NAME='orders' AND COLUMN_NAME='delivery_lng');
SET @sql = IF(@col = 0,
    'ALTER TABLE orders ADD COLUMN delivery_lng DOUBLE NULL',
    'SELECT "delivery_lng already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. estimated_delivery
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA='flamehaus_db' AND TABLE_NAME='orders' AND COLUMN_NAME='estimated_delivery');
SET @sql = IF(@col = 0,
    'ALTER TABLE orders ADD COLUMN estimated_delivery DATETIME NULL',
    'SELECT "estimated_delivery already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. tracking_note
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA='flamehaus_db' AND TABLE_NAME='orders' AND COLUMN_NAME='tracking_note');
SET @sql = IF(@col = 0,
    'ALTER TABLE orders ADD COLUMN tracking_note VARCHAR(300) NULL',
    'SELECT "tracking_note already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. updated_at
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA='flamehaus_db' AND TABLE_NAME='orders' AND COLUMN_NAME='updated_at');
SET @sql = IF(@col = 0,
    'ALTER TABLE orders ADD COLUMN updated_at DATETIME NULL',
    'SELECT "updated_at already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verify: show final orders table structure
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM   INFORMATION_SCHEMA.COLUMNS
WHERE  TABLE_SCHEMA = 'flamehaus_db'
  AND  TABLE_NAME   = 'orders'
ORDER  BY ORDINAL_POSITION;
