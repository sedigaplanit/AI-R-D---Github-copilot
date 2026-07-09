const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

// ── GET /api/cart ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT product_id, quantity FROM cart WHERE user_id = $1',
      [req.user.id]
    );
    const cartItems = {};
    rows.forEach((r) => { cartItems[r.product_id] = r.quantity; });
    res.json({ cartItems });
  } catch (err) {
    console.error(err);
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
    res.json({ message: 'Cart saved.' });
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
  try {
    await pool.query('DELETE FROM cart WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Cart cleared.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
