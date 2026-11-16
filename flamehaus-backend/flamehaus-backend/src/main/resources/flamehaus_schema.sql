-- =============================================================================
--  FLAMEHAUS DATABASE SCHEMA
--  MySQL 8.x compatible
--  Spring Boot auto-creates these via ddl-auto=update on first run.
--  Use this file to create them manually or reset to a clean state.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS flamehaus_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE flamehaus_db;

-- -----------------------------------------------------------------------------
-- 1. ADMIN USERS
--    Stores internal admin accounts. Role is either SUPERADMIN or STAFF.
--    Passwords are BCrypt-hashed (never stored in plain text).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id           BIGINT          NOT NULL AUTO_INCREMENT,
    username     VARCHAR(100)    NOT NULL,
    password     VARCHAR(255)    NOT NULL,   -- BCrypt hash
    role         VARCHAR(50)     NOT NULL DEFAULT 'STAFF',  -- SUPERADMIN | STAFF
    active       TINYINT(1)      NOT NULL DEFAULT 1,
    display_name VARCHAR(150)    NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_admin_username (username),
    CONSTRAINT chk_admin_role CHECK (role IN ('SUPERADMIN', 'STAFF'))
);

-- -----------------------------------------------------------------------------
-- 2. CUSTOMERS
--    Stores registered website customers.
--    Passwords are BCrypt-hashed.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    name       VARCHAR(120) NOT NULL,
    email      VARCHAR(150) NOT NULL,
    password   VARCHAR(255) NOT NULL,   -- BCrypt hash
    phone      VARCHAR(20)  NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active     TINYINT(1)   NOT NULL DEFAULT 1,

    PRIMARY KEY (id),
    UNIQUE KEY uk_customer_email (email)
);

-- -----------------------------------------------------------------------------
-- 3. MENU ITEMS
--    All dishes shown on the public menu.
--    available = 0 hides the item from customers but keeps it in the admin panel.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_items (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    name        VARCHAR(150)    NOT NULL,
    category    VARCHAR(100)    NOT NULL,
    price       DOUBLE          NOT NULL,
    description VARCHAR(500)    NULL,
    image       VARCHAR(20)     NULL DEFAULT '🍽',
    badge       VARCHAR(50)     NULL,
    available   TINYINT(1)      NOT NULL DEFAULT 1,
    rating      DOUBLE          NULL DEFAULT 4.5,
    reviews     INT             NULL DEFAULT 0,
    prep_time   VARCHAR(20)     NULL DEFAULT '15 min',

    PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- 4. ORDERS
--    Placed by both guests (customer_id IS NULL) and logged-in customers.
--    status lifecycle: Pending → Preparing → On the Way → Delivered
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    customer_name    VARCHAR(150) NOT NULL,
    customer_phone   VARCHAR(200) NULL,
    delivery_address VARCHAR(300) NULL,
    total            DOUBLE       NOT NULL,
    status           VARCHAR(50)  NOT NULL DEFAULT 'Pending',
    items_summary    TEXT         NULL,
    customer_id      BIGINT       NULL,      -- FK → customers.id (NULL = guest)
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_order_customer
        FOREIGN KEY (customer_id) REFERENCES customers (id)
        ON DELETE SET NULL,
    CONSTRAINT chk_order_status
        CHECK (status IN ('Pending', 'Preparing', 'On the Way', 'Delivered'))
);

-- -----------------------------------------------------------------------------
-- 5. PASSWORD RESET TOKENS
--    Short-lived tokens for admin password resets (15-minute TTL).
--    used = 1 after the token has been consumed.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    token      VARCHAR(64)  NOT NULL,
    username   VARCHAR(100) NOT NULL,   -- references admin_users.username
    expires_at DATETIME     NOT NULL,
    used       TINYINT(1)   NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    UNIQUE KEY uk_reset_token (token)
);


-- =============================================================================
--  SEED DATA
--  The Spring Boot DataSeeder inserts this automatically on first run.
--  Run the INSERT statements below only when creating the schema manually
--  or after a full reset (TRUNCATE all tables first).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Admin accounts
-- Passwords are BCrypt-encoded. Plain-text values shown in comments.
--   admin  → admin123
--   staff  → staff123
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO admin_users (username, password, role, active, display_name) VALUES
('admin',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- admin123
 'SUPERADMIN', 1, 'Super Admin'),
('staff',
 '$2a$10$8K1p/a0dR1xqM4hHHqFjFuAX1CF5GmGnLRe6sEBr7EXc9aP7msb0i',  -- staff123
 'STAFF', 1, 'Kitchen Staff');

-- -----------------------------------------------------------------------------
-- Menu items (12 dishes, matches DataSeeder exactly)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO menu_items
    (name, category, price, description, image, badge, available, rating, reviews, prep_time)
