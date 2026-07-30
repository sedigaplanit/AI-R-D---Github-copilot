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
 * GET /api/admin/logs/download?minutes=N
 *
 * Admin-only (JWT + is_admin). Filters today's log entries from the last N
 * minutes and returns them as a downloadable .logs file.
 *
 * Query params:
 *   minutes — positive integer, 1-1440 (default: 10)
 */
router.get('/download', requireAuth, (req, res) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  const minutesParam = parseInt(req.query.minutes, 10);
  const minutes = !isNaN(minutesParam) && minutesParam > 0 && minutesParam <= 1440
    ? minutesParam
    : 10;

  const today = new Date().toISOString().slice(0, 10);
  const logFile = path.join(logsDir, `app-${today}.log`);

  if (!fs.existsSync(logFile)) {
    return res.status(404).json({ message: `No log file found for today (${today}).` });
  }

  const content = fs.readFileSync(logFile, 'utf8');
  const lines = content.trimEnd().split('\n');

  const cutoff = Date.now() - minutes * 60 * 1000;
  const recentLines = lines.filter((line) => {
    const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)/);
    if (!tsMatch) return false;
    return new Date(tsMatch[1]).getTime() >= cutoff;
  });

  if (recentLines.length === 0) {
    return res.status(404).json({ message: `No log entries found in the last ${minutes} minute(s).` });
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `app-logs-last-${minutes}min-${ts}.logs`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(recentLines.join('\n'));
});

module.exports = router;

