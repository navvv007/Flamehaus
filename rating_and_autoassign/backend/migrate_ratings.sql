-- =============================================================================
--  RATINGS + AUTO-ASSIGN MIGRATION
--  Run once against flamehaus_db
-- =============================================================================
USE flamehaus_db;

-- Order ratings (overall order)
CREATE TABLE IF NOT EXISTS order_ratings (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    order_id   BIGINT       NOT NULL,
    rating     INT          NOT NULL,
    comment    VARCHAR(500) NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_or_order (order_id),
    CONSTRAINT fk_or_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

-- Dish ratings (per dish)
CREATE TABLE IF NOT EXISTS dish_ratings (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    order_id   BIGINT       NOT NULL,
    dish_name  VARCHAR(150) NULL,
    rating     INT          NOT NULL,
    comment    VARCHAR(300) NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_dr_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

-- Delivery partner rating columns (already in delivery_assignments via Hibernate)
-- Run only if delivery_assignments table exists and columns are missing:
ALTER TABLE delivery_assignments ADD COLUMN rated_at              DATETIME     NULL;
ALTER TABLE delivery_assignments ADD COLUMN partner_order_rating  INT          NULL;
ALTER TABLE delivery_assignments ADD COLUMN partner_order_comment VARCHAR(300) NULL;
ALTER TABLE delivery_assignments ADD COLUMN partner_rated_at      DATETIME     NULL;

-- Verify
SELECT 'order_ratings'   AS tbl, COUNT(*) AS cnt FROM order_ratings
UNION ALL
SELECT 'dish_ratings'    AS tbl, COUNT(*) AS cnt FROM dish_ratings;
