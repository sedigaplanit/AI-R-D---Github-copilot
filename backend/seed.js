// Seeds the default automation test user and all 36 products into the database.
// Usage: node seed.js
// NOTE: This script calls initDb() itself so it can be run standalone during
//       the Render build step (before server.js / initDb are started).
require('dotenv').config();
const bcrypt  = require('bcryptjs');
const pool    = require('./db');
const initDb  = require('./initDb');

// New collection IDs (from new_collections.js)
const NEW_COLLECTION_IDS = new Set([2, 8, 12, 14, 15, 17, 28, 35]);
// Popular IDs (from data.js / Popular component)
const POPULAR_IDS = new Set([1, 2, 3, 4]);

const products = [
  { id: 1,  name: 'Casual Striped Blouse with Peplum Hem',         category: 'women', image_url: 'product_1.png',  new_price: 50.0,  old_price: 80.5,  description: 'A stylish striped blouse featuring flutter sleeves and a peplum hem, perfect for casual outings.' },
  { id: 2,  name: 'Elegant Overlap Collar Top',                    category: 'women', image_url: 'product_2.png',  new_price: 85.0,  old_price: 120.5, description: 'An elegant top with a striped pattern and overlap collar, designed for comfort and style.' },
  { id: 3,  name: 'Striped Summer Flutter Blouse',                 category: 'women', image_url: 'product_3.png',  new_price: 60.0,  old_price: 100.5, description: 'A lightweight striped blouse with flutter sleeves, ideal for summer days.' },
  { id: 4,  name: 'Sophisticated Peplum Blouse',                   category: 'women', image_url: 'product_4.png',  new_price: 100.0, old_price: 150.0, description: 'A sophisticated blouse featuring a peplum hem and a flattering striped design.' },
  { id: 5,  name: 'Chic Overlap Collar Blouse',                    category: 'women', image_url: 'product_5.png',  new_price: 85.0,  old_price: 120.5, description: 'A chic and versatile blouse with a striped pattern and overlap collar.' },
  { id: 6,  name: 'Flutter Sleeve Stripe Top',                     category: 'women', image_url: 'product_6.png',  new_price: 85.0,  old_price: 120.5, description: 'A stylish striped top with flutter sleeves, perfect for a casual yet polished look.' },
  { id: 7,  name: 'Striped Day-Out Blouse',                        category: 'women', image_url: 'product_7.png',  new_price: 85.0,  old_price: 120.5, description: 'A comfortable striped blouse with a peplum hem, great for day outings.' },
  { id: 8,  name: 'Feminine Striped Peplum Top',                   category: 'women', image_url: 'product_8.png',  new_price: 85.0,  old_price: 120.5, description: 'A feminine striped top featuring a peplum hem and flutter sleeves.' },
  { id: 9,  name: 'Modern Striped Casual Blouse',                  category: 'women', image_url: 'product_9.png',  new_price: 85.0,  old_price: 120.5, description: 'A modern blouse with a striped design, ideal for casual or semi-formal occasions.' },
  { id: 10, name: 'Peplum Hem Overlap Top',                        category: 'women', image_url: 'product_10.png', new_price: 85.0,  old_price: 120.5, description: 'An overlap collar top with a peplum hem, offering a perfect balance of style and comfort.' },
  { id: 11, name: 'Relaxed Fit Striped Blouse',                    category: 'women', image_url: 'product_11.png', new_price: 85.0,  old_price: 120.5, description: 'A relaxed-fit striped blouse that pairs well with jeans or skirts for a laid-back look.' },
  { id: 12, name: 'Sophisticated Flutter Sleeve Top',              category: 'women', image_url: 'product_12.png', new_price: 85.0,  old_price: 120.5, description: 'A sophisticated top featuring flutter sleeves and a striped pattern.' },
  { id: 13, name: 'Green Slim Fit Bomber Jacket',                  category: 'men',   image_url: 'product_13.png', new_price: 85.0,  old_price: 120.5, description: 'A trendy bomber jacket with a solid green colour and slim-fit design, perfect for any occasion.' },
  { id: 14, name: 'Casual Green Zippered Jacket',                  category: 'men',   image_url: 'product_14.png', new_price: 85.0,  old_price: 120.5, description: 'A casual zippered jacket in green, combining functionality and style.' },
  { id: 15, name: 'Versatile Bomber Jacket',                       category: 'men',   image_url: 'product_15.png', new_price: 85.0,  old_price: 120.5, description: 'A versatile bomber jacket with a sleek, solid green design and comfortable fit.' },
  { id: 16, name: 'Green Zipped Slim Jacket',                      category: 'men',   image_url: 'product_16.png', new_price: 85.0,  old_price: 120.5, description: 'A zippered slim-fit jacket, perfect for layering and keeping warm.' },
  { id: 17, name: "Men's Urban Style Jacket",                      category: 'men',   image_url: 'product_17.png', new_price: 85.0,  old_price: 120.5, description: 'An urban-style bomber jacket in green, designed for contemporary fashion.' },
  { id: 18, name: 'Solid Green Full-Zip Jacket',                   category: 'men',   image_url: 'product_18.png', new_price: 85.0,  old_price: 120.5, description: 'A full-zip jacket with a solid green colour, suitable for casual wear.' },
  { id: 19, name: "Men's Fashion Bomber Jacket",                   category: 'men',   image_url: 'product_19.png', new_price: 85.0,  old_price: 120.5, description: 'A fashionable bomber jacket in green, perfect for men seeking a stylish outerwear option.' },
  { id: 20, name: 'Slim-Fit Green Bomber',                         category: 'men',   image_url: 'product_20.png', new_price: 85.0,  old_price: 120.5, description: 'A slim-fit bomber jacket in green, combining style with functionality.' },
  { id: 21, name: 'Contemporary Green Jacket',                     category: 'men',   image_url: 'product_21.png', new_price: 85.0,  old_price: 120.5, description: 'A contemporary green jacket with a full-zip design for everyday use.' },
  { id: 22, name: "Comfortable Men's Jacket",                      category: 'men',   image_url: 'product_22.png', new_price: 85.0,  old_price: 120.5, description: 'A comfortable jacket in solid green, ideal for casual outings.' },
  { id: 23, name: 'Durable Zippered Jacket',                       category: 'men',   image_url: 'product_23.png', new_price: 85.0,  old_price: 120.5, description: 'A durable zippered jacket in green, offering warmth and a sleek look.' },
  { id: 24, name: "Men's Solid Green Jacket",                      category: 'men',   image_url: 'product_24.png', new_price: 85.0,  old_price: 120.5, description: 'A solid green jacket with a slim fit, suitable for various occasions.' },
  { id: 25, name: 'Orange Colourblocked Sweatshirt',               category: 'kid',   image_url: 'product_25.png', new_price: 85.0,  old_price: 120.5, description: 'A vibrant orange sweatshirt with colourblock details, perfect for boys.' },
  { id: 26, name: 'Vivid Orange Hooded Sweatshirt',                category: 'kid',   image_url: 'product_26.png', new_price: 85.0,  old_price: 120.5, description: 'A vivid orange hooded sweatshirt featuring stylish colourblock patterns.' },
  { id: 27, name: "Trendy Boys' Sweatshirt",                       category: 'kid',   image_url: 'product_27.png', new_price: 85.0,  old_price: 120.5, description: 'A trendy sweatshirt with a hood and orange colourblock design.' },
  { id: 28, name: 'Hooded Colourblocked Sweatshirt',               category: 'kid',   image_url: 'product_28.png', new_price: 85.0,  old_price: 120.5, description: 'A hooded sweatshirt in orange, perfect for boys who love a sporty look.' },
  { id: 29, name: 'Bold Orange Sweatshirt',                        category: 'kid',   image_url: 'product_29.png', new_price: 85.0,  old_price: 120.5, description: 'A bold sweatshirt with a hood and a vibrant colourblock design.' },
  { id: 30, name: "Stylish Kids' Sweatshirt",                      category: 'kid',   image_url: 'product_30.png', new_price: 85.0,  old_price: 120.5, description: 'A stylish sweatshirt for kids, featuring a hood and colourblock patterns.' },
  { id: 31, name: "Playful Boys' Orange Hoodie",                   category: 'kid',   image_url: 'product_31.png', new_price: 85.0,  old_price: 120.5, description: 'A playful orange hoodie for boys with colourblock patterns for a cheerful look.' },
  { id: 32, name: 'Vibrant Colourblocked Hoodie',                  category: 'kid',   image_url: 'product_32.png', new_price: 85.0,  old_price: 120.5, description: 'A vibrant hoodie with bold orange and contrasting colourblock patterns.' },
  { id: 33, name: 'Orange Sweatshirt for Boys',                    category: 'kid',   image_url: 'product_33.png', new_price: 85.0,  old_price: 120.5, description: 'An orange sweatshirt designed for boys, featuring trendy colourblock details.' },
  { id: 34, name: "Sporty Kids' Orange Hoodie",                    category: 'kid',   image_url: 'product_34.png', new_price: 85.0,  old_price: 120.5, description: 'A sporty orange hoodie with colourblock patterns, perfect for active kids.' },
  { id: 35, name: "Dynamic Boys' Sweatshirt",                      category: 'kid',   image_url: 'product_35.png', new_price: 85.0,  old_price: 120.5, description: 'A dynamic sweatshirt for boys with bold orange and playful design elements.' },
  { id: 36, name: 'Chic Colourblocked Hoodie',                     category: 'kid',   image_url: 'product_36.png', new_price: 85.0,  old_price: 120.5, description: 'A chic hoodie for kids, featuring a stylish orange colourblock pattern.' },
];

