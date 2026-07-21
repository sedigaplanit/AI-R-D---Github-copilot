const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { logger, maskUserId } = require('../logger');

const log = logger.child({ component: 'app.routes.orders' });

router.use(requireAuth);

// ── GET /api/orders ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const trace = `ord_${req.traceId}`;
  log.info(`[Trace: ${trace}] Order history request. User: ${maskUserId(req.user.id)}, Method: GET, URL: /api/orders`);
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

    log.info(`[Trace: ${trace}] Retrieved ${result.length} order(s) for User: ${maskUserId(req.user.id)}.`);
    res.json({ orders: result });
  } catch (err) {
    log.error(`[Trace: ${trace}] Order history fetch failed. User: ${maskUserId(req.user.id)} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/orders ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { id: orderNumber, date, total, items } = req.body;
  if (!orderNumber || !total || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: 'Invalid order data.' });

  const trace = `ord_${req.traceId}`;
  log.info(`[Trace: ${trace}] Incoming Order Request. User: ${maskUserId(req.user.id)}, Method: POST, URL: /api/orders`);
  log.info(`[Trace: ${trace}] Validating order payload. Order: ${orderNumber}, Items: ${items.length}, Total: $${parseFloat(total).toFixed(2)}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    log.info(`[Trace: ${trace}] DB transaction initiated. Inserting order record.`);

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
    log.info(`[Trace: ${trace}] Order items persisted. ${items.length} line item(s) inserted.`);

    await client.query('COMMIT');
    log.info(`[Trace: ${trace}] Order committed successfully. Order: ${orderNumber}, User: ${maskUserId(req.user.id)}.`);
    res.status(201).json({ message: 'Order saved.', orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    log.error(`[Trace: ${trace}] Order placement failed, transaction rolled back. Order: ${orderNumber}, User: ${maskUserId(req.user.id)} — ${err.message}`);
    // PostgreSQL unique_violation code
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Duplicate order number.' });
    }
    res.status(500).json({ message: 'Server error.' });
  } finally {
    client.release();
  }
});

module.exports = router;
