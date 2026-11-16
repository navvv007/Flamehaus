-- Run this once against flamehaus_db
-- Adds rejection fields to delivery_assignments table

USE flamehaus_db;

ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS rejected_at       DATETIME     NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS rejection_reason  VARCHAR(300) NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS reassign_count    INT          NOT NULL DEFAULT 0;

-- Verify
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'flamehaus_db'
  AND TABLE_NAME   = 'delivery_assignments'
  AND COLUMN_NAME  IN ('rejected_at','rejection_reason','reassign_count');
