const { Pool } = require('pg');

// Supabase (and Render production) both require SSL
const requireSsl =
  process.env.NODE_ENV === 'production' ||
  (process.env.DATABASE_URL || '').includes('supabase');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: requireSsl ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
