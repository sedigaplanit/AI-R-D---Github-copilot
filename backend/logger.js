'use strict';
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
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

// ── Log line format ────────────────────────────────────────────────────────────
// Matches the production log shape shown in the brief:
//   2026-07-15 10:30:01.102 INFO  [api-1] app.routes.auth               - [Trace: ...]
const lineFormat = format.printf(({ timestamp, level, component, message }) =>
  `${timestamp} ${level.toUpperCase().padEnd(5)} [api-1] ${String(component || 'app.server').padEnd(35)} - ${message}`
);

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
  ],
});

module.exports = { logger, maskEmail, maskName, maskUserId };
