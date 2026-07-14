const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');

const sign = (user) =>
  jwt.sign(
    { id: user.id, name: user.name, email: user.email, gender: user.gender || null, mobile: user.mobile || null, address: user.address || null },
    process.env.JWT_SECRET || 'dev_jwt_secret',
    { expiresIn: '7d' }
  );

// ── POST /api/auth/signup ──────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { name, email, password, gender, mobile, address } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields are required.' });

  try {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0)
      return res.status(409).json({ message: 'Email already registered.' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, gender, mobile, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, email, hash, gender || null, mobile || null, address || null]
    );

    const user = { id: rows[0].id, name, email, gender: gender || null, mobile: mobile || null, address: address || null };
    res.status(201).json({ user, token: sign(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required.' });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0)
      return res.status(401).json({ message: 'Invalid email or password.' });

    const dbUser = rows[0];
    const match = await bcrypt.compare(password, dbUser.password_hash);
    if (!match)
      return res.status(401).json({ message: 'Invalid email or password.' });

    const user = { id: dbUser.id, name: dbUser.name, email: dbUser.email, gender: dbUser.gender, mobile: dbUser.mobile, address: dbUser.address };
    res.json({ user, token: sign(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────────
// JWT is stateless — client just discards the token. Nothing to do server-side.
router.post('/logout', (_req, res) => res.json({ message: 'Logged out.' }));

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
// Always query the DB so stale JWTs still return fresh profile fields
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, gender, mobile, address FROM users WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PUT /api/auth/profile ──────────────────────────────────────────────────────
router.put('/profile', requireAuth, async (req, res) => {
  const { name, gender, mobile, address } = req.body;
  if (!name || name.trim().length < 3)
    return res.status(400).json({ message: 'Name must be at least 3 characters.' });

  try {
    const { rows } = await pool.query(
      'UPDATE users SET name=$1, gender=$2, mobile=$3, address=$4 WHERE id=$5 RETURNING id, name, email, gender, mobile, address',
      [name.trim(), gender || null, mobile || null, address || null, req.user.id]
    );
    const user = rows[0];
    res.json({ user, token: sign(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
