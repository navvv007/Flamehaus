-- =============================================================================
--  DELIVERY PARTNER MODULE — Database Migration
--  Compatible with MySQL 5.7+ and MariaDB 10.x+
-- =============================================================================

USE flamehaus_db;

-- ── 1. delivery_partners ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_partners (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    name              VARCHAR(120)  NOT NULL,
    email             VARCHAR(150)  NOT NULL,
    password          VARCHAR(255)  NOT NULL,
    phone             VARCHAR(20)   NOT NULL,
    vehicle_number    VARCHAR(20)   NULL,
    vehicle_type      VARCHAR(50)   NOT NULL DEFAULT 'Bike',
    status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    availability      VARCHAR(20)   NOT NULL DEFAULT 'OFFLINE',
    current_lat       DOUBLE        NULL,
    current_lng       DOUBLE        NULL,
    rating            DOUBLE        NULL DEFAULT 0.0,
    total_deliveries  INT           NULL DEFAULT 0,
    total_ratings     INT           NULL DEFAULT 0,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at       DATETIME      NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_dp_email (email),
    UNIQUE KEY uk_dp_phone (phone)
);

-- ── 2. delivery_assignments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_assignments (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    order_id        BIGINT       NOT NULL,
    partner_id      BIGINT       NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ASSIGNED',
    assigned_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at     DATETIME     NULL,
    picked_up_at    DATETIME     NULL,
    delivered_at    DATETIME     NULL,
    pickup_lat      DOUBLE       NULL,
    pickup_lng      DOUBLE       NULL,
    partner_rating  INT          NULL,
    rating_comment  VARCHAR(300) NULL,
    rated_at        DATETIME     NULL,
    delivery_otp    VARCHAR(6)   NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_da_order (order_id),
    CONSTRAINT fk_da_order   FOREIGN KEY (order_id)   REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_da_partner FOREIGN KEY (partner_id) REFERENCES delivery_partners (id)
);

-- ── Verify (using 'cnt' instead of reserved word 'rows') ──────────────────────
SELECT 'delivery_partners'    AS tbl, COUNT(*) AS cnt FROM delivery_partners
UNION ALL
SELECT 'delivery_assignments' AS tbl, COUNT(*) AS cnt FROM delivery_assignments;
