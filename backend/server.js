require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initDb = require('./initDb');
const attachTraceId = require('./middleware/traceId');
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

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info({
    component: 'app.middleware.request',
    message: `[Trace: req_${req.traceId}] Incoming Request — Method: ${req.method}, URL: ${req.path}`,
  });
  next();
});

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

initDb()
  .then(() => seedDb())
  .then(() => {
    app.listen(PORT, () =>
      logger.info({ component: 'app.server', message: `Server running on http://localhost:${PORT}` })
    );
  })
  .catch((err) => {
    logger.error({ component: 'app.server', message: `Failed to initialise database: ${err.message}` });
    process.exit(1);
  });
