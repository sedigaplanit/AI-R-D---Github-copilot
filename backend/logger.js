'use strict';
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const PgTransport     = require('./dbTransport');
const path = require('path');

// ── Masking helpers ────────────────────────────────────────────────────────────

/** us**@example.com  — keeps domain visible, masks local part after first 2 chars */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '***';
  const at = email.indexOf('@');
  if (at < 0) return '***';
  return email.slice(0, 2) + '**' + email.slice(at);
};

/** "John Smith"  →  "J*** S***" */
const maskName = (name) => {
  if (!name || typeof name !== 'string') return '***';
  return name
    .split(' ')
    .map((w) => (w[0] || '') + '***')
    .join(' ');
};

/** 42  →  "usr_**42"  (last 2 digits visible) */
const maskUserId = (id) => {
  if (id == null) return 'usr_****';
  const s = String(id);
  return 'usr_' + '*'.repeat(Math.max(0, s.length - 2)) + s.slice(-2);
};

/**
 * sess_abc123def0 — sanitizes and truncates a client-supplied session id.
 * Shared by every route that logs a session, so the same input always
 * produces the same token and journeys stay joinable across log lines.
 */
const formatSessionId = (sessionId) => {
  if (!sessionId) return 'sess_unknown';
  return `sess_${String(sessionId).replace(/[^a-z0-9]/gi, '').slice(0, 10)}`;
};

// ── Log line format ────────────────────────────────────────────────────────────
// Journal entries (HTTP_REQUEST_JOURNAL) are pre-formatted, tab-separated and
// self-contained, so they are printed verbatim — exactly like the production
// access-journal sample. All other application messages keep the readable shape:
//   2026-07-15 10:30:01.102 INFO  [api-1] app.routes.auth               - [Trace: ...]
const lineFormat = format.printf((info) => {
  if (info.component === 'HTTP_REQUEST_JOURNAL') return String(info.message);
  const level = String(info.level || 'info').toUpperCase().padEnd(5);
  return `${info.timestamp} ${level} [api-1] ${String(info.component || 'app.server').padEnd(35)} - ${info.message}`;
});

// ── Transports ─────────────────────────────────────────────────────────────────
const logsDir = path.join(__dirname, 'logs');

const logger = createLogger({
  level: 'info',
  transports: [
    // Console — human-readable with colour
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        lineFormat
      ),
    }),
    // Daily rotating file — one file per day, kept for 30 days, gzipped when archived
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      zippedArchive: true,
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        lineFormat
      ),
    }),
    // PostgreSQL transport — persists logs across Render restarts/redeploys
    new PgTransport({ level: 'info' }),
  ],
});

module.exports = { logger, maskEmail, maskName, maskUserId, formatSessionId };
