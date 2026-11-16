USE flamehaus_db;

-- ============================================================================
-- Consolidated, re-runnable migration. Safe to run more than once.
-- (MariaDB: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS are supported)
-- ============================================================================

-- ── orders ──────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id          BIGINT       NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status       VARCHAR(20)  NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method       VARCHAR(30)  NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery   DATETIME     NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_note        VARCHAR(500) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_line1        VARCHAR(200) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_line2        VARCHAR(200) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS landmark             VARCHAR(100) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city                 VARCHAR(100) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS state                VARCHAR(100) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pincode              VARCHAR(10)  NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat         DOUBLE       NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng         DOUBLE       NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code          VARCHAR(30)  NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount_inr  DOUBLE       NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at           DATETIME     NULL;

-- ── delivery_partners ───────────────────────────────────────────────────────
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS current_lat          DOUBLE   NULL;
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS current_lng          DOUBLE   NULL;
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS location_updated_at  DATETIME NULL;

-- ── delivery_assignments ────────────────────────────────────────────────────
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS rejected_at            DATETIME     NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS rejection_reason       VARCHAR(300) NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS reassign_count         INT          NULL DEFAULT 0;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS partner_order_rating   INT          NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS partner_order_comment  VARCHAR(300) NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS partner_rated_at       DATETIME     NULL;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS rated_at               DATETIME     NULL;

-- ── payments (refund tracking) ──────────────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_id      VARCHAR(100) NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status  VARCHAR(20)  NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at    DATETIME     NULL;

-- ── customer_addresses ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_addresses (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    customer_id   BIGINT       NOT NULL,
    label         VARCHAR(50)  NULL DEFAULT 'Home',
    address_line1 VARCHAR(200) NOT NULL,
    address_line2 VARCHAR(200) NULL,
    landmark      VARCHAR(100) NULL,
    city          VARCHAR(100) NOT NULL,
    state         VARCHAR(100) NOT NULL,
    pincode       VARCHAR(10)  NOT NULL,
    country       VARCHAR(100) NULL DEFAULT 'India',
    latitude      DOUBLE       NULL,
    longitude     DOUBLE       NULL,
    is_default    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_ca_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
);

-- ── coupons ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
    id                   BIGINT       NOT NULL AUTO_INCREMENT,
    code                 VARCHAR(30)  NOT NULL,
    description          VARCHAR(100) NOT NULL,
    discount_type        VARCHAR(20)  NOT NULL DEFAULT 'PERCENTAGE',
    discount_value       DOUBLE       NOT NULL,
    minimum_order_amount DOUBLE       NOT NULL DEFAULT 700.0,
    maximum_discount     DOUBLE       NULL,
    usage_limit          INT          NULL,
    usage_count          INT          NOT NULL DEFAULT 0,
    per_customer_limit   INT          NOT NULL DEFAULT 1,
    active               TINYINT(1)   NOT NULL DEFAULT 1,
    created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at           DATETIME     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_coupon_code (code)
);

CREATE TABLE IF NOT EXISTS coupon_usage (
    id                  BIGINT   NOT NULL AUTO_INCREMENT,
    coupon_id           BIGINT   NOT NULL,
    customer_id         BIGINT   NULL,
    order_id            BIGINT   NOT NULL,
    discount_amount_inr DOUBLE   NOT NULL,
    used_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cu_order (order_id),
    CONSTRAINT fk_cu_coupon   FOREIGN KEY (coupon_id)   REFERENCES coupons   (id),
    CONSTRAINT fk_cu_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_cu_order    FOREIGN KEY (order_id)    REFERENCES orders    (id) ON DELETE CASCADE
);

-- ── order_cancellations ─────────────────────────────────────────────────────
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

-- ── Verify: list every table the app expects ────────────────────────────────
SELECT TABLE_NAME, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'flamehaus_db'
ORDER BY TABLE_NAME;
