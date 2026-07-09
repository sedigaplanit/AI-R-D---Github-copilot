const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

// ── GET /api/orders ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows: orders } = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    const result = await Promise.all(
      orders.map(async (order) => {
        const { rows: items } = await pool.query(
          'SELECT * FROM order_items WHERE order_id = $1',
          [order.id]
        );
        return {
          id: order.order_number,
          date: order.created_at,
          total: parseFloat(order.total),
          items: items.map((i) => ({
            id: i.product_id,
            name: i.product_name,
            image: i.product_image,
            price: parseFloat(i.price),
            quantity: i.quantity,
          })),
        };
      })
    );

    res.json({ orders: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/orders ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { id: orderNumber, date, total, items } = req.body;
  if (!orderNumber || !total || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: 'Invalid order data.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'INSERT INTO orders (order_number, user_id, total, created_at) VALUES ($1, $2, $3, $4) RETURNING id',
      [orderNumber, req.user.id, total, date || new Date()]
    );
    const orderId = rows[0].id;

    // Build bulk insert for order_items
    const placeholders = items
      .map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`)
      .join(', ');
    const values = items.flatMap((i) => [orderId, i.id, i.name, i.image || '', i.price, i.quantity]);
    await client.query(
      `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity) VALUES ${placeholders}`,
      values
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Order saved.', orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  } finally {
    client.release();
  }
});

module.exports = router;
