PRAGMA foreign_keys = ON;

CREATE TABLE categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    price       REAL    NOT NULL CHECK (price >= 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    emoji       TEXT    NOT NULL DEFAULT '📦',
    category_id INTEGER NOT NULL REFERENCES categories(id)
);

CREATE TABLE orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    email         TEXT NOT NULL,
    total         REAL NOT NULL,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- product_name et unit_price sont copiés au moment de la commande :
-- l'historique reste correct même si le produit est modifié ou supprimé.
CREATE TABLE order_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT    NOT NULL,
    unit_price   REAL    NOT NULL,
    quantity     INTEGER NOT NULL CHECK (quantity > 0)
);
