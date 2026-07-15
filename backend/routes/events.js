'use strict';
const router = require('express').Router();
const crypto = require('crypto');
const { logger, maskUserId } = require('../logger');

const log = logger.child({ component: 'app.routes.events' });

// Allowlist prevents arbitrary strings being injected into logs
const ALLOWED_EVENTS = new Set([
  'PAGE_VIEW',
  'PRODUCT_VIEW',
  'WISHLIST_ADD',
  'WISHLIST_REMOVE',
  'CART_ADD',
  'CART_REMOVE',
  'CATEGORY_BROWSE',
  'SEARCH',
  'CHECKOUT_START',
]);

/**
 * POST /api/events
 *
 * Fire-and-forget frontend analytics receiver.
 * No auth required — captures anonymous and authenticated journeys.
 *
 * Body: { event, page?, productId?, productName?, category?, userId?, sessionId?, meta? }
 */
router.post('/', (req, res) => {
  const { event, page, productId, productName, category, userId, sessionId, meta } = req.body;

  if (!event || !ALLOWED_EVENTS.has(event)) {
    return res.status(400).json({ message: 'Unknown event type.' });
  }

  // Sanitise inputs — only allow safe scalar values
  const trace  = `evt_${crypto.randomBytes(6).toString('hex')}`;
  const user   = userId   ? maskUserId(Number(userId)) : 'anonymous';
  const sess   = sessionId ? `sess_${String(sessionId).replace(/[^a-z0-9]/gi, '').slice(0, 10)}` : 'sess_unknown';

  let message = `[Trace: ${trace}] ${event} — User: ${user}, Session: ${sess}`;
  if (page)        message += `, Page: ${String(page).slice(0, 100)}`;
  if (productId)   message += `, Product: ${Number(productId) || productId}`;
  if (productName) message += ` (${String(productName).slice(0, 60)})`;
  if (category)    message += `, Category: ${String(category).slice(0, 30)}`;
  if (meta?.qty    !== undefined) message += `, Qty: ${Number(meta.qty)}`;
  if (meta?.query  !== undefined) message += `, Query: "${String(meta.query).slice(0, 50)}"`;

  log.info(message);

  // 204 — success, no body (fire-and-forget, frontend doesn't wait for this)
  res.status(204).send();
});

module.exports = router;
