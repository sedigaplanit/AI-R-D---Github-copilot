// Seeds the default automation test user into the database.
// Usage: node seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
  const testUser = { name: 'Test User', email: 'test@test.com', password: 'Test@123' };

  try {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [testUser.email]);
    if (existing.length > 0) {
      console.log('Test user already exists — skipping.');
    } else {
      const hash = await bcrypt.hash(testUser.password, 10);
      await pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)', [
        testUser.name,
        testUser.email,
        hash,
      ]);
      console.log(`Seeded test user: ${testUser.email} / ${testUser.password}`);
    }
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
