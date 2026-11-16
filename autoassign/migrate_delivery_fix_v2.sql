-- ── Fix: remove UNIQUE on delivery_assignments.order_id ──────────────────────
-- Cannot drop the index directly because a FK uses it.
-- Steps: drop FK → drop unique index → add plain index → recreate FK

USE flamehaus_db;

-- Step 1: Drop the foreign key that references the unique index
ALTER TABLE delivery_assignments DROP FOREIGN KEY fk_da_order;

-- Step 2: Now drop the unique index (no longer referenced by a FK)
ALTER TABLE delivery_assignments DROP INDEX uk_da_order;

-- Step 3: Add a plain non-unique index for query performance
ALTER TABLE delivery_assignments ADD INDEX idx_da_order_id (order_id);

-- Step 4: Recreate the foreign key using the new plain index
ALTER TABLE delivery_assignments
  ADD CONSTRAINT fk_da_order
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

-- Step 5: Add missing columns (safe — skips if already present)
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS rejected_at           DATETIME     NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS rejection_reason      VARCHAR(300) NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS reassign_count        INT          NULL DEFAULT 0;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS partner_order_rating  INT          NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS partner_order_comment VARCHAR(300) NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS partner_rated_at      DATETIME     NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS rated_at              DATETIME     NULL;

-- Verify
SELECT 'Done — unique constraint removed, FK recreated' AS result;
SELECT COUNT(*) AS total_assignments FROM delivery_assignments;
