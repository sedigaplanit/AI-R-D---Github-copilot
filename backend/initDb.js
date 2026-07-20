// Creates all tables if they don't exist yet.
// Called once at server startup — safe to run on every deploy.
const pool = require('./db');

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(100) NOT NULL,
        email         VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        gender        VARCHAR(50),
        mobile        VARCHAR(20),
        address       TEXT,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add new columns to existing deployments
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gender  VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile  VARCHAR(20);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

      CREATE TABLE IF NOT EXISTS products (
        id                SERIAL PRIMARY KEY,
        name              VARCHAR(255)   NOT NULL,
        category          VARCHAR(50)    NOT NULL CHECK (category IN ('women', 'men', 'kid')),
        image_url         VARCHAR(500)   NOT NULL,
        new_price         DECIMAL(10,2)  NOT NULL,
        old_price         DECIMAL(10,2)  NOT NULL,
        description       TEXT,
        is_new_collection BOOLEAN        NOT NULL DEFAULT FALSE,
        is_popular        BOOLEAN        NOT NULL DEFAULT FALSE,
        created_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cart (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity   INTEGER NOT NULL DEFAULT 1,
        UNIQUE (user_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id           SERIAL PRIMARY KEY,
        order_number VARCHAR(20) NOT NULL UNIQUE,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total        DECIMAL(10,2) NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id            SERIAL PRIMARY KEY,
        order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id    INTEGER NOT NULL,
        product_name  VARCHAR(255) NOT NULL,
        product_image VARCHAR(500) DEFAULT '',
        price         DECIMAL(10,2) NOT NULL,
        quantity      INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wishlist (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id         SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
        rating     INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment    TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, product_id)
      );
    `);
    console.log('Database tables ready.');
  } finally {
    client.release();
  }
}

module.exports = initDb;
