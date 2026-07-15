const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { logger, maskEmail, maskName, maskUserId } = require('../logger');

const log = logger.child({ component: 'app.routes.auth' });

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

  const trace = `auth_${req.traceId}`;
  log.info(`[Trace: ${trace}] Signup request received. Method: POST, URL: /api/auth/signup, Email: ${maskEmail(email)}, Name: ${maskName(name)}`);

  try {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      log.warn(`[Trace: ${trace}] Signup rejected — email already registered. Email: ${maskEmail(email)}`);
      return res.status(409).json({ message: 'Email already registered.' });
    }

    log.info(`[Trace: ${trace}] Email uniqueness check passed. Hashing credentials and creating user record.`);
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, gender, mobile, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, email, hash, gender || null, mobile || null, address || null]
    );

    const user = { id: rows[0].id, name, email, gender: gender || null, mobile: mobile || null, address: address || null };
    log.info(`[Trace: ${trace}] User registered successfully. User: ${maskUserId(user.id)}. JWT token issued. Session established.`);
    res.status(201).json({ user, token: sign(user) });
  } catch (err) {
    log.error(`[Trace: ${trace}] Signup failed with internal error. Email: ${maskEmail(email)} — ${err.message}`);
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
router.post('/logout', (req, res) => {
  log.info(`[Trace: req_${req.traceId}] Logout request received. Session token discarded client-side.`);
  res.json({ message: 'Logged out.' });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
// Always query the DB so stale JWTs still return fresh profile fields
router.get('/me', requireAuth, async (req, res) => {
  const trace = `auth_${req.traceId}`;
  try {
    log.info(`[Trace: ${trace}] Profile fetch request. User: ${maskUserId(req.user.id)}, Method: GET, URL: /api/auth/me`);
    const { rows } = await pool.query(
      'SELECT id, name, email, gender, mobile, address FROM users WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) {
      log.warn(`[Trace: ${trace}] Profile not found for User: ${maskUserId(req.user.id)}`);
      return res.status(404).json({ message: 'User not found.' });
    }
    log.info(`[Trace: ${trace}] Profile retrieved successfully for User: ${maskUserId(req.user.id)}`);
    res.json({ user: rows[0] });
  } catch (err) {
    log.error(`[Trace: ${trace}] Profile fetch failed. User: ${maskUserId(req.user.id)} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PUT /api/auth/profile ──────────────────────────────────────────────────────
router.put('/profile', requireAuth, async (req, res) => {
  const { name, gender, mobile, address } = req.body;
  if (!name || name.trim().length < 3)
    return res.status(400).json({ message: 'Name must be at least 3 characters.' });

  const trace = `auth_${req.traceId}`;
  log.info(`[Trace: ${trace}] Profile update request. User: ${maskUserId(req.user.id)}, Method: PUT, URL: /api/auth/profile, Name: ${maskName(name)}`);

  try {
    const { rows } = await pool.query(
      'UPDATE users SET name=$1, gender=$2, mobile=$3, address=$4 WHERE id=$5 RETURNING id, name, email, gender, mobile, address',
      [name.trim(), gender || null, mobile || null, address || null, req.user.id]
    );
    const user = rows[0];
    log.info(`[Trace: ${trace}] Profile updated successfully for User: ${maskUserId(user.id)}. JWT token re-issued.`);
    res.json({ user, token: sign(user) });
  } catch (err) {
    log.error(`[Trace: ${trace}] Profile update failed. User: ${maskUserId(req.user.id)} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
