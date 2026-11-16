USE flamehaus_db;

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
    CONSTRAINT fk_cu_coupon   FOREIGN KEY (coupon_id)   REFERENCES coupons  (id),
    CONSTRAINT fk_cu_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_cu_order    FOREIGN KEY (order_id)    REFERENCES orders    (id) ON DELETE CASCADE
);

INSERT IGNORE INTO coupons (code,description,discount_type,discount_value,minimum_order_amount,maximum_discount,usage_limit,per_customer_limit)
VALUES
  ('FLAME10','10% off on orders above Rs.700',       'PERCENTAGE',10, 700,100,NULL,3),
  ('FLAME20','20% off on orders above Rs.1000',      'PERCENTAGE',20,1000,200,NULL,2),
  ('FLAT100','Rs.100 off on orders above Rs.700',    'FLAT',      100, 700,NULL,NULL,1),
  ('FLAT200','Rs.200 off on orders above Rs.1500',   'FLAT',      200,1500,NULL, 100,1),
  ('WELCOME','Welcome offer - 15% off first order',  'PERCENTAGE',15, 700,150,NULL,1),
  ('FEAST30','30% off on orders above Rs.2000',      'PERCENTAGE',30,2000,300,  50,2);

SELECT 'Coupons ready' AS result;