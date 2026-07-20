'use strict';
const router      = require('express').Router();
const pool        = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { logger, maskUserId } = require('../logger');

const log = logger.child({ component: 'app.routes.wishlist' });

router.use(requireAuth);

// ── GET /api/wishlist ──────────────────────────────────────────────────────────
// Returns the full list of wishlisted product IDs for the authenticated user.
router.get('/', async (req, res) => {
  const trace = `wl_${req.traceId}`;
  try {
    const { rows } = await pool.query(
      `SELECT w.product_id, p.name, p.category, p.image_url, p.new_price, p.old_price
       FROM wishlist w
       JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    log.info(`[Trace: ${trace}] Wishlist fetched. User: ${maskUserId(req.user.id)}, Items: ${rows.length}`);
    res.json({ wishlist: rows });
  } catch (err) {
    log.error(`[Trace: ${trace}] Wishlist fetch failed. User: ${maskUserId(req.user.id)} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/wishlist/:productId ──────────────────────────────────────────────
// Add a product to the wishlist. Idempotent — re-adding an existing item returns 200.
router.post('/:productId', async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) return res.status(400).json({ message: 'productId must be a number.' });

  const trace = `wl_${req.traceId}`;
  try {
    // Verify product exists
    const { rows: prod } = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (prod.length === 0) return res.status(404).json({ message: 'Product not found.' });

    await pool.query(
      `INSERT INTO wishlist (user_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [req.user.id, productId]
    );
    log.info(`[Trace: ${trace}] Wishlist add. User: ${maskUserId(req.user.id)}, Product: ${productId}`);
    res.json({ message: 'Added to wishlist.' });
  } catch (err) {
    log.error(`[Trace: ${trace}] Wishlist add failed. User: ${maskUserId(req.user.id)}, Product: ${productId} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── DELETE /api/wishlist/:productId ───────────────────────────────────────────
// Remove a single product from the wishlist.
router.delete('/:productId', async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) return res.status(400).json({ message: 'productId must be a number.' });

  const trace = `wl_${req.traceId}`;
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2',
      [req.user.id, productId]
    );
    if (rowCount === 0) return res.status(404).json({ message: 'Item not in wishlist.' });
    log.info(`[Trace: ${trace}] Wishlist remove. User: ${maskUserId(req.user.id)}, Product: ${productId}`);
    res.json({ message: 'Removed from wishlist.' });
  } catch (err) {
    log.error(`[Trace: ${trace}] Wishlist remove failed. User: ${maskUserId(req.user.id)}, Product: ${productId} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── DELETE /api/wishlist ───────────────────────────────────────────────────────
// Clear the entire wishlist (used after checkout).
router.delete('/', async (req, res) => {
  const trace = `wl_${req.traceId}`;
  try {
    await pool.query('DELETE FROM wishlist WHERE user_id = $1', [req.user.id]);
    log.info(`[Trace: ${trace}] Wishlist cleared. User: ${maskUserId(req.user.id)}`);
    res.json({ message: 'Wishlist cleared.' });
  } catch (err) {
    log.error(`[Trace: ${trace}] Wishlist clear failed. User: ${maskUserId(req.user.id)} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
