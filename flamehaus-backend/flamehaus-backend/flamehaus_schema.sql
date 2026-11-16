-- ============================================================
--  Flamehaus Database Schema
--  Compatible with MySQL 8.x
--  Spring Boot ddl-auto=update will also auto-create these,
--  but use this script for a clean manual setup.
-- ============================================================

CREATE DATABASE IF NOT EXISTS flamehaus_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE flamehaus_db;

-- ────────────────────────────────────────────────────────────
--  1. ADMIN USERS
--     Stores all admin panel accounts (SUPERADMIN / STAFF).
--     Seeded automatically by DataSeeder on first boot.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
    id           BIGINT        NOT NULL AUTO_INCREMENT,
    username     VARCHAR(100)  NOT NULL,
    password     VARCHAR(255)  NOT NULL,          -- BCrypt hash
    role         VARCHAR(50)   NOT NULL DEFAULT 'STAFF',  -- SUPERADMIN | STAFF
    active       TINYINT(1)    NOT NULL DEFAULT 1,
    display_name VARCHAR(150)  NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ────────────────────────────────────────────────────────────
--  2. CUSTOMERS
--     Website users who register to track their orders.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    name       VARCHAR(120) NOT NULL,
    email      VARCHAR(150) NOT NULL,             -- unique, stored lowercase
    password   VARCHAR(255) NOT NULL,             -- BCrypt hash
    phone      VARCHAR(20)  NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active     TINYINT(1)   NOT NULL DEFAULT 1,

    PRIMARY KEY (id),
    UNIQUE KEY uq_customer_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ────────────────────────────────────────────────────────────
--  3. MENU ITEMS
--     Dishes managed by SUPERADMIN through the admin panel.
--     Seeded automatically by DataSeeder on first boot.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    name        VARCHAR(150)  NOT NULL,
    category    VARCHAR(100)  NOT NULL,           -- Burgers | Pizza | Sushi | ...
    price       DOUBLE        NOT NULL,           -- stored in USD
    description VARCHAR(500)  NULL,
    image       VARCHAR(20)   NULL DEFAULT '🍽',  -- emoji
    badge       VARCHAR(50)   NULL,               -- Best Seller | New | Premium | ...
    available   TINYINT(1)    NOT NULL DEFAULT 1,
    rating      DOUBLE        NULL DEFAULT 4.5,
    reviews     INT           NULL DEFAULT 0,
    prep_time   VARCHAR(20)   NULL DEFAULT '15 min',

    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ────────────────────────────────────────────────────────────
--  4. ORDERS
--     Placed from the website cart (guest or logged-in).
--     customer_id is NULL for guest orders.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    customer_name    VARCHAR(150) NOT NULL,
    customer_phone   VARCHAR(200) NULL,
    delivery_address VARCHAR(300) NULL,
    total            DOUBLE       NOT NULL,       -- total in USD
    status           VARCHAR(50)  NOT NULL DEFAULT 'Pending',
                                                  -- Pending | Preparing | On the Way | Delivered
    items_summary    TEXT         NULL,           -- e.g. "Burger x2, Lassi x1"
    customer_id      BIGINT       NULL,           -- FK → customers.id (NULL = guest)
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_order_customer
        FOREIGN KEY (customer_id) REFERENCES customers (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ────────────────────────────────────────────────────────────
--  5. PASSWORD RESET TOKENS
--     Short-lived (15 min) tokens for admin forgot-password.
--     In production these would be emailed; in dev the API
--     returns the token directly in the response.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    token      VARCHAR(64) NOT NULL,              -- random 32-char hex string
    username   VARCHAR(100) NOT NULL,             -- references admin_users.username
    expires_at DATETIME    NOT NULL,              -- now + 15 minutes
    used       TINYINT(1)  NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    UNIQUE KEY uq_prt_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  SEED DATA  (matches DataSeeder.java — safe to skip if you
--  let Spring Boot seed automatically on first run)
-- ============================================================

-- Default admin accounts (passwords are BCrypt of plain values shown)
-- admin / admin123
-- staff / staff123
INSERT IGNORE INTO admin_users (username, password, role, active, display_name) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'SUPERADMIN', 1, 'Super Admin'),
('staff', '$2a$10$Fows3XgBGkFZCMYOqP0l4.IvBGGDzFUGj2Q9k.6SbPORPLLkXiCe', 'STAFF',      1, 'Kitchen Staff');

-- Menu items
INSERT IGNORE INTO menu_items (name, category, price, description, image, badge, available, rating, reviews, prep_time) VALUES
('Classic Smash Burger',  'Burgers',  12.99, 'Double smash patty, aged cheddar, caramelised onions, secret sauce', '🍔', 'Best Seller', 1, 4.8, 320, '12 min'),
('BBQ Bacon Stack',       'Burgers',  14.99, 'Triple stack, crispy bacon, BBQ glaze, jalapeños, coleslaw',          '🥓', 'Spicy',       1, 4.7, 210, '15 min'),
('Margherita Royale',     'Pizza',    13.99, 'San Marzano tomatoes, buffalo mozzarella, fresh basil, EVOO',         '🍕', 'Chef''s Pick', 1, 4.9, 480, '18 min'),
('Truffle Mushroom Pizza','Pizza',    17.99, 'Black truffle oil, wild mushrooms, fontina, thyme',                   '🍄', 'Premium',     1, 4.8, 195, '20 min'),
('Dragon Roll',           'Sushi',    18.99, 'Shrimp tempura, cucumber, avocado, spicy mayo, tobiko',              '🍣', 'Fan Fav',     1, 4.9, 267, '20 min'),
('Rainbow Platter',       'Sushi',    24.99, '8-piece assorted nigiri with chef''s seasonal selection',             '🐟', 'Premium',     1, 4.8, 189, '25 min'),
('Carbonara Classica',    'Pasta',    15.99, 'Guanciale, pecorino romano, egg yolk, black pepper',                 '🍝', 'Best Seller', 1, 4.7, 312, '16 min'),
('Lobster Linguine',      'Pasta',    28.99, 'Fresh lobster, cherry tomatoes, garlic, white wine, parsley',        '🦞', 'Premium',     1, 4.9, 145, '25 min'),
('Mediterranean Bowl',    'Salads',   11.99, 'Quinoa, falafel, hummus, roasted veg, lemon tahini dressing',        '🥗', 'Vegan',       1, 4.6, 230, '10 min'),
('Tiramisu',              'Desserts',  7.99, 'Savoiardi, mascarpone cream, espresso, cocoa dusting',              '🍰', 'Best Seller', 1, 4.9, 410, '5 min'),
('Mango Lassi',           'Drinks',    5.99, 'Fresh Alphonso mango, yoghurt, cardamom, rose water',               '🥭', 'Refreshing',  1, 4.7, 290, '5 min'),
('Fish Tacos',            'Tacos',    13.99, 'Battered cod, mango salsa, chipotle crema, pickled cabbage',         '🌮', 'New',         1, 4.7, 178, '14 min');
