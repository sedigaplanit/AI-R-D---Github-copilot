'use strict';
const router = require('express').Router();
const pool   = require('../db');
const { logger } = require('../logger');

const log = logger.child({ component: 'app.routes.products' });

// ── GET /api/products ──────────────────────────────────────────────────────────
// Query params: category, search, priceRange (low|medium|high), sort (price-asc|price-desc|name-asc)
router.get('/', async (req, res) => {
  const { category, search, priceRange, sort } = req.query;

  const conditions = [];
  const values     = [];

  if (category) {
    if (!['women', 'men', 'kid'].includes(category))
      return res.status(400).json({ message: 'category must be women, men, or kid.' });
    values.push(category);
    conditions.push(`category = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }

  if (priceRange) {
    if (priceRange === 'low')    conditions.push('new_price < 100');
    else if (priceRange === 'medium') conditions.push('new_price >= 100 AND new_price <= 200');
    else if (priceRange === 'high')   conditions.push('new_price > 200');
    else return res.status(400).json({ message: 'priceRange must be low, medium, or high.' });
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const ORDER_MAP = {
    'price-asc':  'new_price ASC',
    'price-desc': 'new_price DESC',
    'name-asc':   'name ASC',
  };
  const orderBy = ORDER_MAP[sort] || 'id ASC';

  try {
    const { rows } = await pool.query(
      `SELECT id, name, category, image_url, new_price, old_price, description,
              is_new_collection, is_popular, created_at
       FROM products ${where} ORDER BY ${orderBy}`,
      values
    );
    log.info(`Products fetched. Count: ${rows.length}, Filters: category=${category||'*'} search=${search||'*'} price=${priceRange||'*'} sort=${sort||'default'}`);
    res.json({ products: rows });
  } catch (err) {
    log.error(`Products fetch failed — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/products/new-collections ─────────────────────────────────────────
router.get('/new-collections', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, category, image_url, new_price, old_price, description
       FROM products WHERE is_new_collection = TRUE ORDER BY id`
    );
    res.json({ products: rows });
  } catch (err) {
    log.error(`New collections fetch failed — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/products/popular ──────────────────────────────────────────────────
router.get('/popular', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, category, image_url, new_price, old_price, description
       FROM products WHERE is_popular = TRUE ORDER BY id`
    );
    res.json({ products: rows });
  } catch (err) {
    log.error(`Popular products fetch failed — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/products/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ message: 'Product id must be a number.' });

  try {
    const { rows } = await pool.query(
      `SELECT id, name, category, image_url, new_price, old_price, description,
              is_new_collection, is_popular, created_at
       FROM products WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Product not found.' });
    res.json({ product: rows[0] });
  } catch (err) {
    log.error(`Product fetch failed id=${id} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/products/:id/reviews ─────────────────────────────────────────────
// Inline here (reviews are product-scoped; also exposed via /api/reviews)
router.get('/:id/reviews', async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) return res.status(400).json({ message: 'Product id must be a number.' });

  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.name AS reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId]
    );

    const ratingResult = await pool.query(
      `SELECT ROUND(AVG(rating)::numeric, 1) AS average, COUNT(*) AS total
       FROM reviews WHERE product_id = $1`,
      [productId]
    );
    const { average, total } = ratingResult.rows[0];

    res.json({
      reviews:        rows,
      average_rating: parseFloat(average) || 0,
      total_reviews:  parseInt(total, 10),
    });
  } catch (err) {
    log.error(`Reviews fetch failed productId=${productId} — ${err.message}`);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
