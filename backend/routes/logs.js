'use strict';
const router = require('express').Router();
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');

/**
 * GET /api/admin/logs
 *
 * Returns the raw log file for a given date.
 * Protected by a LOG_SECRET env variable checked in the Authorization header.
 *
 * Query params:
 *   date  — YYYY-MM-DD  (defaults to today)
 *   lines — last N lines to return  (optional, returns full file if omitted)
 *
 * Usage:
 *   curl -H "Authorization: Bearer <LOG_SECRET>" \
 *        https://<your-render-url>/api/admin/logs
 *
 *   curl -H "Authorization: Bearer <LOG_SECRET>" \
 *        "https://<your-render-url>/api/admin/logs?date=2026-07-14&lines=200"
 */
router.get('/', (req, res) => {
  // ── Auth check ───────────────────────────────────────────────────────────────
  const secret = process.env.LOG_SECRET;
  if (!secret) {
    return res.status(503).json({ message: 'Log access is not configured on this server.' });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ') || authHeader.slice(7) !== secret) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  // ── Date param ────────────────────────────────────────────────────────────────
  const dateParam = req.query.date;
  let date;
  if (dateParam) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    date = dateParam;
  } else {
    date = new Date().toISOString().slice(0, 10);
  }

  const logFile = path.join(logsDir, `app-${date}.log`);

  // Guard against path traversal
  if (!logFile.startsWith(logsDir)) {
    return res.status(400).json({ message: 'Invalid date.' });
  }

  if (!fs.existsSync(logFile)) {
    return res.status(404).json({ message: `No log file found for ${date}.` });
  }

  // ── Optional tail ─────────────────────────────────────────────────────────────
  const linesParam = parseInt(req.query.lines, 10);
  const content = fs.readFileSync(logFile, 'utf8');

  if (!isNaN(linesParam) && linesParam > 0) {
    const tail = content.trimEnd().split('\n').slice(-linesParam).join('\n');
    res.setHeader('Content-Type', 'text/plain');
    return res.send(tail);
  }

  res.setHeader('Content-Type', 'text/plain');
  res.send(content);
});

module.exports = router;
