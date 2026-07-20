'use strict';
const router      = require('express').Router();
const pool        = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { logger, maskUserId } = require('../logger');

const log = logger.child({ component: 'app.routes.reviews' });

// ── POST /api/reviews ──────────────────────────────────────────────────────────
// Submit or update a review for a product. One review per user per product.
router.post('/', requireAuth, async (req, res) => {
  const { productId, rating, comment } = req.body;
  const id = parseInt(productId, 10);

  if (isNaN(id)) return res.status(400).json({ message: 'productId must be a number.' });
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ message: 'rating must be an integer between 1 and 5.' });

  const trace = `rev_${req.traceId}`;
  try {
    const { rows: prod } = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
    if (prod.length === 0) return res.status(404).json({ message: 'Product not found.' });

    const { rows } = await pool.query(
      `INSERT INTO reviews (product_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING id, product_id, user_id, rating, comment, created_at`,
      [id, req.user.id, rating, comment || null]
    );
    log.info(`[Trace: ${trace}] Review upserted. User: ${maskUserId(req.user.id)}, Product: ${id}, Rating: ${rating}`);
    res.status(201).json({ review: rows[0] });
  } catch (err) {
    log.error(`[Trace: ${trace}] Review upsert failed. User: ${maskUserId(req.user.id)}, Product: ${id} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── DELETE /api/reviews/:reviewId ─────────────────────────────────────────────
// Delete the authenticated user's own review.
router.delete('/:reviewId', requireAuth, async (req, res) => {
  const reviewId = parseInt(req.params.reviewId, 10);
  if (isNaN(reviewId)) return res.status(400).json({ message: 'reviewId must be a number.' });

  const trace = `rev_${req.traceId}`;
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM reviews WHERE id = $1 AND user_id = $2',
      [reviewId, req.user.id]
    );
    if (rowCount === 0)
      return res.status(404).json({ message: 'Review not found or not owned by you.' });

    log.info(`[Trace: ${trace}] Review deleted. User: ${maskUserId(req.user.id)}, Review: ${reviewId}`);
    res.json({ message: 'Review deleted.' });
  } catch (err) {
    log.error(`[Trace: ${trace}] Review delete failed. User: ${maskUserId(req.user.id)}, Review: ${reviewId} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
