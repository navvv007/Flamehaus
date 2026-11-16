USE flamehaus_db;

-- Re-runnable. MariaDB syntax (ADD COLUMN / CREATE INDEX / CREATE TABLE ... IF NOT EXISTS).

-- 1) Cancellation log. The SLA job writes cancelled_by = 'SYSTEM' (auto) or 'ADMIN'.
CREATE TABLE IF NOT EXISTS order_cancellations (
    id                   BIGINT       NOT NULL AUTO_INCREMENT,
    order_id             BIGINT       NOT NULL,
    cancelled_by         VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER',
    cancelled_by_name    VARCHAR(100) NULL,
    reason               VARCHAR(300) NULL,
    cancelled_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refund_status        VARCHAR(20)  NOT NULL DEFAULT 'NOT_APPLICABLE',
    refund_id            VARCHAR(100) NULL,
    refund_amount        DOUBLE       NULL,
    refund_gateway       VARCHAR(20)  NULL,
    refund_initiated_at  DATETIME     NULL,
    refund_completed_at  DATETIME     NULL,
    refund_note          VARCHAR(300) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cancel_order (order_id),
    CONSTRAINT fk_cancel_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

-- 2) Columns the job writes on orders / payments (no-ops if they already exist).
ALTER TABLE orders   ADD COLUMN IF NOT EXISTS payment_status  VARCHAR(20)  NULL;
ALTER TABLE orders   ADD COLUMN IF NOT EXISTS tracking_note   VARCHAR(500) NULL;
ALTER TABLE orders   ADD COLUMN IF NOT EXISTS updated_at      DATETIME     NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_id       VARCHAR(100) NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status   VARCHAR(20)  NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at     DATETIME     NULL;

-- 3) Indexes so the once-a-minute scan stays fast as history grows.
CREATE INDEX IF NOT EXISTS idx_da_status_assigned ON delivery_assignments (status, assigned_at);
CREATE INDEX IF NOT EXISTS idx_oc_by_id           ON order_cancellations (cancelled_by, id);

-- 4) Check: the SLA job sets assignments to FAILED, so the status CHECK must allow it.
--    Expect FAILED (and REJECTED) to appear in the definition below.
SHOW CREATE TABLE delivery_assignments;

-- ── TESTING WITHOUT WAITING 2 HOURS ─────────────────────────────────────────
-- Option A (preferred): set app.delivery.timeout-minutes=2 and restart the backend.
-- Option B: make a live assignment look old, then wait up to a minute:
--   UPDATE delivery_assignments
--      SET assigned_at = NOW() - INTERVAL 3 HOUR
--    WHERE id = <assignment id> AND status IN ('ASSIGNED','ACCEPTED','PICKED_UP');
-- Then check:
--   SELECT * FROM order_cancellations WHERE cancelled_by = 'SYSTEM' ORDER BY id DESC;
