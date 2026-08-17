require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const initDb = require('./initDb');
const attachTraceId = require('./middleware/traceId');
const requestJournal = require('./middleware/requestJournal');
const { logger } = require('./logger');

const authRouter     = require('./routes/auth');
const cartRouter     = require('./routes/cart');
const ordersRouter   = require('./routes/orders');
const logsRouter     = require('./routes/logs');
const eventsRouter   = require('./routes/events');
const productsRouter = require('./routes/products');
const wishlistRouter = require('./routes/wishlist');
const reviewsRouter  = require('./routes/reviews');
const { seedDb }     = require('./seed');

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

// ── Trace ID ──────────────────────────────────────────────────────────────────
app.use(attachTraceId);

// ── Request journal ─────────────────────────────────────────────────────────
// Emits one tab-separated HTTP_REQUEST_JOURNAL line per request (start+finish).
app.use(requestJournal);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRouter);
app.use('/api/cart',       cartRouter);
app.use('/api/orders',     ordersRouter);
app.use('/api/admin/logs', logsRouter);
app.use('/api/events',     eventsRouter);
app.use('/api/products',   productsRouter);
app.use('/api/wishlist',   wishlistRouter);
app.use('/api/reviews',    reviewsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// Purge app_logs rows older than 3 days. Runs at startup + every 24 h.
const purgeOldLogs = async () => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM app_logs WHERE logged_at < NOW() - INTERVAL '3 days'`
    );
    if (rowCount > 0)
      logger.info({ component: 'app.server', message: `Log cleanup: removed ${rowCount} entries older than 3 days.` });
  } catch (err) {
    logger.error({ component: 'app.server', message: `Log cleanup failed: ${err.message}` });
  }
};

initDb()
  .then(() => seedDb())
  .then(() => {
    purgeOldLogs();
    setInterval(purgeOldLogs, 24 * 60 * 60 * 1000); // repeat every 24 h
    app.listen(PORT, () =>
      logger.info({ component: 'app.server', message: `Server running on http://localhost:${PORT}` })
    );
  })
  .catch((err) => {
    logger.error({ component: 'app.server', message: `Failed to initialise database: ${err.message}` });
    process.exit(1);
  });