VALUES
('Classic Smash Burger',  'Burgers',  12.99, 'Double smash patty, aged cheddar, caramelised onions, secret sauce', '🍔', 'Best Seller', 1, 4.8, 320, '12 min'),
('BBQ Bacon Stack',       'Burgers',  14.99, 'Triple stack, crispy bacon, BBQ glaze, jalapeños, coleslaw',          '🥓', 'Spicy',       1, 4.7, 210, '15 min'),
('Margherita Royale',     'Pizza',    13.99, 'San Marzano tomatoes, buffalo mozzarella, fresh basil, EVOO',         '🍕', 'Chef''s Pick', 1, 4.9, 480, '18 min'),
('Truffle Mushroom Pizza','Pizza',    17.99, 'Black truffle oil, wild mushrooms, fontina, thyme',                   '🍄', 'Premium',     1, 4.8, 195, '20 min'),
('Dragon Roll',           'Sushi',    18.99, 'Shrimp tempura, cucumber, avocado, spicy mayo, tobiko',              '🍣', 'Fan Fav',     1, 4.9, 267, '20 min'),
('Rainbow Platter',       'Sushi',    24.99, '8-piece assorted nigiri with chef''s seasonal selection',            '🐟', 'Premium',     1, 4.8, 189, '25 min'),
('Carbonara Classica',    'Pasta',    15.99, 'Guanciale, pecorino romano, egg yolk, black pepper',                 '🍝', 'Best Seller', 1, 4.7, 312, '16 min'),
('Lobster Linguine',      'Pasta',    28.99, 'Fresh lobster, cherry tomatoes, garlic, white wine, parsley',        '🦞', 'Premium',     1, 4.9, 145, '25 min'),
('Mediterranean Bowl',    'Salads',   11.99, 'Quinoa, falafel, hummus, roasted veg, lemon tahini dressing',        '🥗', 'Vegan',       1, 4.6, 230, '10 min'),
('Tiramisu',              'Desserts',  7.99, 'Savoiardi, mascarpone cream, espresso, cocoa dusting',               '🍰', 'Best Seller', 1, 4.9, 410,  '5 min'),
('Mango Lassi',           'Drinks',    5.99, 'Fresh Alphonso mango, yoghurt, cardamom, rose water',                '🥭', 'Refreshing',  1, 4.7, 290,  '5 min'),
('Fish Tacos',            'Tacos',    13.99, 'Battered cod, mango salsa, chipotle crema, pickled cabbage',         '🌮', 'New',         1, 4.7, 178, '14 min');


-- =============================================================================
--  QUICK REFERENCE — TABLE RELATIONSHIPS
-- =============================================================================
--
--   admin_users           customers
--       │                     │
--       │ (1:N)               │ (1:N)
--       ▼                     ▼
--  password_reset_tokens   orders
--   (username = FK lookup)  (customer_id → customers.id, nullable)
--
--   menu_items            (standalone — no FK dependencies)
--
-- =============================================================================

-- =============================================================================
--  USEFUL QUERIES
-- =============================================================================

-- All pending orders with customer info
-- SELECT o.id, o.customer_name, o.total, o.status, o.created_at,
--        c.email AS customer_email
-- FROM orders o
-- LEFT JOIN customers c ON c.id = o.customer_id
-- WHERE o.status = 'Pending'
-- ORDER BY o.created_at DESC;

-- Revenue summary
-- SELECT
--     COUNT(*)            AS total_orders,
--     SUM(total)          AS total_revenue,
--     AVG(total)          AS avg_order_value,
--     SUM(total) * 84     AS total_revenue_inr
-- FROM orders;

-- Orders per customer
-- SELECT c.name, c.email, COUNT(o.id) AS order_count, SUM(o.total) AS lifetime_value
-- FROM customers c
-- LEFT JOIN orders o ON o.customer_id = c.id
-- GROUP BY c.id
-- ORDER BY lifetime_value DESC;

-- Menu items by category
-- SELECT category, COUNT(*) AS item_count, AVG(price) AS avg_price
-- FROM menu_items
-- WHERE available = 1
-- GROUP BY category
-- ORDER BY item_count DESC;


-- =============================================================================
--  SCHEMA UPDATE — Order Tracking Fields
--  Run only if upgrading from a previous version (ddl-auto=update handles this
--  automatically on app start). Run manually only on a clean install.
-- =============================================================================
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS delivery_lat      DOUBLE       NULL,
    ADD COLUMN IF NOT EXISTS delivery_lng      DOUBLE       NULL,
    ADD COLUMN IF NOT EXISTS tracking_note     VARCHAR(300) NULL,
    ADD COLUMN IF NOT EXISTS estimated_delivery DATETIME    NULL,
    ADD COLUMN IF NOT EXISTS updated_at        DATETIME     NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP;
