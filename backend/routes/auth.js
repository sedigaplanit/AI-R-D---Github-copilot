const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');

const sign = (user) =>
  jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET || 'dev_jwt_secret',
    { expiresIn: '7d' }
  );

// ── POST /api/auth/signup ──────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields are required.' });

  try {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0)
      return res.status(409).json({ message: 'Email already registered.' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hash]
    );

    const user = { id: rows[0].id, name, email };
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

    const user = { id: dbUser.id, name: dbUser.name, email: dbUser.email };
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
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = router;
