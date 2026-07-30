'use strict';
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');

const logsDir = path.join(__dirname, '..', 'logs');

/**
 * GET /api/admin/logs
 *
 * Returns the raw log file for a given date (curl / server-to-server access).
 * Protected by LOG_SECRET env variable in the Authorization header.
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
  const secret = process.env.LOG_SECRET;
  if (!secret) {
    return res.status(503).json({ message: 'Log access is not configured on this server.' });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ') || authHeader.slice(7) !== secret) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

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

/**
 * GET /api/admin/logs/download
 *
 * Admin-only (JWT + is_admin). Returns a downloadable .logs file.
 *
 * Mode A — recent N minutes (default):
 *   ?minutes=10   positive integer 1-1440, default 10
 *
 * Mode B — custom range:
 *   ?from=2026-07-30T09:00:00Z&to=2026-07-30T10:00:00Z   ISO 8601 UTC strings
 */
router.get('/download', requireAuth, (req, res) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  const { from, to, minutes: minutesQuery } = req.query;
  let fromTs, toTs, filename;

  if (from || to) {
    // ── Custom range mode ────────────────────────────────────────────────────
    if (!from || !to) {
      return res.status(400).json({ message: 'Both "from" and "to" are required for a custom range.' });
    }
    fromTs = new Date(from).getTime();
    toTs   = new Date(to).getTime();
    if (isNaN(fromTs) || isNaN(toTs)) {
      return res.status(400).json({ message: 'Invalid "from" or "to" datetime. Use ISO 8601 (e.g. 2026-07-30T09:00:00Z).' });
    }
    if (fromTs >= toTs) {
      return res.status(400).json({ message: '"from" must be before "to".' });
    }
    const fromStr = new Date(fromTs).toISOString().slice(0, 16).replace(/[T:]/g, '-');
    const toStr   = new Date(toTs).toISOString().slice(0, 16).replace(/[T:]/g, '-');
    filename = `app-logs-${fromStr}_to_${toStr}.logs`;
  } else {
    // ── Recent N minutes mode ────────────────────────────────────────────────
    const minutesParam = parseInt(minutesQuery, 10);
    const minutes = !isNaN(minutesParam) && minutesParam > 0 && minutesParam <= 1440
      ? minutesParam : 10;
    toTs   = Date.now();
    fromTs = toTs - minutes * 60 * 1000;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    filename = `app-logs-last-${minutes}min-${ts}.logs`;
  }

  // ── Collect log files covering the date range ────────────────────────────
  const startDay = new Date(fromTs);
  startDay.setUTCHours(0, 0, 0, 0);
  const allLines = [];
  const cursor = new Date(startDay);
  while (cursor.getTime() <= toTs) {
    const date    = cursor.toISOString().slice(0, 10);
    const logFile = path.join(logsDir, `app-${date}.log`);
    if (fs.existsSync(logFile)) {
      allLines.push(...fs.readFileSync(logFile, 'utf8').trimEnd().split('\n'));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (allLines.length === 0) {
    return res.status(404).json({ message: 'No log files found for the selected period.' });
  }

  // ── Filter to the exact time window ─────────────────────────────────────
  const filteredLines = allLines.filter((line) => {
    const m = line.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}\.\d+)/);
    if (!m) return false;
    const ts = new Date(`${m[1]}T${m[2]}Z`).getTime();
    return !isNaN(ts) && ts >= fromTs && ts <= toTs;
  });

  if (filteredLines.length === 0) {
    return res.status(404).json({ message: 'No log entries found in the selected time range.' });
  }

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(filteredLines.join('\n'));
});

module.exports = router;

