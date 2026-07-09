require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initDb = require('./initDb');

const authRouter = require('./routes/auth');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'https://sedigaplanit.github.io',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });
