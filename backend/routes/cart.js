const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { logger, maskUserId } = require('../logger');

const log = logger.child({ component: 'app.routes.cart' });

router.use(requireAuth);

// ── GET /api/cart ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const trace = `cart_${req.traceId}`;
  log.info(`[Trace: ${trace}] Cart fetch request. User: ${maskUserId(req.user.id)}, Method: GET, URL: /api/cart`);
  try {
    const { rows } = await pool.query(
      'SELECT product_id, quantity FROM cart WHERE user_id = $1',
      [req.user.id]
    );
    const cartItems = {};
    rows.forEach((r) => { cartItems[r.product_id] = r.quantity; });
    log.info(`[Trace: ${trace}] Cart loaded. Found ${rows.length} item(s) for User: ${maskUserId(req.user.id)}.`);
    res.json({ cartItems });
  } catch (err) {
    log.error(`[Trace: ${trace}] Cart fetch failed. User: ${maskUserId(req.user.id)} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PUT /api/cart ──────────────────────────────────────────────────────────────
router.put('/', async (req, res) => {
  const { cartItems } = req.body;
  if (!cartItems || typeof cartItems !== 'object')
    return res.status(400).json({ message: 'cartItems object required.' });

  const userId = req.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM cart WHERE user_id = $1', [userId]);

    const entries = Object.entries(cartItems).filter(([, qty]) => qty > 0);
    if (entries.length > 0) {
      // Build: INSERT INTO cart (user_id, product_id, quantity) VALUES ($1,$2,$3), ($4,$5,$6)...
      const placeholders = entries.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ');
      const values = entries.flatMap(([productId, qty]) => [userId, parseInt(productId), qty]);
      await client.query(
        `INSERT INTO cart (user_id, product_id, quantity) VALUES ${placeholders}`,
        values
      );
    }
    await client.query('COMMIT');
    // Return the saved state so clients can sync local state immediately
    res.json({ message: 'Cart saved.', cartItems });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  } finally {
    client.release();
  }
});

// ── DELETE /api/cart ───────────────────────────────────────────────────────────
router.delete('/', async (req, res) => {
  const trace = `cart_${req.traceId}`;
  log.info(`[Trace: ${trace}] Cart clear request. User: ${maskUserId(req.user.id)}, Method: DELETE, URL: /api/cart`);
  try {
    await pool.query('DELETE FROM cart WHERE user_id = $1', [req.user.id]);
    log.info(`[Trace: ${trace}] Cart cleared successfully for User: ${maskUserId(req.user.id)}.`);
    res.json({ message: 'Cart cleared.' });
  } catch (err) {
    log.error(`[Trace: ${trace}] Cart clear failed. User: ${maskUserId(req.user.id)} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
