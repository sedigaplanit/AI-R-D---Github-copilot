'use strict';
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

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

// ── Helper: build nodemailer transporter from env vars ────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',   // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * POST /api/admin/logs/email
 *
 * Filters the last 1 hour of today's log file and emails it.
 * Protected by the same LOG_SECRET bearer token as GET /.
 *
 * Optional JSON body:
 *   { "to": "recipient@example.com" }   — overrides LOG_EMAIL_TO env var
 *
 * Required env vars:
 *   LOG_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, LOG_EMAIL_TO
 *
 * Usage:
 *   curl -X POST -H "Authorization: Bearer <LOG_SECRET>" \
 *        -H "Content-Type: application/json" \
 *        -d '{"to":"you@example.com"}' \
 *        https://<your-render-url>/api/admin/logs/email
 */
router.post('/email', async (req, res) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = process.env.LOG_SECRET;
  if (!secret) {
    return res.status(503).json({ message: 'Log access is not configured on this server.' });
  }
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ') || authHeader.slice(7) !== secret) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  // ── SMTP config check ─────────────────────────────────────────────────────
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(503).json({ message: 'SMTP is not configured on this server (missing SMTP_HOST / SMTP_USER / SMTP_PASS).' });
  }

  const recipient = (req.body && req.body.to) || process.env.LOG_EMAIL_TO;
  if (!recipient) {
    return res.status(400).json({ message: 'Provide a recipient in the request body { "to": "..." } or set LOG_EMAIL_TO env var.' });
  }

  // ── Read today's log file ─────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const logFile = path.join(logsDir, `app-${today}.log`);

  if (!fs.existsSync(logFile)) {
    return res.status(404).json({ message: `No log file found for today (${today}).` });
  }

  const content = fs.readFileSync(logFile, 'utf8');
  const lines = content.trimEnd().split('\n');

  // ── Filter last 1 hour ────────────────────────────────────────────────────
  // Log line format: "2026-07-15 10:30:01.102 INFO  [api-1] ..."
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentLines = lines.filter((line) => {
    const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)/);
    if (!tsMatch) return false;
    return new Date(tsMatch[1]).getTime() >= oneHourAgo;
  });

  if (recentLines.length === 0) {
    return res.status(404).json({ message: 'No log entries found in the last 1 hour.' });
  }

  // ── Send email ────────────────────────────────────────────────────────────
  const transporter = createTransporter();
  const subject = `[OneStyle] Production Logs — Last 1 Hour (${new Date().toISOString()})`;
  const body = recentLines.join('\n');

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to:   recipient,
      subject,
      text: body,
    });
    return res.json({ message: `Log email sent to ${recipient}. Lines included: ${recentLines.length}.` });
  } catch (err) {
    return res.status(500).json({ message: `Failed to send email: ${err.message}` });
  }
});