async function seed() {
  try {
    // Ensure all tables exist before inserting — critical when running during
    // the Render build step (before server.js has had a chance to call initDb).
    await initDb();

    // ── Test user ────────────────────────────────────────────────────────────────
    const testUser = { name: 'Test User', email: 'test@test.com', password: 'Test@123' };
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [testUser.email]);
    if (existing.length > 0) {
      console.log('Test user already exists — skipping.');
    } else {
      const hash = await bcrypt.hash(testUser.password, 10);
      await pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)', [
        testUser.name, testUser.email, hash,
      ]);
      console.log(`Seeded test user: ${testUser.email} / ${testUser.password}`);
    }

    // ── Products ─────────────────────────────────────────────────────────────────
    for (const p of products) {
      const { rows: existing } = await pool.query('SELECT id FROM products WHERE id = $1', [p.id]);
      if (existing.length > 0) {
        // Update flags in case they changed
        await pool.query(
          `UPDATE products SET is_new_collection=$1, is_popular=$2 WHERE id=$3`,
          [NEW_COLLECTION_IDS.has(p.id), POPULAR_IDS.has(p.id), p.id]
        );
        continue;
      }
      await pool.query(
        `INSERT INTO products (id, name, category, image_url, new_price, old_price, description, is_new_collection, is_popular)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [p.id, p.name, p.category, p.image_url, p.new_price, p.old_price, p.description,
         NEW_COLLECTION_IDS.has(p.id), POPULAR_IDS.has(p.id)]
      );
    }
    // Sync the sequence so future INSERTs don't collide
    await pool.query(`SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))`);
    console.log(`Seeded ${products.length} products.`);
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();

