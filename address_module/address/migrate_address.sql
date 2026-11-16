USE flamehaus_db;

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

-- Add structured address columns to orders table if not present
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(200) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(200) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS landmark      VARCHAR(100) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city          VARCHAR(100) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS state         VARCHAR(100) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pincode       VARCHAR(10)  NULL;

SELECT 'Address tables ready' AS result;